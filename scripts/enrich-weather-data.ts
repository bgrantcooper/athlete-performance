// scripts/enrich-weather-data.ts - Visual Crossing with Daily Batch Support
import 'dotenv/config';
import { db } from '../app/lib/db.server';
import * as schema from '../app/lib/schema';
import { eq, isNull, and, sql } from 'drizzle-orm';

interface VisualCrossingHourlyData {
  datetime: string;        // "09:00:00"
  temp: number;           // Temperature in F
  windspeed: number;      // Wind speed in mph
  winddir: number;        // Wind direction in degrees
  humidity: number;       // Humidity percentage
  visibility: number;     // Visibility in miles
  conditions: string;     // "Partially cloudy"
  icon: string;          // Weather icon
}

interface VisualCrossingResponse {
  days: Array<{
    datetime: string;     // "2025-07-18"
    hours: VisualCrossingHourlyData[];
  }>;
}

interface EventWeatherData {
  date: string;
  event_start_time?: string;
  event_end_time?: string;
  hourly_data: Array<{
    time: string;
    temperature: number;
    wind_speed: number;
    wind_direction: number;
    wind_direction_text: string;
    conditions: string;
    humidity: number;
    visibility: number;
  }>;
  summary: string;
  data_source: string;
}

class WeatherEnricher {
  private apiKey: string;
  private baseUrl = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';
  private processedCount = 0;
  private successCount = 0;
  private errorCount = 0;
  private rateLimitDelay = 2000; // Start with 2 seconds between requests
  
  constructor() {
    this.apiKey = process.env.VISUAL_CROSSING_WEATHER_KEY || '';
    if (!this.apiKey) {
      throw new Error('VISUAL_CROSSING_WEATHER_KEY not found in environment variables');
    }
    console.log('🌤️  Using Visual Crossing Weather API');
  }

  async enrichAllEvents(dryRun: boolean = false, limit?: number) {
    console.log(`🌤️  Starting weather enrichment for all events${dryRun ? ' (DRY RUN)' : ''}${limit ? ` (limit: ${limit})` : ''}...`);
    
    // Get all events that need weather data
    const eventsNeedingWeather = await db
      .select({
        eventId: schema.events.id,
        eventName: schema.events.name,
        eventDate: schema.events.scheduledStartTime,
        actualStartTime: schema.events.actualStartTime,
        competitionName: schema.competitions.name,
        venueName: schema.venues.name,
        latitude: schema.venues.latitude,
        longitude: schema.venues.longitude,
        city: schema.venues.city,
        state: schema.venues.state,
      })
      .from(schema.events)
      .innerJoin(schema.competitions, eq(schema.events.competitionId, schema.competitions.id))
      .innerJoin(schema.venues, eq(schema.events.venueId, schema.venues.id))
      .where(
        and(
          isNull(schema.events.weatherConditions), // Only events without weather data
          // Only events with valid coordinates
          sql`${schema.venues.latitude} IS NOT NULL AND ${schema.venues.longitude} IS NOT NULL`,
          // Skip virtual events
          sql`${schema.events.name} NOT ILIKE '%virtual%'`
        )
      )
      .limit(limit || 1000); // Apply limit here, default to 1000 if no limit
    
    console.log(`📊 Found ${eventsNeedingWeather.length} events needing weather data (excluding virtual events)${limit ? ` - processing ${Math.min(limit, eventsNeedingWeather.length)}` : ''}`);
    
    if (eventsNeedingWeather.length === 0) {
      console.log('✅ All non-virtual events already have weather data!');
      // Check for virtual events
      const virtualEvents = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.events)
        .where(sql`${schema.events.name} ILIKE '%virtual%'`);
      
      if (virtualEvents[0]?.count && virtualEvents[0].count > 0) {
        console.log(`ℹ️  Skipped ${virtualEvents[0].count} virtual events (no physical location)`);
      }
      return;
    }

    if (dryRun) {
      console.log('\n🔍 Events that would be processed:');
      eventsNeedingWeather.slice(0, 10).forEach((event, index) => {
        const eventDate = event.actualStartTime || event.eventDate;
        const apiDate = eventDate ? new Date(eventDate).toISOString().split('T')[0] : 'No date';
        console.log(`${index + 1}. ${event.eventName} (${event.competitionName})`);
        console.log(`   📍 ${event.venueName} - ${event.city}, ${event.state}`);
        console.log(`   📅 ${apiDate} - Coords: ${event.latitude}, ${event.longitude}`);
        console.log('');
      });
      
      if (eventsNeedingWeather.length > 10) {
        console.log(`... and ${eventsNeedingWeather.length - 10} more events`);
      }
      
      console.log(`\n📈 Summary:`);
      console.log(`- Total events to process: ${eventsNeedingWeather.length} (excluding virtual events)`);
      console.log(`- Estimated API calls: ${eventsNeedingWeather.length}`);
      console.log(`- Estimated time (2 sec delay): ~${Math.ceil(eventsNeedingWeather.length * 2 / 60)} minutes`);
      console.log('- May take longer if rate limits are hit');
      console.log('\nRun without --dry-run to actually fetch weather data');
      return;
    }
    
