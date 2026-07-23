CREATE TABLE IF NOT EXISTS "dadata_geocoded_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"patient_name" text NOT NULL,
	"raw_address" text NOT NULL,
	"fias_id" text NOT NULL,
	"qc_geo" integer DEFAULT 0 NOT NULL, -- 0 = exact
	"geo_lat" text NOT NULL,
	"geo_lon" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
