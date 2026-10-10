/**
 * @file bindingOrchestrator.ts
 * @description Candidate lookup in PostgreSQL 18, confident (>90%) auto-binding,
 * homonym disambiguation, and batch study scanning for DICOM/CBCT imaging.
 */

import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import { calculateMatchScore } from "./fioMatcher.js";
import { cleanDicomName } from "./translitUtils.js";
import type {
	AutoBindScanSummary,
	BindingStatus,
	PatientFioBindingResult,
	ScoredMatch,
} from "./types.js";

/**
 * Поиск наиболее подходящего пациента для исследования DICOM в рамках организации
 */
export async function matchPatientForDicom(
	organizationId: string,
	dicomData: {
		dicomPatientName?: string | null;
		dicomPatientId?: string | null;
		dicomBirthDate?: string | null;
	},
): Promise<PatientFioBindingResult> {
	// 1. Поиск по прямому PatientID (только если значение является валидным UUID)
	if (dicomData.dicomPatientId) {
		const trimmedId = dicomData.dicomPatientId.trim();
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedId);
		if (isUuid) {
			const [patientById] = await db
				.select({
					id: schema.patients.id,
					fullName: schema.patients.fullName,
					birthDate: schema.patients.birthDate,
					mergedIntoPatientId: schema.patients.mergedIntoPatientId,
				})
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.organizationId, organizationId),
						eq(schema.patients.id, trimmedId),
					),
				)
				.limit(1);

			if (patientById) {
				const targetId = patientById.mergedIntoPatientId ?? patientById.id;
				return {
					patientId: targetId,
					patientFullName: patientById.fullName,
					confidence: 100,
					status: "auto_bound",
					matchMethod: "dicom_patient_id",
					matchDetails: "Прямое совпадение по номеру/ID карты пациента",
				};
			}
		}

		// 1b. Поиск по номеру карты / ID аппарата (не-UUID безопасный поиск)
		if (!isUuid && trimmedId.length > 0) {
			const [patientByChart] = await db
				.select({
					id: schema.patients.id,
					fullName: schema.patients.fullName,
					birthDate: schema.patients.birthDate,
					mergedIntoPatientId: schema.patients.mergedIntoPatientId,
				})
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.organizationId, organizationId),
						sql`(${schema.patients.administrativeProfile}->>'chartNumber' = ${trimmedId} 
							OR ${schema.patients.administrativeProfile}->>'vatechPatId' = ${trimmedId}
							OR ${schema.patients.administrativeProfile}->>'medicalCardNumber' = ${trimmedId})`,
					),
				)
				.limit(1);

			if (patientByChart) {
				const targetId = patientByChart.mergedIntoPatientId ?? patientByChart.id;
				return {
					patientId: targetId,
					patientFullName: patientByChart.fullName,
					confidence: 100,
					status: "auto_bound",
					matchMethod: "dicom_chart_number",
					matchDetails: `Точное совпадение по номеру карты/ID аппарата (${trimmedId}): ${patientByChart.fullName}`,
				};
			}
		}
	}

	const cleanedName = cleanDicomName(dicomData.dicomPatientName);
	if (!cleanedName) {
		return {
			patientId: null,
			patientFullName: null,
			confidence: 0,
			status: "unassigned",
			matchMethod: "no_dicom_identity",
			matchDetails: "В заголовке DICOM отсутствует PatientName и PatientID",
		};
	}

	// 2. Получение пациентов клиники для скоринга
	// Выбираем активных пациентов организации
	const allPatients = await db
		.select({
			id: schema.patients.id,
			fullName: schema.patients.fullName,
			birthDate: schema.patients.birthDate,
			mergedIntoPatientId: schema.patients.mergedIntoPatientId,
		})
		.from(schema.patients)
		.where(eq(schema.patients.organizationId, organizationId));

	if (allPatients.length === 0) {
		return {
			patientId: null,
			patientFullName: null,
			confidence: 0,
			status: "unassigned",
			matchMethod: "empty_patient_directory",
			matchDetails: "В клинике нет зарегистрированных пациентов",
		};
	}

	// 3. Вычисление скоров для всех кандидатов
	const candidates: ScoredMatch[] = [];

	for (const p of allPatients) {
		const targetId = p.mergedIntoPatientId ?? p.id;
		const scored = calculateMatchScore(dicomData, {
			id: targetId,
			fullName: p.fullName,
			birthDate: p.birthDate,
		});

		if (scored.confidence >= 50) {
			candidates.push(scored);
		}
	}

	// Сортировка кандидатов по убыванию rawScore и точного соответствия даты рождения
	candidates.sort((a, b) => {
		if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
		if (b.exactBirthDateMatch !== a.exactBirthDateMatch) {
			return b.exactBirthDateMatch ? 1 : -1;
		}
		return b.confidence - a.confidence;
	});

	if (candidates.length === 0) {
		return {
			patientId: null,
			patientFullName: null,
			confidence: 0,
			status: "unassigned",
			matchMethod: "no_matching_candidate",
			matchDetails: `Пациент с именем "${cleanedName}" не найден среди пациентов клиники`,
		};
	}

	const bestCandidate = candidates[0]!;

	// Разруливание полных тезок (гомонимов) по дате рождения:
	// Если есть второй кандидат с близким скором (разница < 8%), проверяем, подтверждена ли дата рождения у лучшего
	if (candidates.length > 1) {
		const secondCandidate = candidates[1]!;
		const isDisambiguatedByBirthDate =
			bestCandidate.exactBirthDateMatch &&
			!secondCandidate.exactBirthDateMatch &&
			bestCandidate.confidence >= 90;

		if (
			!isDisambiguatedByBirthDate &&
			bestCandidate.confidence >= 90 &&
			bestCandidate.confidence - secondCandidate.confidence < 8
		) {
			return {
				patientId: bestCandidate.patientId,
				patientFullName: bestCandidate.patientFullName,
				confidence: bestCandidate.confidence,
				status: "pending_review",
				matchMethod: "homonym_collision_pending_review",
				matchDetails: `Найдено несколько похожих пациентов (${bestCandidate.patientFullName} и ${secondCandidate.patientFullName}). Требуется подтверждение врача.`,
				candidates: candidates.slice(0, 5),
			};
		}
	}

	return {
		patientId:
			bestCandidate.status === "unassigned" ? null : bestCandidate.patientId,
		patientFullName: bestCandidate.patientFullName,
		confidence: bestCandidate.confidence,
		status: bestCandidate.status,
		matchMethod: bestCandidate.matchMethod,
		matchDetails: bestCandidate.matchDetails,
		candidates: candidates.slice(0, 5),
	};
}

