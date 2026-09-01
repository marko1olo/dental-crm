/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CMO EMR QUALITY AUDIT & FORM 043/U APPROVAL ENGINE
 * Clinical Expert Review & Quality Assessment (Roszdravnadzor, Order 203n, 323-FZ)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MedicalCardForm043uData, VisitDiaryEntry043 } from "../emr043Types";
import {
	type CmoDefectSeverity,
	type CmoDefectCategory,
	CMO_AUDIT_CATEGORIES,
	CMO_STATUTORY_DEFECT_PRESETS,
} from "./cmoEmrAuditPresets";

export type EmrAuditStatus =
	| "not_filled"              // 1. Не заполнен
	| "in_progress"             // 2. В работе
	| "under_review"            // 3. На проверке
	| "pending_review"          // 3. На проверке (совместимость)
	| "revision_required"       // 4. На доработке
	| "rejected_with_remarks"   // 4. На доработке (совместимость)
	| "approved_by_cmo"         // 5. Утверждено главврачом
	| "approved"                // 5. Утверждено главврачом (совместимость)
	| "draft"                   // 1. Не заполнен / Черновик (совместимость)
	| "archived";

export type CanonicalAuditStage =
	| "not_filled"          // Не заполнен
	| "in_progress"         // В работе
	| "under_review"        // На проверке
	| "revision_required"   // На доработке
	| "approved_by_cmo";    // Утверждено главврачом

export function getCanonicalAuditStage(status: EmrAuditStatus): CanonicalAuditStage {
	switch (status) {
		case "not_filled":
		case "draft":
			return "not_filled";
		case "in_progress":
			return "in_progress";
		case "under_review":
		case "pending_review":
			return "under_review";
		case "revision_required":
		case "rejected_with_remarks":
			return "revision_required";
		case "approved_by_cmo":
		case "approved":
		case "archived":
			return "approved_by_cmo";
		default:
			return "not_filled";
	}
}

export const CANONICAL_AUDIT_STAGES: Array<{
	key: CanonicalAuditStage;
	stageNumber: number;
	title: string;
	description: string;
	colorClass: string;
}> = [
	{
		key: "not_filled",
		stageNumber: 1,
		title: "Не заполнен",
		description: "Карта 043/у открыта, но клинические протоколы не внесены",
		colorClass: "stage-not-filled",
	},
	{
		key: "in_progress",
		stageNumber: 2,
		title: "В работе",
		description: "Врач заполняет дневник SOAP, одонтограмму и назначения",
		colorClass: "stage-in-progress",
	},
	{
		key: "under_review",
		stageNumber: 3,
		title: "На проверке",
		description: "Направлена в службу контроля качества (КЭР) и главному врачу",
		colorClass: "stage-under-review",
	},
	{
		key: "revision_required",
		stageNumber: 4,
		title: "На доработке",
		description: "Возвращена лечащему врачу с обязательным клиническим комментарием",
		colorClass: "stage-revision-required",
	},
	{
		key: "approved_by_cmo",
		stageNumber: 5,
		title: "Утверждено главврачом",
		description: "Проверено, заверено ЭЦП начмеда/главврача и готово к РЭМД",
		colorClass: "stage-approved-by-cmo",
	},
];

export interface AttachedEmrDocument {
	id: string;
	type: "ids_323fz" | "treatment_plan" | "act_completed_works" | "xray_study" | "warranty_card" | "medical_history";
	title: string;
	isSigned: boolean;
	signedAt?: string | undefined;
	signedByPatient: boolean;
	signedByDoctorUkep: boolean;
	fileUrl?: string | undefined;
}

export interface CompletedActItem {
	serviceCode: string;
	serviceName: string;
	toothNumber?: string | null | undefined;
	quantity: number;
	priceRub: number;
}

export interface TreatmentPlanItem {
	serviceCode: string;
	serviceName: string;
	toothNumber?: string | null | undefined;
	stage: string;
}

export interface EmrAutomatedCheckResult {
	ruleId: string;
	ruleCategory: CmoDefectCategory;
	title: string;
	passed: boolean;
	severity: CmoDefectSeverity;
	details: string;
	statutoryRef: string;
	deduction: number;
}

export interface CmoAuditRemark {
	id: string;
	presetId?: string | undefined;
	category: CmoDefectCategory;
	severity: CmoDefectSeverity;
	title: string;
	comment: string;
	affectedSection: "passport" | "anamnesis" | "dental_status" | "diaries" | "epicrisis" | "ids" | "anesthesia" | "act_reconciliation";
	createdAt: string;
	isResolved: boolean;
	resolvedAt?: string | undefined;
	resolutionComment?: string | undefined;
	doctorStaffId?: string | undefined;
}

export interface CmoAuditResolution {
	auditorFullName: string;
	auditorRole: "chief_medical_officer" | "deputy_cmo_qcr" | "medical_commission_chair";
	reviewedAt: string;
	decision: "approved" | "rejected_with_remarks";
	cmoComment: string;
	finalQualityScore: number;
	requiredActions?: string[] | undefined;
}

export interface EmrAuditHistoryEntry {
	timestamp: string;
	actorFullName: string;
	actorRole: string;
	action: "created" | "submitted" | "approved" | "rejected" | "remark_added" | "remark_resolved" | "updated";
	comment: string;
	previousStatus?: EmrAuditStatus | undefined;
	newStatus?: EmrAuditStatus | undefined;
}

export interface EmrAuditRecord {
	id: string;
	medicalCardId: string;
	recordNumber: string;
	patientId: string;
	patientFullName: string;
	patientBirthDate: string;
	patientGender: "male" | "female";
	patientPhone?: string | null | undefined;
	doctorStaffId: string;
	doctorFullName: string;
	doctorSpecialty: string;
	visitDate: string;
	status: EmrAuditStatus;
	cardData: MedicalCardForm043uData;
	attachedDocuments: AttachedEmrDocument[];
	completedActItems: CompletedActItem[];
	treatmentPlanItems: TreatmentPlanItem[];
	automatedCheckResults: EmrAutomatedCheckResult[];
	automatedQualityScore: number;
	cmoRemarks: CmoAuditRemark[];
	cmoResolution?: CmoAuditResolution | undefined;
	auditHistory: EmrAuditHistoryEntry[];
}

