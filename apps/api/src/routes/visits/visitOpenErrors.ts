import type { FastifyReply } from "fastify";

export const visitOpenAppointmentNotFoundMessage =
	"Прием не открыт: запись не найдена в этой клинике. Обновите расписание и выберите актуальную строку.";
export const visitOpenPatientMissingMessage =
	"Прием не открыт: в записи не указан пациент. Откройте запись в расписании, выберите пациента и повторите.";
export const visitOpenAppointmentClosedMessage =
	"Прием не открыт: запись отменена или отмечена как неявка. Создайте новую запись в расписании.";
export const visitOpenFailedMessage =
	"Прием не открыт: повторите действие, а если не поможет — обновите рабочий экран.";

export function sendVisitOpenError(error: unknown, reply: FastifyReply) {
	const message = error instanceof Error ? error.message : "";
	if (message === "Запись не найдена") {
		return reply.code(404).send({
			error: "AppointmentNotFound",
			reason: "appointment_not_found",
			message: visitOpenAppointmentNotFoundMessage,
		});
	}
	if (
		message === "У записи нет пациента" ||
		message === "В записи не указан пациент"
	) {
		return reply.code(409).send({
			error: "AppointmentWithoutPatient",
			reason: "appointment_without_patient",
			message: visitOpenPatientMissingMessage,
		});
	}
	if (
		message === "Запись отменена" ||
		message === "Пациент не явился на прием"
	) {
		return reply.code(409).send({
			error: "AppointmentClosed",
			reason: "appointment_closed",
			message: visitOpenAppointmentClosedMessage,
		});
	}
	return reply.code(409).send({
		error: "VisitOpenRejected",
		reason: "visit_open_rejected",
		message: visitOpenFailedMessage,
	});
}
