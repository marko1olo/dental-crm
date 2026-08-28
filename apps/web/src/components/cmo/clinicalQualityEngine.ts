/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CMO CLINICAL QUALITY & STATUTORY AUDIT ENGINE (WAVE 9)
 * Chief Medical Officer (Начмед) Quality Control & VKK Expert Review Engine
 * Invariants: Orders 834n, 785n (ВКК), 1051n (ИДС), 804n, 203n, SanPiN, 63-FZ
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MedicalCardForm043uData, VisitDiaryEntry043 } from "../emr/emr043Types";

// ── VKK Control Levels per Order 785n ──
export type VkkControlLevel =
	| "level_1_department_head" // 1-й уровень: Заведующий отделением
	| "level_2_cmo_expert"       // 2-й уровень: Заместитель главного врача по КЭР / Начмед
	| "level_3_medical_commission"; // 3-й уровень: Врачебная комиссия клиники

// ── Defect Severity Classification ──
export type CmoDefectSeverity = "critical" | "major" | "minor";

// ── Statutory Defect Categories per Order 785n & 834n ──
export type CmoDefectCategory =
	| "INFORMED_CONSENT_1051N"
	| "ANESTHESIA_BATCH_AND_DOSAGE"
	| "ICD10_NOMENCLATURE_804N"
	| "ENDODONTIC_XRAY_APEX_CONTROL"
	| "ISOLATION_RUBBERDAM"
	| "CLINICAL_DIARY_SOAP"
	| "UKEP_DIGITAL_SIGNATURE"
	| "EPICRISIS_DISPENSARY"
	| "XRAY_RADIATION_SAFETY";

// ── Audit Status ──
export type CmoAuditStatus =
	| "pending_review"
	| "approved"
	| "rejected_with_remarks"
	| "commission_referral"
	| "archived";

// ── Defect Preset Definition ──
export interface CmoDefectPreset {
	id: string;
	code: string;
	category: CmoDefectCategory;
	categoryLabel: string;
	title: string;
	description: string;
	statutoryReference: string;
	severity: CmoDefectSeverity;
	penaltyScore: number;
	recommendedAction: string;
	targetSection: "ids" | "anesthesia" | "diagnosis" | "endodontics" | "isolation" | "diaries" | "signature" | "epicrisis" | "xray";
}

// ── Attached Document ──
export interface AttachedDocument043 {
	id: string;
	type: "ids_1051n" | "treatment_plan" | "act_completed_works" | "xray_study" | "warranty_card" | "medical_history";
	title: string;
	isSigned: boolean;
	signedAt?: string | null | undefined;
	signedByPatient: boolean;
	signedByDoctorUkep: boolean;
	fileUrl?: string | null | undefined;
}

// ── Completed Act Item ──
export interface CompletedServiceItem {
	serviceCode: string; // Номенклатура 804н (e.g., A16.07.002.001, A16.07.008.002)
	serviceName: string;
	toothNumber?: string | null | undefined;
	quantity: number;
	priceRub: number;
}

// ── Single Automated Check Result ──
export interface CmoAutomatedCheckResult {
	ruleId: string;
	ruleCategory: CmoDefectCategory;
	title: string;
	passed: boolean;
	severity: CmoDefectSeverity;
	details: string;
	statutoryRef: string;
	deduction: number;
}

// ── CMO Custom Remark / Recorded Defect ──
export interface CmoDefectRemark {
	id: string;
	presetId?: string | null | undefined;
	category: CmoDefectCategory;
	severity: CmoDefectSeverity;
	title: string;
	comment: string;
	statutoryRef: string;
	penaltyScore: number;
	affectedSection: string;
	createdAt: string;
	isResolved: boolean;
	resolvedAt?: string | null | undefined;
	resolutionComment?: string | null | undefined;
	doctorStaffId?: string | null | undefined;
}

// ── CMO Resolution ──
export interface CmoResolutionRecord {
	auditorFullName: string;
	auditorRole: "chief_medical_officer" | "deputy_cmo_qcr" | "medical_commission_chair";
	controlLevel: VkkControlLevel;
	reviewedAt: string;
	decision: "approved" | "rejected_with_remarks" | "commission_referral";
	cmoComment: string;
	finalQualityScore: number;
	qualityCategory: "I_CATEGORY_EXCELLENT" | "II_CATEGORY_GOOD" | "III_CATEGORY_RISK";
	correctiveDirectives?: string[] | undefined;
}

// ── Audit History Entry ──
export interface CmoAuditHistoryEntry {
	timestamp: string;
	actorFullName: string;
	actorRole: string;
	action: "created" | "submitted" | "approved" | "rejected" | "remark_added" | "remark_resolved" | "referred_to_commission" | "updated";
	comment: string;
	previousStatus?: CmoAuditStatus | undefined;
	newStatus?: CmoAuditStatus | undefined;
}

// ── Complete Medical Card Audit Record ──
export interface CmoQualityAuditRecord {
	id: string;
	medicalCardId: string;
	recordNumber: string; // Номер акта КЭР (e.g., КЭР-2026-0842)
	patientId: string;
	patientFullName: string;
	patientBirthDate: string;
	patientGender: "male" | "female";
	patientPhone?: string | null | undefined;
	doctorStaffId: string;
	doctorFullName: string;
	doctorSpecialty: string;
	visitDate: string;
	status: CmoAuditStatus;
	controlLevel: VkkControlLevel;
	cardData: MedicalCardForm043uData;
	attachedDocuments: AttachedDocument043[];
	completedServices: CompletedServiceItem[];
	automatedCheckResults: CmoAutomatedCheckResult[];
	automatedQualityScore: number; // 0..100
	cmoRemarks: CmoDefectRemark[];
	cmoResolution?: CmoResolutionRecord | undefined;
	auditHistory: CmoAuditHistoryEntry[];
}

// ── VKK Official Expertise Act ──
export interface VkkExpertiseAct {
	actNumber: string;
	actDate: string;
	controlLevel: VkkControlLevel;
	controlLevelLabel: string;
	clinicName: string;
	clinicOgrn: string;
	clinicLicense: string;
	patientFullName: string;
	patientBirthDate: string;
	medicalCardNumber: string;
	doctorFullName: string;
	doctorSpecialty: string;
	clinicalDiagnosis: string;
	icd10Code: string;
	qualityScore: number;
	qualityCategory: "I_CATEGORY_EXCELLENT" | "II_CATEGORY_GOOD" | "III_CATEGORY_RISK";
	qualityCategoryLabel: string;
	defectsList: Array<{
		code: string;
		category: string;
		title: string;
		statutoryRef: string;
		severity: CmoDefectSeverity;
		penalty: number;
	}>;
	expertConclusion: string;
	correctivePrescriptions: string[];
	commissionChairFullName: string;
	commissionMembers: string[];
	attendingDoctorFullName: string;
}

// ── Doctor Quality Metrics / KPI ──
export interface CmoDoctorQualityRanking {
	doctorStaffId: string;
	doctorFullName: string;
	doctorSpecialty: string;
	totalAudited: number;
	approvedCount: number;
	approvedFirstAttempt: number;
	rejectedCount: number;
	commissionReferrals: number;
	firstPassRatePercent: number; // 0..100%
	averageQualityScore: number; // 0..100
	commonDefects: Array<{ defectTitle: string; count: number; category: CmoDefectCategory }>;
	complianceStatus: "I_CATEGORY_EXCELLENT" | "II_CATEGORY_GOOD" | "III_CATEGORY_RISK";
	complianceStatusLabel: string;
	recommendedVkkAction: string;
}

// ── Filter Parameters ──
export interface CmoAuditFilterParams {
	doctorStaffId?: string | undefined;
	status?: CmoAuditStatus | "all" | undefined;
	controlLevel?: VkkControlLevel | "all" | undefined;
	search?: string | undefined;
	minScore?: number | undefined;
	maxScore?: number | undefined;
	dateFrom?: string | undefined;
	dateTo?: string | undefined;
}

