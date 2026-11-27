import type { FastifyReply } from "fastify";
import { z } from "zod";
import {
	recallBandSchema,
	recallCandidateSchema,
	recallReportSchema,
	recallInviteSchema,
	recallInviteResultSchema,
	type RecallBand,
	type RecallReport,
	type RecallInviteRequest,
	type RecallInviteResponse,
} from "@dental/shared/recalls";
import { replyBadRequest } from "../routeErrors.js";

export {
	recallBandSchema,
	recallCandidateSchema,
	recallReportSchema,
	recallInviteSchema,
	recallInviteResultSchema,
	type RecallBand,
	type RecallReport,
	type RecallInviteRequest,
	type RecallInviteResponse,
};

export const listQuerySchema = z
	.object({
		minMonths: z.coerce.number().int().min(0).max(60).optional(),
		minDays: z.coerce.number().int().min(0).max(1800).optional(),
		limit: z.coerce.number().int().min(1).max(1000).optional(),
		band: recallBandSchema.optional(),
		filterBand: recallBandSchema.optional(),
		includeNeverArrived: z
			.enum(["true", "false"])
			.optional()
			.transform((value) => (value === undefined ? undefined : value === "true")),
	})
	.strict();

export const inviteSchema = recallInviteSchema;

export const recallStatusParamsSchema = z
	.object({
		patientId: z.string().uuid("Некорректный идентификатор пациента."),
	})
	.strict();

export const recallStatusEnum = z.enum([
	"due_now",
	"invited",
	"contacted",
	"scheduled",
	"declined",
	"completed",
	"reached",
	"confirmed",
	"cancelled",
	"no_answer",
	"failed",
	"pending",
	"not_called",
	"snoozed",
	"needs_review",
	"sent",
]);

export const statusUpdateSchema = z
	.object({
		status: z
			.string()
			.trim()
			.min(1)
			.max(50)
			.refine(
				(val) => recallStatusEnum.safeParse(val.toLowerCase()).success,
				"Недопустимый статус профосмотра пациента.",
			),
		channel: z.string().max(30).optional(),
		note: z.string().max(1000).optional(),
	})
	.strict();

export function badRequest(reply: FastifyReply, message: string) {
	return replyBadRequest(reply, "RecallValidationError", message);
}
