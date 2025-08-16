// scripts/import-2025-data.ts - Updated for v2 Schema with Raw Data + Performance Separation
import 'dotenv/config';
import fs from 'fs';
import { db } from '../app/lib/db.server';
import * as schema from '../app/lib/schema';
import { eq, sql, and } from 'drizzle-orm';

// Types based on your JSON structure
interface RaceResultsFile {
  results: RaceResult[];
}

interface RaceResult {
  event_id: string;
  event_url: string;
  event_title: string;
  event_date: string;
  year: string;
  organized_by: {
    email_ids: string[];
  };
  status: string;
  races?: Array<{
    name: string;
    categoryMultiplier: number;
    results: Array<{
      overall_place: string;
      division_place: string;
      name: string;
      number: string;
      age_group: string;
      gender: string;
      category: string;
      time: string;
      craft_type: string;
      ranking_place: number;
      points: number;
      race_name: string;
      event_id: string;
    }>;
  }>;
}

class DataImporter {
  private disciplineCache = new Map<string, number>();
  private categoryCache = new Map<string, number>();
  private venueCache = new Map<string, number>();
  private organizerCache = new Map<string, number>();
  private athleteCache = new Map<string, number>();
  private competitionCache = new Map<string, number>();

  async importData(filePath: string) {
    console.log('🚀 Starting import of 2025 race data with v2 schema...');
    
    // Read and parse the JSON file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data: RaceResultsFile = JSON.parse(fileContent);
    const raceResults = data.results;
    
    console.log(`📊 Found ${raceResults.length} race events to process`);
    
    // Filter for events that have results available
    const eventsWithResults = raceResults.filter(event => 
      event.status === "Results available" && event.races && event.races.length > 0
    );
    
    console.log(`🏁 Found ${eventsWithResults.length} events with actual results`);
    
    if (eventsWithResults.length === 0) {
      console.log('No events with results found. Exiting...');
      return;
    }
    
    // Step 1: Set up basic disciplines and categories
    await this.setupBasicData();
    
    // Step 2: Process each race event
    let processed = 0;
    for (const raceEvent of eventsWithResults) {
      try {
        await this.processRaceEvent(raceEvent);
        processed++;
        
        if (processed % 5 === 0) {
          console.log(`✅ Processed ${processed}/${eventsWithResults.length} events`);
        }
      } catch (error) {
        console.error(`❌ Error processing event ${raceEvent.event_id}:`, error);
        // Continue with next event rather than failing entirely
      }
    }
    
    console.log('🎉 Import completed!');
    await this.printSummary();
  }

  private async setupBasicData() {
    console.log('🔧 Setting up basic disciplines and categories...');
    
    // Create main disciplines
    const disciplines = [
      { name: 'SUP Distance', code: 'SUP_DISTANCE', raceType: 'DISTANCE' as const, courseType: 'OCEAN' as const, level: 'DISCIPLINE' as const },
      { name: 'SUP Sprint', code: 'SUP_SPRINT', raceType: 'SPRINT' as const, courseType: 'FLATWATER' as const, level: 'DISCIPLINE' as const },
      { name: 'Surfski Distance', code: 'SURFSKI_DISTANCE', raceType: 'DISTANCE' as const, courseType: 'OCEAN' as const, level: 'DISCIPLINE' as const },
      { name: 'Kayak Distance', code: 'KAYAK_DISTANCE', raceType: 'DISTANCE' as const, courseType: 'FLATWATER' as const, level: 'DISCIPLINE' as const },
      { name: 'Dragon Boat', code: 'DRAGON_BOAT', raceType: 'SPRINT' as const, courseType: 'FLATWATER' as const, level: 'DISCIPLINE' as const },
      { name: 'Outrigger Canoe Distance', code: 'OC_DISTANCE', raceType: 'DISTANCE' as const, courseType: 'OCEAN' as const, level: 'DISCIPLINE' as const },
      { name: 'Outrigger Canoe Sprint', code: 'OC_SPRINT', raceType: 'SPRINT' as const, courseType: 'FLATWATER' as const, level: 'DISCIPLINE' as const },
    ];

    for (const discipline of disciplines) {
      const existing = await db.select().from(schema.disciplines).where(eq(schema.disciplines.code, discipline.code));
      if (existing.length === 0) {
        const result = await db.insert(schema.disciplines).values(discipline).returning();
        this.disciplineCache.set(discipline.name, result[0].id);
      } else {
        this.disciplineCache.set(discipline.name, existing[0].id);
      }
    }

    // Create standard categories
    const categories = [
      { name: 'Open Men', code: 'OPEN_M', gender: 'MALE' as const },
      { name: 'Open Women', code: 'OPEN_F', gender: 'FEMALE' as const },
      { name: 'Open Mixed', code: 'OPEN_MIXED' },
      { name: 'Masters Men', code: 'MASTERS_M', gender: 'MALE' as const, minAge: 40 },
      { name: 'Masters Women', code: 'MASTERS_F', gender: 'FEMALE' as const, minAge: 40 },
    ];

    for (const category of categories) {
      const existing = await db.select().from(schema.categories).where(eq(schema.categories.code, category.code));
      if (existing.length === 0) {
        const result = await db.insert(schema.categories).values(category).returning();
        this.categoryCache.set(category.name, result[0].id);
      } else {
        this.categoryCache.set(category.name, existing[0].id);
      }
    }

    console.log('✅ Basic data setup complete');
  }

