import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { chairs, clinics, users } from "../../../db/schema.js";
import {
	isMissingOrDefaultChairId,
	isMissingOrDefaultDoctorId,
	normalizeAppointmentFieldAliases,
} from "../appointmentsHelpers.js";
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
 * Резолвит дефолтного врача для создания записи (первый активный врач или администратор/владелец).
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

	const [anyDoctor] = await tx
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.organizationId, orgId), eq(users.role, "doctor")))
		.limit(1);
	if (anyDoctor) {
		return anyDoctor.id;
	}

	const [firstActiveOwnerOrAdmin] = await tx
		.select({ id: users.id })
		.from(users)
		.where(
			and(
				eq(users.organizationId, orgId),
				eq(users.isActive, true),
				inArray(users.role, ["owner", "admin"]),
			),
		)
		.limit(1);
	if (firstActiveOwnerOrAdmin) {
		return firstActiveOwnerOrAdmin.id;
	}

	const [anyOrgUser] = await tx
		.select({ id: users.id })
		.from(users)
		.where(eq(users.organizationId, orgId))
		.limit(1);
	if (anyOrgUser) {
		return anyOrgUser.id;
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
): Promise<Record<string, unknown> | null> {
	const rawBody =
		body && typeof body === "object"
			? { ...(body as Record<string, unknown>) }
			: null;

	if (rawBody) {
		normalizeAppointmentFieldAliases(rawBody);

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
): Promise<Record<string, unknown> | null> {
	const rawBody =
		body && typeof body === "object"
			? { ...(body as Record<string, unknown>) }
			: null;

	if (rawBody) {
		normalizeAppointmentFieldAliases(rawBody);

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
