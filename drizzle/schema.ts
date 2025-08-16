import { pgTable, serial, timestamp, varchar, date, boolean, text, foreignKey, integer, unique, real, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const athleteStatus = pgEnum("athlete_status", ['ACTIVE', 'INACTIVE', 'RETIRED', 'SUSPENDED'])
export const competitionLevel = pgEnum("competition_level", ['INTERNATIONAL', 'NATIONAL', 'REGIONAL', 'STATE', 'LOCAL', 'CLUB'])
export const competitionStatus = pgEnum("competition_status", ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
export const courseType = pgEnum("course_type", ['FLATWATER', 'OCEAN', 'RIVER', 'SURF', 'HARBOR'])
export const disciplineLevel = pgEnum("discipline_level", ['SPORT', 'DISCIPLINE', 'SUB_DISCIPLINE', 'EVENT_TYPE'])
export const gender = pgEnum("gender", ['MALE', 'FEMALE', 'OTHER'])
export const raceType = pgEnum("race_type", ['SPRINT', 'DISTANCE', 'MARATHON', 'TECHNICAL', 'RELAY'])
export const resultStatus = pgEnum("result_status", ['PROVISIONAL', 'UNOFFICIAL', 'OFFICIAL'])
export const venueType = pgEnum("venue_type", ['INDOOR', 'OUTDOOR', 'SEMI_COVERED'])


export const people = pgTable("people", {
	personId: serial("person_id").primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	firstName: varchar("first_name", { length: 255 }).notNull(),
	lastName: varchar("last_name", { length: 255 }).notNull(),
	displayName: varchar("display_name", { length: 255 }),
	dateOfBirth: date("date_of_birth"),
	gender: gender(),
	nationality: varchar({ length: 100 }),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	street: varchar({ length: 255 }),
	city: varchar({ length: 100 }),
	state: varchar({ length: 100 }),
	postalCode: varchar("postal_code", { length: 20 }),
	country: varchar({ length: 100 }),
	isVerified: boolean("is_verified").default(false),
	notes: text(),
});

export const athletes = pgTable("athletes", {
	athleteId: serial("athlete_id").primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	personId: integer("person_id").notNull(),
	athleteNumber: varchar("athlete_number", { length: 50 }),
	status: athleteStatus().default('ACTIVE').notNull(),
	primaryDisciplineId: integer("primary_discipline_id"),
	homeOrganizationId: integer("home_organization_id"),
	professionalDebut: date("professional_debut"),
	retirement: date(),
	website: varchar({ length: 500 }),
	instagram: varchar({ length: 100 }),
	facebook: varchar({ length: 100 }),
	twitter: varchar({ length: 100 }),
	biography: text(),
	achievements: text(),
	sponsorships: text(),
	isVerified: boolean("is_verified").default(false),
}, (table) => [
	foreignKey({
			columns: [table.personId],
			foreignColumns: [people.personId],
			name: "athletes_person_id_people_person_id_fk"
		}),
	foreignKey({
			columns: [table.primaryDisciplineId],
			foreignColumns: [disciplines.disciplineId],
			name: "athletes_primary_discipline_id_disciplines_discipline_id_fk"
		}),
	foreignKey({
			columns: [table.homeOrganizationId],
			foreignColumns: [organizations.organizationId],
			name: "athletes_home_organization_id_organizations_organization_id_fk"
		}),
]);

export const disciplines = pgTable("disciplines", {
	disciplineId: serial("discipline_id").primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	parentId: integer("parent_id"),
	level: disciplineLevel().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 50 }),
	shortName: varchar("short_name", { length: 100 }),
	raceType: raceType("race_type"),
	courseType: courseType("course_type"),
	standardDistance: real("standard_distance"),
	distanceUnit: varchar("distance_unit", { length: 20 }),
	equipmentRequirements: text("equipment_requirements"),
	rules: text(),
	description: text(),
	isActive: boolean("is_active").default(true),
	sortOrder: integer("sort_order"),
}, (table) => [
	unique("disciplines_code_unique").on(table.code),
]);

export const organizations = pgTable("organizations", {
	organizationId: serial("organization_id").primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	name: varchar({ length: 255 }).notNull(),
	abbreviation: varchar({ length: 20 }),
	type: varchar({ length: 100 }),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	website: varchar({ length: 500 }),
	street: varchar({ length: 255 }),
	city: varchar({ length: 100 }),
	state: varchar({ length: 100 }),
	postalCode: varchar("postal_code", { length: 20 }),
	country: varchar({ length: 100 }),
	isActive: boolean("is_active").default(true),
	description: text(),
});

