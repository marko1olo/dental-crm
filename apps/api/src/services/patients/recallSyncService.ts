import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import { appointments } from "../../db/schema/schedule.js";
import { patientRecalls } from "../../db/schema/patientsSchema/patientMedicalData.js";
import { visits, visitDiaries } from "../../db/schema/clinical/visitsSchema.js";
import { patients } from "../../db/schema/patients.js";
import { doctorPreferences } from "../../db/schema/doctorPreferences.js";
import { patientImplantInstallations } from "../../db/schema.js";
import { wsBroker } from "../websocketBroker.js";

/**
 * Реактивная связка Запись/Визит <-> Контрольный вызов (Recall).
 *
 * Клинические интервалы по когортам (Мандаты 8e, 8n, 8x):
 * - Ортодонтия (активация брекетов / элайнеров): 4 недели / 28 дней
 * - Эндодонтия (рентген-контроль после лечения каналов): 1 месяц / 30 дней
 * - Детская стоматология (профилактика / минерализация): 3 месяца / 90 дней
 * - Пародонтология (поддерживающая терапия SPT): 3 месяца / 90 дней
 * - Имплантология (контрольные этапы остеоинтеграции): 3 месяца / 90 дней
 * - Плановая терапия и профгигиена: 6 месяцев / 180 дней
 */

export interface ClinicalCohortResolution {
	readonly nextDueDate: Date;
	readonly cohortType: string;
	readonly reason: string;
	readonly intervalDays: number;
}

export function resolveClinicalRecallCohort(params: {
	readonly birthDate?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly diagnosisMkb10?: string | null | undefined;
	readonly hasImplants?: boolean | undefined;
	readonly referenceDate?: Date | undefined;
}): ClinicalCohortResolution {
	const now = params.referenceDate ?? new Date();

	// 1. Детская когорта (возраст < 14 или специальность pediatric)
	let isChild = false;
	if (params.birthDate) {
		const bDate = new Date(params.birthDate);
		if (!Number.isNaN(bDate.getTime())) {
			const age = Math.floor((now.getTime() - bDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
			if (age < 14) isChild = true;
		}
	}
	if (isChild || params.doctorSpecialty === "pediatric") {
		const intervalDays = 90; // 3 месяца
		return {
			nextDueDate: new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000),
			cohortType: "general",
			reason: "Детский профилактический осмотр и минерализация эмали (3 мес.)",
			intervalDays,
		};
	}

	// 2. Ортодонтия (активация аппаратуры каждые 4 недели / 28 дней)
	const mkb = (params.diagnosisMkb10 ?? "").toUpperCase();
	if (params.doctorSpecialty === "orthodontist" || mkb.startsWith("K07")) {
		const intervalDays = 28; // 4 недели / 28 дней
		return {
			nextDueDate: new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000),
			cohortType: "orthodontic_retention",
			reason: "Ортодонтический контроль: плановая активация аппаратуры (4 нед.)",
			intervalDays,
		};
	}

	// 3. Эндодонтия (контрольная визиография через 1 месяц)
	if (mkb.startsWith("K04")) {
		const intervalDays = 30; // 1 месяц / 30 дней
		return {
			nextDueDate: new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000),
			cohortType: "endodontic",
			reason: "Контрольный осмотр и рентгенография после эндодонтии (1 мес.)",
			intervalDays,
		};
	}

	// 4. Пародонтология (поддерживающая терапия 3 месяца)
	if (params.doctorSpecialty === "periodontist" || mkb.startsWith("K05")) {
		const intervalDays = 90; // 3 месяца
		return {
			nextDueDate: new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000),
			cohortType: "periodontal",
			reason: "Поддерживающая пародонтальная терапия и гигиена (3 мес.)",
			intervalDays,
		};
	}

	// 5. Имплантология (контрольные этапы остеоинтеграции)
	if (params.hasImplants) {
		const intervalDays = 90; // 3 месяца
		return {
			nextDueDate: new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000),
			cohortType: "implant",
			reason: "Контрольный осмотр остеоинтеграции и имплантатов (3 мес.)",
			intervalDays,
		};
	}

	// 6. Плановая профгигиена и терапия (дефолт 6 месяцев / 180 дней)
	const intervalDays = 180;
	return {
		nextDueDate: new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000),
		cohortType: "hygiene_therapy",
		reason: "Плановый профилактический осмотр и гигиена (6 мес.)",
		intervalDays,
	};
}

