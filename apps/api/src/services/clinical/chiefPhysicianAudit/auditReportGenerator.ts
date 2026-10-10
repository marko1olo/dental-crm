/**
 * auditReportGenerator.ts — Layer 3: Генерация клинических актов экспертизы качества (КЭК / ВК) и сводных отчетов.
 */

import {
	type AuditReportSummary,
	type ChiefDoctorVerdict,
	type ChiefReviewQueryRecord,
	type Order203nCriteriaEvaluation,
	VERDICT_LABELS,
} from "./types.js";

/**
 * Генерация текста клинического акта экспертизы качества медицинской помощи (КЭК / ВК).
 */
export function generateQualityActText(params: {
	actNumber: string;
	protocolNumber: string;
	reviewedAt: Date;
	patientFullName: string;
	attendingDoctorFullName: string;
	reviewerDoctorFullName: string;
	reviewerRole: string;
	diagnosisIcd10: string | null;
	diagnosisTooth: string | null;
	verdict: ChiefDoctorVerdict;
	complianceScorePct: number;
	criteria: Order203nCriteriaEvaluation;
	notes: string | null;
}): { expertSummary: string; recommendations: string } {
	const dateStr = params.reviewedAt.toLocaleDateString("ru-RU", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const verdictTitle = VERDICT_LABELS[params.verdict];
	const diagnosisStr = [params.diagnosisIcd10, params.diagnosisTooth ? `Зуб ${params.diagnosisTooth}` : null]
		.filter(Boolean)
		.join(" | ") || "Не указан";

	const lines = [
		`АКТ ЭКСПЕРТИЗЫ КАЧЕСТВА МЕДИЦИНСКОЙ ПОМОЩИ (ВК / КЭК) № ${params.actNumber}`,
		`по Приказу Минздрава России от 10.05.2017 № 203н`,
		`Дата проведения экспертизы: ${dateStr}`,
		`Протокол врачебной комиссии: № ${params.protocolNumber}`,
		``,
		`1. ОБЩИЕ СВЕДЕНИЯ:`,
		`- Пациент: ${params.patientFullName}`,
		`- Лечащий врач: ${params.attendingDoctorFullName}`,
		`- Эксперт (Председатель ВК): ${params.reviewerDoctorFullName} (Роль: ${params.reviewerRole})`,
		`- Клинический диагноз: ${diagnosisStr}`,
		``,
		`2. РЕЗУЛЬТАТЫ ОЦЕНКИ КРИТЕРИЕВ КАЧЕСТВА (Приказ 203н, Раздел II):`,
		`- Информированное добровольное согласие (ИДС): ${params.criteria.informedConsentPresent ? "СООТВЕТСТВУЕТ (оформлено)" : "ДЕФЕКТ (отсутствует или не подписано)"}`,
		`- Сбор жалоб и анамнеза заболевания/жизни: ${params.criteria.anamnesisComplete ? "СООТВЕТСТВУЕТ (полный)" : "ДЕФЕКТ (неполный сбор данных)"}`,
		`- Первичный осмотр и Status Localis (зубная формула): ${params.criteria.statusLocalisComplete ? "СООТВЕТСТВУЕТ (описан подробно)" : "ДЕФЕКТ (скудное описание локального статуса)"}`,
		`- Клинический диагноз по МКБ-10 с обоснованием: ${params.criteria.icd10DiagnosisValid ? "СООТВЕТСТВУЕТ (валидный код по СтАР)" : "ДЕФЕКТ (невалидный код или не соответствует клинике)"}`,
		`- Обоснованность и объем лечебных манипуляций: ${params.criteria.treatmentPlanAdequate ? "СООТВЕТСТВУЕТ клиническим рекомендациям" : "ДЕФЕКТ (недостаточное описание протокола лечения)"}`,
		`- Безопасность и санэпидрежим (штрихкод стерилизации): ${params.criteria.instrumentTraceabilityValid ? "СООТВЕТСТВУЕТ (лоток подтверждён)" : "ДЕФЕКТ (нет привязки лотка стерилизации)"}`,
		``,
		`3. ЭКСПЕРТНОЕ ЗАКЛЮЧЕНИЕ:`,
		`- Итоговый вердикт: ${verdictTitle}`,
		`- Интегральный показатель качества медпомощи: ${params.complianceScorePct}%`,
	];

	if (params.notes && params.notes.trim()) {
		lines.push(`- Особые замечания эксперта: ${params.notes.trim()}`);
	}

	const expertSummary = lines.join("\n");

	let recommendations = "";
	if (params.verdict === "approved") {
		recommendations =
			"Медицинская помощь оказана в полном объёме, в соответствии с клиническими рекомендациями и Приказом Минздрава России № 203н. Карта 043/у утверждена.";
	} else if (params.verdict === "deficiencies_found") {
		recommendations =
			"Лечащему врачу указано на дефекты ведения медицинской документации (форма 043/у). Провести коррекцию записи в установленном порядке через административную ревизию.";
	} else {
		recommendations =
			"ВЫЯВЛЕНЫ КРИТИЧЕСКИЕ НАРУШЕНИЯ. Назначить внеочередное заседание врачебной комиссии (ВК). Врачу пройти повторный инструктаж по клиническим протоколам и стандартам безопасности.";
	}

	return { expertSummary, recommendations };
}

/**
 * Сборка сводной аналитики по проверенным картам для начмеда и владельца клиники.
 */
export function generateManagementAuditSummary(
	records: ChiefReviewQueryRecord[],
): AuditReportSummary {
	if (records.length === 0) {
		return {
			totalAudited: 0,
			approvedCount: 0,
			deficienciesCount: 0,
			criticalCount: 0,
			averageScorePct: 0,
			topDefects: [],
		};
	}

	let approvedCount = 0;
	let deficienciesCount = 0;
	let criticalCount = 0;
	let totalScore = 0;

	const defectCounter = new Map<string, number>();

	for (const rec of records) {
		if (rec.verdict === "approved") approvedCount++;
		else if (rec.verdict === "deficiencies_found") deficienciesCount++;
		else if (rec.verdict === "critical_violation") criticalCount++;

		totalScore += rec.complianceScorePct;

		if (rec.criteriaEvaluation) {
			if (!rec.criteriaEvaluation.informedConsentPresent) {
				defectCounter.set("Отсутствие ИДС", (defectCounter.get("Отсутствие ИДС") ?? 0) + 1);
			}
			if (!rec.criteriaEvaluation.icd10DiagnosisValid) {
				defectCounter.set("Невалидный МКБ-10", (defectCounter.get("Невалидный МКБ-10") ?? 0) + 1);
			}
			if (!rec.criteriaEvaluation.anamnesisComplete) {
				defectCounter.set("Неполный анамнез", (defectCounter.get("Неполный анамнез") ?? 0) + 1);
			}
			if (!rec.criteriaEvaluation.statusLocalisComplete) {
				defectCounter.set("Краткий статус", (defectCounter.get("Краткий статус") ?? 0) + 1);
			}
			if (!rec.criteriaEvaluation.treatmentPlanAdequate) {
				defectCounter.set("Схематичный план", (defectCounter.get("Схематичный план") ?? 0) + 1);
			}
			if (!rec.criteriaEvaluation.instrumentTraceabilityValid) {
				defectCounter.set("Нет лотка стерилизации", (defectCounter.get("Нет лотка стерилизации") ?? 0) + 1);
			}
		}
	}

	const topDefects = Array.from(defectCounter.entries())
		.map(([defectTitle, count]) => ({ defectTitle, count }))
		.sort((a, b) => b.count - a.count);

	return {
		totalAudited: records.length,
		approvedCount,
		deficienciesCount,
		criticalCount,
		averageScorePct: Math.round(totalScore / records.length),
		topDefects,
	};
}
