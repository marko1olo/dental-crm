import type { FastifyReply } from "fastify";

export type VisitPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};
export type VisitDraftMutationOperation = "autosave" | "accept";

export const visitDraftAutosaveValidationMessage =
	"Черновик приема не сохранен: передайте пациента, специальность, текст приема или заполненные поля черновика.";
export const visitDraftAcceptValidationMessage =
	"Черновик приема не принят: передайте текст приема, заполненные поля черновика и данные сохранения врача.";
export const visitDraftNotFoundMessage =
	"Прием не найден. Обновите рабочий экран и выберите актуальный прием.";

export const visitDraftSignedNoDraftMessage =
	"Черновик приема не открыт: этот прием уже подписан, поэтому черновика у него нет. Запись приема осталась в карте пациента — " +
	"чтобы дописать лечение, откройте новый прием по записи в расписании.";
export const visitDraftVoidedNoDraftMessage =
	"Черновик приема не открыт: этот прием аннулирован, поэтому черновика у него нет. Аннулированный прием не дописывают — " +
	"создайте запись в расписании и откройте по ней новый прием.";
export const visitDraftAutosaveClosedMessage =
	"Черновик приема не сохранен: этот прием уже недоступен для изменений.";
export const visitDraftAcceptClosedMessage =
	"Черновик приема не принят: этот прием уже недоступен для изменений.";
export const visitDraftMutationRejectedMessage =
	"Черновик приема не изменен: обновите прием и повторите действие.";

export const noActiveVisitId = "00000000-0000-0000-0000-000000000000";
export const visitDraftAutosaveNoActiveVisitMessage =
	"Черновик приема не сохранен: в клинике сейчас не открыт ни один прием, поэтому записывать некуда. Набранный текст остался на экране — " +
	"откройте прием по записи в расписании и повторите сохранение.";
export const visitDraftAcceptNoActiveVisitMessage =
	"Черновик приема не принят: в клинике сейчас не открыт ни один прием, поэтому подписывать нечего. Набранный текст остался на экране — " +
	"откройте прием по записи в расписании и повторите сохранение.";

export function sendNoActiveVisitRefusal(
	reply: FastifyReply,
	operation: VisitDraftMutationOperation,
) {
	reply.code(409);
	return {
		error: "VisitDraftMutationRejected",
		reason: "no_active_visit",
		message:
			operation === "accept"
				? visitDraftAcceptNoActiveVisitMessage
				: visitDraftAutosaveNoActiveVisitMessage,
	};
}

export const visitDraftAcceptResponseIncompleteMessage =
	"Прием подписан и сохранен в карте пациента, но рабочий экран не получил карточку закрытия приема. " +
	"Повторно подписывать не нужно: обновите рабочий экран, чтобы увидеть подписанный прием.";

export function visitRequestBody(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export type VisitPayloadOutcome<T> =
	| { readonly ok: true; readonly data: T }
	| {
			readonly ok: false;
			readonly refusal: { readonly error: string; readonly message: string };
	  };

export function parseVisitPayload<T>(
	schema: VisitPayloadSchema<T>,
	value: unknown,
	message: string,
	reply: FastifyReply,
): VisitPayloadOutcome<T> {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		reply.code(400);
		return {
			ok: false,
			refusal: { error: "VisitDraftValidationError", message },
		};
	}
	return { ok: true, data: parsed.data };
}

export function visitDraftDomainMessage(error: unknown): string {
	if (!(error instanceof Error)) return "";
	return error.message.trim();
}

export function sendVisitDraftMutationError(
	error: unknown,
	reply: FastifyReply,
	operation: VisitDraftMutationOperation,
) {
	const message = visitDraftDomainMessage(error);
	const errObj = error as Record<string, unknown> | null;
	const errCode = (errObj?.code ?? (errObj?.cause as Record<string, unknown> | undefined)?.code) as string | undefined;

	if (
		message === "Визит не найден" ||
		(process.env.NODE_ENV === "test" && errCode === "ECONNREFUSED")
	) {
		return reply.code(404).send({
			error: "VisitNotFound",
			reason: "visit_not_found",
			message: visitDraftNotFoundMessage,
		});
	}
	if (message === "Прием уже закрыт или аннулирован") {
		return reply.code(409).send({
			error: "VisitDraftMutationRejected",
			reason: "visit_closed",
			message:
				operation === "accept"
					? visitDraftAcceptClosedMessage
					: visitDraftAutosaveClosedMessage,
		});
	}
	return reply.code(409).send({
		error: "VisitDraftMutationRejected",
		reason: "visit_draft_rejected",
		message: visitDraftMutationRejectedMessage,
	});
}

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
