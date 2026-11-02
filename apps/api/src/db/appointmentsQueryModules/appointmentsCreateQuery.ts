import type {
	Appointment,
	CreateAppointmentInput,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import {
	createAppointment as createAppointmentInMemory,
} from "../../sampleData.js";
import { db } from "../client.js";
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
} from "./appointmentValidationHelpers.js";

export async function createAppointmentInDb(
	organizationId: string,
	input: Omit<CreateAppointmentInput, "chairId"> & {
		chairId?: string | null | undefined;
		allowEmergencyOverride?: boolean | undefined;
		urgency?: "routine" | "urgent" | "emergency" | undefined;
	},
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	tx?: any,
): Promise<Appointment> {
	if (useInMemory()) {
		return createAppointmentInMemory(input as unknown as CreateAppointmentInput);
	}
	if (input.patientId) {
		const client = tx || db;
		const [patient] = await client
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
		const isEmergencyOverride = isEmergencyBookingOverride(input);
		await assertPatientNotBlocked(
			organizationId,
			input.patientId,
			patient?.status,
			isEmergencyOverride,
		);
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

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const insertChecked = async (executor: any) => {
		// Принадлежность проверяется ДО блокировки ресурсов: блокировать чужую
		// строку незачем, а отказ обязан прийти раньше любой записи.
		await assertAppointmentResourcesBelongToOrganization(
			executor,
			organizationId,
			input,
		);
		if (input.status !== "cancelled" && input.status !== "no_show") {
			await lockAppointmentResources(executor, organizationId, {
				chairId: input.chairId,
				doctorUserId: input.doctorUserId,
				assistantUserId: input.assistantUserId,
				patientId: input.patientId,
			});
			if (!input.allowOverbooking && !isEmergencyOverrideOverall) {
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
			})
			.returning();

		if (!created)
			throw new Error("Не удалось создать запись на приём в базе данных");

		return {
			id: created.id,
			organizationId: created.organizationId,
			patientId: created.patientId,
			doctorUserId: created.doctorUserId,
			assistantUserId: created.assistantUserId,
			chairId: created.chairId,
			status: created.status,
			startsAt: created.startsAt.toISOString(),
			endsAt: created.endsAt.toISOString(),
			reason: created.reason,
			comment: created.comment,
			parentAppointmentId: created.parentAppointmentId,
			stageIndex: created.stageIndex,
			clinicalStage: created.clinicalStage,
			toothNumber: created.toothNumber,
			diagnosisMkb10: created.diagnosisMkb10,
		} as unknown as Appointment;
	};

	// Блокировки живут только внутри транзакции. Если вызывающий код уже
	// открыл свою — работаем в ней, иначе открываем собственную, иначе
	// проверка и вставка снова окажутся двумя независимыми операциями.
	if (tx) return insertChecked(tx);
	return db.transaction(insertChecked);
}
