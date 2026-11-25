import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { isValidUuid, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import { appointments } from "../../db/schema/schedule.js";
import { patientRecalls } from "../../db/schema/patientsSchema/patientMedicalData.js";
import { patients } from "../../db/schema/patients.js";
import { treatmentPlans } from "../../db/schema/clinical/treatmentPlansSchema.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { wsBroker } from "../websocketBroker.js";

const logger = createApiLogger("treatmentPlanDropoutService");

export interface DropoutPreventionResult {
	evaluatedPlans: number;
	dropoutRiskCount: number;
	tasksCreated: number;
	existingRecallsCount: number;
	recalls: Array<{
		patientId: string;
		patientName: string;
		planId: string;
		planTitle: string;
		daysInactive: number;
		totalPriceKopecks: number;
		totalPriceRub: number;
		recallId?: string;
	}>;
}

function resolvePlanAmountKopecks(plan: {
	totalPriceKopecks?: bigint | number | null;
	totalPriceRub?: string | number | null;
	totalPrice?: string | number | null;
}): bigint {
	if (typeof plan.totalPriceKopecks === "bigint" && plan.totalPriceKopecks > 0n) {
		return plan.totalPriceKopecks;
	}
	if (typeof plan.totalPriceKopecks === "number" && Number.isFinite(plan.totalPriceKopecks) && plan.totalPriceKopecks > 0) {
		return BigInt(Math.round(plan.totalPriceKopecks));
	}
	const fallbackRub = Number(plan.totalPrice) || Number(plan.totalPriceRub) || 0;
	return fallbackRub > 0 ? BigInt(rublesToKopecks(fallbackRub)) : 0n;
}

/**
 * Анти-отвал пациентов (Treatment Plan Drop-out Prevention):
 * Если пациент утвердил план лечения (Approved) или находится в активной фазе (Active),
 * но не записан на следующий этап лечения в течение 14–21+ дней — автоматически
 * формируется задача на звонок куратору / реколл в patientRecalls.
 */
export async function checkAndGenerateDropoutRecalls(
	organizationId: string,
	minDaysWithoutAppointment: number = 14,
): Promise<DropoutPreventionResult> {
	const now = new Date();

	return await withTenantCtx(organizationId, async (tx) => {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${`dropout_recalls:${organizationId}`}))`,
		);

		// 1. Извлекаем все утвержденные и активные планы клиники
		const plans = await tx
			.select({
				id: treatmentPlans.id,
				name: treatmentPlans.name,
				title: treatmentPlans.title,
				status: treatmentPlans.status,
				totalPriceKopecks: treatmentPlans.totalPriceKopecks,
				totalPriceRub: treatmentPlans.totalPriceRub,
				totalPrice: treatmentPlans.totalPrice,
				patientId: treatmentPlans.patientId,
				doctorId: treatmentPlans.doctorId,
				approvedAt: treatmentPlans.approvedAt,
				updatedAt: treatmentPlans.updatedAt,
				createdAt: treatmentPlans.createdAt,
				patientName: patients.fullName,
				patientPhone: patients.phone,
			})
			.from(treatmentPlans)
			.innerJoin(patients, eq(treatmentPlans.patientId, patients.id))
			.where(
				and(
					eq(treatmentPlans.organizationId, organizationId),
					inArray(treatmentPlans.status, ["Approved", "Active"]),
				),
			)
			.orderBy(desc(treatmentPlans.updatedAt));

		if (plans.length === 0) {
			return {
				evaluatedPlans: 0,
				dropoutRiskCount: 0,
				tasksCreated: 0,
				existingRecallsCount: 0,
				recalls: [],
			};
		}

		const patientIds = Array.from(new Set(plans.map((p) => p.patientId).filter(Boolean)));

		// 2. Ищем записи на приём пациентов (прошлые и будущие)
		const apptRows = await tx
			.select({
				patientId: appointments.patientId,
				startsAt: appointments.startsAt,
				status: appointments.status,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					inArray(appointments.patientId, patientIds),
					sql`${appointments.status} != 'cancelled'`,
				),
			);

		const futureAppts = new Set<string>();
		const lastPastAppts = new Map<string, Date>();

		for (const a of apptRows) {
			if (!a.patientId || !a.startsAt) continue;
			const d = new Date(a.startsAt);
			if (isNaN(d.getTime())) continue;

			if (d >= now) {
				futureAppts.add(a.patientId);
			} else {
				const prev = lastPastAppts.get(a.patientId);
				if (!prev || prev < d) {
					lastPastAppts.set(a.patientId, d);
				}
			}
		}

		// 3. Ищем существующие активные реколл-задачи по анти-отвалу
		const existingRecalls = await tx
			.select({
				id: patientRecalls.id,
				patientId: patientRecalls.patientId,
			})
			.from(patientRecalls)
			.where(
				and(
					eq(patientRecalls.organizationId, organizationId),
					inArray(patientRecalls.patientId, patientIds),
					eq(patientRecalls.cohortType, "treatment_plan_followup"),
					inArray(patientRecalls.status, ["pending", "scheduled"]),
				),
			);

		const activeRecallPatientIds = new Set(existingRecalls.map((r) => r.patientId));

		let tasksCreated = 0;
		let existingRecallsCount = 0;
		const dropoutPlans: DropoutPreventionResult["recalls"] = [];
		const recallsToInsert: Array<typeof patientRecalls.$inferInsert> = [];
		const pendingSummariesByPatient = new Map<string, number>();

		for (const plan of plans) {
			// Если есть будущая запись — пациент не отвалился
			if (futureAppts.has(plan.patientId)) continue;

			// Вычисляем дату последней активности (последний визит или утверждение плана)
			const pastApptDate = lastPastAppts.get(plan.patientId);
			const baseDate =
				pastApptDate ||
				(plan.approvedAt ? new Date(plan.approvedAt) : null) ||
				(plan.updatedAt ? new Date(plan.updatedAt) : null) ||
				(plan.createdAt ? new Date(plan.createdAt) : now);

			const validBaseTime = isNaN(baseDate.getTime()) ? now.getTime() : baseDate.getTime();
			const daysInactive = Math.floor(Math.max(0, now.getTime() - validBaseTime) / 86400000);

			if (daysInactive >= minDaysWithoutAppointment) {
				const totalKopecksBig = resolvePlanAmountKopecks(plan);
				const totalRub = kopecksToRubles(totalKopecksBig);
				const planTitle = plan.title || plan.name || "Комплексный план лечения";

				const itemSummary = {
					patientId: plan.patientId,
					patientName: plan.patientName || "Без имени",
					planId: plan.id,
					planTitle,
					daysInactive,
					totalPriceKopecks: Number(totalKopecksBig),
					totalPriceRub: totalRub,
				};

				if (activeRecallPatientIds.has(plan.patientId)) {
					existingRecallsCount++;
					dropoutPlans.push(itemSummary);
				} else {
					activeRecallPatientIds.add(plan.patientId);
					recallsToInsert.push({
						organizationId,
						patientId: plan.patientId,
						doctorId: plan.doctorId || null,
						reason: `Анти-отвал: план «${planTitle}» утвержден, нет записи ${daysInactive} дн.`,
						cohortType: "treatment_plan_followup",
						status: "pending",
						dueDate: now,
						notes: `Сумма плана: ${totalRub.toLocaleString("ru-RU")} ₽. Задача куратору: связаться с пациентом для записи на следующий этап лечения.`,
					});
					const idx = dropoutPlans.length;
					dropoutPlans.push(itemSummary);
					pendingSummariesByPatient.set(plan.patientId, idx);
				}
			}
		}

		if (recallsToInsert.length > 0) {
			try {
				const inserted = await tx
					.insert(patientRecalls)
					.values(recallsToInsert)
					.onConflictDoNothing()
					.returning({ id: patientRecalls.id, patientId: patientRecalls.patientId });

				tasksCreated = inserted.length;
				for (const row of inserted) {
					const idx = pendingSummariesByPatient.get(row.patientId);
					const summaryItem = idx !== undefined ? dropoutPlans[idx] : undefined;
					if (summaryItem) {
						summaryItem.recallId = row.id;
					}
				}
			} catch (err) {
				logger.warn(
					{ err: safeLogError(err), organizationId, batchSize: recallsToInsert.length },
					"Failed to batch insert treatment plan dropout recalls",
				);
				throw err;
			}
		}

		if (tasksCreated > 0) {
			const totalAtRisk = dropoutPlans.length;
			onTenantTxCommit(() => {
				wsBroker.broadcastToOrganization(organizationId, {
					type: "TREATMENT_PLAN_DROPOUT_TASKS_CREATED",
					payload: {
						tasksCreated,
						totalAtRisk,
						timestamp: now.toISOString(),
					},
				});
			});
		}

		return {
			evaluatedPlans: plans.length,
			dropoutRiskCount: dropoutPlans.length,
			tasksCreated,
			existingRecallsCount,
			recalls: dropoutPlans,
		};
	});
}

/**
 * Создание одиночной задачи на звонок куратору по конкретному плану лечения
 */
export async function createSinglePlanDropoutRecall(
	organizationId: string,
	planId: string,
	curatorNotes?: string,
): Promise<{ success: boolean; recallId?: string; message: string }> {
	const trimmedPlanId = planId?.trim();
	if (!trimmedPlanId || !isValidUuid(trimmedPlanId)) {
		return { success: false, message: "Некорректный идентификатор плана лечения" };
	}
	const trimmedOrgId = organizationId?.trim();
	if (!trimmedOrgId || !isValidUuid(trimmedOrgId)) {
		return { success: false, message: "Некорректный идентификатор организации" };
	}

	return await withTenantCtx(trimmedOrgId, async (tx) => {
		const [plan] = await tx
			.select({
				id: treatmentPlans.id,
				name: treatmentPlans.name,
				title: treatmentPlans.title,
				patientId: treatmentPlans.patientId,
				doctorId: treatmentPlans.doctorId,
				totalPriceKopecks: treatmentPlans.totalPriceKopecks,
				totalPriceRub: treatmentPlans.totalPriceRub,
				totalPrice: treatmentPlans.totalPrice,
			})
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.id, trimmedPlanId),
					eq(treatmentPlans.organizationId, trimmedOrgId),
				),
			)
			.limit(1);

		if (!plan) {
			return { success: false, message: "План лечения не найден" };
		}

		const now = new Date();
		const planTitle = plan.title || plan.name || "План лечения";
		const totalRub = kopecksToRubles(resolvePlanAmountKopecks(plan));

		// Проверяем существующий активный реколл
		const [existing] = await tx
			.select({ id: patientRecalls.id })
			.from(patientRecalls)
			.where(
				and(
					eq(patientRecalls.organizationId, trimmedOrgId),
					eq(patientRecalls.patientId, plan.patientId),
					eq(patientRecalls.cohortType, "treatment_plan_followup"),
					inArray(patientRecalls.status, ["pending", "scheduled"]),
				),
			)
			.limit(1);

		if (existing) {
			return {
				success: true,
				recallId: existing.id,
				message: "Задача на звонок куратора уже находится в очереди",
			};
		}

		const [created] = await tx
			.insert(patientRecalls)
			.values({
				organizationId: trimmedOrgId,
				patientId: plan.patientId,
				doctorId: plan.doctorId || null,
				reason: `Контроль плана лечения: «${planTitle}»`,
				cohortType: "treatment_plan_followup",
				status: "pending",
				dueDate: now,
				notes: curatorNotes || `Сумма плана: ${totalRub.toLocaleString("ru-RU")} ₽. Требуется звонок куратора для согласования записи.`,
			})
			.returning({ id: patientRecalls.id });

		const createdRecallId = created?.id;
		const targetPatientId = plan.patientId;
		onTenantTxCommit(() => {
			wsBroker.broadcastToOrganization(trimmedOrgId, {
				type: "PATIENT_RECALL_UPDATED",
				payload: {
					recallId: createdRecallId,
					patientId: targetPatientId,
					status: "pending",
					cohortType: "treatment_plan_followup",
				},
			});
		});

		return {
			success: true,
			...(createdRecallId ? { recallId: createdRecallId } : {}),
			message: "Задача на звонок куратору успешно создана",
		};
	});
}
