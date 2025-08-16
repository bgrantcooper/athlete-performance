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
// CORE PEOPLE & ORGANIZATIONS
// ================================

export const people = pgTable('people', {
  id: serial('person_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Basic Information
  identifier: varchar('identifier', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  familyName: varchar('family_name', { length: 255 }),
  givenName: varchar('given_name', { length: 255 }),
  alternateName: varchar('alternate_name', { length: 255 }),
  
  // Contact
  email: varchar('email', { length: 255 }).unique(),
  
  // Demographics
  gender: genderEnum('gender'),
  birthDate: date('birth_date'),
  nationality: varchar('nationality', { length: 3 }), // ISO 3166-1 alpha-3
  
  // Physical (for paddle sports)
  height: real('height'), // meters
  weight: real('weight'), // kilograms
});

export const organizations = pgTable('organizations', {
  id: serial('organization_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  identifier: varchar('identifier', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  alternateName: varchar('alternate_name', { length: 255 }),
  description: text('description'),
  email: varchar('email', { length: 255 }),
  url: varchar('url', { length: 500 }),
});

export const athletes = pgTable('athletes', {
  id: serial('athlete_id').primaryKey(),
  personId: integer('person_id').references(() => people.id).notNull(),
  neonUserId: varchar('neon_user_id', { length: 255 }).unique(), // Link to Neon Auth
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  status: athleteStatusEnum('status').default('ACTIVE').notNull(),
  clubId: integer('club_id').references(() => organizations.id),
});

// ================================
// DISCIPLINES & CATEGORIES
// ================================

export const disciplines = pgTable('disciplines', {
  id: serial('discipline_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  name: varchar('name', { length: 255 }).unique().notNull(),
  code: varchar('code', { length: 100 }).unique(),
  description: text('description'),
  
  // Hierarchy
  parentDisciplineId: integer('parent_discipline_id'),
  disciplineLevel: disciplineLevelEnum('discipline_level').default('SPORT').notNull(),
  
  // Course Specifications
  distanceMeters: real('distance_meters'),
  raceType: raceTypeEnum('race_type').notNull(),
  courseType: courseTypeEnum('course_type'),
});

export const categories = pgTable('categories', {
  id: serial('category_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  name: varchar('name', { length: 255 }).unique().notNull(),
  code: varchar('code', { length: 100 }).unique(),
  description: text('description'),
  
  // Eligibility
  requiredGender: genderEnum('required_gender'),
  requiredMinAge: integer('required_min_age'),
  requiredMaxAge: integer('required_max_age'),
});

// ================================
// VENUES & LOCATIONS
// ================================

export const venues = pgTable('venues', {
  id: serial('venue_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  venueType: venueTypeEnum('venue_type').notNull(),
  
  // Location
  city: varchar('city', { length: 255 }),
  state: varchar('state', { length: 255 }),
  country: varchar('country', { length: 3 }), // ISO 3166-1 alpha-3
  latitude: real('latitude'),
  longitude: real('longitude'),
  timezone: varchar('timezone', { length: 100 }),
});

// ================================
// COMPETITIONS & EVENTS
// ================================

export const competitions = pgTable('competitions', {
  id: serial('competition_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  identifier: varchar('identifier', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Dates
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  
  // Classification
  status: competitionStatusEnum('status').default('SCHEDULED').notNull(),
  level: competitionLevelEnum('level').default('LOCAL').notNull(),
  
  // Location & Organization
  venueId: integer('venue_id').references(() => venues.id),
  organizerId: integer('organizer_id').references(() => organizations.id).notNull(),
});

export const events = pgTable('events', {
  id: serial('event_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Timing
  scheduledStartTime: timestamp('scheduled_start_time').notNull(),
  actualStartTime: timestamp('actual_start_time'),
  
  // Classification
  competitionId: integer('competition_id').references(() => competitions.id).notNull(),
  disciplineId: integer('discipline_id').references(() => disciplines.id).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
});

// ================================
// RESULTS & PERFORMANCES
// ================================

export const performances = pgTable('performances', {
  id: serial('performance_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  athleteId: integer('athlete_id').references(() => athletes.id).notNull(),
  disciplineId: integer('discipline_id').references(() => disciplines.id).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  
  // Performance Data
  time: varchar('time', { length: 20 }), // "HH:MM:SS.mmm"
  timeMilliseconds: integer('time_milliseconds'),
  distance: real('distance'), // meters
  
  // Record flags
  isPersonalBest: boolean('is_personal_best').default(false).notNull(),
  isSeasonBest: boolean('is_season_best').default(false).notNull(),
  
  // Verification
  verified: boolean('verified').default(false).notNull(),
});

export const results = pgTable('results', {
  id: serial('result_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Context
  athleteId: integer('athlete_id').references(() => athletes.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  performanceId: integer('performance_id').references(() => performances.id),
  
  // Result Information
  position: integer('position'),
  bibNumber: varchar('bib_number', { length: 50 }),
  
  // Status
  resultStatus: resultStatusEnum('result_status').default('PROVISIONAL').notNull(),
  
  // Timing
  startTime: timestamp('start_time'),
  finishTime: timestamp('finish_time'),
});

// ================================
// VIRTUAL SERIES (ATHLETE PERFORMANCE SPECIFIC)
// ================================

export const virtualSeries = pgTable('virtual_series', {
  id: serial('virtual_series_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  creatorNeonUserId: varchar('creator_neon_user_id', { length: 255 }).notNull(), // Link to Neon Auth user
  
  // Series Configuration
  isPublic: boolean('is_public').default(false).notNull(),
  disciplineId: integer('discipline_id').references(() => disciplines.id),
  categoryId: integer('category_id').references(() => categories.id),
  
  // Date Range
  startDate: date('start_date'),
  endDate: date('end_date'),
});

export const virtualSeriesParticipants = pgTable('virtual_series_participants', {
  id: serial('participant_id').primaryKey(),
  virtualSeriesId: integer('virtual_series_id').references(() => virtualSeries.id).notNull(),
  athleteId: integer('athlete_id').references(() => athletes.id).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const virtualSeriesEvents = pgTable('virtual_series_events', {
  id: serial('series_event_id').primaryKey(),
  virtualSeriesId: integer('virtual_series_id').references(() => virtualSeries.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  isCountingEvent: boolean('is_counting_event').default(true).notNull(),
});

// ================================
// RELATIONS
// ================================

export const peopleRelations = relations(people, ({ one, many }) => ({
  athletes: many(athletes),
}));

export const athletesRelations = relations(athletes, ({ one, many }) => ({
  person: one(people, {
    fields: [athletes.personId],
    references: [people.id],
  }),
  club: one(organizations, {
    fields: [athletes.clubId],
    references: [organizations.id],
  }),
  performances: many(performances),
  results: many(results),
  createdSeries: many(virtualSeries),
  seriesParticipations: many(virtualSeriesParticipants),
}));

export const disciplinesRelations = relations(disciplines, ({ one, many }) => ({
  parentDiscipline: one(disciplines, {
    fields: [disciplines.parentDisciplineId],
    references: [disciplines.id],
    relationName: "disciplineHierarchy"
  }),
  subDisciplines: many(disciplines, {
    relationName: "disciplineHierarchy"
  }),
  events: many(events),
  performances: many(performances),
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
  results: many(results),
  virtualSeriesEvents: many(virtualSeriesEvents),
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

export const virtualSeriesRelations = relations(virtualSeries, ({ one, many }) => ({
  discipline: one(disciplines, {
    fields: [virtualSeries.disciplineId],
    references: [disciplines.id],
  }),
  category: one(categories, {
    fields: [virtualSeries.categoryId],
    references: [categories.id],
  }),
  participants: many(virtualSeriesParticipants),
  events: many(virtualSeriesEvents),
}));

export const virtualSeriesParticipantsRelations = relations(virtualSeriesParticipants, ({ one }) => ({
  virtualSeries: one(virtualSeries, {
    fields: [virtualSeriesParticipants.virtualSeriesId],
    references: [virtualSeries.id],
  }),
  athlete: one(athletes, {
    fields: [virtualSeriesParticipants.athleteId],
    references: [athletes.id],
  }),
}));

export const virtualSeriesEventsRelations = relations(virtualSeriesEvents, ({ one }) => ({
  virtualSeries: one(virtualSeries, {
    fields: [virtualSeriesEvents.virtualSeriesId],
    references: [virtualSeries.id],
  }),
  event: one(events, {
    fields: [virtualSeriesEvents.eventId],
    references: [events.id],
  }),
}));