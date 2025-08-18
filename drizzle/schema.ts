import { pgTable, integer, text, real, timestamp, foreignKey, date, boolean, index, unique, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const venues = pgTable("venues", {
	venueId: integer("venue_id").primaryKey().notNull(),
	name: text().notNull(),
	city: text(),
	state: text(),
	country: text(),
	latitude: real(),
	longitude: real(),
	timezone: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const competitions = pgTable("competitions", {
	competitionId: integer("competition_id").primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	name: text().notNull(),
	shortName: text("short_name"),
	year: integer().notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	registrationDeadline: date("registration_deadline"),
	venueId: integer("venue_id"),
	organizerId: integer("organizer_id"),
	level: text().notNull(),
	status: text().default('SCHEDULED').notNull(),
	sanctioningBody: text("sanctioning_body"),
	competitionRules: text("competition_rules"),
	weatherConditions: text("weather_conditions"),
	waterConditions: text("water_conditions"),
	entryFee: real("entry_fee"),
	prizeMoney: real("prize_money"),
	currency: text(),
	website: text(),
	contactEmail: text("contact_email").array(),
	registrationUrl: text("registration_url"),
	description: text(),
	notes: text(),
	isPublic: boolean("is_public").default(true),
	promotionProvider: text("promotion_provider"),
	promotionUrl: text("promotion_url"),
	registrationProvider: text("registration_provider"),
	resultsProvider: text("results_provider"),
	resultsUrl: text("results_url"),
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

export const organizations = pgTable("organizations", {
	organizationId: integer("organization_id").primaryKey().notNull(),
	name: text().notNull(),
	shortName: text("short_name"),
	type: text(),
	website: text(),
	contactEmail: text("contact_email"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const events = pgTable("events", {
	eventId: integer("event_id").primaryKey().notNull(),
	competitionId: integer("competition_id").notNull(),
	name: text().notNull(),
	date: date().notNull(),
	discipline: text().notNull(),
	category: text().notNull(),
	distance: text(),
	venue: text(),
	venueId: integer("venue_id"),
	latitude: real(),
	longitude: real(),
	weatherData: text("weather_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.competitionId],
			foreignColumns: [competitions.competitionId],
			name: "events_competition_id_competitions_competition_id_fk"
		}),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.venueId],
			name: "events_venue_id_venues_venue_id_fk"
		}),
]);

export const results = pgTable("results", {
	resultId: integer("result_id").primaryKey().notNull(),
	eventId: integer("event_id").notNull(),
	athleteId: integer("athlete_id").notNull(),
	position: integer(),
	time: text(),
	timeSeconds: integer("time_seconds"),
	bibNumber: text("bib_number"),
	category: text(),
	ageGroup: text("age_group"),
	craft: text(),
	registrar: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.eventId],
			name: "results_event_id_events_event_id_fk"
		}),
	foreignKey({
			columns: [table.athleteId],
			foreignColumns: [athletes.athleteId],
			name: "results_athlete_id_athletes_athlete_id_fk"
		}),
]);

export const performances = pgTable("performances", {
	performanceId: integer("performance_id").primaryKey().notNull(),
	resultId: integer("result_id").notNull(),
	athleteId: integer("athlete_id").notNull(),
	eventId: integer("event_id").notNull(),
	points: real(),
	percentile: real(),
	fieldStrength: real("field_strength"),
	weatherAdjustedTimeSeconds: integer("weather_adjusted_time_seconds"),
	speedKph: real("speed_kph"),
	paceMinKm: real("pace_min_km"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.resultId],
			foreignColumns: [results.resultId],
			name: "performances_result_id_results_result_id_fk"
		}),
	foreignKey({
			columns: [table.athleteId],
			foreignColumns: [athletes.athleteId],
			name: "performances_athlete_id_athletes_athlete_id_fk"
		}),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.eventId],
			name: "performances_event_id_events_event_id_fk"
		}),
]);

export const athletes = pgTable("athletes", {
	athleteId: integer("athlete_id").primaryKey().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	email: text(),
	city: text(),
	state: text(),
	country: text(),
	birthYear: integer("birth_year"),
	gender: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	tier: text().default('free').notNull(),
	viewCount: integer("view_count").default(0).notNull(),
	viewCountResetDate: timestamp("view_count_reset_date", { mode: 'string' }).defaultNow().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("users_email_unique").on(table.email),
]);

export const userActivity = pgTable("user_activity", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	activityType: text("activity_type").notNull(),
	resourceId: text("resource_id"),
	metadata: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_activity_type_idx").using("btree", table.activityType.asc().nullsLast().op("text_ops")),
	index("user_activity_user_date_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_activity_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userAthleteLinks = pgTable("user_athlete_links", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	athleteId: integer("athlete_id").notNull(),
	isOwner: boolean("is_owner").default(false).notNull(),
	isVerified: boolean("is_verified").default(false).notNull(),
	claimedAt: timestamp("claimed_at", { mode: 'string' }).defaultNow().notNull(),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
}, (table) => [
	index("user_athlete_links_athlete_idx").using("btree", table.athleteId.asc().nullsLast().op("int4_ops")),
	index("user_athlete_links_user_athlete_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.athleteId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_athlete_links_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.athleteId],
			foreignColumns: [athletes.athleteId],
			name: "user_athlete_links_athlete_id_athletes_athlete_id_fk"
		}).onDelete("cascade"),
]);