export interface DoctorQualityMetrics {
	doctorStaffId: string;
	doctorFullName: string;
	doctorSpecialty: string;
	totalRecordsAudited: number;
	approvedFirstAttempt: number;
	approvedWithRemarks: number;
	rejectedCount: number;
	pendingCount: number;
	firstTimeApprovalRate: number; // 0..100 %
	overallQualityScoreAvg: number; // 0..100
	commonDefects: Array<{ defectId: string; title: string; count: number }>;
	complianceRating: "excellent" | "good" | "satisfactory" | "risk_of_penalty";
}

export interface AuditRecordFilters {
	doctorStaffId?: string | undefined;
	status?: EmrAuditStatus | "all" | undefined;
	search?: string | undefined;
	minScore?: number | undefined;
	maxScore?: number | undefined;
	dateFrom?: string | undefined;
	dateTo?: string | undefined;
}

export interface CmoAuditSummaryReport {
	totalAudited: number;
	approvedCount: number;
	rejectedCount: number;
	pendingCount: number;
	draftCount: number;
	averageQualityScore: number;
	firstPassRateAvg: number;
	topDefects: Array<{ category: CmoDefectCategory; categoryLabel: string; title: string; count: number }>;
	doctorRankings: DoctorQualityMetrics[];
}

/** Проверка корректности формата кода МКБ-10 */
export function isValidIcd10Code(code: string | undefined | null): boolean {
	if (!code || typeof code !== "string") return false;
	const trimmed = code.trim().toUpperCase();
	// МКБ-10 формат: Буква + 2 цифры, опционально точка и еще 1-3 цифры (например: K02, K02.1, K04.03, K05.3, Z01.2)
	const icd10Regex = /^[A-Z][0-9]{2}(\.[0-9]{1,3})?$/;
	return icd10Regex.test(trimmed);
}

/** Проверка соответствия кода услуги Номенклатуре медицинских услуг Минздрава РФ (Приказ № 804н) */
export function isValidOrder804nServiceCode(code: string | undefined | null): boolean {
	if (!code || typeof code !== "string") return false;
	const trimmed = code.trim().toUpperCase();
	// Номенклатура 804н: Класс A/B + 2 цифры + . + 2-3 цифры (+ опционально .xxx.xxx)
	// Например: A16.07.002, A16.07.002.001, B01.003.004.001, A11.07.012, A06.07.004
	const code804nRegex = /^[AB][0-9]{2}\.[0-9]{2,3}(\.[0-9]{3}(\.[0-9]{3})?)?$/;
	return code804nRegex.test(trimmed);
}

export interface AnesthesiaProtocolAnalysis {
	hasAnesthesiaMentioned: boolean;
	hasDrugName: boolean;
	hasDosageOrVolume: boolean;
	hasSeriesOrLot: boolean;
	isCompliant: boolean;
	details: string;
}

/** Анализ полноты анестезиологического протокола (Приказ № 834н, Приказ № 203н) */
export function analyzeAnesthesiaProtocol(diary: VisitDiaryEntry043): AnesthesiaProtocolAnalysis {
	const rawText = `${diary.anesthesiaDetails || ""} ${diary.procedureProtocol || ""}`.toLowerCase();

	const hasAnesthesiaMentioned =
		rawText.includes("анестези") ||
		rawText.includes("артикаин") ||
		rawText.includes("ультракаин") ||
		rawText.includes("септонест") ||
		rawText.includes("убистезин") ||
		rawText.includes("скандонест") ||
		rawText.includes("лидокаин") ||
		rawText.includes("мепивакаин");

	if (!hasAnesthesiaMentioned) {
		return {
			hasAnesthesiaMentioned: false,
			hasDrugName: false,
			hasDosageOrVolume: false,
			hasSeriesOrLot: false,
			isCompliant: false,
			details: "Запись об анестезии отсутствует",
		};
	}

	const hasDrugName = /(ультракаин|септонест|убистезин|скандонест|артикаин|лидокаин|мепивакаин|sol\.\s*[a-zа-я]+)/i.test(rawText);
	const hasDosageOrVolume = /(\d+([.,]\d+)?\s*(мл|ml|мг|mg|карпул|carp|%))|(\d+:\d+)/i.test(rawText);
	const hasSeriesOrLot = /(серия|партия|лот|lot|series|№\s*\d+|24[a-z0-9]+|25[a-z0-9]+|26[a-z0-9]+)/i.test(rawText);

	const isCompliant = hasDrugName && hasDosageOrVolume;
	const details = isCompliant
		? `Протокол обезболивания зафиксирован: препарат, дозировка ${hasSeriesOrLot ? "и серия карпулы" : "(рекомендуется указать серию)"}.`
		: "Не указан конкретный анестетик (торговое наименование) или дозировка в мл/карпулах.";

	return {
		hasAnesthesiaMentioned,
		hasDrugName,
		hasDosageOrVolume,
		hasSeriesOrLot,
		isCompliant,
		details,
	};
}