  private async processRaceEvent(raceEvent: RaceResult) {
    // Skip events without races data
    if (!raceEvent.races || raceEvent.races.length === 0) {
      console.log(`Skipping event ${raceEvent.event_id} - no races data`);
      return;
    }

    // Step 1: Create or get venue
    const venueId = await this.getOrCreateVenue(raceEvent);
    
    // Step 2: Create or get organizer
    const organizerId = await this.getOrCreateOrganizer(raceEvent);
    
    // Step 3: Create competition
    const competitionId = await this.getOrCreateCompetition(raceEvent, venueId, organizerId);
    
    // Step 4: Process each race within the event
    for (const race of raceEvent.races) {
      await this.processRace(raceEvent, race, competitionId);
    }
  }

  private async getOrCreateVenue(raceEvent: RaceResult): Promise<number> {
    const venueName = `Venue for ${raceEvent.event_title}`;
    
    if (this.venueCache.has(venueName)) {
      return this.venueCache.get(venueName)!;
    }

    const existing = await db.select().from(schema.venues).where(eq(schema.venues.name, venueName));
    if (existing.length > 0) {
      this.venueCache.set(venueName, existing[0].id);
      return existing[0].id;
    }

    const result = await db.insert(schema.venues).values({
      name: venueName,
      description: `Venue for ${raceEvent.event_title}`,
      venueType: 'OUTDOOR',
      country: 'USA', // Assume USA for now
    }).returning();

    this.venueCache.set(venueName, result[0].id);
    return result[0].id;
  }

  private async getOrCreateOrganizer(raceEvent: RaceResult): Promise<number> {
    const email = raceEvent.organized_by.email_ids[0] || 'unknown@example.com';
    
    if (this.organizerCache.has(email)) {
      return this.organizerCache.get(email)!;
    }

    const existing = await db.select().from(schema.organizations).where(eq(schema.organizations.email, email));
    if (existing.length > 0) {
      this.organizerCache.set(email, existing[0].id);
      return existing[0].id;
    }

    const result = await db.insert(schema.organizations).values({
      name: `Organizer (${email})`,
      email: email,
      description: 'Event organizer',
    }).returning();

    this.organizerCache.set(email, result[0].id);
    return result[0].id;
  }

  private async getOrCreateCompetition(raceEvent: RaceResult, venueId: number, organizerId: number): Promise<number> {
    if (this.competitionCache.has(raceEvent.event_id)) {
      return this.competitionCache.get(raceEvent.event_id)!;
    }

    // Check if competition exists by name and year
    const eventDate = new Date(raceEvent.event_date);
    const year = eventDate.getFullYear();
    
    const existing = await db.select()
      .from(schema.competitions)
      .where(eq(schema.competitions.name, raceEvent.event_title));
    
    if (existing.length > 0) {
      this.competitionCache.set(raceEvent.event_id, existing[0].id);
      return existing[0].id;
    }

    const competitionData = {
      name: raceEvent.event_title,
      year: year,
      startDate: eventDate,
      endDate: eventDate,
      status: raceEvent.status === 'Results available' ? 'COMPLETED' : 'SCHEDULED',
      level: this.inferCompetitionLevel(raceEvent.event_title),
      venueId: venueId,
      organizerId: organizerId,
      website: raceEvent.event_url,
    };
    
    console.log('Inserting competition with data:', competitionData);
    
    const result = await db.insert(schema.competitions).values(competitionData).returning();

    this.competitionCache.set(raceEvent.event_id, result[0].id);
    return result[0].id;
  }

  private async processRace(raceEvent: RaceResult, race: any, competitionId: number) {
    // Create event for this race
    const disciplineId = this.getDisciplineId(race.name, race.results[0]?.craft_type);
    const categoryId = this.getCategoryId(race.results[0]?.age_group, race.results[0]?.gender);
    
    const eventDate = new Date(raceEvent.event_date);
    const event = await db.insert(schema.events).values({
      name: race.name,
      description: `${race.name} - ${raceEvent.event_title}`,
      scheduledStartTime: eventDate,
      actualStartTime: eventDate,
      competitionId: competitionId,
      disciplineId: disciplineId,
      categoryId: categoryId,
    }).returning();

    // Process each result
    for (const result of race.results) {
      await this.processResult(result, event[0].id, disciplineId, categoryId, raceEvent);
    }
  }