// ── VKK Summary Report ──
export interface CmoVkkSummaryReport {
	totalAudited: number;
	approvedCount: number;
	rejectedCount: number;
	pendingCount: number;
	commissionReferralCount: number;
	averageQualityScore: number;
	firstPassRateAvg: number;
	categoryDistribution: {
		excellentCount: number;
		goodCount: number;
		riskCount: number;
	};
	topDefects: Array<{ category: CmoDefectCategory; categoryLabel: string; title: string; count: number }>;
	doctorRankings: CmoDoctorQualityRanking[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG OF STATUTORY DEFECT PRESETS (Orders 834n, 785n, 1051n, 804n, 203n)
// ═══════════════════════════════════════════════════════════════════════════

export const CMO_STATUTORY_DEFECT_PRESETS: CmoDefectPreset[] = [
	// 1. ИДС 1051н / 323-ФЗ
	{
		id: "DEF-IDS-01",
		code: "КЭР-1051Н-01",
		category: "INFORMED_CONSENT_1051N",
		categoryLabel: "ИДС (Приказ 1051н / 323-ФЗ)",
		title: "Отсутствует подписанное ИДС перед началом лечения",
		description: "В медицинской карте отсутствует скан или электронный документ ИДС, подписанный пациентом до начала вмешательства.",
		statutoryReference: "Приказ Минздрава России от 12.11.2021 № 1051н, ст. 20 Федерального закона № 323-ФЗ",
		severity: "critical",
		penaltyScore: 25,
		recommendedAction: "Оформить и прикрепить подписанный пациентом бланк ИДС по Форме Приказа 1051н.",
		targetSection: "ids",
	},
	{
		id: "DEF-IDS-02",
		code: "КЭР-1051Н-02",
		category: "INFORMED_CONSENT_1051N",
		categoryLabel: "ИДС (Приказ 1051н / 323-ФЗ)",
		title: "ИДС оформлено позже даты проведенного вмешательства",
		description: "Дата подписания согласия пациентом позже даты выполнения инвазивного лечения в дневнике.",
		statutoryReference: "Федеральный закон № 323-ФЗ ст. 20 ч. 1, Приказ Минздрава № 1051н",
		severity: "critical",
		penaltyScore: 20,
		recommendedAction: "Устранить процессуальное нарушение, получить актуализированное подтверждение.",
		targetSection: "ids",
	},

	// 2. Анестезия: дозировка мг/кг и номер партии/серии карпулы
	{
		id: "DEF-ANES-01",
		code: "КЭР-АНЕС-01",
		category: "ANESTHESIA_BATCH_AND_DOSAGE",
		categoryLabel: "Протокол анестезии (Дозировка / Партия)",
		title: "Отсутствует номер серии (партии) карпулы анестетика",
		description: "В протоколе обезболивания не указан номер производственной серии карпулы (требование фармаконадзора и 785н).",
		statutoryReference: "Приказ Минздрава России № 785н п. 17, стандарты клинической безопасности",
		severity: "major",
		penaltyScore: 10,
		recommendedAction: "Внести в протокол номер серии и срок годности использованной карпулы (например, 'Серия 24B012').",
		targetSection: "anesthesia",
	},
	{
		id: "DEF-ANES-02",
		code: "КЭР-АНЕС-02",
		category: "ANESTHESIA_BATCH_AND_DOSAGE",
		categoryLabel: "Протокол анестезии (Дозировка / Партия)",
		title: "Не указана дозировка (мг/кг или общий объем активного вещества)",
		description: "Отсутствует расчет или точный объем введенного анестетика с концентрацией действующего вещества.",
		statutoryReference: "Приказ Минздрава России № 203н п. 2.3, Клинические рекомендации СтАР",
		severity: "critical",
		penaltyScore: 20,
		recommendedAction: "Указать полный протокол: 'Sol. Articaini 4% cum Epinephrino 1:100000 - 1.7 мл (68 мг артикаина) инфильтрационно'.",
		targetSection: "anesthesia",
	},
	{
		id: "DEF-ANES-03",
		code: "КЭР-АНЕС-03",
		category: "ANESTHESIA_BATCH_AND_DOSAGE",
		categoryLabel: "Протокол анестезии (Дозировка / Партия)",
		title: "Инвазивное лечение проведено без протокола обезболивания",
		description: "При препарировании дентина, депульпировании или удалении зуба нет записи об анестезии или отказе пациента.",
		statutoryReference: "Федеральный закон № 323-ФЗ ст. 19 ч. 5 п. 5, Приказ Минздрава № 203н",
		severity: "critical",
		penaltyScore: 20,
		recommendedAction: "Зафиксировать метод анестезии либо отказ пациента от обезболивания.",
		targetSection: "anesthesia",
	},

	// 3. МКБ-10 и Номенклатура 804н
	{
		id: "DEF-ICD-01",
		code: "КЭР-МКБ-01",
		category: "ICD10_NOMENCLATURE_804N",
		categoryLabel: "МКБ-10 и Номенклатура 804н",
		title: "Отсутствует или некорректен код диагноза по МКБ-10",
		description: "В карте не указан шифр по МКБ-10 (класс XI K00-K14) или код не соответствует клинической картине.",
		statutoryReference: "Приказ Минздрава России № 834н, Приказ № 203н п. 2.1",
		severity: "critical",
		penaltyScore: 20,
		recommendedAction: "Указать точный нозологический код МКБ-10 (например, K02.1, K04.0, K05.3).",
		targetSection: "diagnosis",
	},
	{
		id: "DEF-ICD-02",
		code: "КЭР-МКБ-02",
		category: "ICD10_NOMENCLATURE_804N",
		categoryLabel: "МКБ-10 и Номенклатура 804н",
		title: "Услуга не соответствует коду Номенклатуры 804н",
		description: "В акте выполненных работ или плане лечения использованы произвольные наименования вместо кодов Номенклатуры 804н.",
		statutoryReference: "Приказ Минздрава России от 13.10.2017 № 804н",
		severity: "minor",
		penaltyScore: 5,
		recommendedAction: "Привести коды услуг в соответствие с Номенклатурой (например, A16.07.002, A16.07.008).",
		targetSection: "diagnosis",
	},

	// 4. Эндодонтия: рентген-контроль обтурации каналов до апекса
	{
		id: "DEF-ENDO-01",
		code: "КЭР-ЭНДО-01",
		category: "ENDODONTIC_XRAY_APEX_CONTROL",
		categoryLabel: "Эндодонтия (Рентген-контроль апекса)",
		title: "Отсутствует контрольный рентген-снимок после пломбирования каналов",
		description: "При завершении эндодонтического лечения (пульпит/периодонтит) отсутствует снимок с визуализацией обтурации каналов.",
		statutoryReference: "Клинические рекомендации СтАР по эндодонтии, Приказ Минздрава № 203н п. 2.2",
		severity: "critical",
		penaltyScore: 25,
		recommendedAction: "Выполнить и прикрепить контрольную визиографию/прицельный снимок корневых каналов.",
		targetSection: "endodontics",
	},
	{
		id: "DEF-ENDO-02",
		code: "КЭР-ЭНДО-02",
		category: "ENDODONTIC_XRAY_APEX_CONTROL",
		categoryLabel: "Эндодонтия (Рентген-контроль апекса)",
		title: "Каналы запломбированы не до физиологического апекса (недопломбировка/выведение)",
		description: "В описании снимка или протоколе зафиксировано отклонение обтурации более чем на 2 мм от апекса.",
		statutoryReference: "Клинические стандарты эндодонтического лечения СтАР",
		severity: "critical",
		penaltyScore: 20,
		recommendedAction: "Провести ревизию корневых каналов или обосновать анатомическую обтурацию в протоколе.",
		targetSection: "endodontics",
	},

	// 5. Изоляция коффердамом
	{
		id: "DEF-ISOL-01",
		code: "КЭР-ИЗОЛ-01",
		category: "ISOLATION_RUBBERDAM",
		categoryLabel: "Изоляция рабочего поля",
		title: "Отсутствует отметка об изоляции коффердамом (раббердамом) при эндодонтии/реставрации",
		description: "При работе с корневыми каналами или адгезивным протоколом не указано использование системы коффердам.",
		statutoryReference: "Клинические рекомендации СтАР по терапевтической стоматологии",
		severity: "minor",
		penaltyScore: 5,
		recommendedAction: "Внести в протокол применение системы коффердам (кламп, платок, герметизация жидким коффердамом).",
		targetSection: "isolation",
	},

	// 6. Дневник SOAP
	{
		id: "DEF-SOAP-01",
		code: "КЭР-SOAP-01",
		category: "CLINICAL_DIARY_SOAP",
		categoryLabel: "Дневник визита (SOAP)",
		title: "Неполный дневник визита (отсутствуют жалобы, объективный статус или протокол)",
		description: "Дневниковая запись не соответствует структуре SOAP (Subjective, Objective, Assessment, Plan).",
		statutoryReference: "Приказ Минздрава России № 834н п. 8",
		severity: "major",
		penaltyScore: 15,
		recommendedAction: "Дополнить дневниковую запись всеми обязательными разделами стандарта SOAP.",
		targetSection: "diaries",
	},

	// 7. УКЭП
	{
		id: "DEF-UKEP-01",
		code: "КЭР-УКЭП-01",
		category: "UKEP_DIGITAL_SIGNATURE",
		categoryLabel: "Электронная подпись (УКЭП)",
		title: "Отсутствует усиленная квалифицированная электронная подпись врача",
		description: "Электронная карта не подписана квалифицированным сертификатом УКЭП лечащего врача (Приказ 947н).",
		statutoryReference: "Федеральный закон № 63-ФЗ, Приказ Минздрава России № 947н",
		severity: "critical",
		penaltyScore: 20,
		recommendedAction: "Подписать дневниковую запись персональным сертификатом УКЭП врача.",
		targetSection: "signature",
	},

	// 8. Эпикриз и диспансеризация
	{
		id: "DEF-EPIC-01",
		code: "КЭР-ЭПИК-01",
		category: "EPICRISIS_DISPENSARY",
		categoryLabel: "Эпикриз и диспансеризация",
		title: "Не определена группа диспансерного наблюдения (Д-I, Д-II, Д-III) или срок профосмотра",
		description: "В эпикризе завершенного лечения отсутствует указание диспансерной группы и контрольного срока.",
		statutoryReference: "Приказ Минздрава России № 834н, Приказ № 168н",
		severity: "minor",
		penaltyScore: 5,
		recommendedAction: "Определить диспансерную группу (Д-I, Д-II, Д-III) и назначить контрольный визит через 6 мес.",
		targetSection: "epicrisis",
	},

	// 9. Дозовая нагрузка СанПиН
	{
		id: "DEF-XRAY-01",
		code: "КЭР-РАД-01",
		category: "XRAY_RADIATION_SAFETY",
		categoryLabel: "Радиационная безопасность",
		title: "Не внесена дозовая нагрузка (мЗв) при выполнении рентгенографии",
		description: "При наличии рентгенологических снимков в карте отсутствует учет полученной дозы облучения.",
		statutoryReference: "СанПиН 2.6.1.1192-03, Приказ Минздрава № 560н",
		severity: "minor",
		penaltyScore: 5,
		recommendedAction: "Зафиксировать индивидуальную дозу облучения (например, 0.004 мЗв на снимок).",
		targetSection: "xray",
	},
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Проверка формата кода МКБ-10 */
export function isValidIcd10Code(code: string | undefined | null): boolean {
	if (!code || typeof code !== "string") return false;
	const trimmed = code.trim().toUpperCase();
	const icd10Regex = /^[A-Z][0-9]{2}(\.[0-9]{1,3})?$/;
	return icd10Regex.test(trimmed);
}

/** Проверка кода Номенклатуры 804н */
export function isValidNomenclature804nCode(code: string | undefined | null): boolean {
	if (!code || typeof code !== "string") return false;
	const trimmed = code.trim().toUpperCase();
	// Формат Номенклатуры 804н: A/B + 2 цифры . 2 цифры . 3 цифры (например: A16.07.002, A16.07.008.001, B01.003.004)
	const nomRegex = /^[AB][0-9]{2}\.[0-9]{2,3}(\.[0-9]{2,3})?(\.[0-9]{1,3})?$/;
	return nomRegex.test(trimmed);
}

/** Проверка наличия номера серии/партии карпулы анестетика в тексте */
export function extractAnesthesiaBatchNumber(text: string | undefined | null): string | null {
	if (!text || typeof text !== "string") return null;
	// Поиск серии / партии: "сер. 12345", "серия: 24B012", "партия LOT-8941", "LOT 98214"
	const batchRegex = /(?:сери[яи]|сер\.?|парти[яи]|партия|лот|lot|batch)[\s№#:]*([A-Za-z0-9\-_/]+)/i;
	const match = text.match(batchRegex);
	return match?.[1] ? match[1].trim() : null;
}

/** Проверка наличия дозировки анестетика в тексте (мг, мл, карпулы) */
export function extractAnesthesiaDosage(text: string | undefined | null): {
	volumeMl?: number | undefined;
	carpules?: number | undefined;
	mgActive?: number | undefined;
	rawText: string;
} | null {
	if (!text || typeof text !== "string") return null;
	const trimmed = text.trim();
	if (trimmed.length < 3) return null;

	let volumeMl: number | undefined;
	let carpules: number | undefined;
	let mgActive: number | undefined;

	// Поиск мл
	const mlMatch = trimmed.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:мл|ml)/i);
	if (mlMatch?.[1]) {
		volumeMl = parseFloat(mlMatch[1].replace(",", "."));
	}

	// Поиск карпул
	const carpMatch = trimmed.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:карп|carp)/i);
	if (carpMatch?.[1]) {
		carpules = parseFloat(carpMatch[1].replace(",", "."));
		if (!volumeMl) volumeMl = Math.round(carpules * 1.7 * 10) / 10;
	}