/**
 * Пакетное сканирование и автопривязка неразобранных КТ по базе пациентов клиники
 */
export async function autoBindUnassignedStudies(
	organizationId: string,
): Promise<AutoBindScanSummary> {
	// Выбираем неразобранные исследования ('unassigned' или 'pending_review' или patient_id IS NULL)
	const studies = await db
		.select({
			id: schema.imagingStudies.id,
			patientId: schema.imagingStudies.patientId,
			dicomPatientName: schema.imagingStudies.dicomPatientName,
			dicomPatientId: schema.imagingStudies.dicomPatientId,
			dicomBirthDate: schema.imagingStudies.dicomBirthDate,
			bindingStatus: schema.imagingStudies.bindingStatus,
		})
		.from(schema.imagingStudies)
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				or(
					isNull(schema.imagingStudies.patientId),
					inArray(schema.imagingStudies.bindingStatus, [
						"unassigned",
						"pending_review",
					]),
				),
			),
		);

	const summary: AutoBindScanSummary = {
		scanned: studies.length,
		autoBound: 0,
		pendingReview: 0,
		unassigned: 0,
		results: [],
	};

	for (const study of studies) {
		const matchResult = await matchPatientForDicom(organizationId, {
			dicomPatientName: study.dicomPatientName,
			dicomPatientId: study.dicomPatientId,
			dicomBirthDate: study.dicomBirthDate,
		});

		let newStatus: BindingStatus = matchResult.status;
		let assignedPatientId = matchResult.patientId;

		if (matchResult.status === "auto_bound" && assignedPatientId) {
			summary.autoBound++;
			await db
				.update(schema.imagingStudies)
				.set({
					patientId: assignedPatientId,
					bindingStatus: "auto_bound",
					bindingConfidence: matchResult.confidence,
					aiSummary: `Автопривязано к пациенту: ${matchResult.patientFullName} (${matchResult.matchMethod}). ${matchResult.matchDetails}`,
				})
				.where(
					and(
						eq(schema.imagingStudies.id, study.id),
						eq(schema.imagingStudies.organizationId, organizationId),
					),
				);
		} else if (matchResult.status === "pending_review") {
			summary.pendingReview++;
			await db
				.update(schema.imagingStudies)
				.set({
					patientId: assignedPatientId ?? study.patientId,
					bindingStatus: "pending_review",
					bindingConfidence: matchResult.confidence,
					aiSummary: `Требует подтверждения врача: кандидат ${matchResult.patientFullName ?? "не определен"} (${matchResult.confidence}%). ${matchResult.matchDetails}`,
				})
				.where(
					and(
						eq(schema.imagingStudies.id, study.id),
						eq(schema.imagingStudies.organizationId, organizationId),
					),
				);
		} else {
			summary.unassigned++;
			newStatus = "unassigned";
			assignedPatientId = null;
		}

		summary.results.push({
			studyId: study.id,
			patientId: assignedPatientId,
			patientFullName: matchResult.patientFullName,
			status: newStatus,
			confidence: matchResult.confidence,
			matchMethod: matchResult.matchMethod,
		});
	}

	return summary;
}
