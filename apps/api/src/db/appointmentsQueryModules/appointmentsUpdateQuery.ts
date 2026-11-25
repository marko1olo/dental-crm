import type {
	Appointment,
	AppointmentStatus,
	UpdateAppointmentInput,
} from "@dental/shared";
import { and, eq, gt, lt, or, type SQL } from "drizzle-orm";
import {
	updateAppointment as updateAppointmentInMemory,
} from "../../sampleData.js";
import { db } from "../client.js";
import * as schema from "../schema.js";
import {
	isEmergencyBookingOverride,
	isPatientBookingBlocked,
	useInMemory,
} from "./emergencyBookingCheck.js";
import {
	assertAppointmentResourcesBelongToOrganization,
	assertNoResourceOverlap,
	lockAppointmentResources,
	type DbClientOrTransaction,
} from "./appointmentValidationHelpers.js";

export async function updateAppointmentInDb(
	organizationId: string,
	appointmentId: string,
	input: UpdateAppointmentInput & {
		allowEmergencyOverride?: boolean | undefined;
		allowOverbooking?: boolean | undefined;
		urgency?: "routine" | "urgent" | "emergency" | undefined;
		leaseToken?: string | null | undefined;
	},
	executor?: DbClientOrTransaction,
): Promise<Appointment> {
	if (useInMemory()) {
		return updateAppointmentInMemory(appointmentId, input);
	}
	// Перенос приёма — та же гонка, что и создание: между проверкой занятости
	// и записью другой администратор успевает занять слот. Всё внутри одной
	// транзакции с блокировкой строк ресурсов.
	const run = async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
		// Шаг 1: Чтение исходной записи без FOR UPDATE (MVCC snapshot).
		// Это исключает deadlock инверсии appointments <-> chairs/users/patients.
		const [existing] = await tx
			.select()
			.from(schema.appointments)
			.where(
				and(
					eq(schema.appointments.id, appointmentId),
					eq(schema.appointments.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!existing) throw new Error("Запись не найдена");

		if (
			input.expectedCurrentStatus &&
			input.expectedCurrentStatus.length > 0 &&
			!input.expectedCurrentStatus.includes(existing.status as AppointmentStatus)
		) {
			throw new Error(
				`Слот уже занят другим администратором или приём больше не свободен (текущий статус: ${existing.status}).`,
			);
		}

		// Перенос принимает те же ссылки, что и создание, и тем же путём уводил
		// приём за пределы клиники.
		await assertAppointmentResourcesBelongToOrganization(
			tx,
			organizationId,
			input,
		);

		const startsAtRaw = input.startsAt ?? existing.startsAt.toISOString();
		const endsAtRaw = input.endsAt ?? existing.endsAt.toISOString();

		const startsAtMs = Date.parse(startsAtRaw);
		const endsAtMs = Date.parse(endsAtRaw);
		if (
			!Number.isFinite(startsAtMs) ||
			!Number.isFinite(endsAtMs) ||
			endsAtMs <= startsAtMs
		) {
			throw new Error("Время окончания должно быть позже времени начала");
		}

		const candidateStarts = new Date(startsAtMs);
		const candidateEnds = new Date(endsAtMs);
		const newStatus = input.status ?? existing.status;
		const newChairId = input.chairId ?? existing.chairId;
		const newDoctorUserId = input.doctorUserId ?? existing.doctorUserId;
		const newAssistantUserId =
			input.assistantUserId !== undefined
				? input.assistantUserId
				: existing.assistantUserId;
		const newPatientId = input.patientId ?? existing.patientId;

		if (newPatientId && newStatus !== "cancelled" && newStatus !== "no_show") {
			const [patient] = await tx
				.select({ id: schema.patients.id, status: schema.patients.status })
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.id, newPatientId),
						eq(schema.patients.organizationId, organizationId),
					),
				)
				.limit(1);

			// Ст. 124 УК РФ (Неоказание помощи больному): при острой боли перенос/запись
			// не блокируются — только по явному структурному флагу (SSOT:
			// isEmergencyBookingOverride), без разбора свободного текста причины.
			const isEmergencyOverride = isEmergencyBookingOverride(input);

			if (!isEmergencyOverride) {
				if (patient?.status === "archived") {
					throw new Error("Пациент находится в архиве. Запись заблокирована.");
				}
				if (await isPatientBookingBlocked(organizationId, newPatientId, tx)) {
					throw new Error("Пациент внесен в черный список. Запись заблокирована.");
				}
			}
		}

		const isEmergencyOverrideOverall = isEmergencyBookingOverride(input);

		if (newStatus !== "cancelled" && newStatus !== "no_show") {
			// Шаг 2: Блокировка всех затрагиваемых ресурсов (старых И новых) в каноническом порядке
			await lockAppointmentResources(tx, organizationId, {
				chairIds: [existing.chairId, newChairId],
				userIds: [
					existing.doctorUserId,
					newDoctorUserId,
					existing.assistantUserId,
					newAssistantUserId,
				],
				patientIds: [existing.patientId, newPatientId],
			});

			// Шаг 3: Блокировка самой строки приёма (Level 4)
			const [locked] = await tx
				.select()
				.from(schema.appointments)
				.where(
					and(
						eq(schema.appointments.id, appointmentId),
						eq(schema.appointments.organizationId, organizationId),
					),
				)
				.for("update")
				.limit(1);

			if (!locked) throw new Error("Запись не найдена");

			if (
				input.expectedCurrentStatus &&
				input.expectedCurrentStatus.length > 0 &&
				!input.expectedCurrentStatus.includes(locked.status as AppointmentStatus)
			) {
				throw new Error(
					`Слот уже занят другим администратором или приём больше не свободен (текущий статус: ${locked.status}).`,
				);
			}

			// Шаг 4: Проверка отсутствия пересечений (пропускается при овербукинге или острой боли)
			if (!input.allowOverbooking && !isEmergencyOverrideOverall) {
				await assertNoResourceOverlap(tx, organizationId, {
					startsAt: candidateStarts,
					endsAt: candidateEnds,
					chairId: newChairId,
					doctorUserId: newDoctorUserId,
					assistantUserId: newAssistantUserId,
					patientId: newPatientId,
					excludeAppointmentId: appointmentId,
				});
			}

			// -------------------------------------------------------------
			// SLOT LEASE PROTOCOL (CORE-7):
			// -------------------------------------------------------------
			if (input.leaseToken) {
				const [lease] = await tx
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
					if (!input.allowOverbooking && !isEmergencyOverrideOverall) {
						throw new Error("Срок резервирования слота истек или токен удержания недействителен");
					}
				} else {
					await tx
						.delete(schema.scheduleSlotLeases)
						.where(eq(schema.scheduleSlotLeases.id, lease.id));
				}
			} else if (!input.allowOverbooking && !isEmergencyOverrideOverall) {
				const leaseResourceConditions: SQL[] = [];
				if (newDoctorUserId) {
					leaseResourceConditions.push(
						eq(schema.scheduleSlotLeases.doctorUserId, newDoctorUserId),
					);
				}
				if (newChairId) {
					leaseResourceConditions.push(
						eq(schema.scheduleSlotLeases.chairId, newChairId),
					);
				}

				if (leaseResourceConditions.length > 0) {
					const resourceFilter = or(...leaseResourceConditions);
					if (resourceFilter) {
						const [activeLease] = await tx
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
		}

		/*
		 * АТОМАРНЫЙ ЧАСТИЧНЫЙ UPDATE (DEFECT #MULTI-DEVICE-LWW):
		 * БЫЛО: в .set({...}) безусловно передавались все поля через `input.X ?? existing.X`.
		 * Если Врач с планшета обновлял comment/reason (без передачи status), а Администратор
		 * на ресепшене одновременно менял status на "completed", снимок existing Врача содержал
		 * старый status ("in_treatment"), и запись Врача молча затирала статус Администратора.
		 * СТАЛО: в updateData включаются ТОЛЬКО переданные в input поля. Непереданные колонки
		 * не затрагиваются в SQL UPDATE, защищая от LWW-гонок между устройствами.
		 */
		const updateData: Partial<typeof schema.appointments.$inferInsert> = {};

		if (input.patientId !== undefined) updateData.patientId = input.patientId;
		if (input.doctorUserId !== undefined) updateData.doctorUserId = input.doctorUserId;
		if (input.assistantUserId !== undefined) updateData.assistantUserId = input.assistantUserId;
		if (input.chairId !== undefined) updateData.chairId = input.chairId;
		if (input.status !== undefined) updateData.status = input.status;
		if (input.startsAt !== undefined) updateData.startsAt = new Date(startsAtMs);
		if (input.endsAt !== undefined) updateData.endsAt = new Date(endsAtMs);
		if (input.reason !== undefined) updateData.reason = input.reason;
		if (input.comment !== undefined) updateData.comment = input.comment;
		if (input.parentAppointmentId !== undefined) updateData.parentAppointmentId = input.parentAppointmentId;
		if (input.stageIndex !== undefined) updateData.stageIndex = input.stageIndex;
		if (input.clinicalStage !== undefined) updateData.clinicalStage = input.clinicalStage;
		if (input.toothNumber !== undefined) updateData.toothNumber = input.toothNumber;
		if (input.diagnosisMkb10 !== undefined) updateData.diagnosisMkb10 = input.diagnosisMkb10;
		if (input.treatmentPlanId !== undefined) updateData.treatmentPlanId = input.treatmentPlanId;
		if (input.stageId !== undefined) updateData.stageId = input.stageId;
		if (input.allowOverbooking !== undefined || input.allowEmergencyOverride !== undefined) {
			updateData.isOverbooking = Boolean(input.allowOverbooking || isEmergencyOverrideOverall);
		} else if (!isEmergencyOverrideOverall && (input.startsAt !== undefined || input.chairId !== undefined || input.doctorUserId !== undefined)) {
			updateData.isOverbooking = false;
		}

		if (Object.keys(updateData).length === 0) {
			return existing;
		}

		const [row] = await tx
			.update(schema.appointments)
			.set(updateData)
			.where(
				and(
					eq(schema.appointments.organizationId, organizationId),
					eq(schema.appointments.id, appointmentId),
				),
			)
			.returning();

		return row;
	};

	const updated =
		executor && executor !== db
			? await run(executor as Parameters<Parameters<typeof db.transaction>[0]>[0])
			: await db.transaction(run);

	if (!updated) throw new Error("Не удалось обновить запись на приём");

	const result: Appointment = {
		id: updated.id,
		organizationId: updated.organizationId,
		patientId: updated.patientId,
		doctorUserId: updated.doctorUserId,
		assistantUserId: updated.assistantUserId,
		chairId: updated.chairId,
		status: updated.status as AppointmentStatus,
		startsAt: updated.startsAt.toISOString(),
		endsAt: updated.endsAt.toISOString(),
		reason: updated.reason,
		comment: updated.comment,
		parentAppointmentId: updated.parentAppointmentId,
		stageIndex: updated.stageIndex,
		clinicalStage: updated.clinicalStage,
		toothNumber: updated.toothNumber,
		diagnosisMkb10: updated.diagnosisMkb10,
		treatmentPlanId: updated.treatmentPlanId,
		stageId: updated.stageId,
		isCito: input.isCito ?? input.cito ?? undefined,
		cito: input.cito ?? input.isCito ?? undefined,
		createdAt: updated.createdAt?.toISOString(),
	};
	return result;
}
