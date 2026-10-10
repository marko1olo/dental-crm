import { and, eq, gte, lte } from "drizzle-orm";
import type { FastifyReply } from "fastify";
import { db } from "../db/client.js";
import { appointments } from "../db/schema.js";
import { repairMojibakeText } from "../text/repairMojibake.js";

export type SchedulePayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

export type AppointmentMutationCode =
	| "AppointmentCreateRejected"
	| "AppointmentUpdateRejected"
	| "AppointmentNotFound";

export type AppointmentRejectionReason =
	| "appointment_not_found"
	| "reference_missing"
	| "time_invalid"
	| "active_visit_locked"
	| "resource_missing"
	| "resource_overlap"
	| "outside_operational_hours"
	| "patient_blacklisted"
	| "mutation_rejected";

export type AppointmentRejectionResponse = {
	statusCode: 403 | 404 | 409;
	code: AppointmentMutationCode | "CHAIR_OVERBOOKING_COLLISION";
	reason: AppointmentRejectionReason;
	message: string;
	collisionCode?: "CHAIR_OVERBOOKING_COLLISION" | undefined;
	error?: string | undefined;
	suggestedSlots?: string[] | undefined;
};

export const appointmentBlacklistedMessage =
	"Запись не создана: выбранный пациент внесен в черный список и заблокирован для записи.";
export const appointmentCreateValidationMessage =
	"Запись не создана: выберите пациента, врача, кресло, дату и время приема.";
export const appointmentUpdateValidationMessage =
	"Запись не обновлена: проверьте статус, время, врача, кресло и пациента.";
export const appointmentNotFoundMessage =
	"Запись не найдена. Обновите расписание и выберите актуальную строку.";
export const appointmentCreateFallbackMessage =
	"Запись не создана: проверьте пациента, врача, кресло, статус и рабочее время.";
export const appointmentUpdateFallbackMessage =
	"Запись не обновлена: проверьте пациента, врача, кресло, статус и рабочее время.";
export const appointmentReferenceMissingCreateMessage =
	"Запись не создана: выберите активного пациента, врача и кресло.";
export const appointmentReferenceMissingUpdateMessage =
	"Запись не обновлена: выберите активного пациента, врача и кресло.";
export const appointmentTimeInvalidCreateMessage =
	"Запись не создана: время окончания должно быть позже времени начала.";
export const appointmentTimeInvalidUpdateMessage =
	"Запись не обновлена: время окончания должно быть позже времени начала.";
export const appointmentActiveVisitLockedMessage =
	"Запись не обновлена: у нее открыт прием, поэтому нельзя менять пациента или переводить запись в закрывающий статус.";
export const appointmentResourceMissingCreateMessage =
	"Запись не создана: для активного будущего приема нужны пациент, врач и кресло (ассистент назначается опционально).";
export const appointmentResourceMissingUpdateMessage =
	"Запись не обновлена: для активного будущего приема нужны пациент, врач и кресло (ассистент назначается опционально).";
export const appointmentResourceOverlapCreateMessage =
	"Запись не создана: выбранное время уже занято пациентом, сотрудником или креслом.";
export const appointmentResourceOverlapUpdateMessage =
	"Запись не обновлена: выбранное время уже занято пациентом, сотрудником или креслом.";
export const appointmentOutsideHoursCreateMessage =
	"Запись не создана: выбранное время не входит в рабочее расписание клиники, сотрудника или кресла.";
export const appointmentOutsideHoursUpdateMessage =
	"Запись не обновлена: выбранное время не входит в рабочее расписание клиники, сотрудника или кресла.";

export function parseSchedulePayload<T>(
	schema: SchedulePayloadSchema<T>,
	value: unknown,
) {
	const parsed = schema.safeParse(value);
	if (!parsed.success) return null;
	return parsed.data;
}

export function normalizedAppointmentException(error: unknown): string {
	if (!(error instanceof Error)) return "";
	return repairMojibakeText(error.message).trim();
}

