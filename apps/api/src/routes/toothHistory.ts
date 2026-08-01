import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	patients,
	toothStateHistory,
	toothStates,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
	visitDiaries,
} from "../db/schema.js";

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

			if (isNaN(toothNum))
				return reply.code(400).send({ error: "Invalid tooth ID" });

			const [patient] = await db
				.select()
				.from(patients)
				.where(
					and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
				);
			if (!patient) return reply.code(404).send({ error: "PatientNotFound" });

			const events: any[] = [];

			const diaries = await db
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.patientId, patientId),
						eq(visitDiaries.diagnosisTooth, toothId),
						eq(visitDiaries.organizationId, orgId),
					),
				);
			// DEFECT #42: diary author was raw UUID (lockedBy/coSigned/doctor).
			// state_change already joins users.fullName; diary did not — UI showed
			// toothHistoryAuthorLabel → «Автор: имя в записи не сохранено».
			// Batch-resolve fullName within org (same spirit as diary GET doctorFullName).
			const diaryAuthorIds = Array.from(
				new Set(
					diaries
						.map(
							(d) =>
								d.lockedByUserId || d.coSignedByUserId || d.doctorId || null,
						)
						.filter((id): id is string => typeof id === "string" && id.length > 0),
				),
			);
			const diaryAuthorNameById = new Map<string, string>();
			if (diaryAuthorIds.length > 0) {
				const authorRows = await db
					.select({ id: users.id, fullName: users.fullName })
					.from(users)
					.where(
						and(inArray(users.id, diaryAuthorIds), eq(users.organizationId, orgId)),
					);
				for (const row of authorRows) {
					const name =
						typeof row.fullName === "string" ? row.fullName.trim() : "";
					if (name) diaryAuthorNameById.set(row.id, name);
				}
			}
			diaries.forEach((d) => {
				const rawAuthorId =
					d.lockedByUserId || d.coSignedByUserId || d.doctorId || null;
				const authorLabel = rawAuthorId
					? (diaryAuthorNameById.get(rawAuthorId) ?? rawAuthorId)
					: "System";
				events.push({
					type: "diary",
					date: d.createdAt,
					description: d.treatmentDescription || d.anamnesis,
					authorId: authorLabel,
				});
			});
			const planItems = await db
				.select({
					createdAt: treatmentPlans.createdAt,
					name: treatmentPlans.name,
					priceId: treatmentPlanItemsNew.priceId,
					phase: treatmentPlanItemsNew.phase,
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

			planItems.forEach((p) => {
				events.push({
					type: "plan",
					date: p.createdAt,
					description: `План: ${p.name} - ${p.priceId} (Этап ${p.phase})`,
					authorId: "System",
				});
			});

			// БЫЛО: читалась таблица tooth_states, где на зуб приходится ровно ОДНА
			// строка (обновление идёт через delete + insert). Поэтому история
			// любого зуба состояла из единственной записи с текущим статусом и
			// автором «System»: и январская пломба, и мартовский пульпит
			// бесследно исчезали из карты.
			// Теперь читаем append-only историю переходов с указанием врача.
			let historyRows: Array<{
				previousState: string | null;
				newState: string;
				changedAt: Date | string;
				changedByUserId: string | null;
				authorName: string | null;
			}> = [];
			try {
				historyRows = await db
					.select({
						previousState: toothStateHistory.previousState,
						newState: toothStateHistory.newState,
						changedAt: toothStateHistory.changedAt,
						changedByUserId: toothStateHistory.changedByUserId,
						authorName: users.fullName,
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
				// Таблица появляется миграцией add_tooth_state_history.sql.
				// Пока её нет, история зуба не должна ронять всю карточку.
				console.warn("[toothHistory] История переходов недоступна:", error);
			}

			if (historyRows.length > 0) {
				historyRows.forEach((row) => {
					events.push({
						type: "state_change",
						date: row.changedAt,
						description: row.previousState
							? `Статус: ${row.previousState} → ${row.newState}`
							: `Статус установлен: ${row.newState}`,
						authorId: row.authorName ?? row.changedByUserId ?? "Не указан",
					});
				});
			} else {
				// Запасной путь для данных, внесённых до включения истории.
				// DEFECT #43: organizationId обязателен — колонка NOT NULL, historyRows уже фильтрует по org.
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
				states.forEach((s) => {
					events.push({
						type: "state_change",
						date: s.updatedAt,
						description: `Текущий статус: ${s.state} (история до включения журнала не сохранялась)`,
						authorId: "Не указан",
					});
				});
			}

			events.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
			);

			return reply.send({ events });
		},
	);
}
