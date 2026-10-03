/**
 * dicomPatientAutoBinder.ts — Автоматическая привязка исследования к существующему пациенту в PostgreSQL 18
 * или создание карточки пациента (Мандат 8e — Doctor Autonomy, ноль препятствий врачу).
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { matchPatientForDicom } from "../../routes/imaging/patientFioBindingEngine.js";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PatientBindingResult {
	patientId: string | null;
	patientFullName: string | null;
	isNewPatientCreated: boolean;
	bindingStatus: "auto_bound" | "manual_bound" | "pending_review" | "unassigned";
	bindingConfidence: number;
	matchMethod: string;
	matchDetails: string;
}

export interface PatientResolutionInput {
	patientFullName: string | null;
	patientChartNumber: string | null;
	patientBirthDate: string | null;
	patientSex?: "male" | "female" | null;
	autoCreateDraftIfNotFound?: boolean;
}

/**
 * Резолвинг или авто-создание пациента для входящего DICOM-исследования.
 */
export async function resolveOrAutoCreatePatientForDicom(
	organizationId: string,
	input: PatientResolutionInput,
): Promise<PatientBindingResult> {
	const {
		patientFullName,
		patientChartNumber,
		patientBirthDate,
		patientSex,
		autoCreateDraftIfNotFound = true,
	} = input;

	// 1. Поиск по прямому номеру карты Vatech / амбулаторной карте (pat_chartno / patient_id)
	if (patientChartNumber && patientChartNumber.trim().length > 0) {
		const rawChart = patientChartNumber.trim();

		// Если это валидный UUID нашего CRM
		if (UUID_SHAPE.test(rawChart)) {
			const [directUuidMatch] = await db
				.select({
					id: schema.patients.id,
					fullName: schema.patients.fullName,
					mergedIntoPatientId: schema.patients.mergedIntoPatientId,
				})
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.organizationId, organizationId),
						eq(schema.patients.id, rawChart),
					),
				)
				.limit(1);

			if (directUuidMatch) {
				const effectiveId = directUuidMatch.mergedIntoPatientId ?? directUuidMatch.id;
				return {
					patientId: effectiveId,
					patientFullName: directUuidMatch.fullName,
					isNewPatientCreated: false,
					bindingStatus: "auto_bound",
					bindingConfidence: 100,
					matchMethod: "exact_uuid_match",
					matchDetails: `Прямое совпадение по UUID пациента: ${directUuidMatch.fullName}`,
				};
			}
		}

		// Поиск по administrativeProfile->chartNumber, vatechPatId или medicalCardNumber
		const [chartMatch] = await db
			.select({
				id: schema.patients.id,
				fullName: schema.patients.fullName,
				mergedIntoPatientId: schema.patients.mergedIntoPatientId,
			})
			.from(schema.patients)
			.where(
				and(
					eq(schema.patients.organizationId, organizationId),
					sql`(${schema.patients.administrativeProfile}->>'chartNumber' = ${rawChart} 
						OR ${schema.patients.administrativeProfile}->>'vatechPatId' = ${rawChart}
						OR ${schema.patients.administrativeProfile}->>'medicalCardNumber' = ${rawChart})`,
				),
			)
			.limit(1);

		if (chartMatch) {
			const effectiveId = chartMatch.mergedIntoPatientId ?? chartMatch.id;
			return {
				patientId: effectiveId,
				patientFullName: chartMatch.fullName,
				isNewPatientCreated: false,
				bindingStatus: "auto_bound",
				bindingConfidence: 100,
				matchMethod: "exact_chart_number_match",
				matchDetails: `Точное совпадение по номеру карты/ID аппарата (${rawChart}): ${chartMatch.fullName}`,
			};
		}
	}

	// 2. Интеллектуальный поиск по ФИО и дате рождения через patientFioBindingEngine
	if (patientFullName && patientFullName.trim().length > 0) {
		const autoBindRes = await matchPatientForDicom(organizationId, {
			dicomPatientName: patientFullName,
			dicomPatientId: patientChartNumber,
			dicomBirthDate: patientBirthDate,
		});

		if (autoBindRes.patientId && autoBindRes.status === "auto_bound") {
			return {
				patientId: autoBindRes.patientId,
				patientFullName: autoBindRes.patientFullName,
				isNewPatientCreated: false,
				bindingStatus: "auto_bound",
				bindingConfidence: autoBindRes.confidence,
				matchMethod: autoBindRes.matchMethod,
				matchDetails: autoBindRes.matchDetails,
			};
		}

		// Если уверенность частичная (pending_review), возвращаем кандидата
		if (autoBindRes.patientId && autoBindRes.status === "pending_review") {
			return {
				patientId: autoBindRes.patientId,
				patientFullName: autoBindRes.patientFullName,
				isNewPatientCreated: false,
				bindingStatus: "pending_review",
				bindingConfidence: autoBindRes.confidence,
				matchMethod: autoBindRes.matchMethod,
				matchDetails: autoBindRes.matchDetails,
			};
		}
	}

	// 3. Авто-создание карточки пациента (Мандат 8e)
	// Врач нажал кнопку на томографе — снимок обязан сохраниться и привязаться к новому пациенту,
	// а не потеряться в небытии и не выдать ошибку 404/500!
	if (autoCreateDraftIfNotFound && (patientFullName || patientChartNumber)) {
		const generatedFullName =
			patientFullName && patientFullName.trim().length > 0
				? patientFullName.trim()
				: `Пациент карты ${patientChartNumber ?? new Date().toLocaleDateString("ru-RU")}`;

		const [newPatient] = await db
			.insert(schema.patients)
			.values({
				organizationId,
				fullName: generatedFullName,
				birthDate: patientBirthDate,
				status: "active",
				isSynced: false,
				notes: "Автоматически создан при прямом приеме снимка с аппарата лучевой диагностики.",
				administrativeProfile: null,
			})
			.returning({
				id: schema.patients.id,
				fullName: schema.patients.fullName,
			});

		if (newPatient) {
			return {
				patientId: newPatient.id,
				patientFullName: newPatient.fullName,
				isNewPatientCreated: true,
				bindingStatus: "auto_bound",
				bindingConfidence: 95,
				matchMethod: "auto_created_from_dicom",
				matchDetails: `Создана новая амбулаторная карточка пациента: ${newPatient.fullName}`,
			};
		}
	}

	// 4. Пациент не идентифицирован — исследование уходит в неразобранную очередь PACS
	return {
		patientId: null,
		patientFullName: null,
		isNewPatientCreated: false,
		bindingStatus: "unassigned",
		bindingConfidence: 0,
		matchMethod: "unassigned",
		matchDetails: "Данные пациента не совпали с картотекой клиники (направлено в очередь неразобранных снимков).",
	};
}