  private async processResult(result: any, eventId: number, disciplineId: number, categoryId: number, raceEvent: RaceResult) {
    // Create or get athlete
    const athleteId = await this.getOrCreateAthlete(result);
    
    // ================================
    // CREATE PERFORMANCE RECORD (Our Calculations)
    // ================================
    const timeMs = this.parseTimeToMilliseconds(result.time);
    const overallPosition = this.parsePosition(result.overall_place);
    const divisionPosition = this.parseDivisionPosition(result.division_place);
    const rankingPlace = result.ranking_place; // This is the key field!
    
    const performance = await db.insert(schema.performances).values({
      athleteId: athleteId,
      disciplineId: disciplineId,
      categoryId: categoryId,
      
      // Calculated time performance
      timeMilliseconds: timeMs,
      
      // Calculated positions (our rankings)
      calculatedOverallPosition: overallPosition,
      calculatedDivisionPosition: divisionPosition,
      calculatedGenderPosition: rankingPlace, // Store ranking_place here for now
      
      // Our points/ranking system
      rankingPoints: result.points || null,
      performanceRating: result.points || null,
      
      // Performance classification
      isPodiumFinish: rankingPlace ? rankingPlace <= 3 : false,
      
      // Field strength
      fieldStrength: this.extractFieldStrength(result.division_place),
      
      // Data quality
      calculationVersion: 'v1.0',
      verified: true,
    }).returning();

    // ================================
    // CREATE RESULT RECORD (Raw Scraped Data)
    // ================================
    await db.insert(schema.results).values({
      athleteId: athleteId,
      eventId: eventId,
      performanceId: performance[0].id,
      
      // Raw scraped data (exactly as it appears on race website)
      overallPlace: result.overall_place,
      divisionPlace: result.division_place,
      rawName: result.name,
      bibNumber: result.number,
      rawAgeGroup: result.age_group,
      rawGender: result.gender,
      rawCategory: result.category,
      rawTime: result.time,
      rawCraftType: result.craft_type,
      
      // Source metadata (for audit trail)
      sourceEventId: result.event_id,
      sourceRaceName: result.race_name,
      sourceUrl: raceEvent.event_url,
      scrapedAt: new Date(),
      sourceSystem: 'paddleguru',
      
      // Status
      resultStatus: 'OFFICIAL',
      athleteVerified: false, // Athletes haven't verified yet
    });
  }

  private async getOrCreateAthlete(result: any): Promise<number> {
    const athleteName = result.name.trim();
    
    if (this.athleteCache.has(athleteName)) {
      return this.athleteCache.get(athleteName)!;
    }

    // Check if person exists by looking for matching first and last name
    const firstName = this.extractFirstName(athleteName);
    const lastName = this.extractLastName(athleteName);
    
    const existingPerson = await db.select()
      .from(schema.people)
      .where(and(
        eq(schema.people.firstName, firstName),
        eq(schema.people.lastName, lastName)
      ));
    
    if (existingPerson.length > 0) {
      // Check if this person has an athlete record
      const existingAthlete = await db.select()
        .from(schema.athletes)
        .where(eq(schema.athletes.personId, existingPerson[0].id));
      
      if (existingAthlete.length > 0) {
        this.athleteCache.set(athleteName, existingAthlete[0].id);
        return existingAthlete[0].id;
      }
    }

    // Create new person
    const person = await db.insert(schema.people).values({
      firstName: firstName,
      lastName: lastName,
      displayName: athleteName,
      gender: this.mapGender(result.gender),
    }).returning();

    // Create athlete
    const athlete = await db.insert(schema.athletes).values({
      personId: person[0].id,
      status: 'ACTIVE',
    }).returning();

    this.athleteCache.set(athleteName, athlete[0].id);
    return athlete[0].id;
  }

  // ================================
  // HELPER FUNCTIONS
  // ================================
  
  private getDisciplineId(raceName: string, craftType: string): number {
    if (craftType?.toLowerCase().includes('sup') || raceName.toLowerCase().includes('sup')) {
      return this.disciplineCache.get('SUP Distance') || 1;
    } else if (craftType?.toLowerCase().includes('surfski')) {
      return this.disciplineCache.get('Surfski Distance') || 1;
    } else if (craftType?.toLowerCase().includes('kayak')) {
      return this.disciplineCache.get('Kayak Distance') || 1;
    } else if (craftType?.toLowerCase().includes('oc') || raceName.toLowerCase().includes('outrigger')) {
      return this.disciplineCache.get('Outrigger Canoe Distance') || 1;
    } else if (craftType?.toLowerCase().includes('dragon')) {
      return this.disciplineCache.get('Dragon Boat') || 1;
    }
    return this.disciplineCache.get('SUP Distance') || 1; // Default
  }

