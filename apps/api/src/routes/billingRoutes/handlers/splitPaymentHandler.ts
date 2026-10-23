import {
	type CreatePaymentInput,
	createPaymentSchema,
} from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { handleCreatePayment } from "./paymentCreateHandler.js";

/**
 * Combined / Split Payment Handler (Cash + Card + SBP + Advance deposit).
 * Non-blocking 1-click execution under Mandates 8e & 8n.
 */
export async function handleSplitPayment(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const body = (request.body as Record<string, unknown>) || {};
	const cashKopecks = Math.max(0, Math.round(Number(body.cashKopecks || 0)));
	const cardKopecks = Math.max(0, Math.round(Number(body.electronicCardKopecks || body.cardKopecks || 0)));
	const sbpKopecks = Math.max(0, Math.round(Number(body.sbpKopecks || 0)));
	const advanceKopecks = Math.max(0, Math.round(Number(body.prepaidKopecks || body.advanceKopecks || 0)));

	const totalKopecks = cashKopecks + cardKopecks + sbpKopecks + advanceKopecks;
	const totalRub = Number((totalKopecks / 100).toFixed(2));

	request.body = {
		...body,
		method: "split",
		amountRub: totalRub,
		splitDetails: {
			cashKopecks,
			cardKopecks,
			sbpKopecks,
			advanceKopecks,
			totalKopecks,
		},
	};

	return handleCreatePayment(request, reply);
}