export const venues = pgTable("venues", {
	venueId: serial("venue_id").primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	name: varchar({ length: 255 }).notNull(),
	shortName: varchar("short_name", { length: 100 }),
	venueType: venueType("venue_type"),
	street: varchar({ length: 255 }),
	city: varchar({ length: 100 }),
	state: varchar({ length: 100 }),
	postalCode: varchar("postal_code", { length: 20 }),
	country: varchar({ length: 100 }),
	latitude: real(),
	longitude: real(),
	elevation: real(),
	capacity: integer(),
	facilities: text(),
	accessibility: text(),
	website: varchar({ length: 500 }),
	phone: varchar({ length: 50 }),
	email: varchar({ length: 255 }),
	isActive: boolean("is_active").default(true),
	description: text(),
});

export const competitions = pgTable("competitions", {
	competitionId: serial("competition_id").primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	name: varchar({ length: 255 }).notNull(),
	shortName: varchar("short_name", { length: 100 }),
	year: integer().notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	registrationDeadline: date("registration_deadline"),
	venueId: integer("venue_id"),
	organizerId: integer("organizer_id"),
	level: competitionLevel().notNull(),
	status: competitionStatus().default('SCHEDULED').notNull(),
	sanctioningBody: varchar("sanctioning_body", { length: 255 }),
	competitionRules: text("competition_rules"),
	weatherConditions: text("weather_conditions"),
	waterConditions: text("water_conditions"),
	entryFee: real("entry_fee"),
	prizeMoney: real("prize_money"),
	currency: varchar({ length: 10 }),
	website: varchar({ length: 500 }),
	contactEmail: varchar("contact_email", { length: 255 }),
	registrationUrl: varchar("registration_url", { length: 500 }),
	description: text(),
	notes: text(),
	isPublic: boolean("is_public").default(true),
}, (table) => [
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.venueId],
			name: "competitions_venue_id_venues_venue_id_fk"
		}),
	foreignKey({
			columns: [table.organizerId],
			foreignColumns: [organizations.organizationId],
			name: "competitions_organizer_id_organizations_organization_id_fk"
		}),
]);

export const divisions = pgTable("divisions", {
	divisionId: serial("division_id").primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }),
	disciplineId: integer("discipline_id"),
	categoryId: integer("category_id"),
	rawCategoryPatterns: text("raw_category_patterns"),
	description: text(),
	eligibilityRules: text("eligibility_rules"),
	isActive: boolean("is_active").default(true),
}, (table) => [
	foreignKey({
			columns: [table.disciplineId],
			foreignColumns: [disciplines.disciplineId],
			name: "divisions_discipline_id_disciplines_discipline_id_fk"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.categoryId],
			name: "divisions_category_id_categories_category_id_fk"
		}),
	unique("divisions_code_unique").on(table.code),
]);

export const categories = pgTable("categories", {
	categoryId: serial("category_id").primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 50 }),
	shortName: varchar("short_name", { length: 100 }),
	gender: gender(),
	minAge: integer("min_age"),
	maxAge: integer("max_age"),
	equipmentRestrictions: text("equipment_restrictions"),
	eligibilityRules: text("eligibility_rules"),
	description: text(),
	isActive: boolean("is_active").default(true),
	sortOrder: integer("sort_order"),
}, (table) => [
	unique("categories_code_unique").on(table.code),
]);

