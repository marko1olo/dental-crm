import type {
	Appointment,
	AppointmentStatus,
	CreateAppointmentInput,
} from "@dental/shared";
import { and, eq, gt, gte, lt, or, sql, type SQL } from "drizzle-orm";
import {
	createAppointment as createAppointmentInMemory,
} from "../../sampleData.js";
import { db } from "../client.js";
import { withTenantCtx } from "../rls.js";
import * as schema from "../schema.js";
import {
	assertPatientNotBlocked,
	isEmergencyBookingOverride,
	useInMemory,
} from "./emergencyBookingCheck.js";
import {
	assertAppointmentResourcesBelongToOrganization,
	assertNoResourceOverlap,
	lockAppointmentResources,
	type DbClientOrTransaction,
} from "./appointmentValidationHelpers.js";
import {
	acquireCanonicalScheduleAdvisoryLocks,
	assertNoTimeReservationOverlap,
} from "./scheduleReservationLockHelpers.js";

export type CreateAppointmentDbInput = CreateAppointmentInput & {
	allowEmergencyOverride?: boolean | undefined;
	urgency?: "routine" | "urgent" | "emergency" | undefined;
	creatorUserId?: string | null | undefined;
	attributedRole?: string | null | undefined;
	attributedUserId?: string | null | undefined;
	attributionReason?: string | null | undefined;
	rebookingSourceVisitId?: string | null | undefined;
	rebookingDeltaMinutes?: number | null | undefined;
	leaseToken?: string | null | undefined;
};

export interface RebookingAttributionInput {
	isSoloDoctor: boolean;
	creatorUserId?: string | null | undefined;
	doctorUserId?: string | null | undefined;
	assistantUserId?: string | null | undefined;
	activeVisit?: {
		id: string;
		doctorUserId?: string | null | undefined;
	} | null | undefined;
	lastCompletedVisit?: {
		id: string;
		doctorUserId?: string | null | undefined;
		completedAt: Date;
	} | null | undefined;
	now?: Date | undefined;
}

export interface RebookingAttributionResult {
	attributedRole: "doctor" | "administrator";
	attributedUserId: string | null;
	attributionReason: string;
	deltaMinutes: number | null;
	sourceVisitId: string | null;
}

export function computeRebookingAttribution(
	input: RebookingAttributionInput,
): RebookingAttributionResult {
	// 1. Соло-врач (Мандат 8n): 100% записей атрибутируются врачу
	if (input.isSoloDoctor) {
		return {
			attributedRole: "doctor",
			attributedUserId: input.doctorUserId ?? input.creatorUserId ?? null,
			attributionReason: "solo_doctor_auto",
			deltaMinutes: 0,
			sourceVisitId: input.activeVisit?.id ?? input.lastCompletedVisit?.id ?? null,
		};
	}

	// 2. Активный визит в кресле прямо сейчас (in_treatment / arrived) -> Delta = 0, Врач
	if (input.activeVisit) {
		return {
			attributedRole: "doctor",
			attributedUserId: input.activeVisit.doctorUserId ?? input.doctorUserId ?? null,
			attributionReason: "chairside_rebooking_under_15m",
			deltaMinutes: 0,
			sourceVisitId: input.activeVisit.id,
		};
	}

	// 3. Предшествующий завершенный визит за 24 часа
	if (input.lastCompletedVisit) {
		const completedTime = input.lastCompletedVisit.completedAt.getTime();
		const nowTime = (input.now ?? new Date()).getTime();
		const rawDeltaMinutes = Math.floor((nowTime - completedTime) / 60000);
		// Защита от отрицательной дельты (если визит оформлен за несколько минут до официального закрытия):
		const deltaClean = Math.max(0, rawDeltaMinutes);

		if (deltaClean <= 15) {
			return {
				attributedRole: "doctor",
				attributedUserId:
					input.lastCompletedVisit.doctorUserId ?? input.doctorUserId ?? null,
				attributionReason: "chairside_rebooking_under_15m",
				deltaMinutes: deltaClean,
				sourceVisitId: input.lastCompletedVisit.id,
			};
		}

		return {
			attributedRole: "administrator",
			attributedUserId: input.creatorUserId ?? input.assistantUserId ?? null,
			attributionReason: "frontdesk_rebooking_over_15m",
			deltaMinutes: deltaClean,
			sourceVisitId: input.lastCompletedVisit.id,
		};
	}

	// 4. Нет предшествующего визита за 24ч -> новая запись оформлена администратором
	return {
		attributedRole: "administrator",
		attributedUserId: input.creatorUserId ?? input.assistantUserId ?? null,
		attributionReason: "frontdesk_rebooking_over_15m",
		deltaMinutes: null,
		sourceVisitId: null,
	};
}