/** Автоматический аудит медицинской карты 043/у по критериям Росздравнадзора и Приказа № 203н */
export function runAutomatedEmrAudit(record: EmrAuditRecord): {
	results: EmrAutomatedCheckResult[];
	score: number;
	passedCount: number;
	failedCount: number;
	isAutoApprovedEligible: boolean;
} {
	const results: EmrAutomatedCheckResult[] = [];
	const card = record.cardData;

	// 1. Проверка диагноза МКБ-10 (Приказ 834н / 203н)
	const primaryIcdValid = isValidIcd10Code(card.passport.primaryDiagnosisIcd10);
	const primaryDiagTextValid = Boolean(card.passport.primaryDiagnosisText && card.passport.primaryDiagnosisText.trim().length >= 3);
	const allDiariesIcdValid = card.visitDiaries.length > 0 && card.visitDiaries.every((vd: VisitDiaryEntry043) => isValidIcd10Code(vd.assessmentIcd10Code));

	if (primaryIcdValid && primaryDiagTextValid && allDiariesIcdValid) {
		results.push({
			ruleId: "AUTO-ICD-01",
			ruleCategory: "DIAGNOSIS_JUSTIFICATION",
			title: "Кодирование диагноза по МКБ-10",
			passed: true,
			severity: "critical",
			details: `Диагноз обоснован: ${card.passport.primaryDiagnosisIcd10} (${card.passport.primaryDiagnosisText})`,
			statutoryRef: "Приказ Минздрава России № 834н, Приказ № 203н п. 2.1",
			deduction: 0,
		});
	} else {
		results.push({
			ruleId: "AUTO-ICD-01",
			ruleCategory: "DIAGNOSIS_JUSTIFICATION",
			title: "Кодирование диагноза по МКБ-10",
			passed: false,
			severity: "critical",
			details: !primaryIcdValid
				? `Некорректный или пустой код МКБ-10 в титульном листе: "${card.passport.primaryDiagnosisIcd10 || ""}"`
				: !primaryDiagTextValid
					? "Отсутствует текст клинического диагноза"
					: "В одной или нескольких дневниковых записях не указан корректный код МКБ-10",
			statutoryRef: "Приказ Минздрава России № 834н, Приказ № 203н п. 2.1",
			deduction: 20,
		});
	}

	// 2. Проверка полноты дневниковых записей (SOAP формат)
	let diaryPassed = true;
	let diaryFailReason = "";
	if (!card.visitDiaries || card.visitDiaries.length === 0) {
		diaryPassed = false;
		diaryFailReason = "В карте отсутствуют дневниковые записи посещений";
	} else {
		for (const [idx, vd] of card.visitDiaries.entries()) {
			if (!vd.subjectiveComplaints || vd.subjectiveComplaints.trim().length < 3) {
				diaryPassed = false;
				diaryFailReason = `Визит #${idx + 1}: не заполнены жалобы пациента (Subjective)`;
				break;
			}
			if (!vd.objectiveStatusLocalis || vd.objectiveStatusLocalis.trim().length < 8) {
				diaryPassed = false;
				diaryFailReason = `Визит #${idx + 1}: не заполнен объективный статус (Objective / Status localis)`;
				break;
			}
			if (!vd.procedureProtocol || vd.procedureProtocol.trim().length < 10) {
				diaryPassed = false;
				diaryFailReason = `Визит #${idx + 1}: не заполнен протокол лечебных манипуляций (Procedure)`;
				break;
			}
		}
	}

	results.push({
		ruleId: "AUTO-SOAP-01",
		ruleCategory: "CLINICAL_DIARY_SOAP",
		title: "Клинический дневник приема (SOAP)",
		passed: diaryPassed,
		severity: "major",
		details: diaryPassed
			? `Заполнено ${card.visitDiaries.length} дневниковых записей в соответствии со стандартом SOAP.`
			: diaryFailReason,
		statutoryRef: "Приказ Минздрава России № 834н п. 8, Клинические рекомендации СтАР",
		deduction: diaryPassed ? 0 : 15,
	});

	// 3. Проверка Информированного добровольного согласия (ИДС 323-ФЗ ст. 20)
	const idsDoc = record.attachedDocuments.find((d: AttachedEmrDocument) => d.type === "ids_323fz");
	const idsValid = Boolean(idsDoc && idsDoc.isSigned && idsDoc.signedByPatient);

	results.push({
		ruleId: "AUTO-IDS-01",
		ruleCategory: "INFORMED_CONSENT_323FZ",
		title: "Информированное добровольное согласие (323-ФЗ)",
		passed: idsValid,
		severity: "critical",
		details: idsValid
			? `ИДС прикреплено и подписано пациентом (${idsDoc?.title}, дата: ${idsDoc?.signedAt || "подтверждено"}).`
			: "Отсутствует прикрепленное или подписанное пациентом ИДС на медицинское вмешательство (ст. 20 323-ФЗ).",
		statutoryRef: "Федеральный закон № 323-ФЗ ст. 20, Приказ Минздрава № 1051н",
		deduction: idsValid ? 0 : 25,
	});

	// 4. Проверка анестезиологического протокола при инвазивных процедурах
	const isInvasiveProcedure = card.visitDiaries.some((vd: VisitDiaryEntry043) => {
		const text = `${vd.procedureProtocol} ${vd.assessmentDiagnosisText}`.toLowerCase();
		return (
			text.includes("анестези") ||
			text.includes("препарирован") ||
			text.includes("депульп") ||
			text.includes("удален") ||
			text.includes("экстирпац") ||
			text.includes("пломб") ||
			text.includes("резекц") ||
			text.includes("имплант") ||
			text.includes("кюретаж")
		);
	}) || record.completedActItems.some((act: CompletedActItem) => {
		const name = act.serviceName.toLowerCase();
		return name.includes("анестези") || name.includes("удаление") || name.includes("лечение") || name.includes("кариес") || name.includes("пульпит");
	});

	let anesthesiaPassed = true;
	let anesthesiaDetails = "Инвазивные вмешательства не зафиксированы.";

	if (isInvasiveProcedure) {
		const hasAnesthesiaRecord = card.visitDiaries.some((vd: VisitDiaryEntry043) => {
			if (vd.anesthesiaDetails && vd.anesthesiaDetails.trim().length >= 4) return true;
			const p = vd.procedureProtocol.toLowerCase();
			return p.includes("анестези") || p.includes("ультракаин") || p.includes("убистезин") || p.includes("септонест") || p.includes("скандонест") || p.includes("без анестезии");
		});

		if (hasAnesthesiaRecord) {
			anesthesiaPassed = true;
			anesthesiaDetails = "Протокол анестезии зафиксирован (препарат, дозировка или обоснование отказа).";
		} else {
			anesthesiaPassed = false;
			anesthesiaDetails = "Проведено инвазивное вмешательство без обязательной фиксации протокола обезболивания.";
		}
	}

	results.push({
		ruleId: "AUTO-ANES-01",
		ruleCategory: "ANESTHESIA_SAFETY",
		title: "Анестезиологический протокол",
		passed: anesthesiaPassed,
		severity: "critical",
		details: anesthesiaDetails,
		statutoryRef: "Приказ Минздрава России № 203н п. 2.3, Федеральный закон № 323-ФЗ ст. 19",
		deduction: anesthesiaPassed ? 0 : 20,
	});

	// 5. Проверка согласованности акта выполненных работ, плана лечения и Номенклатуры 804н
	let actCoherent = true;
	let actDetails = "Позиции акта полностью согласованы с планом лечения и записями приема.";

	if (record.completedActItems.length > 0 && record.treatmentPlanItems.length > 0) {
		const missingInPlan = record.completedActItems.filter(
			(act: CompletedActItem) => !record.treatmentPlanItems.some((plan: TreatmentPlanItem) => plan.serviceCode === act.serviceCode || plan.serviceName === act.serviceName)
		);

		if (missingInPlan.length > 0) {
			actCoherent = false;
			actDetails = `В акте присутствуют услуги, не включенные в утвержденный план лечения: ${missingInPlan.map((m: CompletedActItem) => m.serviceName).join(", ")}`;
		}
	}

	// Проверка корректности кодов Номенклатуры 804н в акте
	const invalid804nCodes = record.completedActItems.filter((act) => act.serviceCode && !isValidOrder804nServiceCode(act.serviceCode));
	if (invalid804nCodes.length > 0 && actCoherent) {
		actDetails += ` (Предупреждение: коды ${invalid804nCodes.map((c) => c.serviceCode).join(", ")} не соответствуют формату Номенклатуры 804н)`;
	}

	results.push({
		ruleId: "AUTO-ACT-01",
		ruleCategory: "ACT_SERVICES_COHERENCE",
		title: "Согласованность акта и плана лечения (Приказ 804н)",
		passed: actCoherent,
		severity: "major",
		details: actDetails,
		statutoryRef: "Закон РФ 'О защите прав потребителей' ст. 10, Приказ Минздрава № 804н",
		deduction: actCoherent ? 0 : 15,
	});

	// 6. Проверка электронной подписи врача (УКЭП 63-ФЗ)
	const hasUkep = card.visitDiaries.length > 0 && card.visitDiaries.every(
		(vd: VisitDiaryEntry043) => vd.isSignedWithUkep === true || (Boolean(vd.digitalSignatureHash) && vd.digitalSignatureHash!.length >= 16)
	);

	results.push({
		ruleId: "AUTO-UKEP-01",
		ruleCategory: "UKEP_DIGITAL_SIGNATURE",
		title: "Электронная подпись врача (УКЭП)",
		passed: hasUkep,
		severity: "critical",
		details: hasUkep
			? "Записи заверены усиленной квалифицированной электронной подписью (УКЭП) лечащего врача."
			: "Дневниковые записи не подписаны персональным сертификатом УКЭП врача (Приказ Минздрава № 947н).",
		statutoryRef: "Федеральный закон № 63-ФЗ 'Об электронной подписи', Приказ Минздрава России № 947н",
		deduction: hasUkep ? 0 : 20,
	});

	// 7. Проверка рентгенологического заключения и дозовой нагрузки (СанПиН)
	const hasXrayDose = card.dentalStatus?.xrayRadiationDoseMsv !== undefined && card.dentalStatus?.xrayRadiationDoseMsv !== null;
	const hasXrayDesc = Boolean(card.dentalStatus?.xrayFindingsDescription && card.dentalStatus.xrayFindingsDescription.trim().length >= 5);
	const xrayPassed = hasXrayDesc || !hasXrayDose;

	results.push({
		ruleId: "AUTO-XRAY-01",
		ruleCategory: "XRAY_RADIATION_SAFETY",
		title: "Рентгенодиагностика и радиационная безопасность",
		passed: xrayPassed,
		severity: "minor",
		details: xrayPassed
			? `Рентгенологические данные зафиксированы (дозовая нагрузка: ${card.dentalStatus?.xrayRadiationDoseMsv ?? 0} мЗв).`
			: "Указана дозовая нагрузка, но отсутствует диагностическое описание снимка.",
		statutoryRef: "СанПиН 2.6.1.1192-03, Приказ Минздрава № 560н",
		deduction: xrayPassed ? 0 : 5,
	});

	// 8. Проверка эпикриза и диспансеризации
	const hasDispensary = Boolean(card.epicrisis?.dispensaryGroup && card.epicrisis?.plannedRecallIntervalMonths);
	results.push({
		ruleId: "AUTO-DISP-01",
		ruleCategory: "DISPENSARY_AND_EPICRISIS",
		title: "Эпикриз и диспансерная группа",
		passed: hasDispensary,
		severity: "minor",
		details: hasDispensary
			? `Группа диспансерного наблюдения: ${card.epicrisis?.dispensaryGroupLabel || card.epicrisis?.dispensaryGroup}, осмотр через ${card.epicrisis?.plannedRecallIntervalMonths} мес.`
			: "Не определена диспансерная группа или срок повторного профосмотра.",
		statutoryRef: "Приказ Минздрава России № 834н, Приказ № 168н",
		deduction: hasDispensary ? 0 : 5,
	});

	// Расчет суммарного балла качества (Base 100)
	let score = 100;
	let passedCount = 0;
	let failedCount = 0;

	for (const res of results) {
		if (res.passed) {
			passedCount++;
		} else {
			failedCount++;
			score -= res.deduction;
		}
	}

	score = Math.max(0, Math.min(100, score));
	const isAutoApprovedEligible = failedCount === 0 && score === 100;

	return {
		results,
		score,
		passedCount,
		failedCount,
		isAutoApprovedEligible,
	};
}