/**
 * 1-клик ручная перепривязка исследования к любому другому пациенту из картотеки.
 * (Мандат 8e — Doctor Autonomy: врач/рентгенолаборант имеет 100% суверенное право
 * перепривязать ошибочно сопоставленный или неразобранный снимок в 1 клик).
 */
export async function rebindStudyToPatient(
	organizationId: string,
	studyId: string,
	targetPatientId: string,
): Promise<{
	success: boolean;
	studyId: string;
	patientId: string;
	patientFullName: string;
	bindingStatus: "manual_bound";
	bindingConfidence: number;
	matchMethod: "manual_bound_by_doctor";
	matchDetails: string;
}> {
	// 1. Защита от невалидного формата UUID
	if (!UUID_SHAPE.test(studyId)) {
		throw new Error(`Невалидный UUID исследования: ${studyId}`);
	}
	if (!UUID_SHAPE.test(targetPatientId)) {
		throw new Error(`Невалидный UUID пациента: ${targetPatientId}`);
	}

	// 2. Проверяем существование целевого пациента в организации
	const [patient] = await db
		.select({
			id: schema.patients.id,
			fullName: schema.patients.fullName,
			mergedIntoPatientId: schema.patients.mergedIntoPatientId,
		})
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, targetPatientId),
			),
		)
		.limit(1);

	if (!patient) {
		throw new Error(`Пациент с ID ${targetPatientId} не найден в базе клиники.`);
	}

	const effectivePatientId = patient.mergedIntoPatientId ?? patient.id;

	// 3. Обновляем привязку исследования
	await db
		.update(schema.imagingStudies)
		.set({
			patientId: effectivePatientId,
			bindingStatus: "manual_bound",
			bindingConfidence: 100,
			aiSummary: `Вручную привязано врачом к пациенту: ${patient.fullName}`,
		})
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.id, studyId),
			),
		);

	return {
		success: true,
		studyId,
		patientId: effectivePatientId,
		patientFullName: patient.fullName,
		bindingStatus: "manual_bound",
		bindingConfidence: 100,
		matchMethod: "manual_bound_by_doctor",
		matchDetails: `Исследование КТ успешно перепривязано врачом к пациенту ${patient.fullName}.`,
	};
}

/**
 * 1-клик отвязка исследования от пациента (перевод в неразобранную очередь).
 */
export async function unbindStudy(
	organizationId: string,
	studyId: string,
): Promise<{
	success: boolean;
	studyId: string;
	patientId: null;
	bindingStatus: "unassigned";
}> {
	if (!UUID_SHAPE.test(studyId)) {
		throw new Error(`Невалидный UUID исследования: ${studyId}`);
	}

	await db
		.update(schema.imagingStudies)
		.set({
			patientId: null,
			bindingStatus: "unassigned",
			bindingConfidence: 0,
			aiSummary: "Исследование отвязано от пациента врачом",
		})
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.id, studyId),
			),
		);

	return {
		success: true,
		studyId,
		patientId: null,
		bindingStatus: "unassigned",
	};
}
