/**
 * ChiefPhysicianAuditService.ts — Сервис экспертизы качества медицинской помощи главным врачом.
 *
 * РЕГУЛЯТОРНАЯ ОСНОВА:
 * Приказ Минздрава России от 10.05.2017 № 203н «Об утверждении критериев оценки качества медицинской помощи»
 * (Раздел II: Критерии качества медицинской помощи в амбулаторных условиях).
 *
 * ФУНКЦИОНАЛЬНЫЕ ОБЯЗАННОСТИ:
 * 1. Проверка полномочий эксперта: проводить экспертизу качества историй болезни и амбулаторных карт
 *    имеет право только Главный врач ('chief_doctor'), Владелец клиники ('owner') или Администратор с полными правами ('admin').
 * 2. Экспертиза 6 ключевых критериев ведения медицинской карты стоматологического больного (форма 043/у):
 *    - Оформление информированного добровольного согласия (ИДС) по ст. 20 Федерального закона № 323-ФЗ;
 *    - Полнота сбора анамнеза, жалоб и аллергологического статуса;
 *    - Качество и детальность объективного осмотра (Status Localis, зубная формула);
 *    - Обоснованность и точность диагноза по МКБ-10;
 *    - Соответствие плана лечения клиническим рекомендациям Минздрава РФ и Стоматологической Ассоциации России (СтАР);
 *    - Прослеживаемость стерилизационных лотков и соблюдение санитарно-эпидемиологического режима.
 * 3. Фиксация экспертного вердикта:
 *    - 'approved': Карта соответствует критериям Приказа 203н, лечение проведено в полном объёме;
 *    - 'deficiencies_found': Выявлены устранимые дефекты ведения документации / оформления;
 *    - 'critical_violation': Выявлены грубые дефекты диагностики, противопоказаний или лечебного процесса.
 * 4. Формирование официального Клинического акта экспертизы качества медицинской помощи (КЭК / Протокол ВК).
 * 5. Атомарное сохранение в таблицы `clinical_quality_audits` и `clinical_audit_logs`,
 *    а также обновление статуса контроля качества в приёме (`visits.quality_control_status`).
 */

import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	clinicalAuditLogs,
	clinicalQualityAudits,
	generatedDocuments,
	patients,
	users,
	visitDiaries,
	visits,
} from "../../db/schema.js";
import { Icd10ClinicalValidator } from "./Icd10ClinicalValidator.js";

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

export interface Order203nCriteriaEvaluation {
	/** Наличие информированного добровольного согласия (ИДС) */
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
 * Проверка прав роли проверяющего.
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

export class ChiefPhysicianAuditService {
	/**
	 * Проведение экспертизы дневника приёма / истории болезни главным врачом.
	 */
	public static async reviewDiary(
		organizationId: string,
		reviewerDoctorId: string,
		visitOrDiaryId: string,
		verdict: ChiefDoctorVerdict,
		notes?: string | null,
		options?: {
			criteriaEvaluation?: Partial<Order203nCriteriaEvaluation> | null;
		},
	): Promise<ReviewDiaryResult> {
		if (!organizationId || typeof organizationId !== "string") {
			throw new ChiefPhysicianAuditError(
				"ValidationError",
				"Идентификатор организации (organizationId) обязателен.",
			);
		}
		if (!reviewerDoctorId || typeof reviewerDoctorId !== "string") {
			throw new ChiefPhysicianAuditError(
				"ValidationError",
				"Идентификатор проверяющего (reviewerDoctorId) обязателен.",
			);
		}
		if (!visitOrDiaryId || typeof visitOrDiaryId !== "string") {
			throw new ChiefPhysicianAuditError(
				"ValidationError",
				"Идентификатор приёма или дневника обязателен.",
			);
		}
		if (!isChiefDoctorVerdict(verdict)) {
			throw new ChiefPhysicianAuditError(
				"InvalidVerdict",
				`Недопустимый вердикт экспертизы. Допустимые значения: ${CHIEF_DOCTOR_VERDICTS.join(", ")}.`,
			);
		}

		// 1. Проверка личности и полномочий проверяющего
		const [reviewer] = await db
			.select({
				id: users.id,
				fullName: users.fullName,
				role: users.role,
				organizationId: users.organizationId,
				isActive: users.isActive,
			})
			.from(users)
			.where(
				and(
					eq(users.id, reviewerDoctorId),
					eq(users.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!reviewer) {
			throw new ChiefPhysicianAuditError(
				"UserNotFound",
				"Проверяющий сотрудник не найден в этой клинике.",
			);
		}

		if (!isAuthorizedReviewerRole(reviewer.role)) {
			throw new ChiefPhysicianAuditError(
				"PermissionDenied",
				"Экспертиза историй болезни доступна только главному врачу, владельцу или администратору клиники.",
			);
		}

		// 2. Поиск приёма и дневника 043/у
		let resolvedVisitId: string = visitOrDiaryId;
		let resolvedDiaryId: string | null = null;

		// Сначала пробуем найти приём по visitOrDiaryId
		const [visitByVisitId] = await db
			.select({
				id: visits.id,
				patientId: visits.patientId,
				organizationId: visits.organizationId,
				qualityControlStatus: visits.qualityControlStatus,
				status: visits.status,
				diagnosis: visits.diagnosis,
			})
			.from(visits)
			.where(
				and(
					eq(visits.id, visitOrDiaryId),
					eq(visits.organizationId, organizationId),
				),
			)
			.limit(1);

		let resolvedVisit = visitByVisitId;

		if (!resolvedVisit) {
			// Пробуем найти дневник по id
			const [diaryById] = await db
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.id, visitOrDiaryId),
						eq(visitDiaries.organizationId, organizationId),
					),
				)
				.limit(1);

			if (diaryById) {
				resolvedDiaryId = diaryById.id;
				resolvedVisitId = diaryById.visitId;

				const [visitOfDiary] = await db
					.select({
						id: visits.id,
						patientId: visits.patientId,
						organizationId: visits.organizationId,
						qualityControlStatus: visits.qualityControlStatus,
						status: visits.status,
						diagnosis: visits.diagnosis,
					})
					.from(visits)
					.where(
						and(
							eq(visits.id, diaryById.visitId),
							eq(visits.organizationId, organizationId),
						),
					)
					.limit(1);

				resolvedVisit = visitOfDiary;
			}
		}