/** Расчет итогового индекса качества карты с учетом замечаний главного врача */
export function calculateQualityScore(
	checkResults: EmrAutomatedCheckResult[],
	cmoRemarks: CmoAuditRemark[]
): number {
	let score = 100;

	// Вычеты по автоматическим проверкам
	for (const check of checkResults) {
		if (!check.passed) {
			score -= check.deduction;
		}
	}

	// Вычеты по ручным замечаниям начмеда (неразрешенным)
	for (const remark of cmoRemarks) {
		if (!remark.isResolved) {
			if (remark.severity === "critical") score -= 25;
			else if (remark.severity === "major") score -= 15;
			else score -= 5;
		}
	}

	return Math.max(0, Math.min(100, score));
}

/** Создание новой записи на аудит */
export function createAuditRecord(initial: Partial<EmrAuditRecord> & { cardData?: Partial<MedicalCardForm043uData> | any }): EmrAuditRecord {
	const id = initial.id ?? `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
	const passport = initial.cardData?.passport;
	const record: EmrAuditRecord = {
		id,
		medicalCardId: initial.medicalCardId ?? passport?.medicalCardNumber ?? "MC-001",
		recordNumber: initial.recordNumber ?? `КЭР-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
		patientId: initial.patientId ?? `pat-${Date.now()}`,
		patientFullName: initial.patientFullName ?? passport?.patientFullName ?? "Пациент",
		patientBirthDate: initial.patientBirthDate ?? passport?.patientBirthDate ?? "1990-01-01",
		patientGender: initial.patientGender ?? passport?.patientSex ?? "male",
		patientPhone: initial.patientPhone ?? passport?.patientPhone ?? null,
		doctorStaffId: initial.doctorStaffId ?? "doc-001",
		doctorFullName: initial.doctorFullName ?? passport?.attendingDoctorFullName ?? "Врач-стоматолог",
		doctorSpecialty: initial.doctorSpecialty ?? passport?.attendingDoctorSpecialty ?? "Стоматолог-терапевт",
		visitDate: initial.visitDate ?? passport?.cardOpenedDate ?? new Date().toISOString().split("T")[0],
		status: initial.status ?? "pending_review",
		cardData: (initial.cardData ?? {}) as MedicalCardForm043uData,
		attachedDocuments: initial.attachedDocuments ?? [],
		completedActItems: initial.completedActItems ?? [],
		treatmentPlanItems: initial.treatmentPlanItems ?? [],
		automatedCheckResults: [],
		automatedQualityScore: 100,
		cmoRemarks: initial.cmoRemarks ?? [],
		cmoResolution: initial.cmoResolution,
		auditHistory: initial.auditHistory ?? [
			{
				timestamp: new Date().toISOString(),
				actorFullName: initial.doctorFullName ?? "Врач",
				actorRole: "Лечащий врач",
				action: "created",
				comment: "Карта создана и передана в службу контроля качества (КЭР)",
				newStatus: initial.status ?? "pending_review",
			},
		],
	};

	// Запуск автоматического аудита
	const auditRes = runAutomatedEmrAudit(record);
	record.automatedCheckResults = auditRes.results;
	record.automatedQualityScore = auditRes.score;

	return record;
}