    // Process events with rate limiting (actual run)
    for (const event of eventsNeedingWeather) {
      try {
        await this.processEventWeather(event);
        this.successCount++;
        
        // Progress update every 10 events
        if (this.processedCount % 10 === 0) {
          console.log(`✅ Processed ${this.processedCount}/${eventsNeedingWeather.length} events (${this.successCount} success, ${this.errorCount} errors)`);
        }
        
        // Rate limiting - wait between requests
        await this.sleep(this.rateLimitDelay);
        
      } catch (error) {
        console.error(`❌ Error processing weather for event ${event.eventId} (${event.eventName}):`, error);
        this.errorCount++;
        
        // If we hit rate limit, increase delay significantly
        if (error instanceof Error && (error.message?.includes('rate limit') || error.message?.includes('429'))) {
          console.log(`⏳ Rate limit detected, increasing delay from ${this.rateLimitDelay}ms...`);
          this.rateLimitDelay = Math.min(this.rateLimitDelay + 5000, 30000); // Add 5 seconds each time, max 30 seconds
          console.log(`⏳ New delay: ${this.rateLimitDelay}ms`);
          await this.sleep(this.rateLimitDelay);
        }
      }
      
      this.processedCount++;
    }
    
    console.log('🎉 Weather enrichment completed!');
    await this.printSummary();
  }

  public async processEventWeather(event: any) {
    if (!event.latitude || !event.longitude) {
      throw new Error(`No coordinates for venue: ${event.venueName}`);
    }
    
    const eventDate = event.actualStartTime || event.eventDate;
    if (!eventDate) {
      throw new Error(`No event date for: ${event.eventName}`);
    }
    
    // Format date for API (YYYY-MM-DD)
    const apiDate = new Date(eventDate).toISOString().split('T')[0];
    
    // Fetch weather data from Visual Crossing
    const weatherData = await this.fetchWeatherData(
      event.latitude, 
      event.longitude, 
      apiDate
    );
    
    // Update event with weather data
    await this.updateEventWeather(event.eventId, weatherData);
    
    console.log(`🌤️  Updated weather for: ${event.eventName} (${event.city}, ${event.state}) - ${apiDate}`);
  }

  private async fetchWeatherData(lat: number, lng: number, date: string): Promise<EventWeatherData> {
    const url = `${this.baseUrl}/${lat},${lng}/${date}/${date}?unitGroup=us&include=hours&key=${this.apiKey}&contentType=json`;
    
    console.log(`\n🌐 FULL API URL (copy/paste into browser):`);
    console.log(url);
    console.log(`\n📋 URL Components:`);
    console.log(`- Base URL: ${this.baseUrl}`);
    console.log(`- Coordinates: ${lat},${lng}`);
    console.log(`- Date: ${date}`);
    console.log(`- API Key: ${this.apiKey.substring(0, 8)}...${this.apiKey.slice(-4)}`);
    console.log(`- Full Parameters: unitGroup=us&include=hours&contentType=json`);
    
    const response = await fetch(url);
    
    console.log(`\n📡 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      // Get the actual error message from Visual Crossing
      let errorText = 'Unknown error';
      try {
        errorText = await response.text();
        console.log(`📄 Error Response Body:`);
        console.log(errorText);
      } catch (e) {
        console.log('Could not read error response body');
      }
      
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded. Response: ${errorText}`);
      }
      throw new Error(`Weather API error: ${response.status} ${response.statusText}. Response: ${errorText}`);
    }
    
    const data: VisualCrossingResponse = await response.json();
    
    if (!data.days || data.days.length === 0) {
      throw new Error('No weather data returned');
    }
    
    const dayData = data.days[0];
    
    // Convert hourly data to our format
    const hourlyData = dayData.hours.map(hour => ({
      time: hour.datetime.substring(0, 5), // "09:00" from "09:00:00"
      temperature: Math.round(hour.temp),
      wind_speed: Math.round(hour.windspeed * 10) / 10, // Round to 1 decimal
      wind_direction: hour.winddir,
      wind_direction_text: this.degreesToCompass(hour.winddir),
      conditions: hour.conditions,
      humidity: hour.humidity,
      visibility: hour.visibility,
    }));
    
    // Generate summary
    const avgWindSpeed = hourlyData.reduce((sum, h) => sum + h.wind_speed, 0) / hourlyData.length;
    const avgTemp = hourlyData.reduce((sum, h) => sum + h.temperature, 0) / hourlyData.length;
    const conditions = hourlyData[12]?.conditions || hourlyData[0]?.conditions || 'Unknown'; // Use noon or first hour
    
    return {
      date: date,
      hourly_data: hourlyData,
      summary: `${conditions}, avg temp ${Math.round(avgTemp)}°F, avg wind ${Math.round(avgWindSpeed * 10) / 10} mph`,
      data_source: 'Visual Crossing Weather API',
    };
  }

  private async updateEventWeather(eventId: number, weatherData: EventWeatherData) {
    await db
      .update(schema.events)
      .set({
        weatherConditions: JSON.stringify(weatherData),
        temperature: weatherData.hourly_data[12]?.temperature || weatherData.hourly_data[0]?.temperature, // Use noon temp
        windSpeed: weatherData.hourly_data[12]?.wind_speed || weatherData.hourly_data[0]?.wind_speed, // Use noon wind
        windDirection: weatherData.hourly_data[12]?.wind_direction_text || weatherData.hourly_data[0]?.wind_direction_text,
        updatedAt: new Date(),
      })
      .where(eq(schema.events.id, eventId));
  }

  private degreesToCompass(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async printSummary() {
    console.log('\n📊 Weather Enrichment Summary:');
    console.log(`Total processed: ${this.processedCount}`);
    console.log(`Successfully enriched: ${this.successCount}`);
    console.log(`Errors: ${this.errorCount}`);
    console.log(`Final rate limit delay: ${this.rateLimitDelay}ms`);
    
    // Show sample of enriched events
    console.log('\n🌤️  Sample Weather Data:');
    const sampleEvents = await db
      .select({
        eventName: schema.events.name,
        venueName: schema.venues.name,
        temperature: schema.events.temperature,
        windSpeed: schema.events.windSpeed,
        windDirection: schema.events.windDirection,
      })
      .from(schema.events)
      .innerJoin(schema.venues, eq(schema.events.venueId, schema.venues.id))
      .where(sql`${schema.events.temperature} IS NOT NULL`) // Non-null temperature
      .limit(5);
    
    console.table(sampleEvents);
    
    // Count total events with weather data
    const totalWithWeatherResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.events)
      .where(sql`${schema.events.weatherConditions} IS NOT NULL`);
    
    const totalWithWeather = totalWithWeatherResult[0]?.count || 0;

    console.log(`\n📈 Total events with weather data: ${totalWithWeather}/250`);
  }
}

