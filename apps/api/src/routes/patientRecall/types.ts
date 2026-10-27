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

export const listQuerySchema = z.object({
	minMonths: z.coerce.number().int().min(1).max(60).optional(),
	limit: z.coerce.number().int().min(1).max(1000).optional(),
	band: recallBandSchema.optional(),
	filterBand: recallBandSchema.optional(),
	includeNeverArrived: z
		.enum(["true", "false"])
		.optional()
		.transform((value) => (value === undefined ? undefined : value === "true")),
});

export const inviteSchema = recallInviteSchema;

export const statusUpdateSchema = z.object({
	status: z.string().min(1).max(50),
	channel: z.string().max(30).optional(),
	note: z.string().max(1000).optional(),
});

export function badRequest(reply: FastifyReply, message: string) {
	return replyBadRequest(reply, "RecallValidationError", message);
}
