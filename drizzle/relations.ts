import { relations } from "drizzle-orm/relations";
import { people, athletes, disciplines, organizations, venues, competitions, divisions, categories, events, performances, results } from "./schema";

export const athletesRelations = relations(athletes, ({one, many}) => ({
	person: one(people, {
		fields: [athletes.personId],
		references: [people.personId]
	}),
	discipline: one(disciplines, {
		fields: [athletes.primaryDisciplineId],
		references: [disciplines.disciplineId]
	}),
	organization: one(organizations, {
		fields: [athletes.homeOrganizationId],
		references: [organizations.organizationId]
	}),
	performances: many(performances),
	results: many(results),
}));

export const peopleRelations = relations(people, ({many}) => ({
	athletes: many(athletes),
}));

export const disciplinesRelations = relations(disciplines, ({many}) => ({
	athletes: many(athletes),
	divisions: many(divisions),
	events: many(events),
	performances: many(performances),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	athletes: many(athletes),
	competitions: many(competitions),
}));

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

export const divisionsRelations = relations(divisions, ({one}) => ({
	discipline: one(disciplines, {
		fields: [divisions.disciplineId],
		references: [disciplines.disciplineId]
	}),
	category: one(categories, {
		fields: [divisions.categoryId],
		references: [categories.categoryId]
	}),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	divisions: many(divisions),
	events: many(events),
	performances: many(performances),
}));

export const eventsRelations = relations(events, ({one, many}) => ({
	competition: one(competitions, {
		fields: [events.competitionId],
		references: [competitions.competitionId]
	}),
	discipline: one(disciplines, {
		fields: [events.disciplineId],
		references: [disciplines.disciplineId]
	}),
	category: one(categories, {
		fields: [events.categoryId],
		references: [categories.categoryId]
	}),
	venue: one(venues, {
		fields: [events.venueId],
		references: [venues.venueId]
	}),
	results: many(results),
}));

export const performancesRelations = relations(performances, ({one, many}) => ({
	athlete: one(athletes, {
		fields: [performances.athleteId],
		references: [athletes.athleteId]
	}),
	discipline: one(disciplines, {
		fields: [performances.disciplineId],
		references: [disciplines.disciplineId]
	}),
	category: one(categories, {
		fields: [performances.categoryId],
		references: [categories.categoryId]
	}),
	results: many(results),
}));

export const resultsRelations = relations(results, ({one}) => ({
	athlete: one(athletes, {
		fields: [results.athleteId],
		references: [athletes.athleteId]
	}),
	event: one(events, {
		fields: [results.eventId],
		references: [events.eventId]
	}),
	performance: one(performances, {
		fields: [results.performanceId],
		references: [performances.performanceId]
	}),
}));