/**
 * auditQueryService.ts — Layer 4a: Сервис чтения и выборки истории экспертиз качества медпомощи.
 * Чистое чтение (Read-only) с фильтрацией по организации (мультиарендность).
 */

import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { clinicalQualityAudits, users, visitDiaries } from "../../../db/schema.js";
import {
	type ChiefDoctorVerdict,
	type ChiefReviewQueryRecord,
	type Order203nCriteriaEvaluation,
	VERDICT_LABELS,
	isChiefDoctorVerdict,
} from "./types.js";

/**
 * Получение истории экспертиз главного врача по приёму или дневнику.
 */
export async function getDiaryReviews(
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
