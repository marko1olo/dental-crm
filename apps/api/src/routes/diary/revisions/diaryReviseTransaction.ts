import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { sterilizationLogs, visitDiaries, visitDiaryRevisions } from "../../../db/schema.js";
import {
	computeDiaryHash,
	syncVisitEmkFromDiarySoap,
} from "../../../services/clinical/DiarySigningCeremonyService.js";
import { isDoctorOrClinicalSigner } from "../types.js";
import type { ReviseInputData, ReviseTxResult } from "./revisionsTypes.js";

export async function executeDiaryReviseTx(params: {
	id: string;
	orgId: string;
	userId: string | null;
	role: string;
	body: ReviseInputData;
}): Promise<ReviseTxResult> {
	const { id, orgId, userId, role, body } = params;

	return await db.transaction(async (tx) => {
		const [existing] = await tx
			.select()
			.from(visitDiaries)
			.where(and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)))
			.for("update");

		if (!existing) return { kind: "not_found" as const };
		if (!existing.isLocked) return { kind: "not_locked" as const };

		const isAuthorized =
			isDoctorOrClinicalSigner(role) ||
			(Boolean(userId) && (existing.doctorId === userId || existing.authorId === userId || existing.lockedByUserId === userId));
		if (!isAuthorized) return { kind: "forbidden" as const };

		const nextTrayBarcode = body.instrumentTrayBarcode !== undefined ? body.instrumentTrayBarcode.trim() : (existing.instrumentTrayBarcode ?? "");
		if (body.instrumentTrayBarcode !== undefined && nextTrayBarcode.length > 0) {
			const [trayLog] = await tx
				.select({ id: sterilizationLogs.id, status: sterilizationLogs.status })
				.from(sterilizationLogs)
				.where(and(eq(sterilizationLogs.organizationId, orgId), eq(sterilizationLogs.barcode, nextTrayBarcode)))
				.orderBy(desc(sterilizationLogs.timestamp))
				.limit(1);
			if (trayLog?.status === "failed") return { kind: "invalid_tray" as const };
		}

		const newHash = computeDiaryHash(
			existing.visitId, existing.patientId ?? "", body.anamnesis ?? existing.anamnesis,
			body.statusLocalis ?? existing.statusLocalis, body.treatmentDescription ?? existing.treatmentDescription,
			body.diagnosisIcd10 ?? existing.diagnosisIcd10, body.diagnosisTooth ?? existing.diagnosisTooth,
			body.complications ?? existing.complications, body.comorbidities ?? existing.comorbidities, nextTrayBarcode,
		);
		const priorVersion = existing.version ?? 1;

		const updatedRows = await tx
			.update(visitDiaries)
			.set({
				anamnesis: body.anamnesis ?? existing.anamnesis, statusLocalis: body.statusLocalis ?? existing.statusLocalis,
				diagnosisIcd10: body.diagnosisIcd10 ?? existing.diagnosisIcd10, diagnosisTooth: body.diagnosisTooth ?? existing.diagnosisTooth,
				treatmentDescription: body.treatmentDescription ?? existing.treatmentDescription,
				complications: body.complications ?? existing.complications, comorbidities: body.comorbidities ?? existing.comorbidities,
				instrumentTrayBarcode: body.instrumentTrayBarcode !== undefined ? nextTrayBarcode || null : existing.instrumentTrayBarcode,
				diaryHash: newHash, cryptoSignaturePkcs7: null, version: priorVersion + 1, updatedAt: new Date(),
			})
			.where(and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId), eq(visitDiaries.isLocked, true), eq(visitDiaries.version, priorVersion)))
			.returning({ id: visitDiaries.id });

		if (updatedRows.length === 0) return { kind: "update_lost" as const };

		await tx.insert(visitDiaryRevisions).values({
			organizationId: orgId, diaryId: existing.id, previousAnamnesis: existing.anamnesis,
			previousStatusLocalis: existing.statusLocalis, previousDiagnosisIcd10: existing.diagnosisIcd10,
			previousDiagnosisTooth: existing.diagnosisTooth, previousTreatmentDescription: existing.treatmentDescription,
			previousComplications: existing.complications, previousComorbidities: existing.comorbidities,
			previousInstrumentTrayBarcode: existing.instrumentTrayBarcode, revisionReason: body.revisionReason, revisedByUserId: userId,
		});

		await syncVisitEmkFromDiarySoap(tx, {
			visitId: existing.visitId, organizationId: orgId, anamnesis: body.anamnesis ?? existing.anamnesis,
			statusLocalis: body.statusLocalis ?? existing.statusLocalis, diagnosisIcd10: body.diagnosisIcd10 ?? existing.diagnosisIcd10,
			diagnosisTooth: body.diagnosisTooth ?? existing.diagnosisTooth, treatmentDescription: body.treatmentDescription ?? existing.treatmentDescription,
		});

		const [tally] = await tx.select({ total: count() }).from(visitDiaryRevisions).where(and(eq(visitDiaryRevisions.diaryId, existing.id), eq(visitDiaryRevisions.organizationId, orgId)));
		return { kind: "ok" as const, hash: newHash, revisionCount: tally?.total ?? 0 };
	});
}
