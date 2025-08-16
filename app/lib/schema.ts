// Complete Schema v2 with Raw Data + Performance Separation
// app/lib/schema.ts

import { pgTable, text, varchar, integer, serial, timestamp, date, boolean, real, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ================================
// ENUMS
// ================================
export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'OTHER']);
export const athleteStatusEnum = pgEnum('athlete_status', ['ACTIVE', 'INACTIVE', 'RETIRED', 'SUSPENDED']);
export const competitionStatusEnum = pgEnum('competition_status', ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const competitionLevelEnum = pgEnum('competition_level', ['INTERNATIONAL', 'NATIONAL', 'REGIONAL', 'STATE', 'LOCAL', 'CLUB']);
export const disciplineLevelEnum = pgEnum('discipline_level', ['SPORT', 'DISCIPLINE', 'SUB_DISCIPLINE', 'EVENT_TYPE']);
export const raceTypeEnum = pgEnum('race_type', ['SPRINT', 'DISTANCE', 'MARATHON', 'TECHNICAL', 'RELAY']);
export const courseTypeEnum = pgEnum('course_type', ['FLATWATER', 'OCEAN', 'RIVER', 'SURF', 'HARBOR']);
export const venueTypeEnum = pgEnum('venue_type', ['INDOOR', 'OUTDOOR', 'SEMI_COVERED']);
export const resultStatusEnum = pgEnum('result_status', ['PROVISIONAL', 'UNOFFICIAL', 'OFFICIAL']);

// ================================
// CORE TABLES
// ================================

export const people = pgTable('people', {
  id: serial('person_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Basic Information
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  
  // Demographics
  dateOfBirth: date('date_of_birth'),
  gender: genderEnum('gender'),
  nationality: varchar('nationality', { length: 100 }),
  
  // Contact Information
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  
  // Address
  street: varchar('street', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }),
  
  // Metadata
  isVerified: boolean('is_verified').default(false),
  notes: text('notes'),
});

export const organizations = pgTable('organizations', {
  id: serial('organization_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),
  abbreviation: varchar('abbreviation', { length: 20 }),
  type: varchar('type', { length: 100 }),
  
  // Contact Information
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 500 }),
  
  // Address
  street: varchar('street', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }),
  
  isActive: boolean('is_active').default(true),
  description: text('description'),
});

