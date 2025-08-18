// scripts/simple-weather-extract.ts
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { db } from '../app/lib/db.server';
import { events } from '../app/lib/schema';

console.log('Extracting weather data using database event matching...');

// Step 1: Get all events from current database
console.log('Step 1: Fetching events from current database...');
const currentEvents = await db.select({
  eventId: events.id,
  name: events.name,
  description: events.description,
  startDate: events.scheduledStartTime
}).from(events);

console.log(`Found ${currentEvents.length} events in current database`);

// Step 2: Read backup file and find weather data lines
console.log('Step 2: Reading backup file...');
const backupContent = readFileSync('backup_data.sql', 'utf8');

const weatherLines = backupContent
  .split('\n')
  .filter(line => line.includes('"data_source":"Visual Crossing Weather API"}'));

console.log(`Found ${weatherLines.length} events with weather data in backup`);

interface BackupWeatherRecord {
  name: string;
  description: string;
  startTime: string;
  weatherData: string;
  temperature?: number;
  windSpeed?: number;
  windDirection?: string;
}

// Parse backup weather lines
const backupWeatherRecords: BackupWeatherRecord[] = [];

weatherLines.forEach((line, index) => {
  try {
    const valuesMatch = line.match(/VALUES \((.*)\);/);
    if (!valuesMatch) return;
    
    const values = valuesMatch[1];
    
    // Parse the line carefully
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let braceDepth = 0;
    
    for (let i = 0; i < values.length; i++) {
      const char = values[i];
      
      if (char === "'" && values[i-1] !== '\\') {
        inQuotes = !inQuotes;
      }
      
      if (char === '{' && inQuotes) braceDepth++;
      if (char === '}' && inQuotes) braceDepth--;
      
      if (char === ',' && !inQuotes && braceDepth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());
    
    // Extract the fields we need
    const name = parts[7]?.replace(/^'|'$/g, '') || '';
    const startTime = parts[10]?.replace(/^'|'$/g, '') || '';
    
    // Find description 
    let description = '';
    for (let i = 20; i < 30; i++) {
      if (parts[i] && parts[i].includes(' - ') && !parts[i].includes('"date":')) {
        description = parts[i].replace(/^'|'$/g, '');
        break;
      }
    }
    
    // Find weather data and extract summary fields
    const weatherIndex = parts.findIndex(part => part.includes('"data_source":"Visual Crossing Weather API"'));
    if (weatherIndex === -1) return;
    
    const weatherData = parts[weatherIndex].replace(/^'|'$/g, '');
    
    // Extract summary weather fields that come after the JSON
    // Structure: ..., weather_json, water_conditions, temperature, wind_speed, wind_direction, ...
    const temperature = weatherIndex + 2 < parts.length ? parseFloat(parts[weatherIndex + 2]) : undefined;
    const windSpeed = weatherIndex + 3 < parts.length ? parseFloat(parts[weatherIndex + 3]) : undefined;
    const windDirection = weatherIndex + 4 < parts.length ? parts[weatherIndex + 4]?.replace(/^'|'$/g, '') : undefined;
    
    // Debug logging for first few records
    if (index < 3) {
      console.log(`Debug: ${name}`);
      console.log(`  Weather index: ${weatherIndex}, Total parts: ${parts.length}`);
      console.log(`  Parts after weather: ${parts.slice(weatherIndex + 1, weatherIndex + 6).join(' | ')}`);
      console.log(`  Extracted - temp: ${temperature}, wind_speed: ${windSpeed}, wind_dir: ${windDirection}`);
    }
    
    backupWeatherRecords.push({
      name,
      description,
      startTime: startTime.split(' ')[0], // Just the date
      weatherData,
      temperature: isNaN(temperature!) ? undefined : temperature,
      windSpeed: isNaN(windSpeed!) ? undefined : windSpeed,
      windDirection: windDirection === 'NULL' ? undefined : windDirection
    });
    
  } catch (error) {
    console.log(`Error parsing backup line ${index + 1}:`, (error as Error).message);
  }
});

console.log(`Parsed ${backupWeatherRecords.length} weather records from backup`);

// Step 3: Match current events with backup weather data
console.log('Step 3: Matching events with weather data...');

interface MatchedUpdate {
  eventId: number;
  eventName: string;
  weatherData: string;
  temperature?: number;
  windSpeed?: number;
  windDirection?: string;
}

const matchedUpdates: MatchedUpdate[] = [];

for (const currentEvent of currentEvents) {
  // Find matching weather record in backup
  const matchingWeather = backupWeatherRecords.find(backup => 
    backup.name === currentEvent.name &&
    backup.description === currentEvent.description &&
    backup.startTime === currentEvent.startDate.toISOString().split('T')[0]
  );
  
  if (matchingWeather) {
    matchedUpdates.push({
      eventId: currentEvent.eventId,
      eventName: currentEvent.name,
      weatherData: matchingWeather.weatherData,
      temperature: matchingWeather.temperature,
      windSpeed: matchingWeather.windSpeed,
      windDirection: matchingWeather.windDirection
    });
    console.log(`✅ Matched: ${currentEvent.name} (event_id: ${currentEvent.eventId}) - temp: ${matchingWeather.temperature}°F, wind: ${matchingWeather.windSpeed} mph ${matchingWeather.windDirection}`);
  }
}

// Step 4: Generate UPDATE statements using event_id
const sqlUpdates = matchedUpdates.map(update => {
  const safeWeatherData = update.weatherData.replace(/'/g, "''");
  
  let updateFields = [`weather_conditions = '${safeWeatherData}'`];
  
  if (update.temperature !== undefined) {
    updateFields.push(`temperature = ${update.temperature}`);
  }
  if (update.windSpeed !== undefined) {
    updateFields.push(`wind_speed = ${update.windSpeed}`);
  }
  if (update.windDirection !== undefined) {
    updateFields.push(`wind_direction = '${update.windDirection}'`);
  }
  
  return `-- ${update.eventName} (temp: ${update.temperature || 'N/A'}°F, wind: ${update.windSpeed || 'N/A'} mph ${update.windDirection || 'N/A'})
UPDATE events 
SET ${updateFields.join(', ')}
WHERE event_id = ${update.eventId};`;
}).join('\n\n');

// Write to file
const outputSql = `-- Weather data updates using event_id from current database
-- Generated on ${new Date().toISOString()}
-- Matched ${matchedUpdates.length} events by name + description + date
-- Updates weather_conditions + temperature + wind_speed + wind_direction

${sqlUpdates}
`;

writeFileSync('weather_updates_by_current_id.sql', outputSql);

// Create summary with weather details
const summary = matchedUpdates.map(update => 
  `event_id ${update.eventId}: ${update.eventName} (${update.temperature || 'N/A'}°F, ${update.windSpeed || 'N/A'} mph ${update.windDirection || 'N/A'})`
).join('\n');

writeFileSync('weather_summary_by_current_id.txt', `Weather extraction using current database IDs:\n\nTotal matched: ${matchedUpdates.length} of ${currentEvents.length} events\n\n${summary}`);

console.log('Weather updates written to weather_updates_by_current_id.sql');
console.log('Summary written to weather_summary_by_current_id.txt');
console.log(`\nSuccessfully matched ${matchedUpdates.length} of ${currentEvents.length} current events`);
console.log(`Temperature data: ${matchedUpdates.filter(u => u.temperature !== undefined).length} events`);
console.log(`Wind speed data: ${matchedUpdates.filter(u => u.windSpeed !== undefined).length} events`);
console.log(`Wind direction data: ${matchedUpdates.filter(u => u.windDirection !== undefined).length} events`);
console.log(`Apply with: psql -d athlete-performance -f weather_updates_by_current_id.sql`);