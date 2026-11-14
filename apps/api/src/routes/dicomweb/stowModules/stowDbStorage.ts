import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { withTenantCtx } from "../../../db/rls.js";
import * as schema from "../../../db/schema.js";
import type { StowStoreResult } from "./stowTypes.js";
import { persistStowSeriesAndInstance } from "./stowSeriesInstanceStorage.js";

export interface StowPersistParams {
	organizationId: string;
	parsed: {
		studyUid: string;
		seriesUid: string;
		sopInstanceUid: string;
		sopClassUid?: string | null | undefined;
		rows?: number | null | undefined;
		columns?: number | null | undefined;
		dicomPatientName?: string | null | undefined;
		dicomPatientId?: string | null | undefined;
		dicomBirthDate?: string | null | undefined;
	};
	resolvedPatientId: string | null;
	validDoctorId: string | null;
	validVisitId: string | null;
	staffId: string | null;
	operatorLabel: string;
	bindingStatus: "auto_bound" | "manual_bound" | "pending_review" | "unassigned";
	bindingConfidence: number;
	matchMethod: string;
	matchDetailsText: string;
	normalizedRelativePath: string;
	fileSizeOnDisk: number | undefined;
}

export async function persistStowDicomEntities(p: StowPersistParams): Promise<StowStoreResult> {
	return withTenantCtx(p.organizationId, async (tx) => {
		// 1. Study
		let [study] = await tx
			.select({ id: schema.imagingStudies.id })
			.from(schema.imagingStudies)
			.where(and(eq(schema.imagingStudies.organizationId, p.organizationId), eq(schema.imagingStudies.dicomStudyUid, p.parsed.studyUid)))
			.limit(1);

		if (!study) {
			const [createdStudy] = await tx
				.insert(schema.imagingStudies)
				.values({
					organizationId: p.organizationId,
					patientId: p.resolvedPatientId,
					doctorId: p.validDoctorId,
					visitId: p.validVisitId,
					kind: "cbct",
					title: `Исследование КЛКТ ${p.parsed.studyUid}`,
					capturedAt: new Date(),
					sourceKind: "dicomweb",
					sourceName: `STOW-RS${p.operatorLabel}`,
					status: "available",
					dicomStudyUid: p.parsed.studyUid,
					studyInstanceUid: p.parsed.studyUid,
					seriesInstanceUid: p.parsed.seriesUid,
					modality: "CT",
					seriesDescription: "STOW-RS CBCT Series",
					dimensions: p.parsed.rows && p.parsed.columns ? `${p.parsed.columns}x${p.parsed.rows}` : null,
					bindingStatus: p.bindingStatus,
					bindingConfidence: p.bindingConfidence,
					dicomPatientName: p.parsed.dicomPatientName,
					dicomPatientId: p.parsed.dicomPatientId,
					dicomBirthDate: p.parsed.dicomBirthDate,
					storagePath: p.normalizedRelativePath,
					fileSizeBytes: p.fileSizeOnDisk,
					aiSummary: `Загружено через STOW-RS. Врач/Оператор: ${p.staffId ?? p.validDoctorId ?? "Клинический персонал"}. Сопоставление: ${p.matchMethod} (${p.matchDetailsText}).`,
				})
				.returning({ id: schema.imagingStudies.id });
			if (!createdStudy) throw new Error("Не удалось создать запись исследования");
			study = createdStudy;
		} else {
			await tx.update(schema.imagingStudies).set({
				storagePath: p.normalizedRelativePath,
				studyInstanceUid: p.parsed.studyUid,
				seriesInstanceUid: p.parsed.seriesUid,
				modality: "CT",
				fileSizeBytes: p.fileSizeOnDisk,
				dimensions: p.parsed.rows && p.parsed.columns ? `${p.parsed.columns}x${p.parsed.rows}` : undefined,
			}).where(and(eq(schema.imagingStudies.id, study.id), eq(schema.imagingStudies.organizationId, p.organizationId)));
		}

		// 2. Series & Instance in the same atomic transaction
		const { seriesId, instanceId } = await persistStowSeriesAndInstance({
			tx,
			organizationId: p.organizationId,
			studyId: study.id,
			seriesUid: p.parsed.seriesUid,
			sopInstanceUid: p.parsed.sopInstanceUid,
			sopClassUid: p.parsed.sopClassUid,
			normalizedRelativePath: p.normalizedRelativePath,
			rows: p.parsed.rows ?? undefined,
			columns: p.parsed.columns ?? undefined,
		});

		return {
			studyUid: p.parsed.studyUid,
			seriesUid: p.parsed.seriesUid,
			sopInstanceUid: p.parsed.sopInstanceUid,
			sopClassUid: p.parsed.sopClassUid ?? "1.2.840.10008.5.1.4.1.1.1",
			storagePath: p.normalizedRelativePath,
			studyId: study.id,
			seriesId,
			instanceId,
			patientId: p.resolvedPatientId,
			matchMethod: p.matchMethod,
			bindingStatus: p.bindingStatus,
			bindingConfidence: p.bindingConfidence,
		};
	});
}