	// Поиск мг
	const mgMatch = trimmed.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:мг|mg)/i);
	if (mgMatch?.[1]) {
		mgActive = parseFloat(mgMatch[1].replace(",", "."));
	}

	if (volumeMl !== undefined || carpules !== undefined || mgActive !== undefined) {
		return { volumeMl, carpules, mgActive, rawText: trimmed };
	}
	return null;
}

/** Проверка, является ли случай эндодонтическим */
export function isEndodonticCase(
	card: MedicalCardForm043uData,
	completedServices: CompletedServiceItem[] = []
): boolean {
	// 1. По МКБ-10 (K04: Болезни пульпы и периапикальных тканей)
	const primaryIcd = (card.passport.primaryDiagnosisIcd10 || "").toUpperCase();
	if (primaryIcd.startsWith("K04")) return true;

	// 2. По диагнозам в дневниках
	const hasEndoDiaryDiag = card.visitDiaries.some((vd: VisitDiaryEntry043) => {
		const icd = (vd.assessmentIcd10Code || "").toUpperCase();
		const text = `${vd.assessmentDiagnosisText} ${vd.procedureProtocol}`.toLowerCase();
		return (
			icd.startsWith("K04") ||
			text.includes("пульпит") ||
			text.includes("периодонтит") ||
			text.includes("эндодонт") ||
			text.includes("депульп") ||
			text.includes("экстирпац") ||
			text.includes("корнев") ||
			text.includes("гуттаперч") ||
			text.includes("обтурац")
		);
	});
	if (hasEndoDiaryDiag) return true;

	// 3. По услугам 804н (A16.07.008, A16.07.030, A16.07.082)
	const hasEndoService = completedServices.some((s: CompletedServiceItem) => {
		const code = (s.serviceCode || "").toUpperCase();
		const name = (s.serviceName || "").toLowerCase();
		return (
			code.startsWith("A16.07.008") ||
			code.startsWith("A16.07.030") ||
			code.startsWith("A16.07.082") ||
			name.includes("канал") ||
			name.includes("пульпит") ||
			name.includes("депульпирование") ||
			name.includes("эндодонт")
		);
	});

	return hasEndoService;
}