  private getCategoryId(ageGroup: string, gender: string): number {
    if (gender?.toLowerCase() === 'male') {
      return this.categoryCache.get('Open Men') || 1;
    } else if (gender?.toLowerCase() === 'female') {
      return this.categoryCache.get('Open Women') || 1;
    }
    return this.categoryCache.get('Open Mixed') || 1;
  }

  private inferCompetitionLevel(title: string): "INTERNATIONAL" | "NATIONAL" | "REGIONAL" | "STATE" | "LOCAL" | "CLUB" {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('world') || lowerTitle.includes('international')) return 'INTERNATIONAL';
    if (lowerTitle.includes('national') || lowerTitle.includes('usa')) return 'NATIONAL';
    if (lowerTitle.includes('regional')) return 'REGIONAL';
    if (lowerTitle.includes('state')) return 'STATE';
    if (lowerTitle.includes('club')) return 'CLUB';
    return 'LOCAL'; // Default for events like "Return to the Pier 2025"
  }

  private mapGender(gender: string): "MALE" | "FEMALE" | "OTHER" | null {
    if (!gender) return null;
    const g = gender.toLowerCase();
    if (g === 'male' || g === 'm') return 'MALE';
    if (g === 'female' || g === 'f') return 'FEMALE';
    return 'OTHER';
  }

  private extractFirstName(fullName: string): string {
    return fullName.split(' ')[0];
  }

  private extractLastName(fullName: string): string {
    const parts = fullName.split(' ');
    return parts[parts.length - 1];
  }

  private parseTimeToMilliseconds(timeString: string): number {
    try {
      const parts = timeString.split(':');
      let totalMs = 0;
      
      if (parts.length === 3) {
        // HH:MM:SS.mmm
        const [hours, minutes, secondsStr] = parts;
        const seconds = parseFloat(secondsStr);
        totalMs = (parseInt(hours) * 3600 + parseInt(minutes) * 60 + seconds) * 1000;
      } else if (parts.length === 2) {
        // MM:SS.mmm
        const [minutes, secondsStr] = parts;
        const seconds = parseFloat(secondsStr);
        totalMs = (parseInt(minutes) * 60 + seconds) * 1000;
      }
      
      return Math.round(totalMs);
    } catch {
      return 0;
    }
  }

  private parsePosition(positionStr: string): number | null {
    try {
      const num = parseInt(positionStr);
      return isNaN(num) ? null : num;
    } catch {
      return null;
    }
  }

  private parseDivisionPosition(divisionStr: string): number | null {
    try {
      // Parse "1/3" format to get the position (1)
      const parts = divisionStr.split('/');
      if (parts.length > 0) {
        const position = parseInt(parts[0]);
        return isNaN(position) ? null : position;
      }
      return null;
    } catch {
      return null;
    }
  }

  private extractFieldStrength(divisionStr: string): number | null {
    try {
      // Parse "1/3" format to get the total field size (3)
      const parts = divisionStr.split('/');
      if (parts.length > 1) {
        const total = parseInt(parts[1]);
        return isNaN(total) ? null : total;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async printSummary() {
    console.log('\n📊 Import Summary:');
    
    try {
      const [competitions, events, athletes, results, performances] = await Promise.all([
        db.select().from(schema.competitions),
        db.select().from(schema.events),
        db.select().from(schema.athletes),
        db.select().from(schema.results),
        db.select().from(schema.performances),
      ]);

      console.log(`Competitions: ${competitions.length}`);
      console.log(`Events: ${events.length}`);
      console.log(`Athletes: ${athletes.length}`);
      console.log(`Results: ${results.length}`);
      console.log(`Performances: ${performances.length}`);
      
      // Show data separation working
      console.log('\n🔍 Data Separation Check:');
      const sampleResult = await db.select({
        rawTime: schema.results.rawTime,
        rawName: schema.results.rawName,
        calculatedPosition: schema.performances.calculatedOverallPosition,
        rankingPoints: schema.performances.rankingPoints,
      })
      .from(schema.results)
      .leftJoin(schema.performances, eq(schema.results.performanceId, schema.performances.id))
      .limit(3);
      
      console.table(sampleResult);
      
    } catch (error) {
      console.log('Could not generate summary:', error);
    }
  }
}

// Main execution
async function main() {
  const filePath = '/Users/grantcooper/Documents/code/sup-scrape/2025-test-collected_race_results.json';
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    console.log('Please place your JSON file in the project root');
    process.exit(1);
  }

  const importer = new DataImporter();
  await importer.importData(filePath);
  console.log('🎉 All done!');
  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});