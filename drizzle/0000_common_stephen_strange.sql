CREATE TYPE "public"."athlete_status" AS ENUM('ACTIVE', 'INACTIVE', 'RETIRED', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."competition_level" AS ENUM('INTERNATIONAL', 'NATIONAL', 'REGIONAL', 'STATE', 'LOCAL', 'CLUB');--> statement-breakpoint
CREATE TYPE "public"."competition_status" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."course_type" AS ENUM('FLATWATER', 'OCEAN', 'RIVER', 'SURF', 'HARBOR');--> statement-breakpoint
CREATE TYPE "public"."discipline_level" AS ENUM('SPORT', 'DISCIPLINE', 'SUB_DISCIPLINE', 'EVENT_TYPE');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."race_type" AS ENUM('SPRINT', 'DISTANCE', 'MARATHON', 'TECHNICAL', 'RELAY');--> statement-breakpoint
CREATE TYPE "public"."result_status" AS ENUM('PROVISIONAL', 'UNOFFICIAL', 'OFFICIAL');--> statement-breakpoint
CREATE TYPE "public"."venue_type" AS ENUM('INDOOR', 'OUTDOOR', 'SEMI_COVERED');--> statement-breakpoint
CREATE TABLE "athletes" (
	"athlete_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"person_id" integer NOT NULL,
	"athlete_number" varchar(50),
	"status" "athlete_status" DEFAULT 'ACTIVE' NOT NULL,
	"primary_discipline_id" integer,
	"home_organization_id" integer,
	"professional_debut" date,
	"retirement" date,
	"website" varchar(500),
	"instagram" varchar(100),
	"facebook" varchar(100),
	"twitter" varchar(100),
	"biography" text,
	"achievements" text,
	"sponsorships" text,
	"is_verified" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"category_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"short_name" varchar(100),
	"gender" "gender",
	"min_age" integer,
	"max_age" integer,
	"equipment_restrictions" text,
	"eligibility_rules" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer,
	CONSTRAINT "categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"competition_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"short_name" varchar(100),
	"year" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"registration_deadline" date,
	"venue_id" integer,
	"organizer_id" integer,
	"level" "competition_level" NOT NULL,
	"status" "competition_status" DEFAULT 'SCHEDULED' NOT NULL,
	"sanctioning_body" varchar(255),
	"competition_rules" text,
	"weather_conditions" text,
	"water_conditions" text,
	"entry_fee" real,
	"prize_money" real,
	"currency" varchar(10),
	"website" varchar(500),
	"contact_email" varchar(255),
	"registration_url" varchar(500),
	"description" text,
	"notes" text,
	"is_public" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "disciplines" (
	"discipline_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"parent_id" integer,
	"level" "discipline_level" NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"short_name" varchar(100),
	"race_type" "race_type",
	"course_type" "course_type",
	"standard_distance" real,
	"distance_unit" varchar(20),
	"equipment_requirements" text,
	"rules" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer,
	CONSTRAINT "disciplines_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"division_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100),
	"discipline_id" integer,
	"category_id" integer,
	"raw_category_patterns" text,
	"description" text,
	"eligibility_rules" text,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "divisions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"event_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"competition_id" integer NOT NULL,
	"discipline_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"venue_id" integer,
	"name" varchar(255) NOT NULL,
	"short_name" varchar(100),
	"event_number" varchar(50),
	"scheduled_start_time" timestamp,
	"actual_start_time" timestamp,
	"status" varchar(50) DEFAULT 'SCHEDULED',
	"distance" real,
	"distance_unit" varchar(20),
	"course_description" text,
	"weather_conditions" text,
	"water_conditions" text,
	"temperature" real,
	"wind_speed" real,
	"wind_direction" varchar(50),
	"max_entries" integer,
	"entry_fee" real,
	"timing_method" varchar(100),
	"scoring_method" varchar(100),
	"description" text,
	"notes" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"organization_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"abbreviation" varchar(20),
	"type" varchar(100),
	"email" varchar(255),
	"phone" varchar(50),
	"website" varchar(500),
	"street" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"is_active" boolean DEFAULT true,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "people" (
	"person_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"date_of_birth" date,
	"gender" "gender",
	"nationality" varchar(100),
	"email" varchar(255),
	"phone" varchar(50),
	"street" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"is_verified" boolean DEFAULT false,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "performances" (
	"performance_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"athlete_id" integer NOT NULL,
	"discipline_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"time_milliseconds" integer,
	"adjusted_time_milliseconds" integer,
	"calculated_overall_position" integer,
	"calculated_division_position" integer,
	"calculated_gender_position" integer,
	"ranking_points" real,
	"difficulty_multiplier" real,
	"performance_rating" real,
	"is_personal_best" boolean DEFAULT false,
	"is_season_best" boolean DEFAULT false,
	"is_podium_finish" boolean DEFAULT false,
	"weather_conditions" text,
	"water_conditions" text,
	"field_strength" integer,
	"calculation_version" varchar(20),
	"verified" boolean DEFAULT false,
	"verified_by" varchar(255),
	"verification_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "results" (
	"result_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"athlete_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"performance_id" integer,
	"overall_place" varchar(10),
	"division_place" varchar(20),
	"raw_name" varchar(255),
	"bib_number" varchar(50),
	"raw_age_group" varchar(100),
	"raw_gender" varchar(20),
	"raw_category" varchar(100),
	"raw_time" varchar(50),
	"raw_craft_type" varchar(50),
	"source_event_id" varchar(100),
	"source_race_name" varchar(255),
	"source_url" varchar(500),
	"scraped_at" timestamp,
	"source_system" varchar(50),
	"result_status" "result_status" DEFAULT 'PROVISIONAL' NOT NULL,
	"data_quality_flags" text,
	"athlete_verified" boolean DEFAULT false,
	"start_time" timestamp,
	"finish_time" timestamp
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"venue_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"short_name" varchar(100),
	"venue_type" "venue_type",
	"street" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"latitude" real,
	"longitude" real,
	"elevation" real,
	"capacity" integer,
	"facilities" text,
	"accessibility" text,
	"website" varchar(500),
	"phone" varchar(50),
	"email" varchar(255),
	"is_active" boolean DEFAULT true,
	"description" text
);
--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_person_id_people_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_primary_discipline_id_disciplines_discipline_id_fk" FOREIGN KEY ("primary_discipline_id") REFERENCES "public"."disciplines"("discipline_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_home_organization_id_organizations_organization_id_fk" FOREIGN KEY ("home_organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_venue_id_venues_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("venue_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_organizer_id_organizations_organization_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_discipline_id_disciplines_discipline_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("discipline_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_category_id_categories_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_competition_id_competitions_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("competition_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_discipline_id_disciplines_discipline_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("discipline_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_category_id_categories_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_venues_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("venue_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_athlete_id_athletes_athlete_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("athlete_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_discipline_id_disciplines_discipline_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("discipline_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_category_id_categories_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_athlete_id_athletes_athlete_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("athlete_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_event_id_events_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_performance_id_performances_performance_id_fk" FOREIGN KEY ("performance_id") REFERENCES "public"."performances"("performance_id") ON DELETE no action ON UPDATE no action;