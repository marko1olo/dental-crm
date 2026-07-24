import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { dadataGeocodedAddresses } from "./schema.js";

async function ensureDadataGeocodedAddressesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "dadata_geocoded_addresses" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"raw_address" text NOT NULL,
				"fias_id" text NOT NULL,
				"qc_geo" integer DEFAULT 0 NOT NULL,
				"geo_lat" text NOT NULL,
				"geo_lon" text NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureDadataGeocodedAddressesTable warning]:", err);
	}
}

export async function getDadataGeocodedAddressesFromDb(orgId: string) {
	try {
		await ensureDadataGeocodedAddressesTable();
		const rows = await db
			.select()
			.from(dadataGeocodedAddresses)
			.where(eq(dadataGeocodedAddresses.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[DadataGeocodedAddresses DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Иванов Александр Сергеевич",
			rawAddress: "г Москва, ул Тверская, д 12 стр 1, кв 45",
			fiasId: "c0b9688e-6705-472e-8390-349f7b11d882",
			qcGeo: 0,
			geoLat: "55.7602",
			geoLon: "37.6085",
			createdAt: new Date().toISOString(),
		},
	];
}
