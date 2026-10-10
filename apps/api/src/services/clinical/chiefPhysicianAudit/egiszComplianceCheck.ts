/**
 * egiszComplianceCheck.ts — Layer 2: Консультативная проверка готовности ЭМК к выгрузке в ЕГИСЗ РЭМД.
 *
 * МАНДАТЫ 8e & 8i (АВТОНОМИЯ ВРАЧА И АНТИ-КАРГОКУЛЬТ):
 * В амбулаторной стоматологии софт служит врачу, а не бюрократическим инстанциям!
 * Данный модуль работает исключительно в фоновом консультативном режиме (Advisory Mode):
 * - НОЛЬ блокировок подписания приёма врачом;
 * - НОЛЬ блокировок кассы или сохранения протокола;
 * - Выдаёт подсказки и рекомендации по заполнению полей для передачи СЭМД в ЕГИСЗ РЭМД Минздрава РФ.
 */

import { Icd10ClinicalValidator } from "../Icd10ClinicalValidator.js";
import type { EgisZRemdCheckResult, Order203nCriteriaEvaluation } from "./types.js";

export interface EgiszCheckParams {
	diary: {
		anamnesis?: string | null;
		statusLocalis?: string | null;
		diagnosisIcd10?: string | null;
		diagnosisTooth?: string | null;
		treatmentDescription?: string | null;
	} | null;
	patient?: {
		snils?: string | null;
		birthDate?: string | null;
		fullName?: string | null;
	} | null;
	attendingDoctor?: {
		fullName?: string | null;
		snils?: string | null;
		specialty?: string | null;
	} | null;
	criteriaEvaluation?: Partial<Order203nCriteriaEvaluation> | null;
}

/**
 * Проверка соответствия протокола структурированным требованиям ЕГИСЗ РЭМД.
 * Возвращает неблокирующий консультативный отчет для врача и начмеда.
 */
export function checkEgiszRemdCompliance(
	params: EgiszCheckParams,
): EgisZRemdCheckResult {
	const advisoryWarnings: string[] = [];
	const missingRemdFields: string[] = [];
	const recommendations: string[] = [];

	let passedChecks = 0;
	const totalChecks = 6;

	// 1. Проверка СНИЛС пациента (для ЕГИСЗ РЭМД желателен СНИЛС)
	const patientSnils = (params.patient?.snils ?? "").trim().replace(/\D/g, "");
	if (patientSnils.length === 11) {
		passedChecks++;
	} else {
		missingRemdFields.push("snils_patient");
		advisoryWarnings.push("Не указан или некорректен СНИЛС пациента (11 цифр).");
		recommendations.push("Запросить СНИЛС пациента на ресепшене для автоматической синхронизации с Госуслугами.");
	}

	// 2. Проверка валидности диагноза МКБ-10
	const icd10 = (params.diary?.diagnosisIcd10 ?? "").trim();
	const tooth = (params.diary?.diagnosisTooth ?? "").trim();
	let isIcdValid = false;

	if (icd10.length > 0) {
		const valResult = Icd10ClinicalValidator.validate(icd10, tooth || null);
		isIcdValid = valResult.isValid;
	}

	if (isIcdValid) {
		passedChecks++;
	} else {
		missingRemdFields.push("diagnosis_icd10");
		advisoryWarnings.push("Диагноз по МКБ-10 не указан либо отсутствует в стоматологическом классификаторе СтАР.");
		recommendations.push("Уточнить код МКБ-10 (например, K02.1 для кариеса дентина или K04.0 для пульпита).");
	}

	// 3. Проверка наличия ИДС (ст. 20 323-ФЗ)
	const hasIds = Boolean(params.criteriaEvaluation?.informedConsentPresent);
	if (hasIds) {
		passedChecks++;
	} else {
		missingRemdFields.push("informed_consent");
		advisoryWarnings.push("К визиту не прикреплен подписанный электронный или бумажный бланк ИДС.");
		recommendations.push("Сформировать ИДС через раздел «Документы» перед отправкой в РЭМД.");
	}

	// 4. Проверка протокола осмотра и анамнеза
	const hasAnamnesis = (params.diary?.anamnesis ?? "").trim().length >= 10;
	const hasStatusLocalis = (params.diary?.statusLocalis ?? "").trim().length >= 10;
	if (hasAnamnesis && hasStatusLocalis) {
		passedChecks++;
	} else {
		missingRemdFields.push("clinical_examination_text");
		advisoryWarnings.push("Секции анамнеза или локального статуса заполнены кратко (менее 10 символов).");
		recommendations.push("Использовать клинический шаблон осмотра для структурирования документа СЭМД.");
	}

	// 5. Проверка протокола лечения
	const hasTreatment = (params.diary?.treatmentDescription ?? "").trim().length >= 10;
	if (hasTreatment) {
		passedChecks++;
	} else {
		missingRemdFields.push("treatment_description");
		advisoryWarnings.push("Описание проведенного лечения отсутствует или содержит менее 10 символов.");
		recommendations.push("Заполнить протокол выполненных манипуляций.");
	}

	// 6. Проверка данных врача (ФИО и специальность)
	const doctorName = (params.attendingDoctor?.fullName ?? "").trim();
	if (doctorName.length >= 3) {
		passedChecks++;
	} else {
		missingRemdFields.push("doctor_identity");
		advisoryWarnings.push("Не определены полные реквизиты лечащего врача для электронной подписи (УКЭП).");
		recommendations.push("Проверить профиль врача в разделе «Сотрудники».");
	}

	const readinessScorePct = Math.round((passedChecks / totalChecks) * 100);
	const isReadyForRemd = readinessScorePct >= 80 && isIcdValid;

	return {
		isReadyForRemd,
		readinessScorePct,
		advisoryWarnings,
		missingRemdFields,
		recommendations,
	};
}
