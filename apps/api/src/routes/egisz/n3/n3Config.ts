/**
 * n3Config.ts — N3.Health ViPNet configuration resolution and token masking.
 * Mandate 8b compliant (<= 120 lines).
 */

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import { type N3HealthVipnetConfig, n3HealthVipnetConfigSchema } from "@dental/shared";

export const n3ConfigUpdateBodySchema = z.object({
	authGuid: z.string().min(1).optional(),
	idLpu: z.string().min(1).optional(),
	clinicOid: z.string().min(5).optional(),
	emkServiceUrl: z.string().url().optional(),
	pixServiceUrl: z.string().url().optional(),
	nsiFhirUrl: z.string().url().optional(),
	eventLogApiUrl: z.string().url().optional(),
	eventLogToken: z.string().min(1).optional(),
	isVipnetChannelActive: z.boolean().optional(),
	timeoutMs: z.number().int().positive().optional(),
});

export async function resolveN3HealthConfig(
	orgId: string,
): Promise<{ config: N3HealthVipnetConfig | null; source: "database" | "environment" | "none" }> {
	try {
		const orgRows = await db
			.select({ flags: schema.organizations.workspaceFeatureFlags })
			.from(schema.organizations)
			.where(eq(schema.organizations.id, orgId))
			.limit(1);

		const rawFlags = orgRows[0]?.flags;
		if (rawFlags && typeof rawFlags === "object" && "n3HealthVipnetConfig" in rawFlags) {
			const dbConfig = (rawFlags as Record<string, unknown>).n3HealthVipnetConfig;
			const parseResult = n3HealthVipnetConfigSchema.safeParse(dbConfig);
			if (parseResult.success) {
				return { config: parseResult.data, source: "database" };
			}
		}
	} catch {
		// Fallback to environment variables
	}

	const pick = (name: string) => {
		const raw = process.env[name];
		return raw && raw.trim().length > 0 ? raw.trim() : undefined;
	};

	const envCandidate = {
		authGuid: pick("EGISZ_N3_AUTH_GUID") || pick("EGISZ_N3_GUID"),
		idLpu: pick("EGISZ_N3_ID_LPU") || pick("EGISZ_N3_LPU_ID"),
		clinicOid: pick("EGISZ_CLINIC_OID"),
		emkServiceUrl: pick("EGISZ_N3_EMK_URL") || "http://b2b.n3health.ru/emk/EMKService.svc",
		pixServiceUrl: pick("EGISZ_N3_PIX_URL") || "http://b2b.n3health.ru/emk/PixService.svc",
		nsiFhirUrl: pick("EGISZ_N3_NSI_FHIR_URL") || "http://b2b.n3health.ru/nsi/fhir/term/",
		eventLogApiUrl: pick("EGISZ_N3_EVENTLOG_URL") || "https://api.n3health.ru/eventlog/",
		eventLogToken: pick("EGISZ_N3_EVENTLOG_TOKEN") || pick("EGISZ_N3_API_KEY"),
		isVipnetChannelActive: process.env.EGISZ_N3_VIPNET_ACTIVE === "true" || process.env.EGISZ_N3_VIPNET_ACTIVE === "1",
		timeoutMs: 15000,
	};

	const envParse = n3HealthVipnetConfigSchema.safeParse(envCandidate);
	if (envParse.success) {
		return { config: envParse.data, source: "environment" };
	}

	return { config: null, source: "none" };
}

export function maskSecretToken(token?: string | null): string | null {
	if (!token || token.length <= 8) return null;
	return `${token.slice(0, 4)}...${token.slice(-4)}`;
}
