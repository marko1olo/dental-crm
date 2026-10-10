/**
 * auditScoringEngine.ts — Layer 1: Чистые математические функции расчета индексов полноты и качества протокола приёма.
 * Полное отсутствие побочных эффектов, отсутствие прямых обращений к СУБД.
 */

import { Icd10ClinicalValidator } from "../Icd10ClinicalValidator.js";
import {
	ALLOWED_CHIEF_REVIEWER_ROLES,
	type ChiefDoctorVerdict,
	type ClinicalQualityDefect,
	type Order203nCriteriaEvaluation,
} from "./types.js";

/**
 * Проверка полномочий роли проверяющего.
 * Допустимы: chief_doctor, owner, admin.
 */
export function isAuthorizedReviewerRole(role: string | null | undefined): boolean {
	if (!role) return false;
	const normalized = role.trim().toLowerCase();
	return (ALLOWED_CHIEF_REVIEWER_ROLES as readonly string[]).includes(normalized);
}

/**
 * Автоматическая оценка критериев качества Приказа 203н по содержимому дневника 043/у.
 */
export function evaluateOrder203nCriteria(
	diary: {
		anamnesis?: string | null;
		statusLocalis?: string | null;
		diagnosisIcd10?: string | null;
		diagnosisTooth?: string | null;
		treatmentDescription?: string | null;
		instrumentTrayBarcode?: string | null;
		isLocked?: boolean | null;
	} | null,
	_visit?: {
		qualityControlStatus?: string | null;
		status?: string | null;
	} | null,
	customOverrides?: Partial<Order203nCriteriaEvaluation> | null,
): Order203nCriteriaEvaluation {
	const anamnesisText = (diary?.anamnesis ?? "").trim();
	const statusLocalisText = (diary?.statusLocalis ?? "").trim();
	const treatmentText = (diary?.treatmentDescription ?? "").trim();
	const icd10 = (diary?.diagnosisIcd10 ?? "").trim();
	const tooth = (diary?.diagnosisTooth ?? "").trim();
	const trayBarcode = (diary?.instrumentTrayBarcode ?? "").trim();

	const anamnesisComplete = anamnesisText.length >= 5;
	const statusLocalisComplete = statusLocalisText.length >= 5;
	const treatmentPlanAdequate = treatmentText.length >= 5;
	const instrumentTraceabilityValid = trayBarcode.length > 0;

	let icd10DiagnosisValid = false;
	if (icd10.length > 0) {
		const valResult = Icd10ClinicalValidator.validate(icd10, tooth || null);
		icd10DiagnosisValid = valResult.isValid;
	}

	// ИДС не симулируется через анамнез: берется строго из оверрайда (результата поиска в generated_documents)
	const informedConsentPresent = customOverrides?.informedConsentPresent ?? false;

	const base: Order203nCriteriaEvaluation = {
		informedConsentPresent,
		anamnesisComplete,
		statusLocalisComplete,
		icd10DiagnosisValid,
		treatmentPlanAdequate,
		instrumentTraceabilityValid,
	};

	if (customOverrides) {
		return {
			...base,
			...customOverrides,
		};
	}

	return base;
}

/**
 * Расчёт интегрального процента соответствия критериям Приказа 203н.
 */
export function calculateComplianceScore(
	criteria: Order203nCriteriaEvaluation,
	verdict: ChiefDoctorVerdict,
): number {
	if (verdict === "critical_violation") {
		return 35;
	}

	const keys: (keyof Order203nCriteriaEvaluation)[] = [
		"informedConsentPresent",
		"anamnesisComplete",
		"statusLocalisComplete",
		"icd10DiagnosisValid",
		"treatmentPlanAdequate",
		"instrumentTraceabilityValid",
	];

	let passedCount = 0;
	for (const key of keys) {
		if (criteria[key]) passedCount++;
	}

	const rawPct = Math.round((passedCount / keys.length) * 100);

	if (verdict === "deficiencies_found") {
		return Math.min(85, Math.max(50, rawPct));
	}

	return rawPct;
}