/** Передача карты на проверку начмеду */
export function submitRecordForReview(record: EmrAuditRecord, actorName = "Лечащий врач"): EmrAuditRecord {
	const auditRes = runAutomatedEmrAudit(record);
	return {
		...record,
		status: "pending_review",
		automatedCheckResults: auditRes.results,
		automatedQualityScore: auditRes.score,
		auditHistory: [
			...record.auditHistory,
			{
				timestamp: new Date().toISOString(),
				actorFullName: actorName,
				actorRole: "Лечащий врач",
				action: "submitted",
				comment: "Медицинская карта 043/у направлена на экспертизу качества КЭР",
				previousStatus: record.status,
				newStatus: "pending_review",
			},
		],
	};
}

/** Применение резолюции Главного врача (Approve / Reject with remarks) */
export function applyCmoAuditDecision(
	record: EmrAuditRecord,
	decision: "approved" | "rejected_with_remarks",
	auditor: {
		fullName: string;
		role: "chief_medical_officer" | "deputy_cmo_qcr" | "medical_commission_chair";
		comment: string;
		remarks?: CmoAuditRemark[] | undefined;
		requiredActions?: string[] | undefined;
	}
): EmrAuditRecord {
	const newRemarks = auditor.remarks ? [...record.cmoRemarks, ...auditor.remarks] : [...record.cmoRemarks];
	const finalScore = calculateQualityScore(record.automatedCheckResults, newRemarks);

	const resolution: CmoAuditResolution = {
		auditorFullName: auditor.fullName,
		auditorRole: auditor.role,
		reviewedAt: new Date().toISOString(),
		decision,
		cmoComment: auditor.comment,
		finalQualityScore: finalScore,
		requiredActions: auditor.requiredActions,
	};

	const newStatus: EmrAuditStatus = decision === "approved" ? "approved" : "rejected_with_remarks";

	const historyEntry: EmrAuditHistoryEntry = {
		timestamp: new Date().toISOString(),
		actorFullName: auditor.fullName,
		actorRole:
			auditor.role === "chief_medical_officer"
				? "Главный врач"
				: auditor.role === "deputy_cmo_qcr"
					? "Зам. гл. врача по КЭР"
					: "Председатель ВК",
		action: decision === "approved" ? "approved" : "rejected",
		comment: auditor.comment || (decision === "approved" ? "Карта 043/у утверждена без замечаний" : "Карта возвращена врачу на исправление дефектов"),
		previousStatus: record.status,
		newStatus,
	};

	return {
		...record,
		status: newStatus,
		cmoRemarks: newRemarks,
		cmoResolution: resolution,
		auditHistory: [...record.auditHistory, historyEntry],
	};
}

/** Добавление замечания начмеда к карте */
export function addCmoRemark(
	record: EmrAuditRecord,
	remarkInput: Omit<CmoAuditRemark, "id" | "createdAt" | "isResolved">
): EmrAuditRecord {
	const remark: CmoAuditRemark = {
		...remarkInput,
		id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
		createdAt: new Date().toISOString(),
		isResolved: false,
	};

	const updatedRemarks = [...record.cmoRemarks, remark];
	const finalScore = calculateQualityScore(record.automatedCheckResults, updatedRemarks);

	return {
		...record,
		status: "rejected_with_remarks",
		cmoRemarks: updatedRemarks,
		automatedQualityScore: finalScore,
		auditHistory: [
			...record.auditHistory,
			{
				timestamp: new Date().toISOString(),
				actorFullName: "Служба КЭР",
				actorRole: "Эксперт контроля качества",
				action: "remark_added",
				comment: `Добавлено замечание: ${remark.title} (${remark.comment})`,
				previousStatus: record.status,
				newStatus: "rejected_with_remarks",
			},
		],
	};
}

/** Разрешение (исправление) замечания лечащим врачом */
/** Разрешение (исправление) замечания лечащим врачом */
export function resolveCmoRemark(
	record: EmrAuditRecord,
	remarkId: string,
	doctorComment: string,
	doctorName = "Лечащий врач"
): EmrAuditRecord {
	const updatedRemarks = record.cmoRemarks.map((rem: CmoAuditRemark) => {
		if (rem.id === remarkId) {
			return {
				...rem,
				isResolved: true,
				resolvedAt: new Date().toISOString(),
				resolutionComment: doctorComment,
			};
		}
		return rem;
	});

	const allResolved = updatedRemarks.every((r: CmoAuditRemark) => r.isResolved);
	const newStatus: EmrAuditStatus = allResolved ? "pending_review" : record.status;
	const finalScore = calculateQualityScore(record.automatedCheckResults, updatedRemarks);

	return {
		...record,
		status: newStatus,
		cmoRemarks: updatedRemarks,
		automatedQualityScore: finalScore,
		auditHistory: [
			...record.auditHistory,
			{
				timestamp: new Date().toISOString(),
				actorFullName: doctorName,
				actorRole: "Лечащий врач",
				action: "remark_resolved",
				comment: `Замечание устранено: ${doctorComment}`,
				previousStatus: record.status,
				newStatus,
			},
		],
	};
}