// CLI options for flexibility
async function main() {
  const enricher = new WeatherEnricher();
  
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const testMode = args.includes('--test');
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  
  if (testMode) {
    console.log('🧪 TEST MODE - Processing only 1 event to test API');
    // Get one event to test
    const testEvent = await db
      .select({
        eventId: schema.events.id,
        eventName: schema.events.name,
        eventDate: schema.events.scheduledStartTime,
        actualStartTime: schema.events.actualStartTime,
        latitude: schema.venues.latitude,
        longitude: schema.venues.longitude,
        city: schema.venues.city,
        state: schema.venues.state,
      })
      .from(schema.events)
      .innerJoin(schema.venues, eq(schema.events.venueId, schema.venues.id))
      .where(and(
        sql`${schema.venues.latitude} IS NOT NULL`,
        sql`${schema.events.name} NOT ILIKE '%virtual%'`
      ))
      .limit(1);
    
    if (testEvent.length > 0) {
      console.log(`Testing with: ${testEvent[0].eventName}`);
      console.log(`Coordinates: ${testEvent[0].latitude}, ${testEvent[0].longitude}`);
      await enricher.processEventWeather(testEvent[0]);
      console.log('✅ Test successful! API is working.');
    }
    return;
  }
  
  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No API calls will be made');
    await enricher.enrichAllEvents(true, limit);
    return;
  }
  
  if (limit) {
    console.log(`⚠️  LIMITED RUN - Processing only ${limit} events`);
  }
  
  await enricher.enrichAllEvents(false, limit);
  console.log('🎉 All done!');
  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('❌ Weather enrichment failed:', error);
  process.exit(1);
});