async function fetchPatientClinicalContext(
	tx: TenantDb,
	organizationId: string,
	patientId: string,
	doctorId?: string | null,
	explicitDiagnosisMkb10?: string | null,
) {
	// 1. Пациент (дата рождения)
	const [patientRow] = await tx
		.select({ birthDate: patients.birthDate })
		.from(patients)
		.where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
		.limit(1);

	// 2. Врач (специальность)
	let doctorSpecialty: string | null = null;
	if (doctorId) {
		const [docPref] = await tx
			.select({ specialty: doctorPreferences.specialty })
			.from(doctorPreferences)
			.where(and(eq(doctorPreferences.organizationId, organizationId), eq(doctorPreferences.doctorId, doctorId)))
			.limit(1);
		doctorSpecialty = docPref?.specialty ?? null;
	}

	// 3. Импланты
	const [implantRow] = await tx
		.select({ count: sql<number>`count(*)::int` })
		.from(patientImplantInstallations)
		.where(eq(patientImplantInstallations.patientId, patientId));
	const hasImplants = (implantRow?.count ?? 0) > 0;

	return {
		birthDate: patientRow?.birthDate ?? null,
		doctorSpecialty,
		diagnosisMkb10: explicitDiagnosisMkb10 ?? null,
		hasImplants,
	};
}

export async function syncRecallOnAppointmentCreated(
	organizationId: string,
	appointment: {
		id: string;
		patientId: string | null;
		doctorUserId?: string | null | undefined;
		reason?: string | null | undefined;
	},
): Promise<void> {
	const patientId = appointment.patientId;
	if (!patientId) return;

	try {
		await withTenantCtx(organizationId, async (tx: TenantDb) => {
			// Ищем открытый recall со статусом 'pending'
			const [pendingRecall] = await tx
				.select({ id: patientRecalls.id })
				.from(patientRecalls)
				.where(
					and(
						eq(patientRecalls.organizationId, organizationId),
						eq(patientRecalls.patientId, patientId),
						eq(patientRecalls.status, "pending"),
					),
				)
				.orderBy(desc(patientRecalls.createdAt))
				.limit(1);

			if (pendingRecall) {
				await tx
					.update(patientRecalls)
					.set({
						status: "scheduled",
						scheduledAppointmentId: appointment.id,
						doctorId: appointment.doctorUserId || null,
						updatedAt: new Date(),
					})
					.where(eq(patientRecalls.id, pendingRecall.id));

				wsBroker.broadcastToOrganization(organizationId, {
					type: "PATIENT_RECALL_UPDATED",
					payload: {
						recallId: pendingRecall.id,
						patientId,
						status: "scheduled",
						scheduledAppointmentId: appointment.id,
						updatedAt: new Date().toISOString(),
					},
				});
			}
		});
	} catch (err) {
		console.error("[recallSyncService] syncRecallOnAppointmentCreated failed:", err);
	}
}