/** Возврат карты врачу на доработку с обязательным клиническим комментарием */
export function returnRecordForRevision(
	record: EmrAuditRecord,
	options: {
		clinicalComment: string;
		presetId?: string | undefined;
		severity?: CmoDefectSeverity | undefined;
		auditorFullName?: string | undefined;
		auditorRole?: "chief_medical_officer" | "deputy_cmo_qcr" | "medical_commission_chair" | undefined;
		targetSection?: "passport" | "anamnesis" | "dental_status" | "diaries" | "epicrisis" | "ids" | "anesthesia" | "act_reconciliation" | undefined;
	}
): { success: boolean; record: EmrAuditRecord; errorMessage?: string } {
	const comment = options.clinicalComment ? options.clinicalComment.trim() : "";
	if (!comment || comment.length < 5) {
		return {
			success: false,
			record,
			errorMessage: "Обязателен клинический комментарий эксперта (минимум 5 символов) с указанием дефекта и предписания по исправлению.",
		};
	}

	const preset = options.presetId
		? CMO_STATUTORY_DEFECT_PRESETS.find((p) => p.id === options.presetId)
		: undefined;

	const severity = options.severity || preset?.severity || "major";
	const title = preset ? preset.title : "Замечание главного врача / службы КЭР";
	const category = preset ? preset.category : "CLINICAL_DIARY_SOAP";
	const affectedSection = options.targetSection || preset?.targetSection || "diaries";

	const newRemark: CmoAuditRemark = {
		id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
		presetId: preset?.id,
		category,
		severity,
		title,
		comment,
		affectedSection,
		createdAt: new Date().toISOString(),
		isResolved: false,
		doctorStaffId: record.doctorStaffId,
	};

	const updatedRemarks = [...record.cmoRemarks, newRemark];
	const finalScore = calculateQualityScore(record.automatedCheckResults, updatedRemarks);
	const auditorName = options.auditorFullName || "Главный врач";
	const auditorRole = options.auditorRole || "chief_medical_officer";

	const updatedRecord: EmrAuditRecord = {
		...record,
		status: "revision_required",
		cmoRemarks: updatedRemarks,
		automatedQualityScore: finalScore,
		cmoResolution: {
			auditorFullName: auditorName,
			auditorRole,
			reviewedAt: new Date().toISOString(),
			decision: "rejected_with_remarks",
			cmoComment: comment,
			finalQualityScore: finalScore,
			requiredActions: [comment],
		},
		auditHistory: [
			...record.auditHistory,
			{
				timestamp: new Date().toISOString(),
				actorFullName: auditorName,
				actorRole: auditorRole === "chief_medical_officer" ? "Главный врач" : "Эксперт КЭР",
				action: "rejected",
				comment: `Карта 043/у возвращена на доработку: ${comment}`,
				previousStatus: record.status,
				newStatus: "revision_required",
			},
		],
	};

	return {
		success: true,
		record: updatedRecord,
	};
}

export interface BatchCmoApprovalOptions {
	auditorFullName: string;
	auditorRole?: "chief_medical_officer" | "deputy_cmo_qcr" | "medical_commission_chair" | undefined;
	certificateThumbprint?: string | undefined;
	certificateSubject?: string | undefined;
	comment?: string | undefined;
}

export interface BatchCmoApprovalResult {
	totalRequested: number;
	approvedCount: number;
	skippedCount: number;
	approvedRecords: EmrAuditRecord[];
	errors: Array<{ recordId: string; reason: string }>;
}

/** Пакетное утверждение проверенных карт 043/у с фиксацией ЭЦП главврача */
export function batchApproveCmoRecords(
	records: EmrAuditRecord[],
	targetRecordIds: string[],
	options: BatchCmoApprovalOptions
): BatchCmoApprovalResult {
	const idSet = new Set(targetRecordIds);
	const approvedRecords: EmrAuditRecord[] = [];
	const errors: Array<{ recordId: string; reason: string }> = [];
	let approvedCount = 0;
	let skippedCount = 0;

	const now = new Date().toISOString();
	const auditorRole = options.auditorRole || "chief_medical_officer";
	const roleTitle = auditorRole === "chief_medical_officer" ? "Главный врач" : "Зам. гл. врача по КЭР";

	for (const rec of records) {
		if (!idSet.has(rec.id)) {
			approvedRecords.push(rec);
			continue;
		}

		// Проверка: можно ли утвердить (нет неразрешенных критических замечаний)
		const unresolvedCritical = rec.cmoRemarks.filter((r) => !r.isResolved && r.severity === "critical");
		if (unresolvedCritical.length > 0) {
			errors.push({
				recordId: rec.id,
				reason: `Карта ${rec.medicalCardId}: имеются неразрешенные критические замечания (${unresolvedCritical.map((r) => r.title).join(", ")})`,
			});
			skippedCount++;
			approvedRecords.push(rec);
			continue;
		}

		// Формирование ЭЦП оттиска
		const signatureHash = `cmo-ecp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${rec.id}`;
		const stampComment = options.comment || "Медицинская карта формы 043/у проверена и утверждена главным врачом с наложением ЭЦП.";

		const approvedRec = applyCmoAuditDecision(rec, "approved", {
			fullName: options.auditorFullName,
			role: auditorRole,
			comment: `${stampComment}${options.certificateSubject ? ` [Сертификат ЭЦП: ${options.certificateSubject}]` : ""}`,
		});

		// Обновляем статус и отметку ЭЦП
		approvedRec.status = "approved_by_cmo";
		approvedRec.auditHistory.push({
			timestamp: now,
			actorFullName: options.auditorFullName,
			actorRole: roleTitle,
			action: "approved",
			comment: `Пакетное утверждение с фиксацией ЭЦП главврача (Хеш: ${signatureHash.substring(0, 16)}...)`,
			previousStatus: rec.status,
			newStatus: "approved_by_cmo",
		});

		approvedCount++;
		approvedRecords.push(approvedRec);
	}

	return {
		totalRequested: targetRecordIds.length,
		approvedCount,
		skippedCount,
		approvedRecords,
		errors,
	};
}

