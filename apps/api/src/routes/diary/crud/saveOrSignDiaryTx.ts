import { and, eq, isNull } from "drizzle-orm";
import { type TenantDb, withTenantWriteCtx } from "../../../db/rls.js";
import { visitDiaries, visitDiaryRevisions, visits } from "../../../db/schema.js";
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
	tx?: TenantDb;
}): Promise<SaveOrSignOutcome> {
	const { data, orgId, userId } = params;
	const isSigning = data.status === "signed";

	const runInTx = async (tx: TenantDb): Promise<SaveOrSignOutcome> => {
		const targetTooth = data.diagnosisTooth?.trim() || null;
		const toothCondition = targetTooth
			? eq(visitDiaries.diagnosisTooth, targetTooth)
			: isNull(visitDiaries.diagnosisTooth);

		let existing = (
			await tx
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.visitId, data.visitId),
						eq(visitDiaries.organizationId, orgId),
						toothCondition,
					),
				)
				.limit(1)
				.for("update")
		)[0];

		if (!existing) {
			const candidateDiaries = await tx
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.visitId, data.visitId),
						eq(visitDiaries.organizationId, orgId),
					),
				)
				.for("update");

			if (targetTooth) {
				const matchByTooth = candidateDiaries.find((d) => d.diagnosisTooth === targetTooth);
				if (matchByTooth) {
					existing = matchByTooth;
				} else {
					const unassignedDraft = candidateDiaries.find((d) => !d.diagnosisTooth && !d.isLocked);
					if (unassignedDraft) {
						existing = unassignedDraft;
					}
				}
			} else {
				const lockedDiary = candidateDiaries.find((d) => d.isLocked);
				if (lockedDiary) {
					existing = lockedDiary;
				} else if (candidateDiaries.length === 1) {
					existing = candidateDiaries[0];
				} else {
					const unassignedDraft = candidateDiaries.find((d) => !d.diagnosisTooth && !d.isLocked);
					if (unassignedDraft) {
						existing = unassignedDraft;
					}
				}
			}
		}

		let diaryId: string;
		if (existing) {
			if (existing.isLocked && isSigning) {
				throw new DiarySigningError("AlreadyLocked", "Дневник уже подписан.");
			}
			if (existing.isLocked) {
				// Автономия врача (Мандат 8e, «Исправленному верить»):
				// Не кирпичим врача ошибкой AlreadyLocked, а фиксируем ревизию в истории
				await tx.insert(visitDiaryRevisions).values({
					organizationId: orgId,
					diaryId: existing.id,
					previousComplaint: existing.complaint,
					previousAnamnesis: existing.anamnesis,
					previousStatusLocalis: existing.statusLocalis,
					previousDiagnosisIcd10: existing.diagnosisIcd10,
					previousDiagnosisTooth: existing.diagnosisTooth,
					previousTreatmentDescription: existing.treatmentDescription,
					previousComplications: existing.complications,
					previousComorbidities: existing.comorbidities,
					previousInstrumentTrayBarcode: existing.instrumentTrayBarcode,
					revisionReason: "Клиническое дополнение дневника приёма врачом («Исправленному верить»)",
					revisedByUserId: userId,
				});
			}

			const priorVersion = existing.version ?? 1;
			const updateData: Partial<typeof visitDiaries.$inferInsert> = {
				updatedAt: new Date(),
				draftAuthorId: userId,
				...(existing.isLocked ? { version: priorVersion + 1 } : {}),
			};
			if (!existing.authorId) updateData.authorId = userId;
			if (!existing.doctorId) updateData.doctorId = userId;
			if (data.complaint !== undefined) updateData.complaint = data.complaint;
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
				.where(and(eq(visitDiaries.id, existing.id), eq(visitDiaries.organizationId, orgId)))
				.returning({ id: visitDiaries.id });
			if (updatedRows.length === 0) throw new DiarySigningError("NotSaved", "Дневник приёма не удалось обновить на сервере.");
			diaryId = existing.id;
		} else {
			const inserted = await tx
				.insert(visitDiaries)
				.values({
					organizationId: orgId, visitId: data.visitId, patientId: data.patientId,
					complaint: data.complaint, anamnesis: data.anamnesis, statusLocalis: data.statusLocalis,
					diagnosisIcd10: data.diagnosisIcd10, diagnosisTooth: data.diagnosisTooth,
					treatmentDescription: data.treatmentDescription, complications: data.complications,
					comorbidities: data.comorbidities, draftAuthorId: userId, authorId: userId, doctorId: userId,
					instrumentTrayBarcode: typeof data.instrumentTrayBarcode === "string" ? data.instrumentTrayBarcode.trim() || null : (data.instrumentTrayBarcode ?? null),
				})
				.returning({ id: visitDiaries.id });
			if (!inserted[0]?.id) throw new DiarySigningError("NotSaved", "Дневник приёма не удалось сохранить на сервере.");
			diaryId = inserted[0].id;
		}

		const [currentVisit] = await tx
			.select({ draftAutosave: visits.draftAutosave, revision: visits.revision })
			.from(visits)
			.where(and(eq(visits.id, data.visitId), eq(visits.organizationId, orgId)))
			.limit(1);

		// Собираем консолидированный диагноз визита по всем зубам (Multi-Tooth ACID)
		const allDiariesForVisit = await tx
			.select({
				diagnosisIcd10: visitDiaries.diagnosisIcd10,
				diagnosisTooth: visitDiaries.diagnosisTooth,
			})
			.from(visitDiaries)
			.where(and(eq(visitDiaries.visitId, data.visitId), eq(visitDiaries.organizationId, orgId)));

		const toothDiagnosesMap = new Map<string, string>();
		for (const d of allDiariesForVisit) {
			if (d.diagnosisIcd10) {
				const key = d.diagnosisTooth?.trim() || "general";
				toothDiagnosesMap.set(key, d.diagnosisTooth ? `${d.diagnosisIcd10} (${d.diagnosisTooth})` : d.diagnosisIcd10);
			}
		}
		if (data.diagnosisIcd10) {
			const key = targetTooth || "general";
			toothDiagnosesMap.set(key, targetTooth ? `${data.diagnosisIcd10} (${targetTooth})` : data.diagnosisIcd10);
		}
		const consolidatedDiagnosis = Array.from(toothDiagnosesMap.values()).join(", ");

		const existingDraftAutosave = (currentVisit?.draftAutosave as Record<string, unknown> | null) || {};
		const existingDraftObj = (existingDraftAutosave.draft as Record<string, unknown> | null) || {};
		const updatedDraftAutosave = {
			...existingDraftAutosave,
			visitId: data.visitId,
			patientId: data.patientId,
			selectedSpecialty: existingDraftAutosave.selectedSpecialty || "therapist",
			transcript: existingDraftAutosave.transcript || "",
			draft: {
				...existingDraftObj,
				...(data.complaint !== undefined ? { complaint: data.complaint } : {}),
				...(data.anamnesis !== undefined ? { anamnesis: data.anamnesis } : {}),
				...(data.statusLocalis !== undefined ? { objectiveStatus: data.statusLocalis } : {}),
				...(data.diagnosisIcd10 !== undefined ? { diagnosis: consolidatedDiagnosis || data.diagnosisIcd10 } : {}),
				...(data.treatmentDescription !== undefined ? { treatmentPlan: data.treatmentDescription } : {}),
			},
			baseRevision: currentVisit?.revision ?? null,
			serverSavedAt: new Date().toISOString(),
		};

		const visitSyncData: Record<string, unknown> = {
			updatedAt: new Date(),
			draftAutosave: updatedDraftAutosave,
		};
		if (data.complaint !== undefined) visitSyncData.complaint = data.complaint;
		if (data.anamnesis !== undefined) visitSyncData.anamnesis = data.anamnesis;
		if (data.statusLocalis !== undefined) visitSyncData.objectiveStatus = data.statusLocalis;
		if (data.diagnosisIcd10 !== undefined) visitSyncData.diagnosis = consolidatedDiagnosis || data.diagnosisIcd10;
		if (data.treatmentDescription !== undefined) visitSyncData.treatmentPlan = data.treatmentDescription;
		await tx.update(visits).set(visitSyncData).where(and(eq(visits.id, data.visitId), eq(visits.organizationId, orgId)));

		if (!isSigning) {
			const [savedRow] = await tx.select().from(visitDiaries).where(and(eq(visitDiaries.id, diaryId), eq(visitDiaries.organizationId, orgId))).limit(1);
			if (!savedRow) return { diaryId, signing: null, draftHash: null };
			const draftHash = computeDiaryHash(
				savedRow.visitId,
				savedRow.patientId ?? "",
				savedRow.complaint,
				savedRow.anamnesis,
				savedRow.statusLocalis,
				savedRow.treatmentDescription,
				savedRow.diagnosisIcd10,
				savedRow.diagnosisTooth,
				savedRow.complications,
				savedRow.comorbidities,
			);
			await tx.update(visitDiaries).set({ diaryHash: draftHash, updatedAt: new Date() }).where(and(eq(visitDiaries.id, diaryId), eq(visitDiaries.organizationId, orgId)));
			await syncVisitEmkFromDiarySoap(tx, {
				visitId: savedRow.visitId, organizationId: orgId, complaint: savedRow.complaint, anamnesis: savedRow.anamnesis,
				statusLocalis: savedRow.statusLocalis, diagnosisIcd10: consolidatedDiagnosis || savedRow.diagnosisIcd10,
				diagnosisTooth: consolidatedDiagnosis ? null : savedRow.diagnosisTooth, treatmentDescription: savedRow.treatmentDescription,
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
	};

	return params.tx
		? await runInTx(params.tx)
		: await withTenantWriteCtx(orgId, runInTx);
}
