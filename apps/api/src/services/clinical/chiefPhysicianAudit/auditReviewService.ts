/**
 * auditReviewService.ts — Layer 4: Координатор транзакционного аудита начмеда в БД PostgreSQL 18.
 *
 * Безупречная мультиарендность: каждый SQL-запрос содержит составной фильтр `organizationId`.
 * ACID-безопасность: фиксация аудита, лога и статуса приёма выполняется в единой транзакции `db.transaction(async (tx) => ...)`.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	clinicalAuditLogs,
	clinicalQualityAudits,
	generatedDocuments,
	patients,
	users,
	visitDiaries,
	visits,
} from "../../../db/schema.js";
import { getDiaryReviews } from "./auditQueryService.js";
import { generateQualityActText } from "./auditReportGenerator.js";
import {
	calculateComplianceScore,
	evaluateOrder203nCriteria,
	isAuthorizedReviewerRole,
} from "./auditScoringEngine.js";
import {
	CHIEF_DOCTOR_VERDICTS,
	type ChiefDoctorVerdict,
	ChiefPhysicianAuditError,
	type ClinicalQualityAct,
	type Order203nCriteriaEvaluation,
	type ReviewDiaryResult,
	VERDICT_LABELS,
	isChiefDoctorVerdict,
} from "./types.js";

/**
 * Проведение экспертизы дневника приёма / истории болезни главным врачом.
 */
export async function reviewDiary(
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
	let resolvedDiaryId: string | null = null;

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

	// Контроль полноты при утверждении карты (approved)
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
 * Канонический класс-сервис для обратной совместимости вызовов.
 */
export class ChiefPhysicianAuditService {
	public static reviewDiary = reviewDiary;
	public static getDiaryReviews = getDiaryReviews;
	public static evaluateCriteria = evaluateOrder203nCriteria;
	public static calculateScore = calculateComplianceScore;
	public static generateAct = generateQualityActText;
	public static isAuthorizedRole = isAuthorizedReviewerRole;
}