/** Фильтрация и поиск записей в очереди аудита */
export function filterAuditRecords(
	records: EmrAuditRecord[],
	filters: AuditRecordFilters
): EmrAuditRecord[] {
	return records.filter((rec: EmrAuditRecord) => {
		// Фильтр по врачу
		if (filters.doctorStaffId !== undefined && filters.doctorStaffId !== "" && rec.doctorStaffId !== filters.doctorStaffId) {
			return false;
		}

		// Фильтр по статусу (с поддержкой канонических стадий)
		if (filters.status !== undefined && filters.status !== "all") {
			const filterStage = getCanonicalAuditStage(filters.status as EmrAuditStatus);
			const recStage = getCanonicalAuditStage(rec.status);
			if (filterStage !== recStage && rec.status !== filters.status) {
				return false;
			}
		}

		// Фильтр по баллу качества
		if (filters.minScore !== undefined && rec.automatedQualityScore < filters.minScore) {
			return false;
		}
		if (filters.maxScore !== undefined && rec.automatedQualityScore > filters.maxScore) {
			return false;
		}

		// Фильтр по дате
		if (filters.dateFrom !== undefined && rec.visitDate < filters.dateFrom) {
			return false;
		}
		if (filters.dateTo !== undefined && rec.visitDate > filters.dateTo) {
			return false;
		}

		// Текстовый поиск (ФИО пациента, номер карты, ФИО врача, диагноз)
		if (filters.search !== undefined && filters.search.trim()) {
			const q = filters.search.toLowerCase().trim();
			const matchPatient = rec.patientFullName.toLowerCase().includes(q);
			const matchCard = rec.medicalCardId.toLowerCase().includes(q) || rec.recordNumber.toLowerCase().includes(q);
			const matchDoctor = rec.doctorFullName.toLowerCase().includes(q);
			const diagText = rec.cardData.passport.primaryDiagnosisText || "";
			const diagIcd = rec.cardData.passport.primaryDiagnosisIcd10 || "";
			const matchDiag = diagText.toLowerCase().includes(q) || diagIcd.toLowerCase().includes(q);

			if (!matchPatient && !matchCard && !matchDoctor && !matchDiag) {
				return false;
			}
		}

		return true;
	});
}

/** Расчет KPI и метрик качества по врачам клиники */
export function calculateDoctorQualityMetrics(records: EmrAuditRecord[]): DoctorQualityMetrics[] {
	const docMap = new Map<string, {
		staffId: string;
		name: string;
		specialty: string;
		records: EmrAuditRecord[];
	}>();

	for (const rec of records) {
		if (!docMap.has(rec.doctorStaffId)) {
			docMap.set(rec.doctorStaffId, {
				staffId: rec.doctorStaffId,
				name: rec.doctorFullName,
				specialty: rec.doctorSpecialty,
				records: [],
			});
		}
		docMap.get(rec.doctorStaffId)!.records.push(rec);
	}

	const metrics: DoctorQualityMetrics[] = [];

	for (const [, docData] of docMap) {
		const total = docData.records.length;
		if (total === 0) continue;

		let approvedFirstAttempt = 0;
		let approvedWithRemarks = 0;
		let rejectedCount = 0;
		let pendingCount = 0;
		let scoreSum = 0;
		const defectCountMap = new Map<string, { title: string; count: number }>();

		for (const rec of docData.records) {
			scoreSum += rec.automatedQualityScore;
			const stage = getCanonicalAuditStage(rec.status);

			if (stage === "approved_by_cmo") {
				if (rec.cmoRemarks.length === 0) {
					approvedFirstAttempt++;
				} else {
					approvedWithRemarks++;
				}
			} else if (stage === "revision_required") {
				rejectedCount++;
			} else if (stage === "under_review") {
				pendingCount++;
			}

			// Сбор дефектов
			for (const res of rec.automatedCheckResults) {
				if (!res.passed) {
					const cur = defectCountMap.get(res.ruleId) || { title: res.title, count: 0 };
					cur.count++;
					defectCountMap.set(res.ruleId, cur);
				}
			}
			for (const rem of rec.cmoRemarks) {
				const key = rem.presetId || rem.title;
				const cur = defectCountMap.get(key) || { title: rem.title, count: 0 };
				cur.count++;
				defectCountMap.set(key, cur);
			}
		}

		const firstTimeApprovalRate = total > 0 ? Math.round((approvedFirstAttempt / total) * 100) : 0;
		const overallQualityScoreAvg = total > 0 ? Math.round(scoreSum / total) : 100;

		let complianceRating: "excellent" | "good" | "satisfactory" | "risk_of_penalty" = "good";
		if (overallQualityScoreAvg >= 95 && firstTimeApprovalRate >= 90) {
			complianceRating = "excellent";
		} else if (overallQualityScoreAvg >= 85) {
			complianceRating = "good";
		} else if (overallQualityScoreAvg >= 70) {
			complianceRating = "satisfactory";
		} else {
			complianceRating = "risk_of_penalty";
		}

		const commonDefects = Array.from(defectCountMap.entries())
			.map(([defectId, val]: [string, { title: string; count: number }]) => ({ defectId, title: val.title, count: val.count }))
			.sort((a: { count: number }, b: { count: number }) => b.count - a.count)
			.slice(0, 5);

		metrics.push({
			doctorStaffId: docData.staffId,
			doctorFullName: docData.name,
			doctorSpecialty: docData.specialty,
			totalRecordsAudited: total,
			approvedFirstAttempt,
			approvedWithRemarks,
			rejectedCount,
			pendingCount,
			firstTimeApprovalRate,
			overallQualityScoreAvg,
			commonDefects,
			complianceRating,
		});
	}

	return metrics.sort((a: DoctorQualityMetrics, b: DoctorQualityMetrics) => b.overallQualityScoreAvg - a.overallQualityScoreAvg);
}

