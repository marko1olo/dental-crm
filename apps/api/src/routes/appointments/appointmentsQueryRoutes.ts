import { and, asc, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { getAppointmentByIdInDb } from "../../db/appointmentsQuery.js";
import { db } from "../../db/client.js";
import { appointments, chairs, patients, users } from "../../db/schema.js";
import { APPOINTMENT_ID_UUID_PATTERN } from "./appointmentsSchemas.js";

// Ре-экспорт вспомогательных резолверов и подготовителей тела запроса
export {
	prepareCreateAppointmentRawBody,
	prepareUpdateAppointmentRawBody,
	resolveDefaultChairForCreate,
	resolveDefaultDoctorForCreate,
} from "./queries/appointmentDefaults.js";

// Ре-экспорт сводки дашборда и каналов интеркома
export {
	buildDashboardResponseAfterUpdate,
	fetchArrivalAppointmentMeta,
	fetchDashboardAfterNextStage,
	fetchTargetIntercomChannels,
	sendDashboardResponseAfterCreate,
} from "./queries/appointmentDashboardQueries.js";

/**
 * Обработчик получения списка записей расписания с фильтрацией по дате/периоду/врачу/пациенту.
 */
export async function handleGetAppointments(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"get appointments",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const query = request.query as Record<string, string | undefined> | undefined;
	const period = query?.period;
	const doctorId = query?.doctorId;
	const date = query?.date;
	const patientId = query?.patientId;

	const conditions = [eq(appointments.organizationId, orgId)];
	if (doctorId) {
		conditions.push(eq(appointments.doctorUserId, doctorId));
	}
	if (patientId) {
		conditions.push(eq(appointments.patientId, patientId));
	}
	if (date) {
		const dayStart = new Date(`${date}T00:00:00.000Z`);
		const dayEnd = new Date(`${date}T23:59:59.999Z`);
		conditions.push(
			sql`${appointments.startsAt} >= ${dayStart} AND ${appointments.startsAt} <= ${dayEnd}`,
		);
	} else if (period) {
		const now = new Date();
		let dateThreshold: Date | undefined;
		if (period === "day") {
			dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		} else if (period === "week") {
			dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		} else if (period === "month") {
			dateThreshold = new Date(now.getFullYear(), now.getMonth(), 1);
		} else if (period === "quarter") {
			const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
			dateThreshold = new Date(now.getFullYear(), currentQuarterMonth, 1);
		} else if (period === "year") {
			dateThreshold = new Date(now.getFullYear(), 0, 1);
		}
		if (dateThreshold) {
			conditions.push(sql`${appointments.startsAt} >= ${dateThreshold}`);
		}
	}

	const cardNumSql = sql<string>`coalesce(
		${patients.administrativeProfile}->>'cardNumber',
		${patients.administrativeProfile}->>'chartNumber',
		${patients.administrativeProfile}->>'medicalCardNumber',
		'К-' || substring(${appointments.id}::text, 1, 8)
	)`;

	const rows = await db
		.select({
			appointment: appointments,
			patientFullName: patients.fullName,
			patientPhone: patients.phone,
			patientBirthDate: patients.birthDate,
			cardNumber: cardNumSql,
			chairName: chairs.name,
			doctorFullName: users.fullName,
		})
		.from(appointments)
		.leftJoin(
			patients,
			and(
				eq(patients.id, appointments.patientId),
				eq(patients.organizationId, orgId),
			),
		)
		.leftJoin(
			chairs,
			and(
				eq(chairs.id, appointments.chairId),
				eq(chairs.organizationId, orgId),
			),
		)
		.leftJoin(
			users,
			and(
				eq(users.id, appointments.doctorUserId),
				eq(users.organizationId, orgId),
			),
		)
		.where(and(...conditions))
		.orderBy(asc(appointments.startsAt))
		.limit(1000);

	const formatted = rows.map((r) => ({
		id: r.appointment.id,
		patientId: r.appointment.patientId,
		patientFullName: r.patientFullName ?? undefined,
		patientName: r.patientFullName ?? undefined,
		patientPhone: r.patientPhone ?? undefined,
		patientBirthDate: r.patientBirthDate ?? undefined,
		cardNumber: r.cardNumber ?? undefined,
		chairId: r.appointment.chairId,
		chairName: r.chairName ?? undefined,
		doctorId: r.appointment.doctorUserId,
		doctorUserId: r.appointment.doctorUserId,
		doctorFullName: r.doctorFullName ?? undefined,
		doctorName: r.doctorFullName ?? undefined,
		startsAt: r.appointment.startsAt.toISOString(),
		endsAt: r.appointment.endsAt.toISOString(),
		status: r.appointment.status,
		reason: r.appointment.reason,
		comment: r.appointment.comment,
		stageIndex: r.appointment.stageIndex,
		clinicalStage: r.appointment.clinicalStage,
		toothNumber: r.appointment.toothNumber,
		diagnosisMkb10: r.appointment.diagnosisMkb10,
	}));

	return reply.send({
		success: true,
		data: formatted,
		appointments: formatted,
	});
}

/**
 * Обработчик получения одиночной записи по идентификатору.
 */
export async function handleGetAppointmentById(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"get appointment by id",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const { appointmentId, id } = request.params as {
		appointmentId?: string;
		id?: string;
	};
	const targetId = appointmentId || id;
	if (!targetId || !APPOINTMENT_ID_UUID_PATTERN.test(targetId)) {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: "Не указан ID приёма",
		});
	}

	const appt = await getAppointmentByIdInDb(orgId, targetId);
	if (!appt) {
		return reply.code(404).send({
			code: "AppointmentNotFound",
			message: "Приём не найден",
		});
	}

	return reply.send({
		success: true,
		appointment: {
			...appt,
			startsAt:
				appt.startsAt instanceof Date
					? appt.startsAt.toISOString()
					: new Date(appt.startsAt).toISOString(),
			endsAt:
				appt.endsAt instanceof Date
					? appt.endsAt.toISOString()
					: new Date(appt.endsAt).toISOString(),
		},
	});
}