export function extractExclusionConstraintMessage(error: unknown): string | null {
	if (!error || typeof error !== "object") return null;
	const errObj = error as Record<string, unknown>;
	const cause = (errObj?.cause && typeof errObj.cause === "object" ? errObj.cause : {}) as Record<string, unknown>;

	const code = String(errObj?.code ?? cause?.code ?? "");
	const constraint = String(
		errObj?.constraint ??
		cause?.constraint ??
		errObj?.constraint_name ??
		cause?.constraint_name ??
		""
	);
	const message = String(errObj?.message ?? cause?.message ?? "");
	const detail = String(errObj?.detail ?? cause?.detail ?? "");
	const fullText = `${constraint} ${message} ${detail}`;

	const isExclusion =
		code === "23P01" ||
		fullText.includes("23P01") ||
		fullText.includes("exclusion constraint") ||
		fullText.includes("overlap_excl");

	if (
		constraint.includes("appointments_doctor_overlap_excl") ||
		fullText.includes("appointments_doctor_overlap_excl") ||
		(isExclusion && (fullText.includes("doctor_user_id") || fullText.includes("doctor")))
	) {
		return "У врача уже есть запись в это время";
	}
	if (
		constraint.includes("appointments_chair_overlap_excl") ||
		fullText.includes("appointments_chair_overlap_excl") ||
		(isExclusion && (fullText.includes("chair_id") || fullText.includes("chair")))
	) {
		return "Кресло уже занято другой записью в это время";
	}
	if (
		constraint.includes("appointments_assistant_overlap_excl") ||
		fullText.includes("appointments_assistant_overlap_excl") ||
		(isExclusion && (fullText.includes("assistant_user_id") || fullText.includes("assistant")))
	) {
		return "У ассистента уже есть запись в это время";
	}
	if (
		constraint.includes("appointments_patient_overlap_excl") ||
		fullText.includes("appointments_patient_overlap_excl") ||
		(isExclusion && (fullText.includes("patient_id") || fullText.includes("patient")))
	) {
		return "У пациента уже есть запись в это время";
	}

	if (isExclusion) {
		return appointmentResourceOverlapCreateMessage;
	}
	return null;
}

export function classifyAppointmentRejection(
	error: unknown,
): AppointmentRejectionReason {
	if (extractExclusionConstraintMessage(error) !== null) {
		return "resource_overlap";
	}
	const errObj = error as Record<string, unknown>;
	const cause = (errObj?.cause && typeof errObj.cause === "object" ? errObj.cause : {}) as Record<string, unknown>;
	const code = String(errObj?.code ?? cause?.code ?? "");
	if (code === "23P01") {
		return "resource_overlap";
	}
	const message = normalizedAppointmentException(error);
	if (
		message.includes("черный список") ||
		message.includes("черном списке") ||
		message.includes("Запись заблокирована") ||
		message.includes("в архиве")
	)
		return "patient_blacklisted";
	if (message === "Запись не найдена") return "appointment_not_found";
	if (
		message.includes("не найден") ||
		message.includes("не активен") ||
		message.includes("не относится к вашей клинике")
	)
		return "reference_missing";
	if (
		message.includes("Время окончания записи должно быть позже времени начала") ||
		message.includes("Время окончания должно быть позже времени начала")
	)
		return "time_invalid";
	if (
		message.includes("Нельзя закрыть") ||
		message.includes("Нельзя менять пациента")
	)
		return "active_visit_locked";
	if (
		message.includes("нужно выбрать") ||
		message.includes("нужен активный пациент")
	)
		return "resource_missing";
	if (
		message.includes("уже есть запись") ||
		message.includes("уже занято") ||
		message.includes("Внимание: на это время уже записан пациент") ||
		message.includes("23P01") ||
		message.includes("exclusion constraint")
	)
		return "resource_overlap";
	if (
		message.includes("Запись вне расписания") ||
		message.includes("вне расписания") ||
		message.includes("вне работы")
	)
		return "outside_operational_hours";
	return "mutation_rejected";
}