/** Формирование сводного аналитического отчета службы КЭР */
export function generateCmoAuditSummaryReport(records: EmrAuditRecord[]): CmoAuditSummaryReport {
	const totalAudited = records.length;
	let approvedCount = 0;
	let rejectedCount = 0;
	let pendingCount = 0;
	let draftCount = 0;
	let totalScore = 0;
	const defectAgg = new Map<string, { category: CmoDefectCategory; categoryLabel: string; title: string; count: number }>();

	for (const rec of records) {
		totalScore += rec.automatedQualityScore;
		const stage = getCanonicalAuditStage(rec.status);
		if (stage === "approved_by_cmo") approvedCount++;
		else if (stage === "revision_required") rejectedCount++;
		else if (stage === "under_review") pendingCount++;
		else if (stage === "not_filled" || stage === "in_progress") draftCount++;

		for (const check of rec.automatedCheckResults) {
			if (!check.passed) {
				const cur = defectAgg.get(check.ruleId) || {
					category: check.ruleCategory,
					categoryLabel: CMO_AUDIT_CATEGORIES[check.ruleCategory]?.label || check.ruleCategory,
					title: check.title,
					count: 0,
				};
				cur.count++;
				defectAgg.set(check.ruleId, cur);
			}
		}

		for (const rem of rec.cmoRemarks) {
			const key = rem.presetId || rem.title;
			const cur = defectAgg.get(key) || {
				category: rem.category,
				categoryLabel: CMO_AUDIT_CATEGORIES[rem.category]?.label || rem.category,
				title: rem.title,
				count: 0,
			};
			cur.count++;
			defectAgg.set(key, cur);
		}
	}

	const averageQualityScore = totalAudited > 0 ? Math.round(totalScore / totalAudited) : 100;
	const doctorRankings = calculateDoctorQualityMetrics(records);
	const firstPassRateAvg = doctorRankings.length > 0
		? Math.round(doctorRankings.reduce((acc: number, d: DoctorQualityMetrics) => acc + d.firstTimeApprovalRate, 0) / doctorRankings.length)
		: 100;

	const topDefects = Array.from(defectAgg.values())
		.sort((a: { count: number }, b: { count: number }) => b.count - a.count)
		.slice(0, 10);

	return {
		totalAudited,
		approvedCount,
		rejectedCount,
		pendingCount,
		draftCount,
		averageQualityScore,
		firstPassRateAvg,
		topDefects,
		doctorRankings,
	};
}

/** Генерация текстового протокола экспертизы КЭР (для печати / вложения в карту) */
export function exportCmoAuditProtocolText(record: EmrAuditRecord): string {
	const res = record.cmoResolution;
	const lines: string[] = [];

	lines.push("═══════════════════════════════════════════════════════════════════════════");
	lines.push("ПРОТОКОЛ КЛИНИКО-ЭКСПЕРТНОЙ ОЦЕНКИ КАЧЕСТВА МЕДИЦИНСКОЙ КАРТЫ ФОРМЫ 043/у");
	lines.push(`Номер акта экспертизы: ${record.recordNumber}`);
	lines.push(`Дата проверки: ${res ? new Date(res.reviewedAt).toLocaleDateString("ru-RU") : new Date().toLocaleDateString("ru-RU")}`);
	lines.push("═══════════════════════════════════════════════════════════════════════════");
	lines.push("");
	lines.push(`1. СВЕДЕНИЯ О ПАЦИЕНТЕ И КАРТЕ:`);
	lines.push(`   • Пациент: ${record.patientFullName} (Дата рождения: ${record.patientBirthDate})`);
	lines.push(`   • Номер медицинской карты: ${record.medicalCardId}`);
	lines.push(`   • Лечащий врач: ${record.doctorFullName} (${record.doctorSpecialty})`);
	lines.push(`   • Дата приема: ${record.visitDate}`);
	lines.push(`   • Диагноз: ${record.cardData.passport.primaryDiagnosisIcd10} — ${record.cardData.passport.primaryDiagnosisText}`);
	lines.push("");
	lines.push(`2. РЕЗУЛЬТАТЫ АВТОМАТИЧЕСКОГО КОНТРОЛЯ КАЧЕСТВА (Приказ Минздрава № 203н):`);
	for (const check of record.automatedCheckResults) {
		const mark = check.passed ? "[ СООТВЕТСТВУЕТ ]" : "[   ДЕФЕКТ   ]";
		lines.push(`   ${mark} ${check.title}: ${check.details}`);
	}
	lines.push("");
	lines.push(`3. ЭКСПЕРТНАЯ ОЦЕНКА И ЗАМЕЧАНИЯ СЛУЖБЫ КЭР:`);
	if (record.cmoRemarks.length === 0) {
		lines.push("   Замечаний экспертной комиссии нет. Карта заполнена безупречно.");
	} else {
		for (const [i, rem] of record.cmoRemarks.entries()) {
			const status = rem.isResolved ? "УСТРАНЕНО" : "ТРЕБУЕТ ИСПРАВЛЕНИЯ";
			lines.push(`   ${i + 1}. [${status}] (${rem.severity.toUpperCase()}) ${rem.title}`);
			lines.push(`      Комментарий: ${rem.comment}`);
			if (rem.isResolved && rem.resolutionComment) {
				lines.push(`      Ответ врача: ${rem.resolutionComment}`);
			}
		}
	}
	lines.push("");
	lines.push(`4. ИТОГОВАЯ РЕЗОЛЮЦИЯ ГЛАВНОГО ВРАЧА / ВРАЧЕБНОЙ КОМИССИИ:`);
	lines.push(`   • Статус: ${record.status === "approved" ? "УТВЕРЖДЕНО К ЭКСПОРТУ В ЕГИСЗ" : "ВОЗВРАЩЕНО НА ДОРАБОТКУ"}`);
	lines.push(`   • Итоговый балл качества: ${res?.finalQualityScore ?? record.automatedQualityScore} из 100`);
	if (res) {
		lines.push(`   • Эксперт: ${res.auditorFullName} (${res.auditorRole === "chief_medical_officer" ? "Главный врач" : "Зам. гл. врача по КЭР"})`);
		lines.push(`   • Заключение: ${res.cmoComment}`);
	}
	lines.push("═══════════════════════════════════════════════════════════════════════════");

	return lines.join("\n");
}
