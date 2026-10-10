/**
 * types.ts — Layer 0: Строгие типы и контракты экспертизы качества медицинской помощи (Приказ Минздрава РФ № 203н).
 * Архитектурный слой Layer 0: ноль побочных эффектов, ноль рантайм-зависимостей от БД.
 */

export const ALLOWED_CHIEF_REVIEWER_ROLES = [
	"chief_doctor",
	"owner",
	"admin",
] as const;

export type ChiefReviewerRole = (typeof ALLOWED_CHIEF_REVIEWER_ROLES)[number];

export type ChiefDoctorVerdict =
	| "approved"
	| "deficiencies_found"
	| "critical_violation";

export const CHIEF_DOCTOR_VERDICTS: readonly ChiefDoctorVerdict[] = [
	"approved",
	"deficiencies_found",
	"critical_violation",
] as const;

export function isChiefDoctorVerdict(value: unknown): value is ChiefDoctorVerdict {
	return (
		typeof value === "string" &&
		(CHIEF_DOCTOR_VERDICTS as readonly string[]).includes(value)
	);
}

export const VERDICT_LABELS: Record<ChiefDoctorVerdict, string> = {
	approved:
		"Соответствует критериям качества (Приказ Минздрава России № 203н)",
	deficiencies_found:
		"Выявлены устранимые дефекты ведения медицинской документации",
	critical_violation:
		"Критическое нарушение стандартов и клинических рекомендаций оказания медпомощи",
};

export type ChiefPhysicianAuditErrorCode =
	| "UserNotFound"
	| "PermissionDenied"
	| "VisitNotFound"
	| "DiaryNotFound"
	| "InvalidVerdict"
	| "ValidationError"
	| "OrgMismatch";

export class ChiefPhysicianAuditError extends Error {
	constructor(
		readonly code: ChiefPhysicianAuditErrorCode,
		message: string,
	) {
		super(message);
		this.name = "ChiefPhysicianAuditError";
	}
}

/**
 * Критерии оценки качества медицинской помощи по Приказу Минздрава России от 10.05.2017 № 203н
 * (Раздел II: Критерии качества в амбулаторных условиях).
 */
export interface Order203nCriteriaEvaluation {
	/** Наличие информированного добровольного согласия (ИДС) по ст. 20 323-ФЗ */
	informedConsentPresent: boolean;
	/** Полнота сбора жалоб и анамнеза (в т.ч. аллергоанамнез и сопутствующие заболевания) */
	anamnesisComplete: boolean;
	/** Детальность объективного обследования (Status Localis, зубная формула) */
	statusLocalisComplete: boolean;
	/** Обоснованность клинического диагноза по МКБ-10 */
	icd10DiagnosisValid: boolean;
	/** Обоснованность и полнота описания лечебных мероприятий */
	treatmentPlanAdequate: boolean;
	/** Контроль стерилизации и безопасности (штрихкод инструментального лотка) */
	instrumentTraceabilityValid: boolean;
}

/**
 * Официальный Клинический акт экспертизы качества медицинской помощи (КЭК / Протокол ВК).
 */
export interface ClinicalQualityAct {
	actNumber: string;
	protocolNumber: string;
	organizationId: string;
	visitId: string;
	diaryId: string | null;
	patientId: string;
	patientFullName: string;
	reviewerDoctorId: string;
	reviewerDoctorFullName: string;
	reviewerRole: string;
	attendingDoctorId: string | null;
	attendingDoctorFullName: string | null;
	diagnosisIcd10: string | null;
	diagnosisTooth: string | null;
	verdict: ChiefDoctorVerdict;
	verdictLabel: string;
	complianceScorePct: number;
	criteriaEvaluation: Order203nCriteriaEvaluation;
	expertSummary: string;
	recommendations: string;
	legalBasis: string;
	reviewedAt: string;
}

export interface ReviewDiaryResult {
	auditId: string;
	act: ClinicalQualityAct;
	verdict: ChiefDoctorVerdict;
	visitId: string;
	diaryId: string | null;
	qualityControlStatus: string;
	auditLogId: string | null;
	complianceScorePct: number;
	reviewedAt: Date;
}

export interface ChiefReviewQueryRecord {
	id: string;
	organizationId: string;
	visitId: string;
	diaryId: string | null;
	patientId: string | null;
	reviewerDoctorId: string;
	reviewerDoctorFullName: string;
	reviewerRole: string;
	attendingDoctorId: string | null;
	attendingDoctorFullName: string | null;
	verdict: ChiefDoctorVerdict;
	verdictLabel: string;
	notes: string | null;
	actNumber: string;
	protocolNumber: string | null;
	criteriaEvaluation: Order203nCriteriaEvaluation | null;
	complianceScorePct: number;
	expertSummary: string;
	recommendations: string | null;
	reviewedAt: string;
	createdAt: string;
}

/**
 * Результат проверки готовности протокола к выгрузке в ЕГИСЗ РЭМД (консультативный режим).
 */
export interface EgisZRemdCheckResult {
	isReadyForRemd: boolean;
	readinessScorePct: number;
	advisoryWarnings: string[];
	missingRemdFields: string[];
	recommendations: string[];
}

/**
 * Дефект ведения медицинской карты 043/у (по классификации Минздрава РФ).
 */
export interface ClinicalQualityDefect {
	code: string;
	criterionKey: keyof Order203nCriteriaEvaluation;
	title: string;
	description: string;
	severity: "advisory" | "minor" | "critical";
	recommendation: string;
}

/**
 * Сводный аналитический отчет для руководства клиники и начмеда.
 */
export interface AuditReportSummary {
	totalAudited: number;
	approvedCount: number;
	deficienciesCount: number;
	criticalCount: number;
	averageScorePct: number;
	topDefects: Array<{ defectTitle: string; count: number }>;
	periodStart?: string;
	periodEnd?: string;
}
