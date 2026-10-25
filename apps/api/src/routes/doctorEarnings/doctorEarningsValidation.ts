/**
 * doctorEarningsValidation.ts — Валидация параметров запроса и RBAC-защита сдельной оплаты врача.
 * Mandate 8e (Doctor Autonomy & Financial Sovereignty) & Mandate 8b (strictly <= 120 lines).
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { getRequestIdentity, type RequestIdentity } from "../../security/identity.js";
import { getMyEarningsQuerySchema, type GetMyEarningsQuery } from "./types.js";

export interface ValidatedEarningsContext {
	readonly identity: RequestIdentity;
	readonly queryData: GetMyEarningsQuery;
	readonly targetDoctorId: string;
	readonly fromDate: Date;
	readonly toDate: Date;
	readonly dateParam?: string | undefined;
}

export function validateDoctorEarningsRequest(
	request: FastifyRequest,
	reply: FastifyReply,
): ValidatedEarningsContext | null {
	const parsedQuery = getMyEarningsQuerySchema.safeParse(request.query);
	if (!parsedQuery.success) {
		reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры запроса периода начислений",
			details: parsedQuery.error.format(),
		});
		return null;
	}

	const identity = getRequestIdentity(request);
	const requestedDoctorId = parsedQuery.data.doctorId?.trim();

	if (identity.role === "doctor" && identity.userId) {
		if (requestedDoctorId && requestedDoctorId !== identity.userId) {
			reply.code(403).send({
				error: "DoctorForbiddenError",
				message:
					"Доступ запрещен: лечащий врач имеет право просматривать исключительно собственные начисления сдельной оплаты",
			});
			return null;
		}
	}

	const targetDoctorId =
		identity.role === "doctor" && identity.userId
			? identity.userId
			: requestedDoctorId || identity.userId || "doc-1";

	let fromDate: Date;
	let toDate: Date;
	const dateParam = parsedQuery.data.date;

	if (dateParam) {
		fromDate = new Date(`${dateParam}T00:00:00.000Z`);
		toDate = new Date(`${dateParam}T23:59:59.999Z`);
	} else if (parsedQuery.data.from && parsedQuery.data.to) {
		fromDate = new Date(parsedQuery.data.from);
		toDate = new Date(parsedQuery.data.to);
	} else if (parsedQuery.data.from) {
		fromDate = new Date(parsedQuery.data.from);
		toDate = new Date(fromDate.getTime() + 24 * 3600 * 1000 - 1);
	} else {
		const todayStr = new Date().toISOString().split("T")[0]!;
		fromDate = new Date(`${todayStr}T00:00:00.000Z`);
		toDate = new Date(`${todayStr}T23:59:59.999Z`);
	}

	if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
		reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный формат даты периода (ожидается ISO или YYYY-MM-DD)",
		});
		return null;
	}

	return {
		identity,
		queryData: parsedQuery.data,
		targetDoctorId,
		fromDate,
		toDate,
		dateParam,
	};
}
