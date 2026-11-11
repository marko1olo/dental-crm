import { and, eq, gt, inArray, lt, ne, or, type SQL } from "drizzle-orm";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";
import { db } from "../client.js";
import * as schema from "../schema.js";

export type DbClientOrTransaction =
	| typeof db
	| Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Пессимистично блокирует строки ресурсов приёма до проверки занятости.
 *
 * Проверка «свободно ли время» и вставка — два разных запроса. Между ними
 * другая транзакция успевает вставить свою запись, и оба вызова видят слот
 * свободным: кресло оказывается занято дважды.
 *
 * Блокируем строки кресла, врача и пациента: две транзакции, претендующие
 * на общий ресурс, выстраиваются в очередь, и вторая уже видит запись
 * первой. Порядок блокировок фиксированный — кресло, врач, пациент, — иначе
 * встречные вызовы могут заклиниться друг о друга.
 */
export async function lockAppointmentResources(
	executor: DbClientOrTransaction,
	organizationId: string,
	resources: {
		chairId?: string | null | undefined;
		chairIds?: (string | null | undefined)[];
		doctorUserId?: string | null | undefined;
		assistantUserId?: string | null | undefined;
		userIds?: (string | null | undefined)[];
		patientId?: string | null | undefined;
		patientIds?: (string | null | undefined)[];
	},
) {
	// Level 1: Кресла (сортировка по UUID исключает deadlock)
	const rawChairIds = [...(resources.chairIds ?? []), resources.chairId];
	const chairIdsToLock = Array.from(
		new Set(
			rawChairIds.filter(
				(id): id is string => typeof id === "string" && id.trim().length > 0,
			),
		),
	).sort();

	if (chairIdsToLock.length > 0) {
		await executor
			.select({ id: schema.chairs.id })
			.from(schema.chairs)
			.where(
				and(
					eq(schema.chairs.organizationId, organizationId),
					inArray(schema.chairs.id, chairIdsToLock),
				),
			)
			.orderBy(schema.chairs.id)
			.for("update");
	}

	// Level 2: Сотрудники (врачи + ассистенты, дедуплицированы и отсортированы по UUID)
	const rawUserIds = [
		...(resources.userIds ?? []),
		resources.doctorUserId,
		resources.assistantUserId,
	];
	const userIdsToLock = Array.from(
		new Set(
			rawUserIds.filter(
				(id): id is string => typeof id === "string" && id.trim().length > 0,
			),
		),
	).sort();

	if (userIdsToLock.length > 0) {
		await executor
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(
				and(
					eq(schema.users.organizationId, organizationId),
					inArray(schema.users.id, userIdsToLock),
				),
			)
			.orderBy(schema.users.id)
			.for("update");
	}

	// Level 3: Пациенты (сортировка по UUID)
	const rawPatientIds = [...(resources.patientIds ?? []), resources.patientId];
	const patientIdsToLock = Array.from(
		new Set(
			rawPatientIds.filter(
				(id): id is string => typeof id === "string" && id.trim().length > 0,
			),
		),
	).sort();

	if (patientIdsToLock.length > 0) {
		await executor
			.select({ id: schema.patients.id })
			.from(schema.patients)
			.where(
				and(
					eq(schema.patients.organizationId, organizationId),
					inArray(schema.patients.id, patientIdsToLock),
				),
			)
			.orderBy(schema.patients.id)
			.for("update");
	}
}

export const acquireHierarchyLocks = lockAppointmentResources;

/**
 * Ищет приём, который пересекается по времени с кандидатом по любому из
 * ресурсов (кресло, врач, ассистент, пациент), и бросает ошибку с указанием
 * конкретного виновника.
 */
