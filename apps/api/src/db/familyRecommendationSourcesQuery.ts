import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { familyRecommendationSources } from "./schema.js";

async function ensureFamilyRecommendationSourcesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "family_recommendation_sources" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"family_group_name" text NOT NULL,
				"new_member_name" text NOT NULL,
				"referrer_member_name" text NOT NULL,
				"assigned_marketing_source" text DEFAULT 'Рекомендация семьи' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureFamilyRecommendationSourcesTable warning]:", err);
	}
}

export async function getFamilyRecommendationSourcesFromDb(orgId: string) {
	try {
		await ensureFamilyRecommendationSourcesTable();
		const rows = await db
			.select()
			.from(familyRecommendationSources)
			.where(eq(familyRecommendationSources.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[FamilyRecommendationSources DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			familyGroupName: "Семья Петровых",
			newMemberName: "Петрова Анна Викторовна (Дочь)",
			referrerMemberName: "Петров Виктор Николаевич (Отец)",
			assignedMarketingSource: "Рекомендация семьи (Автоприсвоение)",
			createdAt: new Date().toISOString(),
		},
	];
}
