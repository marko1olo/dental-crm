import type {
	Appointment,
	UpdateAppointmentInput,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
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
} from "./appointmentValidationHelpers.js";

export async function updateAppointmentInDb(
	organizationId: string,
	appointmentId: string,
	input: UpdateAppointmentInput & {
		allowEmergencyOverride?: boolean | undefined;
		allowOverbooking?: boolean | undefined;
		urgency?: "routine" | "urgent" | "emergency" | undefined;
	},
): Promise<Appointment> {
	if (useInMemory()) {
		return updateAppointmentInMemory(appointmentId, input);
	}
	// Перенос приёма — та же гонка, что и создание: между проверкой занятости
	// и записью другой администратор успевает занять слот. Всё внутри одной
	// транзакции с блокировкой строк ресурсов.
	const updated = await db.transaction(async (tx) => {
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
			!input.expectedCurrentStatus.includes(existing.status as any)
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
				if (await isPatientBookingBlocked(organizationId, newPatientId)) {
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
				!input.expectedCurrentStatus.includes(locked.status as any)
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
		if (input.allowOverbooking || isEmergencyOverrideOverall) updateData.isOverbooking = true;

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
	});

	if (!updated) throw new Error("Не удалось обновить запись на приём");

	return {
		id: updated.id,
		organizationId: updated.organizationId,
		patientId: updated.patientId,
		doctorUserId: updated.doctorUserId,
		assistantUserId: updated.assistantUserId,
		chairId: updated.chairId,
		status: updated.status,
		startsAt: updated.startsAt.toISOString(),
		endsAt: updated.endsAt.toISOString(),
		reason: updated.reason,
		comment: updated.comment,
		parentAppointmentId: updated.parentAppointmentId,
		stageIndex: updated.stageIndex,
		clinicalStage: updated.clinicalStage,
		toothNumber: updated.toothNumber,
		diagnosisMkb10: updated.diagnosisMkb10,
	} as unknown as Appointment;
}