/** Проверка рентген-контроля апекса при эндодонтии */
export function checkEndodonticApexXrayControl(card: MedicalCardForm043uData): {
	hasApexXrayControl: boolean;
	details: string;
	isApexReached: boolean;
} {
	const allText = [
		card.dentalStatus.xrayFindingsDescription || "",
		...card.visitDiaries.map((d: VisitDiaryEntry043) => `${d.objectiveStatusLocalis} ${d.procedureProtocol}`),
	].join(" ").toLowerCase();

	const mentionsXray =
		allText.includes("визиограф") ||
		allText.includes("рентген") ||
		allText.includes("снимок") ||
		allText.includes("клкт") ||
		allText.includes("прицельн") ||
		(card.dentalStatus.xrayRadiationDoseMsv !== undefined && card.dentalStatus.xrayRadiationDoseMsv !== null && card.dentalStatus.xrayRadiationDoseMsv > 0);

	const mentionsApex =
		allText.includes("апекс") ||
		allText.includes("верхушк") ||
		allText.includes("до физиологического") ||
		allText.includes("до анатомического") ||
		allText.includes("длина канала") ||
		allText.includes("обтурация плотная") ||
		allText.includes("гомогенно");

	const hasApexXrayControl = mentionsXray && mentionsApex;
	const isApexReached = mentionsApex;

	let details = "Эндодонтический рентген-контроль выполнен: обтурация корневых каналов до апекса подтверждена.";
	if (!mentionsXray) {
		details = "Отсутствует контрольный рентген-снимок (визиография) после пломбирования каналов.";
	} else if (!mentionsApex) {
		details = "Снимок выполнен, но в протоколе не зафиксировано подтверждение обтурации до апекса.";
	}

	return {
		hasApexXrayControl,
		details,
		isApexReached,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE AUTOMATED AUDIT ALGORITHM (Order 834n & VKK 785n)
// ═══════════════════════════════════════════════════════════════════════════

export function runCmoQualityAudit(
	record: CmoQualityAuditRecord
): {
	results: CmoAutomatedCheckResult[];
	score: number;
	passedCount: number;
	failedCount: number;
	qualityCategory: "I_CATEGORY_EXCELLENT" | "II_CATEGORY_GOOD" | "III_CATEGORY_RISK";
	qualityCategoryLabel: string;
	isEligibleForAutoApproval: boolean;
} {
	const results: CmoAutomatedCheckResult[] = [];
	const card = record.cardData;

	// ── CHECK 1: Подписанное ИДС 1051н перед лечением ──
	const idsDoc = record.attachedDocuments.find(
		(d: AttachedDocument043) => d.type === "ids_1051n" || d.title.toLowerCase().includes("идс") || d.title.toLowerCase().includes("согласи")
	);

	let idsPassed = false;
	let idsDetails = "Отсутствует прикрепленное или подписанное пациентом ИДС по Приказу 1051н.";
	let idsDeduction = 25;

	if (idsDoc && (idsDoc.isSigned || idsDoc.signedByPatient)) {
		// Проверка даты
		const visitDate = record.visitDate || card.passport.cardOpenedDate;
		const signedDate = idsDoc.signedAt || visitDate;
		if (signedDate <= visitDate) {
			idsPassed = true;
			idsDetails = `ИДС (Приказ 1051н) прикреплено и подписано пациентом до начала лечения (${idsDoc.title}, дата: ${signedDate}).`;
			idsDeduction = 0;
		} else {
			idsPassed = false;
			idsDetails = `ИДС подписано позже даты вмешательства (дата ИДС: ${signedDate}, дата визита: ${visitDate}). Нарушение ст. 20 323-ФЗ.`;
			idsDeduction = 20;
		}
	}

	results.push({
		ruleId: "RULE-IDS-1051N",
		ruleCategory: "INFORMED_CONSENT_1051N",
		title: "Информированное добровольное согласие (ИДС 1051н)",
		passed: idsPassed,
		severity: "critical",
		details: idsDetails,
		statutoryRef: "Приказ Минздрава России № 1051н, Федеральный закон № 323-ФЗ ст. 20",
		deduction: idsDeduction,
	});

	// ── CHECK 2: Протокол анестезии: препарат, дозировка (мг/кг), серия/партия карпулы ──
	const isInvasive = card.visitDiaries.some((vd: VisitDiaryEntry043) => {
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
	}) || record.completedServices.some((s: CompletedServiceItem) => {
		const name = s.serviceName.toLowerCase();
		return name.includes("анестези") || name.includes("удаление") || name.includes("лечение") || name.includes("кариес") || name.includes("пульпит");
	});

	let anesPassed = true;
	let anesDetails = "Инвазивные манипуляции не проводились (протокол анестезии не требуется).";
	let anesDeduction = 0;
	let anesSeverity: CmoDefectSeverity = "critical";

	if (isInvasive) {
		const anesthesiaTexts = card.visitDiaries
			.map((d: VisitDiaryEntry043) => `${d.anesthesiaDetails || ""} ${d.procedureProtocol}`)
			.join(" ");

		const lower = anesthesiaTexts.toLowerCase();
		const hasDrugMention =
			lower.includes("артикаин") || lower.includes("articain") ||
			lower.includes("ультракаин") || lower.includes("ultracain") ||
			lower.includes("убистезин") || lower.includes("ubistesin") ||
			lower.includes("септонест") || lower.includes("septanest") ||
			lower.includes("скандонест") || lower.includes("scandonest") ||
			lower.includes("мепивакаин") || lower.includes("mepivacain") ||
			lower.includes("лидокаин") || lower.includes("lidocain") ||
			lower.includes("бупивакаин") || lower.includes("bupivacain") ||
			lower.includes("анестези") || lower.includes("anesthes") ||
			lower.includes("без анестезии") || lower.includes("отказ от анестезии");

		const dosageInfo = extractAnesthesiaDosage(anesthesiaTexts);
		const batchNumber = extractAnesthesiaBatchNumber(anesthesiaTexts);

		if (!hasDrugMention) {
			anesPassed = false;
			anesDetails = "Инвазивное вмешательство проведено без обязательной фиксации протокола обезболивания (Приказ 203н).";
			anesDeduction = 20;
			anesSeverity = "critical";
		} else if (lower.includes("без анестезии") || lower.includes("отказ от анестезии")) {
			anesPassed = true;
			anesDetails = "Зафиксирован отказ пациента от местного обезболивания по личному заявлению.";
			anesDeduction = 0;
		} else if (!dosageInfo) {
			anesPassed = false;
			anesDetails = "Указан препарат анестезии, но отсутствует расчет дозировки (объем в мл/карпулах или мг активного вещества).";
			anesDeduction = 15;
			anesSeverity = "critical";
		} else if (!batchNumber) {
			anesPassed = false;
			anesDetails = `Протокол анестезии зафиксирован (${dosageInfo.rawText.slice(0, 40)}...), но отсутствует номер серии/партии карпулы (Приказ 785н).`;
			anesDeduction = 10;
			anesSeverity = "major";
		} else {
			anesPassed = true;
			anesDetails = `Протокол анестезии полностью оформлен: препарат, дозировка (${dosageInfo.volumeMl ? `${dosageInfo.volumeMl} мл` : ""}), серия карпулы: ${batchNumber}.`;
			anesDeduction = 0;
		}
	}

	results.push({
		ruleId: "RULE-ANES-SAFETY",
		ruleCategory: "ANESTHESIA_BATCH_AND_DOSAGE",
		title: "Протокол анестезии (Дозировка и серия карпулы)",
		passed: anesPassed,
		severity: anesSeverity,
		details: anesDetails,
		statutoryRef: "Приказ Минздрава России № 785н п. 17, Приказ № 203н п. 2.3",
		deduction: anesDeduction,
	});

	// ── CHECK 3: Обоснование диагноза по МКБ-10 и Номенклатуре 804н ──
	const primaryIcdValid = isValidIcd10Code(card.passport.primaryDiagnosisIcd10);
	const primaryDiagTextValid = Boolean(card.passport.primaryDiagnosisText && card.passport.primaryDiagnosisText.trim().length >= 4);
	const allDiariesIcdValid = card.visitDiaries.length > 0 && card.visitDiaries.every((vd: VisitDiaryEntry043) => isValidIcd10Code(vd.assessmentIcd10Code));

	let icdPassed = true;
	let icdDetails = `Диагноз по МКБ-10 обоснован: ${card.passport.primaryDiagnosisIcd10 || ""} (${card.passport.primaryDiagnosisText || ""}).`;
	let icdDeduction = 0;

	if (!primaryIcdValid || !primaryDiagTextValid || !allDiariesIcdValid) {
		icdPassed = false;
		icdDetails = !primaryIcdValid
			? `Некорректный или отсутствующий код МКБ-10: "${card.passport.primaryDiagnosisIcd10 || ""}".`
			: !primaryDiagTextValid
				? "Отсутствует развернутое клиническое наименование диагноза."
				: "В дневниковых записях не указан корректный код МКБ-10.";
		icdDeduction = 20;
	}

	// Проверка соответствия Номенклатуре 804н
	if (record.completedServices.length > 0) {
		const invalidCodes = record.completedServices.filter((s: CompletedServiceItem) => !isValidNomenclature804nCode(s.serviceCode));
		if (invalidCodes.length > 0) {
			icdPassed = false;
			icdDetails += ` Внимание: выявлены услуги без валидного кода 804н (${invalidCodes.map((c: CompletedServiceItem) => c.serviceCode).join(", ")}).`;
			icdDeduction = Math.max(icdDeduction, 10);
		}
	}

	results.push({
		ruleId: "RULE-ICD10-804N",
		ruleCategory: "ICD10_NOMENCLATURE_804N",
		title: "Кодирование диагноза по МКБ-10 и услуг по 804н",
		passed: icdPassed,
		severity: "critical",
		details: icdDetails,
		statutoryRef: "Приказ Минздрава России № 834н, Приказ № 804н, Приказ № 203н п. 2.1",
		deduction: icdDeduction,
	});

	// ── CHECK 4: Обязательный рентген-контроль при эндодонтии (пломбирование каналов до апекса) ──
	const isEndo = isEndodonticCase(card, record.completedServices);
	let endoPassed = true;
	let endoDetails = "Эндодонтическое лечение не проводилось.";
	let endoDeduction = 0;

	if (isEndo) {
		const endoCheck = checkEndodonticApexXrayControl(card);
		if (endoCheck.hasApexXrayControl) {
			endoPassed = true;
			endoDetails = endoCheck.details;
			endoDeduction = 0;
		} else {
			endoPassed = false;
			endoDetails = endoCheck.details;
			endoDeduction = 25; // Высокий дефект качества
		}
	}

	results.push({
		ruleId: "RULE-ENDO-APEX-XRAY",
		ruleCategory: "ENDODONTIC_XRAY_APEX_CONTROL",
		title: "Эндодонтия: рентген-контроль обтурации до апекса",
		passed: endoPassed,
		severity: "critical",
		details: endoDetails,
		statutoryRef: "Клинические рекомендации СтАР по эндодонтии, Приказ Минздрава № 203н п. 2.2",
		deduction: endoDeduction,
	});

	// ── CHECK 5: Изоляция рабочего поля (коффердам/раббердам) ──
	const requiresIsolation = isEndo || card.visitDiaries.some((vd: VisitDiaryEntry043) => {
		const t = vd.procedureProtocol.toLowerCase();
		return t.includes("композит") || t.includes("пломб") || t.includes("реставрац") || t.includes("бондинг");
	});

	let isolPassed = true;
	let isolDetails = "Изоляция коффердамом зафиксирована.";
	let isolDeduction = 0;

	if (requiresIsolation) {
		const mentionsIsolation = card.visitDiaries.some((vd: VisitDiaryEntry043) => {
			const t = vd.procedureProtocol.toLowerCase();
			return t.includes("коффердам") || t.includes("раббердам") || t.includes("оптрадам") || t.includes("изоляция") || t.includes("кламп");
		});

		if (mentionsIsolation) {
			isolPassed = true;
			isolDetails = "Применение системы изоляции (коффердам/раббердам) отражено в протоколе.";
			isolDeduction = 0;
		} else {
			isolPassed = false;
			isolDetails = "При проведении эндодонтии/композитной реставрации отсутствует запись об изоляции коффердамом.";
			isolDeduction = 5;
		}
	}

	results.push({
		ruleId: "RULE-ISOL-RUBBERDAM",
		ruleCategory: "ISOLATION_RUBBERDAM",
		title: "Изоляция рабочего поля (коффердам)",
		passed: isolPassed,
		severity: "minor",
		details: isolDetails,
		statutoryRef: "Клинические стандарты Стоматологической Ассоциации России (СтАР)",
		deduction: isolDeduction,
	});

	// ── CHECK 6: Полнота дневников SOAP ──
	let soapPassed = true;
	let soapDetails = `Заполнено ${card.visitDiaries.length} дневниковых записей по стандарту SOAP.`;
	let soapDeduction = 0;

	if (!card.visitDiaries || card.visitDiaries.length === 0) {
		soapPassed = false;
		soapDetails = "В карте отсутствуют дневниковые записи посещений.";
		soapDeduction = 20;
	} else {
		for (const [idx, vd] of card.visitDiaries.entries()) {
			if (!vd.subjectiveComplaints || vd.subjectiveComplaints.trim().length < 3) {
				soapPassed = false;
				soapDetails = `Визит #${idx + 1}: не заполнены жалобы пациента (Subjective).`;
				soapDeduction = 10;
				break;
			}
			if (!vd.objectiveStatusLocalis || vd.objectiveStatusLocalis.trim().length < 6) {
				soapPassed = false;
				soapDetails = `Визит #${idx + 1}: не заполнен объективный статус (Objective / Status localis).`;
				soapDeduction = 15;
				break;
			}
			if (!vd.procedureProtocol || vd.procedureProtocol.trim().length < 10) {
				soapPassed = false;
				soapDetails = `Визит #${idx + 1}: не заполнен протокол манипуляций (Procedure).`;
				soapDeduction = 15;
				break;
			}
		}
	}

	results.push({
		ruleId: "RULE-SOAP-DIARY",
		ruleCategory: "CLINICAL_DIARY_SOAP",
		title: "Полнота клинического дневника (SOAP)",
		passed: soapPassed,
		severity: "major",
		details: soapDetails,
		statutoryRef: "Приказ Минздрава России № 834н п. 8",
		deduction: soapDeduction,
	});

	// ── CHECK 7: Электронная подпись врача (УКЭП по 63-ФЗ и 947н) ──
	const hasUkep = card.visitDiaries.length > 0 && card.visitDiaries.every(
		(vd: VisitDiaryEntry043) => vd.isSignedWithUkep === true || (Boolean(vd.digitalSignatureHash) && vd.digitalSignatureHash!.length >= 16)
	);

	results.push({
		ruleId: "RULE-UKEP-SIGNATURE",
		ruleCategory: "UKEP_DIGITAL_SIGNATURE",
		title: "Электронная подпись врача (УКЭП)",
		passed: hasUkep,
		severity: "critical",
		details: hasUkep
			? "Все дневниковые записи заверены усиленной квалифицированной электронной подписью (УКЭП) лечащего врача."
			: "Дневниковые записи не подписаны персональным сертификатом УКЭП врача (Приказ 947н).",
		statutoryRef: "Федеральный закон № 63-ФЗ, Приказ Минздрава России № 947н",
		deduction: hasUkep ? 0 : 20,
	});

	// ── CHECK 8: Эпикриз и диспансерное наблюдение (834н / 168н) ──
	const hasDispensary = Boolean(card.epicrisis?.dispensaryGroup && card.epicrisis?.plannedRecallIntervalMonths);
	results.push({
		ruleId: "RULE-EPICRISIS-DISP",
		ruleCategory: "EPICRISIS_DISPENSARY",
		title: "Эпикриз и диспансерная группа",
		passed: hasDispensary,
		severity: "minor",
		details: hasDispensary
			? `Диспансерная группа: ${card.epicrisis.dispensaryGroupLabel || card.epicrisis.dispensaryGroup}, срок профосмотра: через ${card.epicrisis.plannedRecallIntervalMonths} мес.`
			: "Не определена группа диспансерного наблюдения или срок контрольного осмотра.",
		statutoryRef: "Приказ Минздрава России № 834н, Приказ № 168н",
		deduction: hasDispensary ? 0 : 5,
	});

	// ── CHECK 9: Радиационная безопасность и дозовая нагрузка (СанПиН) ──
	const hasXrayDose = card.dentalStatus?.xrayRadiationDoseMsv !== undefined && card.dentalStatus?.xrayRadiationDoseMsv !== null;
	const hasXrayDesc = Boolean(card.dentalStatus?.xrayFindingsDescription && card.dentalStatus.xrayFindingsDescription.trim().length >= 4);
	const xraySanpinPassed = hasXrayDesc || !hasXrayDose;

	results.push({
		ruleId: "RULE-XRAY-SANPIN",
		ruleCategory: "XRAY_RADIATION_SAFETY",
		title: "Радиационная безопасность (СанПиН 2.6.1.1192-03)",
		passed: xraySanpinPassed,
		severity: "minor",
		details: xraySanpinPassed
			? `Рентгенологические данные и дозовая нагрузка учтены (${card.dentalStatus.xrayRadiationDoseMsv ?? 0} мЗв).`
			: "Указана лучевая нагрузка, но отсутствует диагностическое описание снимка.",
		statutoryRef: "СанПиН 2.6.1.1192-03, Приказ Минздрава № 560н",
		deduction: xraySanpinPassed ? 0 : 5,
	});

	// ── Суммарный балл качества ──
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

	let qualityCategory: "I_CATEGORY_EXCELLENT" | "II_CATEGORY_GOOD" | "III_CATEGORY_RISK" = "I_CATEGORY_EXCELLENT";
	let qualityCategoryLabel = "I категория (Высокое качество)";

	if (score >= 90 && failedCount === 0) {
		qualityCategory = "I_CATEGORY_EXCELLENT";
		qualityCategoryLabel = "I категория (Высокое качество)";
	} else if (score >= 70) {
		qualityCategory = "II_CATEGORY_GOOD";
		qualityCategoryLabel = "II категория (Удовлетворительно, требуется устранение замечаний)";
	} else {
		qualityCategory = "III_CATEGORY_RISK";
		qualityCategoryLabel = "III категория (Неудовлетворительно, риск штрафов ТФОМС/Росздравнадзора)";
	}

	const isEligibleForAutoApproval = failedCount === 0 && score === 100;

	return {
		results,
		score,
		passedCount,
		failedCount,
		qualityCategory,
		qualityCategoryLabel,
		isEligibleForAutoApproval,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE CALCULATION & RESOLUTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/** Расчет итогового индекса качества с учетом ручных замечаний начмеда */
export function calculateFinalCmoQualityScore(
	checkResults: CmoAutomatedCheckResult[],
	cmoRemarks: CmoDefectRemark[]
): {
	score: number;
	qualityCategory: "I_CATEGORY_EXCELLENT" | "II_CATEGORY_GOOD" | "III_CATEGORY_RISK";
	qualityCategoryLabel: string;
} {
	let score = 100;

	// Автоматические вычеты
	for (const check of checkResults) {
		if (!check.passed) {
			score -= check.deduction;
		}
	}

	// Вычеты по неразрешенным замечаниям начмеда
	for (const rem of cmoRemarks) {
		if (!rem.isResolved) {
			score -= rem.penaltyScore;
		}
	}

	score = Math.max(0, Math.min(100, score));

	let qualityCategory: "I_CATEGORY_EXCELLENT" | "II_CATEGORY_GOOD" | "III_CATEGORY_RISK" = "I_CATEGORY_EXCELLENT";
	let qualityCategoryLabel = "I категория (Высокое качество)";

	if (score >= 90) {
		qualityCategory = "I_CATEGORY_EXCELLENT";
		qualityCategoryLabel = "I категория (Высокое качество)";
	} else if (score >= 70) {
		qualityCategory = "II_CATEGORY_GOOD";
		qualityCategoryLabel = "II категория (Удовлетворительное качество)";
	} else {
		qualityCategory = "III_CATEGORY_RISK";
		qualityCategoryLabel = "III категория (Риск штрафных санкций)";
	}

	return { score, qualityCategory, qualityCategoryLabel };
}

/** Создание новой записи аудита */
export function createCmoAuditRecord(
	initial: Partial<CmoQualityAuditRecord> & { cardData: MedicalCardForm043uData }
): CmoQualityAuditRecord {
	const id = initial.id ?? `cmo-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
	const record: CmoQualityAuditRecord = {
		id,
		medicalCardId: initial.medicalCardId ?? initial.cardData.passport.medicalCardNumber ?? "СТ-001",
		recordNumber: initial.recordNumber ?? `КЭР-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
		patientId: initial.patientId ?? `pat-${Date.now()}`,
		patientFullName: initial.patientFullName ?? initial.cardData.passport.patientFullName ?? "Пациент",
		patientBirthDate: initial.patientBirthDate ?? initial.cardData.passport.patientBirthDate ?? "1990-01-01",
		patientGender: initial.patientGender ?? initial.cardData.passport.patientSex ?? "male",
		patientPhone: initial.patientPhone ?? initial.cardData.passport.patientPhone ?? null,
		doctorStaffId: initial.doctorStaffId ?? "doc-001",
		doctorFullName: initial.doctorFullName ?? initial.cardData.passport.attendingDoctorFullName ?? "Лечащий врач",
		doctorSpecialty: initial.doctorSpecialty ?? initial.cardData.passport.attendingDoctorSpecialty ?? "Врач-стоматолог",
		visitDate: initial.visitDate ?? initial.cardData.passport.cardOpenedDate ?? new Date().toISOString().split("T")[0],
		status: initial.status ?? "pending_review",
		controlLevel: initial.controlLevel ?? "level_2_cmo_expert",
		cardData: initial.cardData,
		attachedDocuments: initial.attachedDocuments ?? [],
		completedServices: initial.completedServices ?? [],
		automatedCheckResults: [],
		automatedQualityScore: 100,
		cmoRemarks: initial.cmoRemarks ?? [],
		cmoResolution: initial.cmoResolution ?? undefined,
		auditHistory: initial.auditHistory ?? [
			{
				timestamp: new Date().toISOString(),
				actorFullName: initial.doctorFullName ?? "Лечащий врач",
				actorRole: "Лечащий врач",
				action: "created",
				comment: "Медицинская карта 043/у передана в службу контроля качества (КЭР / Начмед).",
				newStatus: initial.status ?? "pending_review",
			},
		],
	};

	const auditRes = runCmoQualityAudit(record);
	record.automatedCheckResults = auditRes.results;
	record.automatedQualityScore = auditRes.score;

	return record;
}

/** Добавление замечания Начмеда к карте */
export function addCmoDefectRemark(
	record: CmoQualityAuditRecord,
	remarkInput: Omit<CmoDefectRemark, "id" | "createdAt" | "isResolved">
): CmoQualityAuditRecord {
	const remark: CmoDefectRemark = {
		...remarkInput,
		id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
		createdAt: new Date().toISOString(),
		isResolved: false,
	};

	const updatedRemarks = [...record.cmoRemarks, remark];
	const scoreRes = calculateFinalCmoQualityScore(record.automatedCheckResults, updatedRemarks);

	return {
		...record,
		status: "rejected_with_remarks",
		cmoRemarks: updatedRemarks,
		automatedQualityScore: scoreRes.score,
		auditHistory: [
			...record.auditHistory,
			{
				timestamp: new Date().toISOString(),
				actorFullName: "Служба контроля качества",
				actorRole: "Эксперт КЭР / Начмед",
				action: "remark_added",
				comment: `Зафиксирован дефект: ${remark.title} (${remark.comment}). Штраф: -${remark.penaltyScore} баллов.`,
				previousStatus: record.status,
				newStatus: "rejected_with_remarks",
			},
		],
	};
}

/** Устранение замечания врачом */
export function resolveCmoDefectRemark(
	record: CmoQualityAuditRecord,
	remarkId: string,
	doctorComment: string,
	doctorName = "Лечащий врач"
): CmoQualityAuditRecord {
	const updatedRemarks = record.cmoRemarks.map((rem: CmoDefectRemark) => {
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

	const allResolved = updatedRemarks.every((r: CmoDefectRemark) => r.isResolved);
	const newStatus: CmoAuditStatus = allResolved ? "pending_review" : record.status;
	const scoreRes = calculateFinalCmoQualityScore(record.automatedCheckResults, updatedRemarks);

	return {
		...record,
		status: newStatus,
		cmoRemarks: updatedRemarks,
		automatedQualityScore: scoreRes.score,
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

/** Принятие резолюции Начмедом (Одобрить / Вернуть / Направить на ВКК) */
export function applyCmoResolution(
	record: CmoQualityAuditRecord,
	decision: "approved" | "rejected_with_remarks" | "commission_referral",
	auditor: {
		fullName: string;
		role: "chief_medical_officer" | "deputy_cmo_qcr" | "medical_commission_chair";
		controlLevel: VkkControlLevel;
		comment: string;
		correctiveDirectives?: string[] | undefined;
	}
): CmoQualityAuditRecord {
	const scoreRes = calculateFinalCmoQualityScore(record.automatedCheckResults, record.cmoRemarks);

	const resolution: CmoResolutionRecord = {
		auditorFullName: auditor.fullName,
		auditorRole: auditor.role,
		controlLevel: auditor.controlLevel,
		reviewedAt: new Date().toISOString(),
		decision,
		cmoComment: auditor.comment,
		finalQualityScore: scoreRes.score,
		qualityCategory: scoreRes.qualityCategory,
		correctiveDirectives: auditor.correctiveDirectives,
	};

	const newStatus: CmoAuditStatus =
		decision === "approved"
			? "approved"
			: decision === "commission_referral"
				? "commission_referral"
				: "rejected_with_remarks";

	const historyEntry: CmoAuditHistoryEntry = {
		timestamp: new Date().toISOString(),
		actorFullName: auditor.fullName,
		actorRole:
			auditor.role === "chief_medical_officer"
				? "Главный врач"
				: auditor.role === "deputy_cmo_qcr"
					? "Зам. главного врача по КЭР"
					: "Председатель ВКК",
		action:
			decision === "approved"
				? "approved"
				: decision === "commission_referral"
					? "referred_to_commission"
					: "rejected",
		comment: auditor.comment || (decision === "approved" ? "Медицинская карта 043/у утверждена без замечаний." : "Карта возвращена врачу на устранение дефектов."),
		previousStatus: record.status,
		newStatus,
	};

	return {
		...record,
		status: newStatus,
		cmoResolution: resolution,
		auditHistory: [...record.auditHistory, historyEntry],
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// VKK EXPERTISE ACT GENERATION (Order 785n)
// ═══════════════════════════════════════════════════════════════════════════

export function generateVkkExpertiseAct(record: CmoQualityAuditRecord): VkkExpertiseAct {
	const scoreRes = calculateFinalCmoQualityScore(record.automatedCheckResults, record.cmoRemarks);
	const clinic = record.cardData.clinic;

	const defectsList: VkkExpertiseAct["defectsList"] = [];

	// Автоматические дефекты
	for (const check of record.automatedCheckResults) {
		if (!check.passed) {
			defectsList.push({
				code: check.ruleId,
				category: check.ruleCategory,
				title: check.title,
				statutoryRef: check.statutoryRef,
				severity: check.severity,
				penalty: check.deduction,
			});
		}
	}

	// Ручные дефекты
	for (const rem of record.cmoRemarks) {
		if (!rem.isResolved) {
			defectsList.push({
				code: rem.presetId || "РУЧ-ДЕФ",
				category: rem.category,
				title: `${rem.title}: ${rem.comment}`,
				statutoryRef: rem.statutoryRef,
				severity: rem.severity,
				penalty: rem.penaltyScore,
			});
		}
	}

	const controlLevelLabel =
		record.controlLevel === "level_1_department_head"
			? "I уровень (Заведующий отделением)"
			: record.controlLevel === "level_2_cmo_expert"
				? "II уровень (Заместитель главного врача по КЭР / Начмед)"
				: "III уровень (Врачебная комиссия клиники)";

	const expertConclusion =
		scoreRes.score >= 90
			? "Медицинская помощь оказана надлежащего качества. Карта формы 043/у оформлена в полном соответствии с требованиями Приказа Минздрава России № 834н, стандартов СтАР и Приказа № 203н."
			: scoreRes.score >= 70
				? "Выявлены устранимые дефекты оформления медицинской документации. Требуется внесение исправлений лечащим врачом в 3-дневный срок без изменения клинической сути."
				: "Выявлены существенные/критические дефекты ведения медицинской документации. Требуется разбор на заседании Врачебной комиссии и повторная экспертиза.";

	const correctivePrescriptions = record.cmoResolution?.correctiveDirectives || [
		"Устранить выявленные замечания в дневниковой записи формы 043/у.",
		"Обеспечить 100% фиксацию номеров партий карпул анестетиков и контрольных рентген-снимков апекса при эндодонтии.",
		"Соблюдать сроки подписания ИДС по Приказу 1051н строго до начала инвазивных манипуляций.",
	];

	return {
		actNumber: record.recordNumber,
		actDate: new Date().toLocaleDateString("ru-RU"),
		controlLevel: record.controlLevel,
		controlLevelLabel,
		clinicName: clinic.clinicLegalName || clinic.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicOgrn: clinic.clinicOgrn || "1237700456789",
		clinicLicense: `${clinic.licenseNumber || "ЛО-77-01-021456"} от ${clinic.licenseDate || "15.03.2023"}`,
		patientFullName: record.patientFullName,
		patientBirthDate: record.patientBirthDate,
		medicalCardNumber: record.medicalCardId,
		doctorFullName: record.doctorFullName,
		doctorSpecialty: record.doctorSpecialty,
		clinicalDiagnosis: `${record.cardData.passport.primaryDiagnosisIcd10 || ""} ${record.cardData.passport.primaryDiagnosisText || ""}`.trim(),
		icd10Code: record.cardData.passport.primaryDiagnosisIcd10 || "—",
		qualityScore: scoreRes.score,
		qualityCategory: scoreRes.qualityCategory,
		qualityCategoryLabel: scoreRes.qualityCategoryLabel,
		defectsList,
		expertConclusion,
		correctivePrescriptions,
		commissionChairFullName: record.cmoResolution?.auditorFullName || "Барабаш С.В. (Начмед)",
		commissionMembers: ["Иванова Т.П. (Зав. терапевтическим отделением)", "Смирнов К.А. (Врач-эксперт)"],
		attendingDoctorFullName: record.doctorFullName,
	};
}

/** Форматирование текста Акта экспертизы для печати и экспорта */
export function exportVkkExpertiseActText(act: VkkExpertiseAct): string {
	const lines: string[] = [
		"═══════════════════════════════════════════════════════════════════════════",
		`АКТ ЭКСПЕРТИЗЫ КАЧЕСТВА МЕДИЦИНСКОЙ ПОМОЩИ № ${act.actNumber}`,
		"Внутренний контроль качества и безопасности медицинской деятельности (Приказ Минздрава РФ № 785н)",
		"═══════════════════════════════════════════════════════════════════════════",
		`Медицинская организация: ${act.clinicName}`,
		`Лицензия: ${act.clinicLicense} | ОГРН: ${act.clinicOgrn}`,
		`Дата проведения экспертизы: ${act.actDate}`,
		`Уровень контроля: ${act.controlLevelLabel}`,
		"───────────────────────────────────────────────────────────────────────────",
		"1. ДАННЫЕ О ПАЦИЕНТЕ И МЕДИЦИНСКОЙ КАРТЕ:",
		`• Пациент (ФИО): ${act.patientFullName}`,
		`• Дата рождения: ${act.patientBirthDate}`,
		`• Номер медицинской карты 043/у: ${act.medicalCardNumber}`,
		`• Лечащий врач: ${act.doctorFullName} (${act.doctorSpecialty})`,
		`• Клинический диагноз: ${act.clinicalDiagnosis} (Код МКБ-10: ${act.icd10Code})`,
		"───────────────────────────────────────────────────────────────────────────",
		"2. РЕЗУЛЬТАТЫ ЭКСПЕРТИЗЫ И ИНДЕКС КАЧЕСТВА:",
		`• Итоговый балл качества (Quality Score): ${act.qualityScore}%`,
		`• Категория качества: ${act.qualityCategoryLabel}`,
		"",
		`Выявлено дефектов оформления: ${act.defectsList.length}`,
	];

	if (act.defectsList.length > 0) {
		for (const [idx, def] of act.defectsList.entries()) {
			lines.push(`  ${idx + 1}. [${def.code}] ${def.title}`);
			lines.push(`     Тяжесть: ${def.severity.toUpperCase()} | Вычет: -${def.penalty} б. | НПА: ${def.statutoryRef}`);
		}
	} else {
		lines.push("  Дефектов и нарушений ведения медицинской документации не выявлено.");
	}

	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push("3. ЭКСПЕРТНОЕ ЗАКЛЮЧЕНИЕ И ПРЕДПИСАНИЯ:");
	lines.push(`• Заключение: ${act.expertConclusion}`);
	lines.push("• Предписания комиссии:");
	for (const p of act.correctivePrescriptions) {
		lines.push(`  - ${p}`);
	}
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push(`Председатель комиссии (Начмед): ________________ / ${act.commissionChairFullName} /`);
	lines.push("Члены комиссии:               ________________ / " + act.commissionMembers.join(" /\n                               ________________ / ") + " /");
	lines.push(`С актом ознакомлен (Врач):     ________________ / ${act.attendingDoctorFullName} / Дата: __________`);
	lines.push("═══════════════════════════════════════════════════════════════════════════");

	return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTERING & DOCTOR RANKING METRICS
// ═══════════════════════════════════════════════════════════════════════════

export function filterCmoAuditRecords(
	records: CmoQualityAuditRecord[],
	filters: CmoAuditFilterParams
): CmoQualityAuditRecord[] {
	return records.filter((rec: CmoQualityAuditRecord) => {
		if (filters.doctorStaffId !== undefined && filters.doctorStaffId !== "" && rec.doctorStaffId !== filters.doctorStaffId) {
			return false;
		}
		if (filters.status !== undefined && filters.status !== "all" && rec.status !== filters.status) {
			return false;
		}
		if (filters.controlLevel !== undefined && filters.controlLevel !== "all" && rec.controlLevel !== filters.controlLevel) {
			return false;
		}
		if (filters.minScore !== undefined && rec.automatedQualityScore < filters.minScore) {
			return false;
		}
		if (filters.maxScore !== undefined && rec.automatedQualityScore > filters.maxScore) {
			return false;
		}
		if (filters.dateFrom !== undefined && rec.visitDate < filters.dateFrom) {
			return false;
		}
		if (filters.dateTo !== undefined && rec.visitDate > filters.dateTo) {
			return false;
		}
		if (filters.search !== undefined && filters.search.trim()) {
			const q = filters.search.toLowerCase().trim();
			const matchPatient = rec.patientFullName.toLowerCase().includes(q);
			const matchCard = rec.medicalCardId.toLowerCase().includes(q) || rec.recordNumber.toLowerCase().includes(q);
			const matchDoctor = rec.doctorFullName.toLowerCase().includes(q);
			const diag = (rec.cardData.passport.primaryDiagnosisText || "").toLowerCase();
			const icd = (rec.cardData.passport.primaryDiagnosisIcd10 || "").toLowerCase();

			if (!matchPatient && !matchCard && !matchDoctor && !diag.includes(q) && !icd.includes(q)) {
				return false;
			}
		}
		return true;
	});
}

export function calculateCmoDoctorRankings(records: CmoQualityAuditRecord[]): CmoDoctorQualityRanking[] {
	const docMap = new Map<string, {
		staffId: string;
		name: string;
		specialty: string;
		records: CmoQualityAuditRecord[];
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

	const rankings: CmoDoctorQualityRanking[] = [];

	for (const [, docData] of docMap) {
		const total = docData.records.length;
		if (total === 0) continue;

		let approvedCount = 0;
		let approvedFirstAttempt = 0;
		let rejectedCount = 0;
		let commissionReferrals = 0;
		let scoreSum = 0;
		const defectMap = new Map<string, { title: string; count: number; category: CmoDefectCategory }>();

		for (const rec of docData.records) {
			scoreSum += rec.automatedQualityScore;

			if (rec.status === "approved") {
				approvedCount++;
				if (rec.cmoRemarks.length === 0 && rec.automatedQualityScore === 100) {
					approvedFirstAttempt++;
				}
			} else if (rec.status === "rejected_with_remarks") {
				rejectedCount++;
			} else if (rec.status === "commission_referral") {
				commissionReferrals++;
			}

			// Сбор дефектов
			for (const res of rec.automatedCheckResults) {
				if (!res.passed) {
					const cur = defectMap.get(res.ruleId) || { title: res.title, count: 0, category: res.ruleCategory };
					cur.count++;
					defectMap.set(res.ruleId, cur);
				}
			}
			for (const rem of rec.cmoRemarks) {
				const key = rem.presetId || rem.title;
				const cur = defectMap.get(key) || { title: rem.title, count: 0, category: rem.category };
				cur.count++;
				defectMap.set(key, cur);
			}
		}

		const averageQualityScore = Math.round(scoreSum / total);
		const firstPassRatePercent = Math.round((approvedFirstAttempt / total) * 100);

		let complianceStatus: "I_CATEGORY_EXCELLENT" | "II_CATEGORY_GOOD" | "III_CATEGORY_RISK" = "I_CATEGORY_EXCELLENT";
		let complianceStatusLabel = "Высокое качество (I категория)";
		let recommendedVkkAction = "Поощрение, плановый аудит 1 раз в квартал.";

		if (averageQualityScore >= 90 && firstPassRatePercent >= 80) {
			complianceStatus = "I_CATEGORY_EXCELLENT";
			complianceStatusLabel = "Высокое качество (I категория)";
			recommendedVkkAction = "Поощрение, плановый аудит 1 раз в квартал.";
		} else if (averageQualityScore >= 75) {
			complianceStatus = "II_CATEGORY_GOOD";
			complianceStatusLabel = "Требуется коррекция (II категория)";
			recommendedVkkAction = "Инструктаж по оформлению протокола анестезии и ИДС 1051н.";
		} else {
			complianceStatus = "III_CATEGORY_RISK";
			complianceStatusLabel = "Риск санкций ТФОМС/РЗН (III категория)";
			recommendedVkkAction = "Направление на заседание Врачебной комиссии, 100% сплошной аудит всех карт.";
		}

		const commonDefects = Array.from(defectMap.values())
			.sort((a, b) => b.count - a.count)
			.slice(0, 5)
			.map((d) => ({ defectTitle: d.title, count: d.count, category: d.category }));

		rankings.push({
			doctorStaffId: docData.staffId,
			doctorFullName: docData.name,
			doctorSpecialty: docData.specialty,
			totalAudited: total,
			approvedCount,
			approvedFirstAttempt,
			rejectedCount,
			commissionReferrals,
			firstPassRatePercent,
			averageQualityScore,
			commonDefects,
			complianceStatus,
			complianceStatusLabel,
			recommendedVkkAction,
		});
	}

	return rankings.sort((a, b) => b.averageQualityScore - a.averageQualityScore);
}

export function generateCmoVkkSummaryReport(records: CmoQualityAuditRecord[]): CmoVkkSummaryReport {
	const totalAudited = records.length;
	let approvedCount = 0;
	let rejectedCount = 0;
	let pendingCount = 0;
	let commissionReferralCount = 0;
	let scoreSum = 0;
	let firstPassCount = 0;

	const defectMap = new Map<CmoDefectCategory, { category: CmoDefectCategory; categoryLabel: string; title: string; count: number }>();

	for (const rec of records) {
		scoreSum += rec.automatedQualityScore;

		if (rec.status === "approved") {
			approvedCount++;
			if (rec.cmoRemarks.length === 0 && rec.automatedQualityScore === 100) {
				firstPassCount++;
			}
		} else if (rec.status === "rejected_with_remarks") {
			rejectedCount++;
		} else if (rec.status === "commission_referral") {
			commissionReferralCount++;
		} else if (rec.status === "pending_review") {
			pendingCount++;
		}

		for (const res of rec.automatedCheckResults) {
			if (!res.passed) {
				const cur = defectMap.get(res.ruleCategory) || {
					category: res.ruleCategory,
					categoryLabel: res.ruleCategory,
					title: res.title,
					count: 0,
				};
				cur.count++;
				defectMap.set(res.ruleCategory, cur);
			}
		}
	}

	const averageQualityScore = totalAudited > 0 ? Math.round(scoreSum / totalAudited) : 100;
	const firstPassRateAvg = totalAudited > 0 ? Math.round((firstPassCount / totalAudited) * 100) : 0;
	const doctorRankings = calculateCmoDoctorRankings(records);

	const excellentCount = doctorRankings.filter((d) => d.complianceStatus === "I_CATEGORY_EXCELLENT").length;
	const goodCount = doctorRankings.filter((d) => d.complianceStatus === "II_CATEGORY_GOOD").length;
	const riskCount = doctorRankings.filter((d) => d.complianceStatus === "III_CATEGORY_RISK").length;

	const topDefects = Array.from(defectMap.values()).sort((a, b) => b.count - a.count).slice(0, 6);

	return {
		totalAudited,
		approvedCount,
		rejectedCount,
		pendingCount,
		commissionReferralCount,
		averageQualityScore,
		firstPassRateAvg,
		categoryDistribution: {
			excellentCount,
			goodCount,
			riskCount,
		},
		topDefects,
		doctorRankings,
	};
}
