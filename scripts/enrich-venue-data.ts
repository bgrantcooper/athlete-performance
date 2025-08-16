// scripts/enrich-venue-data.ts
import 'dotenv/config';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from '../app/lib/db.server';
import * as schema from '../app/lib/schema';
import { eq } from 'drizzle-orm';

interface VenueCSVRow {
  Event_Id: string;
  Event_URL: string;
  Event_Title: string;
  Event_startDate: string;
  Location_formattedAddress: string;
  Location_Latitude: string;
  Location_Longitude: string;
  Location_Location: string;
  Location_Name: string;
  Location_countryCode: string;
  State_countryCode: string;
  State_Code: string;
  State_Name: string;
}

class VenueEnricher {
  private venueCache = new Map<string, number>();
  private processedCount = 0;
  private updatedCount = 0;
  private skippedCount = 0;

  async enrichVenues(csvFilePath: string) {
    console.log('🏗️  Starting venue data enrichment...');
    
    // Read and parse the CSV file
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    const venueData: VenueCSVRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });
    
    console.log(`📊 Found ${venueData.length} venue records to process`);
    
    for (const row of venueData) {
      try {
        await this.processVenueRow(row);
        this.processedCount++;
        
        if (this.processedCount % 10 === 0) {
          console.log(`✅ Processed ${this.processedCount}/${venueData.length} venues`);
        }
      } catch (error) {
        console.error(`❌ Error processing venue for ${row.Event_URL}:`, error);
      }
    }
    
    console.log('🎉 Venue enrichment completed!');
    await this.printSummary();
  }

  private async processVenueRow(row: VenueCSVRow) {
    // Step 1: Find competition by website URL
    const competition = await db
      .select({
        id: schema.competitions.id,
        venueId: schema.competitions.venueId,
        name: schema.competitions.name,
      })
      .from(schema.competitions)
      .where(eq(schema.competitions.website, row.Event_URL))
      .limit(1);

    if (competition.length === 0) {
      console.log(`⚠️  No competition found for URL: ${row.Event_URL}`);
      this.skippedCount++;
      return;
    }

    const comp = competition[0];
    if (!comp.venueId) {
      console.log(`⚠️  Competition "${comp.name}" has no venue_id`);
      this.skippedCount++;
      return;
    }

    // Step 2: Parse location data from CSV
    const locationData = this.parseLocationData(row);
    
    // Step 3: Update venue with enriched data
    await this.updateVenue(comp.venueId, locationData, comp.name);
    this.updatedCount++;
  }

  private parseLocationData(row: VenueCSVRow) {
    // Parse formatted address into components
    const formattedAddress = row.Location_formattedAddress;
    const addressParts = this.parseFormattedAddress(formattedAddress);
    
    return {
      name: row.Location_Name || formattedAddress, // Use Location_Name, fallback to formatted address
      latitude: parseFloat(row.Location_Latitude),
      longitude: parseFloat(row.Location_Longitude),
      street: addressParts.street,
      city: addressParts.city,
      state: row.State_Code, // Use State_Code (e.g., "CA", "OR")
      postalCode: addressParts.postalCode,
      country: row.Location_countryCode, // "US"
      formattedAddress: formattedAddress,
    };
  }

  private parseFormattedAddress(address: string) {
    // Parse "West Beach, Santa Barbara, CA 93109, USA"
    // or "487 Seaport Ct, Redwood City, CA 94063, USA"
    
    const parts = address.split(', ');
    let street = '';
    let city = '';
    let postalCode = '';
    
    if (parts.length >= 4) {
      // Format: "Street, City, State Zip, Country"
      street = parts.slice(0, -3).join(', '); // Everything before last 3 parts
      city = parts[parts.length - 3];
      
      // Extract postal code from "CA 93109" or "OR 97231"
      const stateZip = parts[parts.length - 2];
      const zipMatch = stateZip.match(/\b(\d{5}(-\d{4})?)\b/);
      if (zipMatch) {
        postalCode = zipMatch[1];
      }
    } else if (parts.length >= 2) {
      // Simpler format: "City, State, Country"
      city = parts[0];
    }
    
    return {
      street: street || null,
      city: city || null,
      postalCode: postalCode || null,
    };
  }

  private async updateVenue(venueId: number, locationData: any, competitionName: string) {
    // Update venue with location data
    await db
      .update(schema.venues)
      .set({
        name: locationData.name,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        street: locationData.street,
        city: locationData.city,
        state: locationData.state,
        postalCode: locationData.postalCode,
        country: locationData.country,
        description: `Venue for ${competitionName}. Address: ${locationData.formattedAddress}`,
        venueType: 'OUTDOOR', // Assume outdoor for paddle sports
        updatedAt: new Date(),
      })
      .where(eq(schema.venues.id, venueId));

    console.log(`🏗️  Updated venue ${venueId}: ${locationData.name} (${locationData.city}, ${locationData.state})`);
  }

  private async printSummary() {
    console.log('\n📊 Venue Enrichment Summary:');
    console.log(`Total processed: ${this.processedCount}`);
    console.log(`Successfully updated: ${this.updatedCount}`);
    console.log(`Skipped (no match/venue): ${this.skippedCount}`);
    
    // Show sample of updated venues
    console.log('\n🏟️  Sample Updated Venues:');
    const sampleVenues = await db
      .select({
        id: schema.venues.id,
        name: schema.venues.name,
        city: schema.venues.city,
        state: schema.venues.state,
        latitude: schema.venues.latitude,
        longitude: schema.venues.longitude,
      })
      .from(schema.venues)
      .where(eq(schema.venues.latitude, schema.venues.latitude)) // Non-null latitude
      .limit(5);
    
    console.table(sampleVenues);
    
    // Show competitions with enriched venue data
    console.log('\n🏁 Competitions with Venue Data:');
    const enrichedCompetitions = await db
      .select({
        competition: schema.competitions.name,
        venue: schema.venues.name,
        city: schema.venues.city,
        state: schema.venues.state,
        coordinates: schema.venues.latitude,
      })
      .from(schema.competitions)
      .innerJoin(schema.venues, eq(schema.competitions.venueId, schema.venues.id))
      .where(eq(schema.venues.latitude, schema.venues.latitude)) // Non-null latitude
      .limit(5);
    
    console.table(enrichedCompetitions);
  }
}

// Main execution
async function main() {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.error('❌ Please provide CSV file path as argument');
    console.log('Usage: npm run tsx scripts/enrich-venue-data.ts path/to/venue-data.csv');
    process.exit(1);
  }
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  const enricher = new VenueEnricher();
  await enricher.enrichVenues(csvFilePath);
  console.log('🎉 All done!');
  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('❌ Venue enrichment failed:', error);
  process.exit(1);
});