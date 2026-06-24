ALTER TYPE "public"."promotion_type" ADD VALUE 'buy_x_get_y';--> statement-breakpoint
ALTER TYPE "public"."promotion_type" ADD VALUE 'bundle';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending_payment'::text;--> statement-breakpoint
DROP TYPE "public"."order_status";--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'paid', 'preparing', 'ready', 'completed', 'cancelled');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending_payment'::"public"."order_status";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."order_status" USING "status"::"public"."order_status";--> statement-breakpoint
ALTER TABLE "modifiers" ADD COLUMN "category" text DEFAULT 'Other' NOT NULL;--> statement-breakpoint
ALTER TABLE "modifiers" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "trigger_qty" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "reward_qty" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "trigger_item_ids" integer[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "reward_item_ids" integer[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "applies_to" text DEFAULT 'order' NOT NULL;--> statement-breakpoint
CREATE INDEX "item_modifiers_modifier_id_idx" ON "item_modifiers" USING btree ("modifier_id");