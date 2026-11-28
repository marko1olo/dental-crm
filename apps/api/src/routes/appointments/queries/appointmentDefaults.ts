import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { chairs, clinics, users } from "../../../db/schema.js";
import {
	DEFAULT_SCHEDULE_TIMEZONE,
	isMissingOrDefaultChairId,
	isMissingOrDefaultDoctorId,
	normalizeAppointmentFieldAliases,
} from "../appointmentsHelpers.js";
import { clinicTimeZone } from "../../../services/reports/managerReports/timezone.js";
import type { DbClientOrTransaction } from "../types.js";

/**
 * Резолвит активное кресло по умолчанию для новой записи.
 * Мандат 8n: суверенитет соло-врача и клиники 1–3 кресел без лишней бюрократии.
 */
export async function resolveDefaultChairForCreate(
	tx: DbClientOrTransaction = db,
	orgId: string,
): Promise<string | undefined> {
	const [firstActiveChair] = await tx
		.select({ id: chairs.id })
		.from(chairs)
		.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)))
		.limit(1);
	if (firstActiveChair) {
		return firstActiveChair.id;
	}

	const [anyChair] = await tx
		.select({ id: chairs.id })
		.from(chairs)
		.where(eq(chairs.organizationId, orgId))
		.limit(1);
	if (anyChair) {
		return anyChair.id;
	}

	let [clinic] = await tx
		.select({ id: clinics.id })
		.from(clinics)
		.where(eq(clinics.organizationId, orgId))
		.limit(1);
	if (!clinic) {
		const [newClinic] = await tx
			.insert(clinics)
			.values({
				organizationId: orgId,
				name: "Стоматологическая клиника",
			})
			.returning({ id: clinics.id });
		clinic = newClinic;
	}

	const targetClinicId = clinic?.id;
	if (targetClinicId) {
		const [autoChair] = await tx
			.insert(chairs)
			.values({
				organizationId: orgId,
				clinicId: targetClinicId,
				name: "Кресло 1",
				isActive: true,
			})
			.returning({ id: chairs.id });
		if (autoChair) {
			return autoChair.id;
		}
	}

	return undefined;
}

/**
 * Резолвит дефолтного активного врача клинической роли для создания записи.
 * Никакого тихого подбора случайного неактивного/неклинического пользователя (Мандат 8e/8n).
 */
export async function resolveDefaultDoctorForCreate(
	tx: DbClientOrTransaction = db,
	orgId: string,
): Promise<string | undefined> {
	const [firstActiveDoctor] = await tx
		.select({ id: users.id })
		.from(users)
		.where(
			and(
				eq(users.organizationId, orgId),
				eq(users.isActive, true),
				eq(users.role, "doctor"),
			),
		)
		.limit(1);
	if (firstActiveDoctor) {
		return firstActiveDoctor.id;
	}

	const [firstActiveClinicalLead] = await tx
		.select({ id: users.id })
		.from(users)
		.where(
			and(
				eq(users.organizationId, orgId),
				eq(users.isActive, true),
				inArray(users.role, ["head_doctor", "chief_doctor", "owner"]),
			),
		)
		.limit(1);
	if (firstActiveClinicalLead) {
		return firstActiveClinicalLead.id;
	}

	return undefined;
}

/**
 * Подготавливает тело запроса для создания записи с автозаполнением кресла и врача.
 */
export async function prepareCreateAppointmentRawBody(
	orgId: string,
	body: unknown,
	tx: DbClientOrTransaction = db,
	explicitTimeZone?: string | null,
): Promise<Record<string, unknown> | null> {
	const rawBody =
		body && typeof body === "object"
			? { ...(body as Record<string, unknown>) }
			: null;

	if (rawBody) {
		const zone =
			explicitTimeZone ||
			(await clinicTimeZone(orgId, tx)) ||
			DEFAULT_SCHEDULE_TIMEZONE;
		normalizeAppointmentFieldAliases(rawBody, zone);

		if (isMissingOrDefaultChairId(rawBody.chairId)) {
			const resolvedChairId = await resolveDefaultChairForCreate(tx, orgId);
			if (resolvedChairId) {
				rawBody.chairId = resolvedChairId;
			}
		}

		if (isMissingOrDefaultDoctorId(rawBody.doctorUserId)) {
			const resolvedDoctorId = await resolveDefaultDoctorForCreate(tx, orgId);
			if (resolvedDoctorId) {
				rawBody.doctorUserId = resolvedDoctorId;
			}
		}
	}

	return rawBody;
}

/**
 * Подготавливает тело запроса для обновления записи.
 */
export async function prepareUpdateAppointmentRawBody(
	orgId: string,
	body: unknown,
	tx: DbClientOrTransaction = db,
	explicitTimeZone?: string | null,
): Promise<Record<string, unknown> | null> {
	const rawBody =
		body && typeof body === "object"
			? { ...(body as Record<string, unknown>) }
			: null;

	if (rawBody) {
		const zone =
			explicitTimeZone ||
			(await clinicTimeZone(orgId, tx)) ||
			DEFAULT_SCHEDULE_TIMEZONE;
		normalizeAppointmentFieldAliases(rawBody, zone);

		if (
			rawBody.chairId !== undefined &&
			isMissingOrDefaultChairId(rawBody.chairId)
		) {
			const resolvedChairId = await resolveDefaultChairForCreate(tx, orgId);
			if (resolvedChairId) {
				rawBody.chairId = resolvedChairId;
			} else {
				delete rawBody.chairId;
			}
		}

		if (
			rawBody.doctorUserId !== undefined &&
			isMissingOrDefaultDoctorId(rawBody.doctorUserId)
		) {
			const resolvedDoctorId = await resolveDefaultDoctorForCreate(tx, orgId);
			if (resolvedDoctorId) {
				rawBody.doctorUserId = resolvedDoctorId;
			} else {
				delete rawBody.doctorUserId;
			}
		}
	}

	return rawBody;
}