export async function syncRecallOnAppointmentCompleted(
	organizationId: string,
	appointmentId: string,
): Promise<void> {
	try {
		await withTenantCtx(organizationId, async (tx: TenantDb) => {
			// Получаем данные приёма
			const [appt] = await tx
				.select({
					id: appointments.id,
					patientId: appointments.patientId,
					doctorUserId: appointments.doctorUserId,
					diagnosisMkb10: appointments.diagnosisMkb10,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.id, appointmentId),
						eq(appointments.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!appt || !appt.patientId) return;

			const now = new Date();
			const clinicalCtx = await fetchPatientClinicalContext(
				tx,
				organizationId,
				appt.patientId,
				appt.doctorUserId,
				appt.diagnosisMkb10,
			);
			const cohortPlan = resolveClinicalRecallCohort({
				...clinicalCtx,
				referenceDate: now,
			});

			// 1. Завершаем активный recall (связанный или находящийся в ожидании/запланирован)
			const [activeRecall] = await tx
				.select({ id: patientRecalls.id })
				.from(patientRecalls)
				.where(
					and(
						eq(patientRecalls.organizationId, organizationId),
						eq(patientRecalls.patientId, appt.patientId),
						inArray(patientRecalls.status, ["scheduled", "pending"]),
					),
				)
				.orderBy(desc(patientRecalls.createdAt))
				.limit(1);

			if (activeRecall) {
				await tx
					.update(patientRecalls)
					.set({
						status: "completed",
						completedAt: now,
						appointmentId: appt.id,
						updatedAt: now,
					})
					.where(eq(patientRecalls.id, activeRecall.id));
			}

			// 2. Создаем следующий recall на основе динамической когорты
			const [newRecall] = await tx
				.insert(patientRecalls)
				.values({
					organizationId,
					patientId: appt.patientId,
					doctorId: appt.doctorUserId || null,
					appointmentId: appt.id,
					reason: cohortPlan.reason,
					cohortType: cohortPlan.cohortType,
					status: "pending",
					dueDate: cohortPlan.nextDueDate,
					createdAt: now,
					updatedAt: now,
				})
				.returning({ id: patientRecalls.id });

			wsBroker.broadcastToOrganization(organizationId, {
				type: "PATIENT_RECALL_UPDATED",
				payload: {
					completedRecallId: activeRecall?.id ?? null,
					newRecallId: newRecall?.id ?? null,
					patientId: appt.patientId,
					status: "pending",
					dueDate: cohortPlan.nextDueDate.toISOString(),
					updatedAt: now.toISOString(),
				},
			});
		});
	} catch (err) {
		console.error("[recallSyncService] syncRecallOnAppointmentCompleted failed:", err);
	}
}

export async function syncRecallOnVisitCompleted(
	organizationId: string,
	visitId: string,
): Promise<void> {
	try {
		await withTenantCtx(organizationId, async (tx: TenantDb) => {
			const [v] = await tx
				.select({
					id: visits.id,
					patientId: visits.patientId,
					appointmentId: visits.appointmentId,
				})
				.from(visits)
				.where(
					and(
						eq(visits.id, visitId),
						eq(visits.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!v || !v.patientId) return;

			let doctorUserId: string | null = null;
			let diagnosisMkb10: string | null = null;
			if (v.appointmentId) {
				const [appt] = await tx
					.select({
						doctorUserId: appointments.doctorUserId,
						diagnosisMkb10: appointments.diagnosisMkb10,
					})
					.from(appointments)
					.where(
						and(
							eq(appointments.id, v.appointmentId),
							eq(appointments.organizationId, organizationId),
						),
					)
					.limit(1);
				doctorUserId = appt?.doctorUserId ?? null;
				diagnosisMkb10 = appt?.diagnosisMkb10 ?? null;
			}

			// Проверим также диагноз из дневника приёма если в приёме не был указан
			if (!diagnosisMkb10) {
				const [diary] = await tx
					.select({ diagnosisIcd10: visitDiaries.diagnosisIcd10 })
					.from(visitDiaries)
					.where(eq(visitDiaries.visitId, v.id))
					.limit(1);
				diagnosisMkb10 = diary?.diagnosisIcd10 ?? null;
			}

			const now = new Date();
			const clinicalCtx = await fetchPatientClinicalContext(
				tx,
				organizationId,
				v.patientId,
				doctorUserId,
				diagnosisMkb10,
			);
			const cohortPlan = resolveClinicalRecallCohort({
				...clinicalCtx,
				referenceDate: now,
			});

			// 1. Завершаем активный recall (связанный или находящийся в ожидании/запланирован)
			const [activeRecall] = await tx
				.select({ id: patientRecalls.id })
				.from(patientRecalls)
				.where(
					and(
						eq(patientRecalls.organizationId, organizationId),
						eq(patientRecalls.patientId, v.patientId),
						inArray(patientRecalls.status, ["scheduled", "pending"]),
					),
				)
				.orderBy(desc(patientRecalls.createdAt))
				.limit(1);

			if (activeRecall) {
				await tx
					.update(patientRecalls)
					.set({
						status: "completed",
						completedAt: now,
						appointmentId: v.appointmentId ?? null,
						updatedAt: now,
					})
					.where(eq(patientRecalls.id, activeRecall.id));
			}

			// 2. Создаем следующий recall на основе динамической когорты
			const [newRecall] = await tx
				.insert(patientRecalls)
				.values({
					organizationId,
					patientId: v.patientId,
					doctorId: doctorUserId,
					appointmentId: v.appointmentId ?? null,
					reason: cohortPlan.reason,
					cohortType: cohortPlan.cohortType,
					status: "pending",
					dueDate: cohortPlan.nextDueDate,
					createdAt: now,
					updatedAt: now,
				})
				.returning({ id: patientRecalls.id });

			wsBroker.broadcastToOrganization(organizationId, {
				type: "PATIENT_RECALL_UPDATED",
				payload: {
					completedRecallId: activeRecall?.id ?? null,
					newRecallId: newRecall?.id ?? null,
					patientId: v.patientId,
					status: "pending",
					dueDate: cohortPlan.nextDueDate.toISOString(),
					updatedAt: now.toISOString(),
				},
			});
		});
	} catch (err) {
		console.error("[recallSyncService] syncRecallOnVisitCompleted failed:", err);
	}
}
