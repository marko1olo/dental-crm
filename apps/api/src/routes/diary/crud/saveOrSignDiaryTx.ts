import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { visitDiaries, visits } from "../../../db/schema.js";
import {
	computeDiaryHash,
	DiarySigningError,
	type DiarySigningResult,
	resolveSignatureForStorage,
	runDiarySigningCeremony,
	syncVisitEmkFromDiarySoap,
} from "../../../services/clinical/DiarySigningCeremonyService.js";
import type { z } from "zod";
import type { diaryUpsertSchema } from "../types.js";

export type DiaryUpsertData = z.infer<typeof diaryUpsertSchema>;

export interface SaveOrSignOutcome {
	diaryId: string;
	signing: DiarySigningResult | null;
	draftHash: string | null;
}

export async function executeSaveOrSignDiaryTx(params: {
	data: DiaryUpsertData;
	orgId: string;
	userId: string | null;
}): Promise<SaveOrSignOutcome> {
	const { data, orgId, userId } = params;
	const isSigning = data.status === "signed";

	return await db.transaction(async (tx) => {
		const [existing] = await tx
			.select()
			.from(visitDiaries)
			.where(and(eq(visitDiaries.visitId, data.visitId), eq(visitDiaries.organizationId, orgId)))
			.limit(1)
			.for("update");

		if (existing?.isLocked) {
			throw new DiarySigningError("AlreadyLocked", "Дневник подписан и заблокирован.");
		}

		let diaryId: string;
		if (existing) {
			const updateData: Partial<typeof visitDiaries.$inferInsert> = { updatedAt: new Date(), draftAuthorId: userId };
			if (!existing.authorId) updateData.authorId = userId;
			if (!existing.doctorId) updateData.doctorId = userId;
			if (data.anamnesis !== undefined) updateData.anamnesis = data.anamnesis;
			if (data.statusLocalis !== undefined) updateData.statusLocalis = data.statusLocalis;
			if (data.diagnosisIcd10 !== undefined) updateData.diagnosisIcd10 = data.diagnosisIcd10;
			if (data.diagnosisTooth !== undefined) updateData.diagnosisTooth = data.diagnosisTooth;
			if (data.treatmentDescription !== undefined) updateData.treatmentDescription = data.treatmentDescription;
			if (data.complications !== undefined) updateData.complications = data.complications;
			if (data.comorbidities !== undefined) updateData.comorbidities = data.comorbidities;
			if (data.instrumentTrayBarcode !== undefined) updateData.instrumentTrayBarcode = data.instrumentTrayBarcode.trim() || null;

			const updatedRows = await tx
				.update(visitDiaries)
				.set(updateData)
				.where(and(eq(visitDiaries.id, existing.id), eq(visitDiaries.organizationId, orgId), eq(visitDiaries.isLocked, false)))
				.returning({ id: visitDiaries.id });
			if (updatedRows.length === 0) throw new DiarySigningError("AlreadyLocked", "Дневник подписан и заблокирован.");
			diaryId = existing.id;
		} else {
			const inserted = await tx
				.insert(visitDiaries)
				.values({
					organizationId: orgId, visitId: data.visitId, patientId: data.patientId,
					anamnesis: data.anamnesis, statusLocalis: data.statusLocalis,
					diagnosisIcd10: data.diagnosisIcd10, diagnosisTooth: data.diagnosisTooth,
					treatmentDescription: data.treatmentDescription, complications: data.complications,
					comorbidities: data.comorbidities, draftAuthorId: userId, authorId: userId, doctorId: userId,
					instrumentTrayBarcode: typeof data.instrumentTrayBarcode === "string" ? data.instrumentTrayBarcode.trim() || null : (data.instrumentTrayBarcode ?? null),
				})
				.returning({ id: visitDiaries.id });
			if (!inserted[0]?.id) throw new DiarySigningError("NotSaved", "Дневник приёма не удалось сохранить на сервере.");
			diaryId = inserted[0].id;
		}

		const visitSyncData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.anamnesis !== undefined) visitSyncData.anamnesis = data.anamnesis;
		if (data.statusLocalis !== undefined) visitSyncData.objectiveStatus = data.statusLocalis;
		if (data.diagnosisIcd10 !== undefined) visitSyncData.diagnosis = data.diagnosisIcd10;
		if (data.treatmentDescription !== undefined) visitSyncData.treatmentPlan = data.treatmentDescription;
		await tx.update(visits).set(visitSyncData).where(and(eq(visits.id, data.visitId), eq(visits.organizationId, orgId)));

		if (!isSigning) {
			const [savedRow] = await tx.select().from(visitDiaries).where(and(eq(visitDiaries.id, diaryId), eq(visitDiaries.organizationId, orgId))).limit(1);
			if (!savedRow) return { diaryId, signing: null, draftHash: null };
			const draftHash = computeDiaryHash(
				savedRow.visitId, savedRow.patientId ?? "", savedRow.anamnesis, savedRow.statusLocalis,
				savedRow.treatmentDescription, savedRow.diagnosisIcd10, savedRow.diagnosisTooth,
				savedRow.complications, savedRow.comorbidities, savedRow.instrumentTrayBarcode,
			);
			await tx.update(visitDiaries).set({ diaryHash: draftHash, updatedAt: new Date() }).where(and(eq(visitDiaries.id, diaryId), eq(visitDiaries.organizationId, orgId), eq(visitDiaries.isLocked, false)));
			await syncVisitEmkFromDiarySoap(tx, {
				visitId: savedRow.visitId, organizationId: orgId, anamnesis: savedRow.anamnesis,
				statusLocalis: savedRow.statusLocalis, diagnosisIcd10: savedRow.diagnosisIcd10,
				diagnosisTooth: savedRow.diagnosisTooth, treatmentDescription: savedRow.treatmentDescription,
			});
			return { diaryId, signing: null, draftHash };
		}

		const resolvedPost = await resolveSignatureForStorage({
			pkcs7Signature: data.pkcs7Signature ?? null, userId, organizationId: orgId, diaryHashForMark: null, executor: tx,
		});
		if (!resolvedPost.ok) {
			const errCode = resolvedPost.code === "PepDoctorForbidden" ? "PepDoctorForbidden" : ["PinInvalid", "PinNotSet", "PinRequired", "UserRequired"].includes(resolvedPost.code) ? "PinRejected" : "NotFound";
			throw new DiarySigningError(errCode, resolvedPost.message);
		}
		const signing = await runDiarySigningCeremony(tx, { diaryId, organizationId: orgId, userId, pkcs7Signature: resolvedPost.stored });
		return { diaryId, signing, draftHash: null };
	});
}
