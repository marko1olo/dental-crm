/**
 * @file apps/api/src/routes/ai/dictationRoutes.ts
 * @description Fastify routes for speech dictation parsing and 3D imaging annotation links.
 */

import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalReadAccess,
	resolveOrganizationId,
} from "../../accessGuard.js";
import { parseDictationWithLLM } from "../../ai/dictationParser.js";
import { parseDictationLocally } from "../../ai/localDictationParser.js";
import { db } from "../../db/client.js";
import { clinics, imagingAnnotations } from "../../db/schema.js";

const parseDictationSchema = z.object({
	text: z.string(),
	type: z.enum(["schedule", "patient", "visit"]),
	volumeContext: z
		.object({
			studyId: z.string(),
			seriesId: z.string().optional(),
			organizationId: z.string(),
			patientId: z.string(),
			coordinates: z.record(z.number()).optional(),
		})
		.optional(),
});

async function resolveClinicTimeZone(
	request: FastifyRequest,
): Promise<string | null> {
	const organizationId = await resolveOrganizationId(request);
	if (!organizationId) return null;
	try {
		const [clinic] = await db
			.select({ timezone: clinics.timezone })
			.from(clinics)
			.where(eq(clinics.organizationId, organizationId))
			.limit(1);
		return clinic?.timezone ?? null;
	} catch (err) {
		console.error("[Dente] resolveClinicTimezone failed:", err);
		return null;
	}
}

export async function registerDictationRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/ai/parse-dictation", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"parse dictation with AI",
			))
		)
			return;

		const parsedInput = parseDictationSchema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "ParseDictationValidationError",
				message: "Неверный формат для AI-разбора.",
			});
		}

		try {
			const { text, type, volumeContext } = parsedInput.data;

			// 1. Try Local Algorithmic NLP first (to save LLM keys)
			let result = parseDictationLocally(text, type);

			// 2. Fallback to LLM if local NLP couldn't handle complex natural language
			if (!result) {
				result = await parseDictationWithLLM(
					text,
					type,
					await resolveClinicTimeZone(request),
				);
			}

			// 3. Database Linkage (If 3D viewer context is provided and teeth were found)
			const candidateResult = result as {
				toothUpdates?: Array<{ code: string; state: string }>;
				emkUpdates?: { complaint?: string };
			} | null;

			if (
				volumeContext &&
				candidateResult?.toothUpdates &&
				candidateResult.toothUpdates.length > 0
			) {
				const valuesToInsert = candidateResult.toothUpdates.map(
					(update) => ({
						organizationId: volumeContext.organizationId,
						patientId: volumeContext.patientId,
						studyId: volumeContext.studyId,
						annotationType: "tooth" as const,
						toothCode: update.code,
						coordinates: volumeContext.coordinates || null,
						notes: candidateResult.emkUpdates?.complaint || update.state,
					}),
				);
				await db.insert(imagingAnnotations).values(valuesToInsert);
			}

			return reply.send(result);
		} catch (err) {
			const errMessage =
				err instanceof Error ? err.message : "Неизвестная ошибка";
			return reply.code(500).send({
				error: "ParseDictationError",
				message: errMessage || "Ошибка разбора диктовки",
			});
		}
	});
}