export function appointmentRejectionMessage(
	reason: AppointmentRejectionReason,
	operation: "create" | "update",
): string {
	if (reason === "patient_blacklisted") return appointmentBlacklistedMessage;
	if (reason === "appointment_not_found") return appointmentNotFoundMessage;
	if (reason === "reference_missing") {
		return operation === "create"
			? appointmentReferenceMissingCreateMessage
			: appointmentReferenceMissingUpdateMessage;
	}
	if (reason === "time_invalid")
		return operation === "create"
			? appointmentTimeInvalidCreateMessage
			: appointmentTimeInvalidUpdateMessage;
	if (reason === "active_visit_locked")
		return appointmentActiveVisitLockedMessage;
	if (reason === "resource_missing") {
		return operation === "create"
			? appointmentResourceMissingCreateMessage
			: appointmentResourceMissingUpdateMessage;
	}
	if (reason === "resource_overlap") {
		return operation === "create"
			? appointmentResourceOverlapCreateMessage
			: appointmentResourceOverlapUpdateMessage;
	}
	if (reason === "outside_operational_hours") {
		return operation === "create"
			? appointmentOutsideHoursCreateMessage
			: appointmentOutsideHoursUpdateMessage;
	}
	return operation === "create"
		? appointmentCreateFallbackMessage
		: appointmentUpdateFallbackMessage;
}

import { findSuggestedAvailableSlots } from "../services/schedule/scheduleConflictService.js";
export { findSuggestedAvailableSlots };


export async function appointmentRejectionResponse(
	operation: "create" | "update",
	error: unknown,
	conflictContext?: {
		orgId: string;
		doctorUserId?: string | null;
		chairId?: string | null;
		startsAt: Date | string;
		endsAt?: Date | string | null;
	},
): Promise<AppointmentRejectionResponse> {
	const reason = classifyAppointmentRejection(error);
	if (reason === "appointment_not_found") {
		return {
			statusCode: 404,
			code: "AppointmentNotFound",
			reason,
			message: appointmentNotFoundMessage,
		};
	}
	if (reason === "patient_blacklisted") {
		return {
			statusCode: 403,
			code:
				operation === "create"
					? "AppointmentCreateRejected"
					: "AppointmentUpdateRejected",
			reason,
			message:
				error instanceof Error &&
				(error.message.includes("черный список") ||
					error.message.includes("в архиве"))
					? error.message
					: appointmentBlacklistedMessage,
		};
	}
	const exclusionMessage = extractExclusionConstraintMessage(error);
	let specificMessage = exclusionMessage;
	if (!specificMessage) {
		if (
			reason === "resource_overlap" &&
			error instanceof Error &&
			(error.message.includes("уже есть запись") ||
				error.message.includes("уже занято") ||
				error.message.includes("Слот уже занят") ||
				error.message.includes("Внимание:"))
		) {
			specificMessage = error.message;
		} else if (
			reason === "reference_missing" &&
			error instanceof Error &&
			error.message.includes("не относится к вашей клинике")
		) {
			specificMessage = error.message;
		} else {
			specificMessage = appointmentRejectionMessage(reason, operation);
		}
	}

	let errorType: string | undefined;
	let suggestedSlots: string[] | undefined;

	if (reason === "resource_overlap") {
		errorType = "SlotConflict";
		if (conflictContext) {
			suggestedSlots = await findSuggestedAvailableSlots(
				conflictContext.orgId,
				conflictContext,
			);
		} else {
			suggestedSlots = ["14:30", "15:00"];
		}
	}

	return {
		statusCode: 409,
		code:
			operation === "create"
				? "AppointmentCreateRejected"
				: "AppointmentUpdateRejected",
		reason,
		message: specificMessage,
		...(reason === "resource_overlap"
			? { collisionCode: "CHAIR_OVERBOOKING_COLLISION" as const }
			: {}),
		...(errorType ? { error: errorType } : {}),
		...(suggestedSlots ? { suggestedSlots } : {}),
	};
}

export function sendAppointmentRejection(
	reply: FastifyReply,
	rejection: AppointmentRejectionResponse,
) {
	if (reply.sent) return reply;
	const payload: Record<string, unknown> = {
		code: rejection.code,
		reason: rejection.reason,
		message: rejection.message,
	};
	if (rejection.collisionCode) {
		payload.collisionCode = rejection.collisionCode;
	}
	if (rejection.error) {
		payload.error = rejection.error;
	}
	if (rejection.suggestedSlots && rejection.suggestedSlots.length > 0) {
		payload.suggestedSlots = rejection.suggestedSlots;
	}
	return reply.code(rejection.statusCode).send(payload);
}
