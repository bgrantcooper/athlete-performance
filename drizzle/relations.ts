import { relations } from "drizzle-orm/relations";
import { venues, competitions, organizations, events, results, athletes, performances, users, userActivity, userAthleteLinks } from "./schema";

export const competitionsRelations = relations(competitions, ({one, many}) => ({
	venue: one(venues, {
		fields: [competitions.venueId],
		references: [venues.venueId]
	}),
	organization: one(organizations, {
		fields: [competitions.organizerId],
		references: [organizations.organizationId]
	}),
	events: many(events),
}));

export const venuesRelations = relations(venues, ({many}) => ({
	competitions: many(competitions),
	events: many(events),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	competitions: many(competitions),
}));

export const eventsRelations = relations(events, ({one, many}) => ({
	competition: one(competitions, {
		fields: [events.competitionId],
		references: [competitions.competitionId]
	}),
	venue: one(venues, {
		fields: [events.venueId],
		references: [venues.venueId]
	}),
	results: many(results),
	performances: many(performances),
}));

export const resultsRelations = relations(results, ({one, many}) => ({
	event: one(events, {
		fields: [results.eventId],
		references: [events.eventId]
	}),
	athlete: one(athletes, {
		fields: [results.athleteId],
		references: [athletes.athleteId]
	}),
	performances: many(performances),
}));

export const athletesRelations = relations(athletes, ({many}) => ({
	results: many(results),
	performances: many(performances),
	userAthleteLinks: many(userAthleteLinks),
}));

export const performancesRelations = relations(performances, ({one}) => ({
	result: one(results, {
		fields: [performances.resultId],
		references: [results.resultId]
	}),
	athlete: one(athletes, {
		fields: [performances.athleteId],
		references: [athletes.athleteId]
	}),
	event: one(events, {
		fields: [performances.eventId],
		references: [events.eventId]
	}),
}));

export const userActivityRelations = relations(userActivity, ({one}) => ({
	user: one(users, {
		fields: [userActivity.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userActivities: many(userActivity),
	userAthleteLinks: many(userAthleteLinks),
}));

export const userAthleteLinksRelations = relations(userAthleteLinks, ({one}) => ({
	user: one(users, {
		fields: [userAthleteLinks.userId],
		references: [users.id]
	}),
	athlete: one(athletes, {
		fields: [userAthleteLinks.athleteId],
		references: [athletes.athleteId]
	}),
}));