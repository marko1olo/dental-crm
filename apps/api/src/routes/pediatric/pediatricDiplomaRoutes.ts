import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { generatedDocuments } from "../../db/schema.js";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BraveryDiplomaRecord {
	id: string; patientId: string; diplomaNumber: string; patientName: string;
	patientAgeYears?: number; doctorName: string; clinicName: string;
	awardReasonRu: string; awardedDateIso: string; issueDateRu: string; createdAt: string;
}

export const inMemoryDiplomaAudit = new Map<string, BraveryDiplomaRecord[]>();

const issueDiplomaSchema = z.object({
	patientName: z.string().min(1).default("Юный пациент"),
	patientAgeYears: z.number().optional().default(6),
	doctorName: z.string().optional().default("Врач-стоматолог детский"),
	clinicName: z.string().optional().default("Стоматологическая клиника DENTE"),
	awardReasonRu: z.string().optional().default("За выдающееся мужество, образцовое спокойствие в кресле стоматолога и дружбу с Зубной Феей!"),
	awardedDateIso: z.string().optional(),
});

export function registerPediatricDiplomaRoutes(app: FastifyInstance): void {
	app.get("/api/patients/:patientId/pediatric/bravery-diploma", async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "pediatric diploma audit");
		if (!organizationId) return;

		const { patientId } = request.params as { patientId: string };
		if (!UUID_SHAPE.test(patientId)) return reply.code(400).send({ error: "InvalidPatientId" });

		const inMemList = inMemoryDiplomaAudit.get(patientId) || [];
		try {
			const dbDocs = await db.select().from(generatedDocuments)
				.where(and(eq(generatedDocuments.organizationId, organizationId), eq(generatedDocuments.patientId, patientId), eq(generatedDocuments.title, "Диплом за храбрость")))
				.orderBy(desc(generatedDocuments.createdAt));

			if (dbDocs.length > 0) {
				const mappedFromDb = dbDocs.map((doc) => {
					let payload: Partial<BraveryDiplomaRecord> = {};
					try { payload = doc.payloadJson ? JSON.parse(doc.payloadJson) : {}; } catch { payload = {}; }
					return {
						id: doc.id,
						patientId: doc.patientId,
						diplomaNumber: payload.diplomaNumber || `ДИПЛОМ-ГЕРОЙ-${doc.id.slice(0, 8).toUpperCase()}`,
						patientName: payload.patientName || "Юный пациент",
						patientAgeYears: payload.patientAgeYears,
						doctorName: payload.doctorName || "Врач-стоматолог",
						clinicName: payload.clinicName || "DENTE",
						awardReasonRu: payload.awardReasonRu || "За выдающееся мужество в кресле стоматолога!",
						awardedDateIso: payload.awardedDateIso || doc.createdAt?.toISOString() || new Date().toISOString(),
						issueDateRu: payload.issueDateRu || new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
						createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
					};
				});
				return reply.send({ success: true, diplomas: [...mappedFromDb, ...inMemList] });
			}
		} catch { /* fallback to in-memory */ }

		return reply.send({ success: true, diplomas: inMemList });
	});

	app.post("/api/patients/:patientId/pediatric/bravery-diploma", async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "issue pediatric diploma");
		if (!organizationId) return;

		const { patientId } = request.params as { patientId: string };
		if (!UUID_SHAPE.test(patientId)) return reply.code(400).send({ error: "InvalidPatientId" });

		const parsed = issueDiplomaSchema.safeParse(request.body || {});
		if (!parsed.success) return reply.code(400).send({ error: "ValidationFailed", issues: parsed.error.issues });

		const now = new Date();
		const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
		const diplomaNumber = `ДИПЛОМ-ГЕРОЙ-${now.getFullYear()}-${entropy}`;
		const issueDateRu = now.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

		const diplomaRecord: BraveryDiplomaRecord = {
			id: randomUUID(),
			patientId,
			diplomaNumber,
			patientName: parsed.data.patientName,
			patientAgeYears: parsed.data.patientAgeYears,
			doctorName: parsed.data.doctorName,
			clinicName: parsed.data.clinicName,
			awardReasonRu: parsed.data.awardReasonRu,
			awardedDateIso: parsed.data.awardedDateIso || now.toISOString(),
			issueDateRu,
			createdAt: now.toISOString(),
		};

		const currentList = inMemoryDiplomaAudit.get(patientId) || [];
		inMemoryDiplomaAudit.set(patientId, [diplomaRecord, ...currentList]);

		try {
			await db.insert(generatedDocuments).values({
				id: diplomaRecord.id,
				organizationId,
				patientId,
				kind: "post_visit_recommendations",
				status: "issued",
				title: "Диплом за храбрость",
				payloadJson: JSON.stringify(diplomaRecord),
			});
		} catch { /* in-memory fallback */ }

		return reply.code(201).send({ success: true, diploma: diplomaRecord });
	});
}