		if (!resolvedVisit) {
			throw new ChiefPhysicianAuditError(
				"VisitNotFound",
				"Приём не найден в этой клинике, экспертиза невозможна.",
			);
		}

		// Загружаем актуальную строку дневника
		const [diary] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, resolvedVisit.id),
					eq(visitDiaries.organizationId, organizationId),
				),
			)
			.limit(1);

		if (diary) {
			resolvedDiaryId = diary.id;
		}

		// 3. Загружаем данные пациента
		const [patient] = await db
			.select({
				id: patients.id,
				fullName: patients.fullName,
			})
			.from(patients)
			.where(
				and(
					eq(patients.id, resolvedVisit.patientId),
					eq(patients.organizationId, organizationId),
				),
			)
			.limit(1);

		const patientFullName =
			typeof patient?.fullName === "string" && patient.fullName.trim()
				? patient.fullName.trim()
				: "Пациент клиники";

		// 4. Загружаем данные лечащего врача
		const attendingDoctorId = diary?.doctorId ?? diary?.lockedByUserId ?? null;
		let attendingDoctorFullName: string = "Лечащий врач";
		if (attendingDoctorId) {
			const [attendingUser] = await db
				.select({ fullName: users.fullName })
				.from(users)
				.where(
					and(
						eq(users.id, attendingDoctorId),
						eq(users.organizationId, organizationId),
					),
				)
				.limit(1);
			if (attendingUser?.fullName?.trim()) {
				attendingDoctorFullName = attendingUser.fullName.trim();
			}
		}

		// 5. Оценка критериев Приказа 203н и расчёт скоринга
		let informedConsentPresent = false;
		if (options?.criteriaEvaluation?.informedConsentPresent !== undefined) {
			informedConsentPresent = Boolean(options.criteriaEvaluation.informedConsentPresent);
		} else {
			// Честный поиск подписанного ИДС в таблице generated_documents
			const patientDocs = await db
				.select({
					id: generatedDocuments.id,
					status: generatedDocuments.status,
					kind: generatedDocuments.kind,
					title: generatedDocuments.title,
				})
				.from(generatedDocuments)
				.where(
					and(
						eq(generatedDocuments.organizationId, organizationId),
						eq(generatedDocuments.patientId, resolvedVisit.patientId),
					),
				)
				.limit(20);

			informedConsentPresent = patientDocs.some((d) => {
				const isSigned = d.status === "issued" || (d.status as string) === "signed";
				const isIds =
					d.kind === "informed_consent" ||
					(d.kind as string).includes("consent") ||
					(d.kind as string).includes("ids") ||
					d.title.toLowerCase().includes("согласи") ||
					d.title.toLowerCase().includes("идс");
				return isSigned && isIds;
			});
		}

		const criteria = evaluateOrder203nCriteria(
			diary ?? null,
			resolvedVisit,
			{
				...options?.criteriaEvaluation,
				informedConsentPresent,
			},
		);

		// Запрет серверного вердикта approved, если отсутствуют обязательные поля (МКБ-10, анамнез, ИДС)
		if (verdict === "approved") {
			const missing: string[] = [];
			if (!criteria.icd10DiagnosisValid) missing.push("валидный диагноз по МКБ-10");
			if (!criteria.anamnesisComplete) missing.push("полный анамнез и жалобы");
			if (!criteria.informedConsentPresent) missing.push("подписанное информированное добровольное согласие (ИДС ст. 20 323-ФЗ)");

			if (missing.length > 0) {
				throw new ChiefPhysicianAuditError(
					"ValidationError",
					`Утверждение карты 043/у главным врачом невозможно: выявлены критические дефекты ведения документации (${missing.join(", ")}).`,
				);
			}
		}

		const complianceScorePct = calculateComplianceScore(criteria, verdict);

		const reviewedAt = new Date();
		const timestampSeq = Date.now().toString().slice(-6);
		const actNumber = `АКТ-ВК-${reviewedAt.getFullYear()}-${timestampSeq}`;
		const protocolNumber = `ВК-${reviewedAt.getFullYear()}/${timestampSeq}`;

		const reviewerDoctorFullName = reviewer.fullName.trim();
		const reviewerRoleLabel =
			reviewer.role === "chief_doctor"
				? "Главный врач"
				: reviewer.role === "owner"
					? "Владелец клиники"
					: "Администратор клиники";

		const { expertSummary, recommendations } = generateQualityActText({
			actNumber,
			protocolNumber,
			reviewedAt,
			patientFullName,
			attendingDoctorFullName,
			reviewerDoctorFullName,
			reviewerRole: reviewerRoleLabel,
			diagnosisIcd10: diary?.diagnosisIcd10 ?? null,
			diagnosisTooth: diary?.diagnosisTooth ?? null,
			verdict,
			complianceScorePct,
			criteria,
			notes: notes ?? null,
		});

		const act: ClinicalQualityAct = {
			actNumber,
			protocolNumber,
			organizationId,
			visitId: resolvedVisit.id,
			diaryId: resolvedDiaryId,
			patientId: resolvedVisit.patientId,
			patientFullName,
			reviewerDoctorId,
			reviewerDoctorFullName,
			reviewerRole: reviewerRoleLabel,
			attendingDoctorId,
			attendingDoctorFullName,
			diagnosisIcd10: diary?.diagnosisIcd10 ?? null,
			diagnosisTooth: diary?.diagnosisTooth ?? null,
			verdict,
			verdictLabel: VERDICT_LABELS[verdict],
			complianceScorePct,
			criteriaEvaluation: criteria,
			expertSummary,
			recommendations,
			legalBasis:
				"Приказ Минздрава России от 10.05.2017 № 203н «Об утверждении критериев оценки качества медицинской помощи»",
			reviewedAt: reviewedAt.toISOString(),
		};

		// 6. Транзакционная фиксация аудита в БД
		const outcome = await db.transaction(async (tx) => {
			// 6.1 Вставка в clinicalQualityAudits
			const [insertedAudit] = await tx
				.insert(clinicalQualityAudits)
				.values({
					organizationId,
					visitId: resolvedVisit.id,
					diaryId: resolvedDiaryId,
					patientId: resolvedVisit.patientId,
					reviewerDoctorId,
					attendingDoctorId,
					verdict,
					notes: notes ?? null,
					actNumber,
					protocolNumber,
					criteriaEvaluation: criteria,
					complianceScorePct,
					expertSummary,
					recommendations,
					reviewedAt,
				})
				.returning({ id: clinicalQualityAudits.id });

			// 6.2 Запись юридического следа в clinicalAuditLogs
			const [auditLog] = await tx
				.insert(clinicalAuditLogs)
				.values({
					organizationId,
					patientId: resolvedVisit.patientId,
					actorUserId: reviewerDoctorId,
					userId: reviewerDoctorId,
					action: "CHIEF_PHYSICIAN_REVIEW",
					eventType: "CHIEF_PHYSICIAN_REVIEW",
					resourceType: "visit_diary",
					entityType: "visit",
					resourceId: resolvedDiaryId,
					entityId: resolvedVisit.id,
					meta: {
						verdict,
						actNumber,
						protocolNumber,
						reviewerDoctorId,
						complianceScorePct,
						notes: notes ?? null,
						criteria,
					},
				})
				.returning({ id: clinicalAuditLogs.id });

			// 6.3 Обновление статуса контроля качества в visits
			await tx
				.update(visits)
				.set({
					qualityControlStatus: verdict,
					updatedAt: reviewedAt,
				})
				.where(
					and(
						eq(visits.id, resolvedVisit.id),
						eq(visits.organizationId, organizationId),
					),
				);

			return {
				auditId: insertedAudit?.id ?? `audit-${Date.now()}`,
				auditLogId: auditLog?.id ?? null,
			};
		});

		return {
			auditId: outcome.auditId,
			act,
			verdict,
			visitId: resolvedVisit.id,
			diaryId: resolvedDiaryId,
			qualityControlStatus: verdict,
			auditLogId: outcome.auditLogId,
			complianceScorePct,
			reviewedAt,
		};
	}

	/**
	 * Получение истории экспертиз главного врача по приёму или дневнику.
	 */
	public static async getDiaryReviews(
		organizationId: string,
		visitOrDiaryId: string,
	): Promise<ChiefReviewQueryRecord[]> {
		if (!organizationId || !visitOrDiaryId) return [];

		// Определяем visitId
		let targetVisitId = visitOrDiaryId;
		const [diary] = await db
			.select({ id: visitDiaries.id, visitId: visitDiaries.visitId })
			.from(visitDiaries)
			.where(
				and(
					or(
						eq(visitDiaries.id, visitOrDiaryId),
						eq(visitDiaries.visitId, visitOrDiaryId),
					),
					eq(visitDiaries.organizationId, organizationId),
				),
			)
			.limit(1);

		if (diary?.visitId) {
			targetVisitId = diary.visitId;
		}

		// Выбираем из clinicalQualityAudits
		const auditRows = await db
			.select()
			.from(clinicalQualityAudits)
			.where(
				and(
					eq(clinicalQualityAudits.organizationId, organizationId),
					or(
						eq(clinicalQualityAudits.visitId, targetVisitId),
						eq(clinicalQualityAudits.diaryId, visitOrDiaryId),
					),
				),
			)
			.orderBy(desc(clinicalQualityAudits.reviewedAt));

		if (auditRows.length === 0) {
			return [];
		}

		// Собираем имена рецензентов и лечащих врачей
		const userIds = Array.from(
			new Set(
				auditRows
					.flatMap((r) => [r.reviewerDoctorId, r.attendingDoctorId])
					.filter((id): id is string => typeof id === "string" && id.length > 0),
			),
		);

		const userNameById = new Map<string, { fullName: string; role: string }>();
		if (userIds.length > 0) {
			const usersData = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					role: users.role,
				})
				.from(users)
				.where(
					and(
						inArray(users.id, userIds),
						eq(users.organizationId, organizationId),
					),
				);

			for (const u of usersData) {
				userNameById.set(u.id, {
					fullName: u.fullName.trim(),
					role: u.role,
				});
			}
		}

		return auditRows.map((row) => {
			const reviewer = userNameById.get(row.reviewerDoctorId);
			const attending = row.attendingDoctorId
				? userNameById.get(row.attendingDoctorId)
				: null;

			const verdict = (
				isChiefDoctorVerdict(row.verdict) ? row.verdict : "approved"
			) as ChiefDoctorVerdict;

			const reviewerRoleLabel =
				reviewer?.role === "chief_doctor"
					? "Главный врач"
					: reviewer?.role === "owner"
						? "Владелец клиники"
						: "Администратор клиники";

			return {
				id: row.id,
				organizationId: row.organizationId,
				visitId: row.visitId,
				diaryId: row.diaryId,
				patientId: row.patientId,
				reviewerDoctorId: row.reviewerDoctorId,
				reviewerDoctorFullName: reviewer?.fullName ?? "Главный врач",
				reviewerRole: reviewerRoleLabel,
				attendingDoctorId: row.attendingDoctorId,
				attendingDoctorFullName: attending?.fullName ?? null,
				verdict,
				verdictLabel: VERDICT_LABELS[verdict] ?? verdict,
				notes: row.notes,
				actNumber: row.actNumber,
				protocolNumber: row.protocolNumber,
				criteriaEvaluation:
					(row.criteriaEvaluation as Order203nCriteriaEvaluation | null) ?? null,
				complianceScorePct: row.complianceScorePct ?? 100,
				expertSummary: row.expertSummary,
				recommendations: row.recommendations,
				reviewedAt: row.reviewedAt.toISOString(),
				createdAt: row.createdAt.toISOString(),
			};
		});
	}

	public static evaluateCriteria = evaluateOrder203nCriteria;
	public static calculateScore = calculateComplianceScore;
	public static generateAct = generateQualityActText;
	public static isAuthorizedRole = isAuthorizedReviewerRole;
}
