CREATE TABLE IF NOT EXISTS "family_recommendation_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"family_group_name" text NOT NULL,
	"new_member_name" text NOT NULL,
	"referrer_member_name" text NOT NULL,
	"assigned_marketing_source" text DEFAULT 'Рекомендация семьи' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