export async function assertNoResourceOverlap(
	executor: DbClientOrTransaction,
	organizationId: string,
	candidate: {
		startsAt: Date;
		endsAt: Date;
		chairId?: string | null | undefined;
		doctorUserId?: string | null | undefined;
		assistantUserId?: string | null | undefined;
		patientId?: string | null | undefined;
		excludeAppointmentId?: string | undefined;
	},
) {
	const conditions: SQL[] = [
		eq(schema.appointments.organizationId, organizationId),
		ne(schema.appointments.status, "cancelled"),
		ne(schema.appointments.status, "no_show"),
		lt(schema.appointments.startsAt, candidate.endsAt),
		gt(schema.appointments.endsAt, candidate.startsAt),
	];
	if (candidate.excludeAppointmentId) {
		conditions.push(ne(schema.appointments.id, candidate.excludeAppointmentId));
	}

	const matchConditions: SQL[] = [];
	if (candidate.chairId)
		matchConditions.push(eq(schema.appointments.chairId, candidate.chairId));
	if (candidate.doctorUserId)
		matchConditions.push(
			eq(schema.appointments.doctorUserId, candidate.doctorUserId),
		);
	if (candidate.assistantUserId)
		matchConditions.push(
			eq(schema.appointments.assistantUserId, candidate.assistantUserId),
		);
	if (candidate.patientId)
		matchConditions.push(
			eq(schema.appointments.patientId, candidate.patientId),
		);
	if (matchConditions.length === 0) return;

	const overlapping = await executor
		.select()
		.from(schema.appointments)
		.where(and(...conditions, or(...matchConditions)))
		.limit(1);

	const ov = overlapping[0];
	if (!ov) return;

	let existingPatientName = "Пациент";
	if (ov.patientId) {
		const [p] = await executor
			.select({ fullName: schema.patients.fullName })
			.from(schema.patients)
			.where(eq(schema.patients.id, ov.patientId))
			.limit(1);
		if (p?.fullName) existingPatientName = p.fullName;
	}

	// Порядок сообщений — от самого понятного администратору: пациент важнее
	// врача, врач важнее ассистента, ассистент важнее кресла.
	if (candidate.patientId && ov.patientId === candidate.patientId) {
		throw new Error("У пациента уже есть запись в это время");
	}
	if (candidate.doctorUserId && ov.doctorUserId === candidate.doctorUserId) {
		throw new Error("У врача уже есть запись в это время");
	}
	if (
		candidate.assistantUserId &&
		ov.assistantUserId === candidate.assistantUserId
	) {
		throw new Error("У ассистента уже есть запись в это время");
	}
	throw new Error("Кресло уже занято другой записью в это время");
}

/**
 * ПАЦИЕНТ, ВРАЧ И КРЕСЛО ОБЯЗАНЫ ПРИНАДЛЕЖАТЬ ЭТОЙ КЛИНИКЕ.
 */
export async function assertAppointmentResourcesBelongToOrganization(
	executor: DbClientOrTransaction,
	organizationId: string,
	input: {
		patientId?: string | null | undefined;
		doctorUserId?: string | null | undefined;
		assistantUserId?: string | null | undefined;
		chairId?: string | null | undefined;
	},
): Promise<void> {
	if (input.patientId) {
		const [patient] = await executor
			.select({ id: schema.patients.id })
			.from(schema.patients)
			.where(
				and(
					eq(schema.patients.id, input.patientId),
					eq(schema.patients.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!patient) {
			throw new Error(
				"Пациент не относится к вашей клинике, приём не записан. Обновите список пациентов и выберите карту из своей клиники.",
			);
		}
	}

	if (input.doctorUserId) {
		const [doctor] = await executor
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(
				and(
					eq(schema.users.id, input.doctorUserId),
					eq(schema.users.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!doctor) {
			throw new Error(
				"Врач не относится к вашей клинике, приём не записан. Обновите список сотрудников и выберите врача своей клиники.",
			);
		}
	}

	if (input.assistantUserId) {
		const [assistant] = await executor
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(
				and(
					eq(schema.users.id, input.assistantUserId),
					eq(schema.users.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!assistant) {
			throw new Error(
				"Ассистент не относится к вашей клинике, приём не записан. Обновите список сотрудников и выберите ассистента своей клиники.",
			);
		}
	}

	if (input.chairId) {
		const [chair] = await executor
			.select({ id: schema.chairs.id })
			.from(schema.chairs)
			.where(
				and(
					eq(schema.chairs.id, input.chairId),
					eq(schema.chairs.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!chair) {
			throw new Error(
				"Кресло не относится к вашей клинике, приём не записан. Обновите список кресел и выберите кресло своей клиники.",
			);
		}
	}
}