export const events = pgTable("events", {
	eventId: serial("event_id").primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	competitionId: integer("competition_id").notNull(),
	disciplineId: integer("discipline_id").notNull(),
	categoryId: integer("category_id").notNull(),
	venueId: integer("venue_id"),
	name: varchar({ length: 255 }).notNull(),
	shortName: varchar("short_name", { length: 100 }),
	eventNumber: varchar("event_number", { length: 50 }),
	scheduledStartTime: timestamp("scheduled_start_time", { mode: 'string' }),
	actualStartTime: timestamp("actual_start_time", { mode: 'string' }),
	status: varchar({ length: 50 }).default('SCHEDULED'),
	distance: real(),
	distanceUnit: varchar("distance_unit", { length: 20 }),
	courseDescription: text("course_description"),
	weatherConditions: text("weather_conditions"),
	waterConditions: text("water_conditions"),
	temperature: real(),
	windSpeed: real("wind_speed"),
	windDirection: varchar("wind_direction", { length: 50 }),
	maxEntries: integer("max_entries"),
	entryFee: real("entry_fee"),
	timingMethod: varchar("timing_method", { length: 100 }),
	scoringMethod: varchar("scoring_method", { length: 100 }),
	description: text(),
	notes: text(),
	isActive: boolean("is_active").default(true),
}, (table) => [
	foreignKey({
			columns: [table.competitionId],
			foreignColumns: [competitions.competitionId],
			name: "events_competition_id_competitions_competition_id_fk"
		}),
	foreignKey({
			columns: [table.disciplineId],
			foreignColumns: [disciplines.disciplineId],
			name: "events_discipline_id_disciplines_discipline_id_fk"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.categoryId],
			name: "events_category_id_categories_category_id_fk"
		}),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.venueId],
			name: "events_venue_id_venues_venue_id_fk"
		}),
]);

export const performances = pgTable("performances", {
	performanceId: serial("performance_id").primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	athleteId: integer("athlete_id").notNull(),
	disciplineId: integer("discipline_id").notNull(),
	categoryId: integer("category_id").notNull(),
	timeMilliseconds: integer("time_milliseconds"),
	adjustedTimeMilliseconds: integer("adjusted_time_milliseconds"),
	calculatedOverallPosition: integer("calculated_overall_position"),
	calculatedDivisionPosition: integer("calculated_division_position"),
	calculatedGenderPosition: integer("calculated_gender_position"),
	rankingPoints: real("ranking_points"),
	difficultyMultiplier: real("difficulty_multiplier"),
	performanceRating: real("performance_rating"),
	isPersonalBest: boolean("is_personal_best").default(false),
	isSeasonBest: boolean("is_season_best").default(false),
	isPodiumFinish: boolean("is_podium_finish").default(false),
	weatherConditions: text("weather_conditions"),
	waterConditions: text("water_conditions"),
	fieldStrength: integer("field_strength"),
	calculationVersion: varchar("calculation_version", { length: 20 }),
	verified: boolean().default(false),
	verifiedBy: varchar("verified_by", { length: 255 }),
	verificationDate: timestamp("verification_date", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.athleteId],
			foreignColumns: [athletes.athleteId],
			name: "performances_athlete_id_athletes_athlete_id_fk"
		}),
	foreignKey({
			columns: [table.disciplineId],
			foreignColumns: [disciplines.disciplineId],
			name: "performances_discipline_id_disciplines_discipline_id_fk"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.categoryId],
			name: "performances_category_id_categories_category_id_fk"
		}),
]);

export const results = pgTable("results", {
	resultId: serial("result_id").primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	athleteId: integer("athlete_id").notNull(),
	eventId: integer("event_id").notNull(),
	performanceId: integer("performance_id"),
	overallPlace: varchar("overall_place", { length: 10 }),
	divisionPlace: varchar("division_place", { length: 20 }),
	rawName: varchar("raw_name", { length: 255 }),
	bibNumber: varchar("bib_number", { length: 50 }),
	rawAgeGroup: varchar("raw_age_group", { length: 100 }),
	rawGender: varchar("raw_gender", { length: 20 }),
	rawCategory: varchar("raw_category", { length: 100 }),
	rawTime: varchar("raw_time", { length: 50 }),
	rawCraftType: varchar("raw_craft_type", { length: 50 }),
	sourceEventId: varchar("source_event_id", { length: 100 }),
	sourceRaceName: varchar("source_race_name", { length: 255 }),
	sourceUrl: varchar("source_url", { length: 500 }),
	scrapedAt: timestamp("scraped_at", { mode: 'string' }),
	sourceSystem: varchar("source_system", { length: 50 }),
	resultStatus: resultStatus("result_status").default('PROVISIONAL').notNull(),
	dataQualityFlags: text("data_quality_flags"),
	athleteVerified: boolean("athlete_verified").default(false),
	startTime: timestamp("start_time", { mode: 'string' }),
	finishTime: timestamp("finish_time", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.athleteId],
			foreignColumns: [athletes.athleteId],
			name: "results_athlete_id_athletes_athlete_id_fk"
		}),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.eventId],
			name: "results_event_id_events_event_id_fk"
		}),
	foreignKey({
			columns: [table.performanceId],
			foreignColumns: [performances.performanceId],
			name: "results_performance_id_performances_performance_id_fk"
		}),
]);
