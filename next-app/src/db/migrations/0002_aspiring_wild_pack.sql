ALTER TABLE "modifier_options" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "active_days" text[];