/**
 * Расчёт чистого индекса полноты клинического протокола (0..100%).
 */
export function calculateCompletenessIndex(diary: {
	anamnesis?: string | null;
	statusLocalis?: string | null;
	diagnosisIcd10?: string | null;
	treatmentDescription?: string | null;
	recommendations?: string | null;
	instrumentTrayBarcode?: string | null;
} | null): number {
	if (!diary) return 0;

	let points = 0;
	const maxPoints = 6;

	if ((diary.anamnesis ?? "").trim().length >= 10) points++;
	if ((diary.statusLocalis ?? "").trim().length >= 10) points++;
	if ((diary.diagnosisIcd10 ?? "").trim().length >= 3) points++;
	if ((diary.treatmentDescription ?? "").trim().length >= 10) points++;
	if ((diary.recommendations ?? "").trim().length >= 5) points++;
	if ((diary.instrumentTrayBarcode ?? "").trim().length > 0) points++;

	return Math.round((points / maxPoints) * 100);
}

/**
 * Определение списка выявленных устранимых дефектов ведения карты.
 */
export function detectProtocolDefects(
	criteria: Order203nCriteriaEvaluation,
): ClinicalQualityDefect[] {
	const defects: ClinicalQualityDefect[] = [];

	if (!criteria.informedConsentPresent) {
		defects.push({
			code: "DEF-IDS-01",
			criterionKey: "informedConsentPresent",
			title: "Отсутствует подписанное ИДС",
			description: "Информированное добровольное согласие по ст. 20 323-ФЗ не привязано к визиту.",
			severity: "critical",
			recommendation: "Прикрепить подписанный бланк ИДС пациента или сформировать электронное согласие.",
		});
	}

	if (!criteria.anamnesisComplete) {
		defects.push({
			code: "DEF-ANAM-02",
			criterionKey: "anamnesisComplete",
			title: "Неполный сбор анамнеза",
			description: "Жалобы или анамнез заболевания описаны слишком кратко (менее 5 символов).",
			severity: "minor",
			recommendation: "Дополнить анамнез данными о длительности симптомов и аллергологическом статусе.",
		});
	}

	if (!criteria.statusLocalisComplete) {
		defects.push({
			code: "DEF-STATUS-03",
			criterionKey: "statusLocalisComplete",
			title: "Краткий локальный статус",
			description: "Status Localis зубного ряда описан недостаточно подробно.",
			severity: "minor",
			recommendation: "Указать состояние твердых тканей, перкуссию, зондирование и состояние слизистой.",
		});
	}

	if (!criteria.icd10DiagnosisValid) {
		defects.push({
			code: "DEF-ICD-04",
			criterionKey: "icd10DiagnosisValid",
			title: "Невалидный код МКБ-10",
			description: "Код диагноза отсутствует или не соответствует номенклатуре стоматологических диагнозов СтАР.",
			severity: "critical",
			recommendation: "Выбрать валидный стоматологический код МКБ-10 (класс K00-K14) с привязкой к зубу.",
		});
	}

	if (!criteria.treatmentPlanAdequate) {
		defects.push({
			code: "DEF-TREAT-05",
			criterionKey: "treatmentPlanAdequate",
			title: "Недостаточное описание лечебных манипуляций",
			description: "Протокол лечения заполнен схематично.",
			severity: "minor",
			recommendation: "Описать этапы анестезии, препарирования, медикаментозной обработки и пломбирования.",
		});
	}

	if (!criteria.instrumentTraceabilityValid) {
		defects.push({
			code: "DEF-STERIL-06",
			criterionKey: "instrumentTraceabilityValid",
			title: "Отсутствует штрихкод стерилизации",
			description: "Инструментальный лоток не привязан к протоколу приёма (СанПиН).",
			severity: "advisory",
			recommendation: "Отсканировать штрихкод крафт-пакета или стерилизационного лотка.",
		});
	}

	return defects;
}