export async function createAppointmentInDb(
	organizationId: string,
	input: CreateAppointmentDbInput,
	tx?: DbClientOrTransaction,
): Promise<Appointment> {
	if (useInMemory()) {
		return createAppointmentInMemory(input);
	}
	const startsAtMs = Date.parse(input.startsAt);
	const endsAtMs = Date.parse(input.endsAt);
	if (
		!Number.isFinite(startsAtMs) ||
		!Number.isFinite(endsAtMs) ||
		endsAtMs <= startsAtMs
	) {
		throw new Error("Время окончания должно быть позже времени начала");
	}

	const candidateStarts = new Date(startsAtMs);
	const candidateEnds = new Date(endsAtMs);

	const isEmergencyOverrideOverall = isEmergencyBookingOverride(input);

	const insertChecked = async (executor: DbClientOrTransaction) => {
		if (input.patientId) {
			const [patient] = await executor
				.select({ id: schema.patients.id, status: schema.patients.status })
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.id, input.patientId),
						eq(schema.patients.organizationId, organizationId),
					),
				)
				.limit(1);

			// Ст. 124 УК РФ (Неоказание помощи больному): экстренная запись не
			// блокируется черным списком/архивом и допускает овербукинг — но только
			// по явному флагу администратора, а не по словам в причине (SSOT:
			// isEmergencyBookingOverride).
			await assertPatientNotBlocked(
				organizationId,
				input.patientId,
				patient?.status,
				isEmergencyOverrideOverall,
				executor,
			);
		}

		// Принадлежность проверяется ДО блокировки ресурсов: блокировать чужую
		// строку незачем, а отказ обязан прийти раньше любой записи.
		await assertAppointmentResourcesBelongToOrganization(
			executor,
			organizationId,
			input,
		);
		if (input.status !== "cancelled" && input.status !== "no_show") {
			await acquireCanonicalScheduleAdvisoryLocks(executor, organizationId, {
				chairId: input.chairId,
				doctorUserId: input.doctorUserId,
			});
			await lockAppointmentResources(executor, organizationId, {
				chairId: input.chairId,
				doctorUserId: input.doctorUserId,
				assistantUserId: input.assistantUserId,
				patientId: input.patientId,
			});
			if (!input.allowOverbooking && !isEmergencyOverrideOverall) {
				await assertNoTimeReservationOverlap(executor, organizationId, {
					startsAt: candidateStarts,
					endsAt: candidateEnds,
					chairId: input.chairId,
				});
				await assertNoResourceOverlap(executor, organizationId, {
					startsAt: candidateStarts,
					endsAt: candidateEnds,
					chairId: input.chairId,
					doctorUserId: input.doctorUserId,
					assistantUserId: input.assistantUserId,
					patientId: input.patientId,
				});
			}
		}

		const isOverbookingRecord = Boolean(input.allowOverbooking || isEmergencyOverrideOverall);

		// -------------------------------------------------------------
		// SLOT LEASE PROTOCOL (CORE-7):
		// -------------------------------------------------------------
		if (input.leaseToken) {
			const [lease] = await executor
				.select()
				.from(schema.scheduleSlotLeases)
				.where(
					and(
						eq(schema.scheduleSlotLeases.organizationId, organizationId),
						eq(schema.scheduleSlotLeases.leaseToken, input.leaseToken),
					),
				)
				.limit(1);

			if (!lease || lease.expiresAt.getTime() <= Date.now()) {
				if (!isOverbookingRecord) {
					throw new Error("Срок резервирования слота истек или токен удержания недействителен");
				}
			} else {
				await executor
					.delete(schema.scheduleSlotLeases)
					.where(eq(schema.scheduleSlotLeases.id, lease.id));
			}
		} else if (!isOverbookingRecord && input.status !== "cancelled" && input.status !== "no_show") {
			const leaseResourceConditions: SQL[] = [];
			if (input.doctorUserId) {
				leaseResourceConditions.push(
					eq(schema.scheduleSlotLeases.doctorUserId, input.doctorUserId),
				);
			}
			if (input.chairId) {
				leaseResourceConditions.push(
					eq(schema.scheduleSlotLeases.chairId, input.chairId),
				);
			}

			if (leaseResourceConditions.length > 0) {
				const resourceFilter = or(...leaseResourceConditions);
				if (resourceFilter) {
					const [activeLease] = await executor
						.select({ id: schema.scheduleSlotLeases.id })
						.from(schema.scheduleSlotLeases)
						.where(
							and(
								eq(schema.scheduleSlotLeases.organizationId, organizationId),
								gt(schema.scheduleSlotLeases.expiresAt, new Date()),
								lt(schema.scheduleSlotLeases.startsAt, candidateEnds),
								gt(schema.scheduleSlotLeases.endsAt, candidateStarts),
								resourceFilter,
							),
						)
						.limit(1);

					if (activeLease) {
						throw new Error("Слот временно удерживается другим пользователем");
					}
				}
			}
		}

		// -------------------------------------------------------------
		// ФИЧА 54: Клинический алгоритм разделения конверсии повторной записи:
		// 15-минутный порог — Врач у кресла при \Delta t <= 15 мин vs Администратор при \Delta t > 15 мин.
		// -------------------------------------------------------------
		let finalAttributedRole = input.attributedRole ?? null;
		let finalAttributedUserId = input.attributedUserId ?? null;
		let finalAttributionReason = input.attributionReason ?? null;
		let finalSourceVisitId = input.rebookingSourceVisitId ?? null;
		let finalDeltaMinutes = input.rebookingDeltaMinutes ?? null;

		if (!finalAttributedRole && input.patientId) {
			// Проверка соло-режима клиники (Мандат 8n)
			let isSoloDoctor = false;
			const [orgRecord] = await executor
				.select({ clinicMode: schema.organizations.clinicMode })
				.from(schema.organizations)
				.where(eq(schema.organizations.id, organizationId))
				.limit(1);

			if (
				orgRecord?.clinicMode === "solo_doctor" ||
				orgRecord?.clinicMode === "one_chair"
			) {
				isSoloDoctor = true;
			} else {
				const chairsList = await executor
					.select({ id: schema.chairs.id })
					.from(schema.chairs)
					.where(eq(schema.chairs.organizationId, organizationId))
					.limit(2);
				if (chairsList.length <= 1) {
					isSoloDoctor = true;
				}
			}

			if (isSoloDoctor) {
				const computed = computeRebookingAttribution({
					isSoloDoctor: true,
					creatorUserId: input.creatorUserId,
					doctorUserId: input.doctorUserId,
					assistantUserId: input.assistantUserId,
				});
				finalAttributedRole = computed.attributedRole;
				finalAttributedUserId = computed.attributedUserId;
				finalAttributionReason = computed.attributionReason;
				finalDeltaMinutes = computed.deltaMinutes;
				finalSourceVisitId = computed.sourceVisitId;
			} else {
				// 1. Поиск активного визита пациента в кресле прямо сейчас:
				const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
				const [activeVisit] = await executor
					.select({
						id: schema.visits.id,
						status: schema.visits.status,
						createdAt: schema.visits.createdAt,
						doctorUserId: schema.appointments.doctorUserId,
					})
					.from(schema.visits)
					.leftJoin(
						schema.appointments,
						eq(schema.visits.appointmentId, schema.appointments.id),
					)
					.where(
						and(
							eq(schema.visits.organizationId, organizationId),
							eq(schema.visits.patientId, input.patientId),
							or(
								eq(schema.visits.status, "draft"),
								gte(schema.visits.createdAt, fourHoursAgo),
							),
							or(
								eq(schema.appointments.status, "in_treatment"),
								eq(schema.appointments.status, "arrived"),
							),
						),
					)
					.limit(1);

				if (activeVisit) {
					const computed = computeRebookingAttribution({
						isSoloDoctor: false,
						creatorUserId: input.creatorUserId,
						doctorUserId: input.doctorUserId,
						assistantUserId: input.assistantUserId,
						activeVisit: {
							id: activeVisit.id,
							doctorUserId: activeVisit.doctorUserId,
						},
					});
					finalAttributedRole = computed.attributedRole;
					finalAttributedUserId = computed.attributedUserId;
					finalAttributionReason = computed.attributionReason;
					finalDeltaMinutes = computed.deltaMinutes;
					finalSourceVisitId = computed.sourceVisitId;
				} else {
					// 2. Поиск последнего завершённого визита за последние 24 часа
					const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
					const [lastCompletedVisit] = await executor
						.select({
							id: schema.visits.id,
							signedAt: schema.visits.signedAt,
							updatedAt: schema.visits.updatedAt,
							createdAt: schema.visits.createdAt,
							doctorUserId: schema.appointments.doctorUserId,
							appointmentEndsAt: schema.appointments.endsAt,
						})
						.from(schema.visits)
						.leftJoin(
							schema.appointments,
							eq(schema.visits.appointmentId, schema.appointments.id),
						)
						.where(
							and(
								eq(schema.visits.organizationId, organizationId),
								eq(schema.visits.patientId, input.patientId),
								or(
									eq(schema.visits.status, "signed"),
									sql`${schema.visits.signedAt} IS NOT NULL`,
									eq(schema.appointments.status, "completed"),
								),
								gte(
									sql`coalesce(${schema.visits.signedAt}, ${schema.visits.updatedAt}, ${schema.visits.createdAt})`,
									twentyFourHoursAgo,
								),
							),
						)
						.orderBy(
							sql`coalesce(${schema.visits.signedAt}, ${schema.visits.updatedAt}, ${schema.visits.createdAt}) DESC`,
						)
						.limit(1);

					if (lastCompletedVisit) {
						const completedDate =
							lastCompletedVisit.signedAt ??
							lastCompletedVisit.updatedAt ??
							lastCompletedVisit.appointmentEndsAt ??
							lastCompletedVisit.createdAt;

						const computed = computeRebookingAttribution({
							isSoloDoctor: false,
							creatorUserId: input.creatorUserId,
							doctorUserId: input.doctorUserId,
							assistantUserId: input.assistantUserId,
							lastCompletedVisit: {
								id: lastCompletedVisit.id,
								doctorUserId: lastCompletedVisit.doctorUserId,
								completedAt: completedDate,
							},
						});
						finalAttributedRole = computed.attributedRole;
						finalAttributedUserId = computed.attributedUserId;
						finalAttributionReason = computed.attributionReason;
						finalDeltaMinutes = computed.deltaMinutes;
						finalSourceVisitId = computed.sourceVisitId;
					} else {
						const computed = computeRebookingAttribution({
							isSoloDoctor: false,
							creatorUserId: input.creatorUserId,
							doctorUserId: input.doctorUserId,
							assistantUserId: input.assistantUserId,
						});
						finalAttributedRole = computed.attributedRole;
						finalAttributedUserId = computed.attributedUserId;
						finalAttributionReason = computed.attributionReason;
						finalDeltaMinutes = computed.deltaMinutes;
						finalSourceVisitId = computed.sourceVisitId;
					}
				}
			}
		}

		const [created] = await executor
			.insert(schema.appointments)
			.values({
				organizationId,
				patientId: input.patientId,
				doctorUserId: input.doctorUserId,
				assistantUserId: input.assistantUserId ?? null,
				chairId: input.chairId,
				status: input.status,
				startsAt: candidateStarts,
				endsAt: candidateEnds,
				reason: input.reason || null,
				comment: input.comment || null,
				parentAppointmentId: input.parentAppointmentId ?? null,
				stageIndex: input.stageIndex ?? 1,
				clinicalStage: input.clinicalStage ?? null,
				toothNumber: input.toothNumber ?? null,
				diagnosisMkb10: input.diagnosisMkb10 ?? null,
				isOverbooking: isOverbookingRecord,
				rebookingSourceVisitId: finalSourceVisitId,
				rebookingDeltaMinutes: finalDeltaMinutes,
				attributedRole: finalAttributedRole,
				attributedUserId: finalAttributedUserId,
				attributionReason: finalAttributionReason,
				treatmentPlanId: input.treatmentPlanId ?? null,
				stageId: input.stageId ?? null,
			})
			.returning();

		if (!created)
			throw new Error("Не удалось создать запись на приём в базе данных");

		const result: Appointment = {
			id: created.id,
			organizationId: created.organizationId,
			patientId: created.patientId,
			doctorUserId: created.doctorUserId,
			assistantUserId: created.assistantUserId,
			chairId: created.chairId,
			status: created.status as AppointmentStatus,
			startsAt: created.startsAt.toISOString(),
			endsAt: created.endsAt.toISOString(),
			reason: created.reason,
			comment: created.comment,
			parentAppointmentId: created.parentAppointmentId,
			stageIndex: created.stageIndex,
			clinicalStage: created.clinicalStage,
			toothNumber: created.toothNumber,
			diagnosisMkb10: created.diagnosisMkb10,
			treatmentPlanId: created.treatmentPlanId,
			stageId: created.stageId,
			isCito: input.isCito ?? input.cito ?? undefined,
			cito: input.cito ?? input.isCito ?? undefined,
			createdAt: created.createdAt.toISOString(),
			rebookingSourceVisitId: created.rebookingSourceVisitId,
			rebookingDeltaMinutes: created.rebookingDeltaMinutes,
			attributedRole: created.attributedRole,
			attributedUserId: created.attributedUserId,
			attributionReason: created.attributionReason,
		};
		return result;
	};

	// Блокировки живут только внутри транзакции. Если вызывающий код уже
	// открыл свою — работаем в ней, иначе открываем собственную, иначе
	// проверка и вставка снова окажутся двумя независимыми операциями.
	if (tx && tx !== db) return insertChecked(tx);
	return withTenantCtx(organizationId, insertChecked);
}
