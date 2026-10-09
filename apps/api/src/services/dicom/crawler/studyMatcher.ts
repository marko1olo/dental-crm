/**
 * studyMatcher.ts — Layer 1: Сопоставление метаданных DICOM исследования
 * с карточками пациентов в БД DENTE CRM, дедупликация и разрешение дубликатов.
 */

import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import { and, eq, or } from "drizzle-orm";
import { resolveOrAutoCreatePatientForDicom } from "../dicomPatientAutoBinder.js";
import type { DicomCrawlerDiscoveredStudy } from "./types.js";

export interface StudyDbLookupResult {
	id: string;
	storagePath: string | null;
}

export interface PatientMatchCandidate {
	patientFullName?: string | null | undefined;
	patientChartNumber?: string | null | undefined;
	patientBirthDate?: string | null | undefined;
}

/**
 * Проверка наличия исследования в базе данных по StudyInstanceUID
 */
export async function findExistingStudyByUid(
	orgId: string,
	studyInstanceUid: string,
): Promise<StudyDbLookupResult | null> {
	const [existingDb] = await db
		.select({
			id: schema.imagingStudies.id,
			storagePath: schema.imagingStudies.storagePath,
		})
		.from(schema.imagingStudies)
		.where(
			and(
				eq(schema.imagingStudies.organizationId, orgId),
				eq(schema.imagingStudies.studyInstanceUid, studyInstanceUid),
			),
		)
		.limit(1);

	return existingDb ?? null;
}

/**
 * Проверка наличия исследования в базе данных по StudyInstanceUID или пути к папке
 */
export async function findExistingStudyByUidOrPath(
	orgId: string,
	studyInstanceUid: string,
	folderPath: string,
): Promise<StudyDbLookupResult | null> {
	const [existingDb] = await db
		.select({
			id: schema.imagingStudies.id,
			storagePath: schema.imagingStudies.storagePath,
		})
		.from(schema.imagingStudies)
		.where(
			and(
				eq(schema.imagingStudies.organizationId, orgId),
				or(
					eq(schema.imagingStudies.studyInstanceUid, studyInstanceUid),
					eq(schema.imagingStudies.storagePath, folderPath),
				),
			),
		)
		.limit(1);

	return existingDb ?? null;
}

/**
 * Автоматическое сопоставление метаданных снимка с пациентом CRM
 * (или создание карточки черновика при отсутствии)
 */
export async function matchOrCreatePatient(
	orgId: string,
	candidate: PatientMatchCandidate,
) {
	return resolveOrAutoCreatePatientForDicom(orgId, {
		patientFullName: candidate.patientFullName ?? null,
		patientChartNumber: candidate.patientChartNumber ?? null,
		patientBirthDate: candidate.patientBirthDate ?? null,
		autoCreateDraftIfNotFound: true,
	});
}

/**
 * Дедупликация в реестре оперативной памяти:
 * связывает архив и распакованную папку в единую запись исследования
 */
export function resolveMemoryDuplicate(
	registeredStudies: Map<string, DicomCrawlerDiscoveredStudy>,
	studyInstanceUid: string,
	paths: { archivePath?: string; unpackedFolderPath?: string },
): DicomCrawlerDiscoveredStudy | null {
	const existing = registeredStudies.get(studyInstanceUid);
	if (!existing) return null;

	if (paths.archivePath && !existing.archivePath) {
		existing.archivePath = paths.archivePath;
	}
	if (paths.unpackedFolderPath && !existing.unpackedFolderPath) {
		existing.unpackedFolderPath = paths.unpackedFolderPath;
	}
	existing.status = "duplicate_resolved";

	return existing;
}
