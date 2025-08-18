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
	"person_id" integer NOT NULL,
	"neon_user_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"status" "athlete_status" DEFAULT 'ACTIVE' NOT NULL,
	"club_id" integer,
	CONSTRAINT "athletes_neon_user_id_unique" UNIQUE("neon_user_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"category_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100),
	"description" text,
	"required_gender" "gender",
	"required_min_age" integer,
	"required_max_age" integer,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"competition_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"identifier" varchar(255),
	"name" varchar(255) NOT NULL,
	"description" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" "competition_status" DEFAULT 'SCHEDULED' NOT NULL,
	"level" "competition_level" DEFAULT 'LOCAL' NOT NULL,
	"venue_id" integer,
	"organizer_id" integer NOT NULL,
	"website" text,
	"contact_email" text[],
	"registration_url" text,
	"promotion_provider" text,
	"promotion_url" text,
	"registration_provider" text,
	"results_provider" text,
	"results_url" text,
	"is_public" boolean DEFAULT true,
	CONSTRAINT "competitions_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
CREATE TABLE "disciplines" (
	"discipline_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100),
	"description" text,
	"parent_discipline_id" integer,
	"discipline_level" "discipline_level" DEFAULT 'SPORT' NOT NULL,
	"distance_meters" real,
	"race_type" "race_type" NOT NULL,
	"course_type" "course_type",
	CONSTRAINT "disciplines_name_unique" UNIQUE("name"),
	CONSTRAINT "disciplines_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"event_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"scheduled_start_time" timestamp NOT NULL,
	"actual_start_time" timestamp,
	"competition_id" integer NOT NULL,
	"discipline_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"weather_data" text
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"organization_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"identifier" varchar(255),
	"name" varchar(255) NOT NULL,
	"alternate_name" varchar(255),
	"description" text,
	"email" varchar(255),
	"url" varchar(500),
	CONSTRAINT "organizations_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"person_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"identifier" varchar(255),
	"name" varchar(255) NOT NULL,
	"family_name" varchar(255),
	"given_name" varchar(255),
	"alternate_name" varchar(255),
	"email" varchar(255),
	"gender" "gender",
	"birth_date" date,
	"nationality" varchar(3),
	"height" real,
	"weight" real,
	CONSTRAINT "people_identifier_unique" UNIQUE("identifier"),
	CONSTRAINT "people_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "performances" (
	"performance_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"athlete_id" integer NOT NULL,
	"discipline_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"time" varchar(20),
	"time_milliseconds" integer,
	"distance" real,
	"is_personal_best" boolean DEFAULT false NOT NULL,
	"is_season_best" boolean DEFAULT false NOT NULL,
	"verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "results" (
	"result_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"athlete_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"performance_id" integer,
	"position" integer,
	"bib_number" varchar(50),
	"result_status" "result_status" DEFAULT 'PROVISIONAL' NOT NULL,
	"start_time" timestamp,
	"finish_time" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"resource_id" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_athlete_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"athlete_id" integer NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL,
	"verified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"tier" text DEFAULT 'free' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"view_count_reset_date" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"venue_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"venue_type" "venue_type" NOT NULL,
	"city" varchar(255),
	"state" varchar(255),
	"country" varchar(3),
	"latitude" real,
	"longitude" real,
	"timezone" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "virtual_series" (
	"virtual_series_id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"creator_neon_user_id" varchar(255) NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"discipline_id" integer,
	"category_id" integer,
	"start_date" date,
	"end_date" date
);
--> statement-breakpoint
CREATE TABLE "virtual_series_events" (
	"series_event_id" serial PRIMARY KEY NOT NULL,
	"virtual_series_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"is_counting_event" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "virtual_series_participants" (
	"participant_id" serial PRIMARY KEY NOT NULL,
	"virtual_series_id" integer NOT NULL,
	"athlete_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_person_id_people_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_club_id_organizations_organization_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_venue_id_venues_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("venue_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_organizer_id_organizations_organization_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_competition_id_competitions_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("competition_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_discipline_id_disciplines_discipline_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("discipline_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_category_id_categories_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_athlete_id_athletes_athlete_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("athlete_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_discipline_id_disciplines_discipline_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("discipline_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_category_id_categories_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_athlete_id_athletes_athlete_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("athlete_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_event_id_events_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_performance_id_performances_performance_id_fk" FOREIGN KEY ("performance_id") REFERENCES "public"."performances"("performance_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_athlete_links" ADD CONSTRAINT "user_athlete_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_athlete_links" ADD CONSTRAINT "user_athlete_links_athlete_id_athletes_athlete_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("athlete_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_series" ADD CONSTRAINT "virtual_series_discipline_id_disciplines_discipline_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("discipline_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_series" ADD CONSTRAINT "virtual_series_category_id_categories_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_series_events" ADD CONSTRAINT "virtual_series_events_virtual_series_id_virtual_series_virtual_series_id_fk" FOREIGN KEY ("virtual_series_id") REFERENCES "public"."virtual_series"("virtual_series_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_series_events" ADD CONSTRAINT "virtual_series_events_event_id_events_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_series_participants" ADD CONSTRAINT "virtual_series_participants_virtual_series_id_virtual_series_virtual_series_id_fk" FOREIGN KEY ("virtual_series_id") REFERENCES "public"."virtual_series"("virtual_series_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_series_participants" ADD CONSTRAINT "virtual_series_participants_athlete_id_athletes_athlete_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("athlete_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_activity_user_date_idx" ON "user_activity" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_activity_type_idx" ON "user_activity" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "user_athlete_links_user_athlete_idx" ON "user_athlete_links" USING btree ("user_id","athlete_id");--> statement-breakpoint
CREATE INDEX "user_athlete_links_athlete_idx" ON "user_athlete_links" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");