export const athletes = pgTable('athletes', {
  id: serial('athlete_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Link to person
  personId: integer('person_id').references(() => people.id).notNull(),
  
  // Athletic Information
  athleteNumber: varchar('athlete_number', { length: 50 }),
  status: athleteStatusEnum('status').default('ACTIVE').notNull(),
  
  // Competitive Information
  primaryDisciplineId: integer('primary_discipline_id').references(() => disciplines.id),
  homeOrganizationId: integer('home_organization_id').references(() => organizations.id),
  
  // Career Information
  professionalDebut: date('professional_debut'),
  retirement: date('retirement'),
  
  // Social Media & Web Presence
  website: varchar('website', { length: 500 }),
  instagram: varchar('instagram', { length: 100 }),
  facebook: varchar('facebook', { length: 100 }),
  twitter: varchar('twitter', { length: 100 }),
  
  // Metadata
  biography: text('biography'),
  achievements: text('achievements'),
  sponsorships: text('sponsorships'),
  isVerified: boolean('is_verified').default(false),
});

export const venues = pgTable('venues', {
  id: serial('venue_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Basic Information
  name: varchar('name', { length: 255 }).notNull(),
  shortName: varchar('short_name', { length: 100 }),
  venueType: venueTypeEnum('venue_type'),
  
  // Location
  street: varchar('street', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }),
  
  // Geographic Coordinates
  latitude: real('latitude'),
  longitude: real('longitude'),
  elevation: real('elevation'),
  
  // Facility Information
  capacity: integer('capacity'),
  facilities: text('facilities'),
  accessibility: text('accessibility'),
  
  // Contact & Web
  website: varchar('website', { length: 500 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  
  isActive: boolean('is_active').default(true),
  description: text('description'),
});

export const disciplines = pgTable('disciplines', {
  id: serial('discipline_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Hierarchy
  parentId: integer('parent_id'),
  level: disciplineLevelEnum('level').notNull(),
  
  // Basic Information
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).unique(),
  shortName: varchar('short_name', { length: 100 }),
  
  // Classification
  raceType: raceTypeEnum('race_type'),
  courseType: courseTypeEnum('course_type'),
  
  // Technical Specifications
  standardDistance: real('standard_distance'),
  distanceUnit: varchar('distance_unit', { length: 20 }),
  equipmentRequirements: text('equipment_requirements'),
  rules: text('rules'),
  
  // Metadata
  description: text('description'),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order'),
});

export const categories = pgTable('categories', {
  id: serial('category_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Basic Information
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).unique(),
  shortName: varchar('short_name', { length: 100 }),
  
  // Classification Criteria
  gender: genderEnum('gender'),
  minAge: integer('min_age'),
  maxAge: integer('max_age'),
  
  // Equipment & Rules
  equipmentRestrictions: text('equipment_restrictions'),
  eligibilityRules: text('eligibility_rules'),
  
  // Metadata
  description: text('description'),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order'),
});

export const competitions = pgTable('competitions', {
  id: serial('competition_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Basic Information
  name: varchar('name', { length: 255 }).notNull(),
  shortName: varchar('short_name', { length: 100 }),
  year: integer('year').notNull(),
  
  // Dates
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  registrationDeadline: date('registration_deadline'),
  
  // Location & Organization
  venueId: integer('venue_id').references(() => venues.id),
  organizerId: integer('organizer_id').references(() => organizations.id),
  
  // Competition Details
  level: competitionLevelEnum('level').notNull(),
  status: competitionStatusEnum('status').default('SCHEDULED').notNull(),
  
  // Technical Information
  sanctioningBody: varchar('sanctioning_body', { length: 255 }),
  competitionRules: text('competition_rules'),
  weatherConditions: text('weather_conditions'),
  waterConditions: text('water_conditions'),
  
  // Financial
  entryFee: real('entry_fee'),
  prizeMoney: real('prize_money'),
  currency: varchar('currency', { length: 10 }),
  
  // Web & Contact
  website: varchar('website', { length: 500 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  registrationUrl: varchar('registration_url', { length: 500 }),
  
  // Metadata
  description: text('description'),
  notes: text('notes'),
  isPublic: boolean('is_public').default(true),
});

export const events = pgTable('events', {
  id: serial('event_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Links
  competitionId: integer('competition_id').references(() => competitions.id).notNull(),
  disciplineId: integer('discipline_id').references(() => disciplines.id).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  venueId: integer('venue_id').references(() => venues.id),
  
  // Event Information
  name: varchar('name', { length: 255 }).notNull(),
  shortName: varchar('short_name', { length: 100 }),
  eventNumber: varchar('event_number', { length: 50 }),
  
  // Timing
  scheduledStartTime: timestamp('scheduled_start_time'),
  actualStartTime: timestamp('actual_start_time'),
  status: varchar('status', { length: 50 }).default('SCHEDULED'),
  
  // Course Details
  distance: real('distance'),
  distanceUnit: varchar('distance_unit', { length: 20 }),
  courseDescription: text('course_description'),
  
  // Conditions
  weatherConditions: text('weather_conditions'),
  waterConditions: text('water_conditions'),
  temperature: real('temperature'),
  windSpeed: real('wind_speed'),
  windDirection: varchar('wind_direction', { length: 50 }),
  
  // Entry Information
  maxEntries: integer('max_entries'),
  entryFee: real('entry_fee'),
  
  // Technical
  timingMethod: varchar('timing_method', { length: 100 }),
  scoringMethod: varchar('scoring_method', { length: 100 }),
  
  // Metadata
  description: text('description'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
});

// ================================
// UPDATED RESULTS TABLE - Raw Scraped Data
// ================================
export const results = pgTable('results', {
  id: serial('result_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Foreign Keys
  athleteId: integer('athlete_id').references(() => athletes.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  performanceId: integer('performance_id').references(() => performances.id),
  
  // ================================
  // RAW SCRAPED DATA (Source of Truth for Athletes)
  // ================================
  
  // Raw Positions (exactly as shown on race website)
  overallPlace: varchar('overall_place', { length: 10 }),      // "43", "DNF", "DSQ"
  divisionPlace: varchar('division_place', { length: 20 }),    // "1/3", "2/14", "DQ"
  
  // Raw Participant Info
  rawName: varchar('raw_name', { length: 255 }),               // "Thomas Gallagher" (as scraped)
  bibNumber: varchar('bib_number', { length: 50 }),            // "115"
  
  // Raw Demographics (as categorized by race organizer)
  rawAgeGroup: varchar('raw_age_group', { length: 100 }),      // "Golden Master 60+"
  rawGender: varchar('raw_gender', { length: 20 }),            // "male", "female"
  rawCategory: varchar('raw_category', { length: 100 }),       // "SUP 14", "Surfski Open"
  
  // Raw Performance Data
  rawTime: varchar('raw_time', { length: 50 }),                // "01:05:36.00" (exactly as displayed)
  rawCraftType: varchar('raw_craft_type', { length: 50 }),     // "SUP", "Surfski" (as categorized by organizer)
  
  // ================================
  // SOURCE METADATA (for audit trail)
  // ================================
  sourceEventId: varchar('source_event_id', { length: 100 }),  // "EV-20250111-2924"
  sourceRaceName: varchar('source_race_name', { length: 255 }), // "Return to the Pier 2025 Short Course"
  sourceUrl: varchar('source_url', { length: 500 }),           // URL to original result
  scrapedAt: timestamp('scraped_at'),                          // When we scraped this data
  sourceSystem: varchar('source_system', { length: 50 }),      // "paddleguru", "webscorer", etc.
  
  // ================================
  // BASIC STATUS (for data quality)
  // ================================
  resultStatus: resultStatusEnum('result_status').default('PROVISIONAL').notNull(),
  dataQualityFlags: text('data_quality_flags'),               // JSON array of any data issues
  athleteVerified: boolean('athlete_verified').default(false), // Has athlete confirmed this result?
  
  // Legacy fields (will be deprecated)
  startTime: timestamp('start_time'),
  finishTime: timestamp('finish_time'),
});

// ================================
// NEW PERFORMANCES TABLE - Our Calculated Analytics
// ================================
export const performances = pgTable('performances', {
  id: serial('performance_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Links to normalized entities
  athleteId: integer('athlete_id').references(() => athletes.id).notNull(),
  disciplineId: integer('discipline_id').references(() => disciplines.id).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  
  // ================================
  // NORMALIZED PERFORMANCE DATA (Our calculations)
  // ================================
  
  // Calculated Time Performance
  timeMilliseconds: integer('time_milliseconds'),              // Parsed from rawTime for calculations
  adjustedTime: integer('adjusted_time_milliseconds'),         // Time adjusted for conditions
  
  // Calculated Positions (our rankings)
  calculatedOverallPosition: integer('calculated_overall_position'),
  calculatedDivisionPosition: integer('calculated_division_position'),
  calculatedGenderPosition: integer('calculated_gender_position'),
  
  // Our Points/Ranking System
  rankingPoints: real('ranking_points'),                       // Our points system (1100, 1050, etc.)
  difficultyMultiplier: real('difficulty_multiplier'),         // Based on conditions, field strength
  performanceRating: real('performance_rating'),               // Our calculated performance score
  
  // Performance Classification
  isPersonalBest: boolean('is_personal_best').default(false),
  isSeasonBest: boolean('is_season_best').default(false),
  isPodiumFinish: boolean('is_podium_finish').default(false), // Top 3 in division
  
  // Conditions & Context (for analytics)
  weatherConditions: text('weather_conditions'),               // Weather data if available
  waterConditions: text('water_conditions'),                  // Current, tide, etc.
  fieldStrength: integer('field_strength'),                   // Number of competitors in division
  
  // Data Quality & Verification
  calculationVersion: varchar('calculation_version', { length: 20 }), // Version of our calculation logic
  verified: boolean('verified').default(false),
  verifiedBy: varchar('verified_by', { length: 255 }),        // Who verified this performance
  verificationDate: timestamp('verification_date'),
});

// ================================
// NEW: DIVISIONS TABLE (Optional - for better normalization)
// ================================
export const divisions = pgTable('divisions', {
  id: serial('division_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  
  // Division Definition
  name: varchar('name', { length: 255 }).notNull(),            // "SUP Distance - Masters Men 60+"
  code: varchar('code', { length: 100 }).unique(),             // "SUP_DIST_M60"
  
  // Components
  disciplineId: integer('discipline_id').references(() => disciplines.id),
  categoryId: integer('category_id').references(() => categories.id),
  
  // Raw Mapping (to map back to source categories)
  rawCategoryPatterns: text('raw_category_patterns'),          // JSON array of patterns that match this division
  
  // Division Rules
  description: text('description'),
  eligibilityRules: text('eligibility_rules'),                 // JSON with age ranges, equipment rules, etc.
  
  isActive: boolean('is_active').default(true),
});

// ================================
// RELATIONS
// ================================

export const peopleRelations = relations(people, ({ many }) => ({
  athletes: many(athletes),
}));

export const athletesRelations = relations(athletes, ({ one, many }) => ({
  person: one(people, {
    fields: [athletes.personId],
    references: [people.id],
  }),
  primaryDiscipline: one(disciplines, {
    fields: [athletes.primaryDisciplineId],
    references: [disciplines.id],
  }),
  homeOrganization: one(organizations, {
    fields: [athletes.homeOrganizationId],
    references: [organizations.id],
  }),
  results: many(results),
  performances: many(performances),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  athletes: many(athletes),
  competitions: many(competitions),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  competitions: many(competitions),
  events: many(events),
}));

export const disciplinesRelations = relations(disciplines, ({ one, many }) => ({
  parent: one(disciplines, {
    fields: [disciplines.parentId],
    references: [disciplines.id],
    relationName: "disciplineHierarchy"
  }),
  children: many(disciplines, {
    relationName: "disciplineHierarchy"
  }),
  athletes: many(athletes),
  events: many(events),
  performances: many(performances),
  divisions: many(divisions),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  events: many(events),
  performances: many(performances),
  divisions: many(divisions),
}));

export const competitionsRelations = relations(competitions, ({ one, many }) => ({
  venue: one(venues, {
    fields: [competitions.venueId],
    references: [venues.id],
  }),
  organizer: one(organizations, {
    fields: [competitions.organizerId],
    references: [organizations.id],
  }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  competition: one(competitions, {
    fields: [events.competitionId],
    references: [competitions.id],
  }),
  discipline: one(disciplines, {
    fields: [events.disciplineId],
    references: [disciplines.id],
  }),
  category: one(categories, {
    fields: [events.categoryId],
    references: [categories.id],
  }),
  venue: one(venues, {
    fields: [events.venueId],
    references: [venues.id],
  }),
  results: many(results),
}));

export const resultsRelations = relations(results, ({ one }) => ({
  athlete: one(athletes, {
    fields: [results.athleteId],
    references: [athletes.id],
  }),
  event: one(events, {
    fields: [results.eventId],
    references: [events.id],
  }),
  performance: one(performances, {
    fields: [results.performanceId],
    references: [performances.id],
  }),
}));

export const performancesRelations = relations(performances, ({ one, many }) => ({
  athlete: one(athletes, {
    fields: [performances.athleteId],
    references: [athletes.id],
  }),
  discipline: one(disciplines, {
    fields: [performances.disciplineId],
    references: [disciplines.id],
  }),
  category: one(categories, {
    fields: [performances.categoryId],
    references: [categories.id],
  }),
  results: many(results),
}));

export const divisionsRelations = relations(divisions, ({ one }) => ({
  discipline: one(disciplines, {
    fields: [divisions.disciplineId],
    references: [disciplines.id],
  }),
  category: one(categories, {
    fields: [divisions.categoryId],
    references: [categories.id],
  }),
}));