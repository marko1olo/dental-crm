import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	patients,
	toothStateHistory,
	toothStates,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
	visitDiaries,
	visitDiaryRevisions,
	visits,
} from "../db/schema.js";

/**
 * Checks if a compound tooth string (e.g. "16, 17", "16-18", "1.6", "зуб 16") contains a specific FDI tooth number.
 */
export function isToothReferenced(
	diagnosisToothStr: string | null | undefined,
	targetTooth: number,
): boolean {
	if (!diagnosisToothStr || typeof diagnosisToothStr !== "string") return false;
	const trimmed = diagnosisToothStr.trim();
	if (!trimmed) return false;

	if (trimmed === String(targetTooth)) return true;

	// Regex check for word/symbol bounded tooth numbers
	const regex = new RegExp(`(?:^|[^0-9])${targetTooth}(?:[^0-9]|$)`);
	return regex.test(trimmed);
}

export interface ToothHistoryTimelineEvent {
	type: "diary" | "diary_revision" | "plan" | "treatment_procedure" | "state_change";
	date: Date | string;
	description: string;
	authorId: string;
	visitId?: string | null;
	isVoided?: boolean;
}

export default async function registerToothHistoryRoutes(app: FastifyInstance) {
	app.get(
		"/api/odontogram/tooth-history/:patientId/:toothId",
		async (req, reply) => {
			const orgId = await requireResolvedOrganizationId(
				req,
				reply,
				"read tooth history",
			);
			if (!orgId) return;

			const { patientId, toothId } = req.params as {
				patientId: string;
				toothId: string;
			};
			const toothNum = parseInt(toothId, 10);

			if (Number.isNaN(toothNum)) {
				return reply.code(400).send({ error: "Invalid tooth ID" });
			}

			const [patient] = await db
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
				)
				.limit(1);
			if (!patient) return reply.code(404).send({ error: "PatientNotFound" });

			const events: ToothHistoryTimelineEvent[] = [];

			// 1. Fetch Visit Diaries (Form 043/u) and join with Visit status and Doctor full name
			const diariesWithVisits = await db
				.select({
					diaryId: visitDiaries.id,
					visitId: visitDiaries.visitId,
					diagnosisTooth: visitDiaries.diagnosisTooth,
					diagnosisIcd10: visitDiaries.diagnosisIcd10,
					treatmentDescription: visitDiaries.treatmentDescription,
					anamnesis: visitDiaries.anamnesis,
					statusLocalis: visitDiaries.statusLocalis,
					version: visitDiaries.version,
					createdAt: visitDiaries.createdAt,
					updatedAt: visitDiaries.updatedAt,
					lockedByUserId: visitDiaries.lockedByUserId,
					coSignedByUserId: visitDiaries.coSignedByUserId,
					doctorId: visitDiaries.doctorId,
					doctorFullName: users.fullName,
					visitStatus: visits.status,
				})
				.from(visitDiaries)
				.leftJoin(visits, eq(visits.id, visitDiaries.visitId))
				.leftJoin(users, eq(users.id, visitDiaries.doctorId))
				.where(
					and(
						eq(visitDiaries.patientId, patientId),
						eq(visitDiaries.organizationId, orgId),
					),
				);

			// Match diaries referencing this tooth (single or compound notation)
			const matchingDiaries = diariesWithVisits.filter((d) =>
				isToothReferenced(d.diagnosisTooth, toothNum),
			);

			const matchedDiaryIds: string[] = [];
			for (const d of matchingDiaries) {
				matchedDiaryIds.push(d.diaryId);
				const isVoided = d.visitStatus === "voided";
				const prefix = isVoided ? "[АННУЛИРОВАННЫЙ ВИЗИТ] " : "";
				const doctorName = d.doctorFullName?.trim() || "Врач клиники";
				const descParts: string[] = [];

				if (d.diagnosisIcd10) {
					descParts.push(`Диагноз: ${d.diagnosisIcd10}`);
				}
				if (d.statusLocalis) {
					descParts.push(`Status localis: ${d.statusLocalis}`);
				}
				if (d.treatmentDescription) {
					descParts.push(`Лечение: ${d.treatmentDescription}`);
				} else if (d.anamnesis) {
					descParts.push(`Анамнез: ${d.anamnesis}`);
				}

				events.push({
					type: "diary",
					date: d.createdAt,
					description: `${prefix}${descParts.join(" | ")} (Версия ${d.version || 1})`,
					authorId: doctorName,
					visitId: d.visitId,
					isVoided,
				});
			}

			// 2. Fetch Diary Revisions (Audit Forensic Log for Form 043/u changes)
			if (matchedDiaryIds.length > 0) {
				try {
					const revisions = await db
						.select({
							id: visitDiaryRevisions.id,
							diaryId: visitDiaryRevisions.diaryId,
							revisedAt: visitDiaryRevisions.revisedAt,
							revisionReason: visitDiaryRevisions.revisionReason,
							previousDiagnosisTooth: visitDiaryRevisions.previousDiagnosisTooth,
							previousTreatmentDescription:
								visitDiaryRevisions.previousTreatmentDescription,
							revisedByUserId: visitDiaryRevisions.revisedByUserId,
							authorName: users.fullName,
						})
						.from(visitDiaryRevisions)
						.leftJoin(
							users,
							eq(users.id, visitDiaryRevisions.revisedByUserId),
						)
						.where(
							and(
								eq(visitDiaryRevisions.organizationId, orgId),
								inArray(visitDiaryRevisions.diaryId, matchedDiaryIds),
							),
						);

					for (const rev of revisions) {
						if (isToothReferenced(rev.previousDiagnosisTooth, toothNum)) {
							events.push({
								type: "diary_revision",
								date: rev.revisedAt,
								description: `Ревизия записи: ${rev.revisionReason || "Корректировка дневника"} (ранее: ${rev.previousTreatmentDescription || "нет данных"})`,
								authorId: rev.authorName?.trim() || "Администратор",
							});
						}
					}
				} catch (err) {
					console.warn("[toothHistory] Ошибка чтения ревизий дневника:", err);
				}
			}

			// 3. Fetch Treatment Plan Items
			const planItems = await db
				.select({
					createdAt: treatmentPlans.createdAt,
					name: treatmentPlans.name,
					priceId: treatmentPlanItemsNew.priceId,
					phase: treatmentPlanItemsNew.phase,
					quantity: treatmentPlanItemsNew.quantity,
					price: treatmentPlanItemsNew.price,
				})
				.from(treatmentPlanItemsNew)
				.innerJoin(
					treatmentPlans,
					eq(treatmentPlans.id, treatmentPlanItemsNew.planId),
				)
				.where(
					and(
						eq(treatmentPlans.patientId, patientId),
						eq(treatmentPlans.organizationId, orgId),
						eq(treatmentPlanItemsNew.toothNumber, toothNum),
					),
				);

			for (const p of planItems) {
				events.push({
					type: "plan",
					date: p.createdAt,
					description: `План лечения: ${p.name} - ${p.priceId} (Этап ${p.phase}, кол-во: ${p.quantity})`,
					authorId: "План лечения",
				});
			}

			// 4. Fetch Completed Performed Clinical Procedures (treatment_items)
			try {
				const procedures = await db
					.select({
						id: treatmentItems.id,
						title: treatmentItems.title,
						status: treatmentItems.status,
						visitId: treatmentItems.visitId,
						toothCode: treatmentItems.toothCode,
						visitSignedAt: visits.signedAt,
						visitCreatedAt: visits.createdAt,
					})
					.from(treatmentItems)
					.leftJoin(visits, eq(visits.id, treatmentItems.visitId))
					.where(
						and(
							eq(treatmentItems.organizationId, orgId),
							eq(treatmentItems.patientId, patientId),
							or(
								eq(treatmentItems.toothCode, String(toothNum)),
								sql`left(${treatmentItems.toothCode}, 2) = ${String(toothNum)}`,
							),
						),
					);

				for (const proc of procedures) {
					const eventDate =
						proc.visitSignedAt || proc.visitCreatedAt || new Date();
					events.push({
						type: "treatment_procedure",
						date: eventDate,
						description: `Выполненная процедура: ${proc.title} [Статус: ${proc.status}]`,
						authorId: "Клинический протокол",
						visitId: proc.visitId,
					});
				}
			} catch (err) {
				console.warn("[toothHistory] Ошибка чтения процедур treatmentItems:", err);
			}

			// 5. Fetch Append-only Tooth State History
			let historyRows: Array<{
				previousState: string | null;
				newState: string;
				changedAt: Date | string;
				changedByUserId: string | null;
				authorName: string | null;
				reason: string | null;
			}> = [];

			try {
				historyRows = await db
					.select({
						previousState: toothStateHistory.previousState,
						newState: toothStateHistory.newState,
						changedAt: toothStateHistory.changedAt,
						changedByUserId: toothStateHistory.changedByUserId,
						authorName: users.fullName,
						reason: toothStateHistory.reason,
					})
					.from(toothStateHistory)
					.leftJoin(users, eq(users.id, toothStateHistory.changedByUserId))
					.where(
						and(
							eq(toothStateHistory.organizationId, orgId),
							eq(toothStateHistory.patientId, patientId),
							eq(toothStateHistory.toothNumber, toothNum),
						),
					)
					.orderBy(desc(toothStateHistory.changedAt));
			} catch (error) {
				console.warn("[toothHistory] История переходов недоступна:", error);
			}

			if (historyRows.length > 0) {
				for (const row of historyRows) {
					events.push({
						type: "state_change",
						date: row.changedAt,
						description: row.previousState
							? `Статус зуба: ${row.previousState} → ${row.newState}${row.reason ? ` (${row.reason})` : ""}`
							: `Статус зуба установлен: ${row.newState}`,
						authorId: row.authorName ?? "Не указан",
					});
				}
			} else {
				// Fallback to current tooth states
				const states = await db
					.select()
					.from(toothStates)
					.where(
						and(
							eq(toothStates.patientId, patientId),
							eq(toothStates.organizationId, orgId),
							eq(toothStates.toothNumber, toothNum),
						),
					)
					.orderBy(desc(toothStates.updatedAt));

				for (const s of states) {
					events.push({
						type: "state_change",
						date: s.updatedAt || new Date(),
						description: `Текущий статус: ${s.state} (история до включения журнала не сохранялась)`,
						authorId: "Не указан",
					});
				}
			}

			// Sort chronologically descending (newest events first)
			events.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
			);

			return reply.send({ events });
		},
	);
}
