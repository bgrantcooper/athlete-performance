ALTER TABLE "competitions" ADD COLUMN "short_name" varchar(100);--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "year" integer;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "registration_deadline" date;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "competition_rules" text;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "weather_conditions" text;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "water_conditions" text;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "entry_fee" real;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "prize_money" real;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "short_name" varchar(100);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "event_number" varchar(50);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "status" varchar(50) DEFAULT 'SCHEDULED';--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "venue_id" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "distance" real;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "distance_unit" varchar(20);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "course_description" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "weather_conditions" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "water_conditions" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "temperature" real;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "wind_speed" real;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "wind_direction" varchar(50);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "max_entries" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "entry_fee" real;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "timing_method" varchar(100);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "scoring_method" varchar(100);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_venues_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("venue_id") ON DELETE no action ON UPDATE no action;