import { z } from "zod";

/**
 * Zod validation schema for POST /api/sberbank/pay request body.
 * Supports amountKopecks (canonical) and amount (legacy alias) per Mandate 8bm.
 */
export const sberbankPayBodySchema = z.preprocess(
	(val) => {
		if (val && typeof val === "object") {
			const obj = { ...(val as Record<string, unknown>) };
			if (obj.amountKopecks === undefined && obj.amount !== undefined) {
				obj.amountKopecks = obj.amount;
			}
			return obj;
		}
		return val;
	},
	z.object({
		patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID"),
		amountKopecks: z.number().int().positive("Сумма должна быть положительным целым числом копеек"),
		amount: z.number().int().positive().optional(),
		visitId: z.string().uuid().optional().nullable(),
		documentId: z.string().uuid().optional().nullable(),
		invoiceId: z.string().uuid().optional().nullable(),
	}).strict(),
);

export type SberbankPayBody = z.infer<typeof sberbankPayBodySchema>;

/**
 * Zod validation schema for GET /api/sberbank/status/:orderId route params.
 */
export const sberbankStatusParamsSchema = z
	.object({
		orderId: z.string().trim().min(1, "orderId обязателен"),
	})
	.strict();

export type SberbankStatusParams = z.infer<typeof sberbankStatusParamsSchema>;

/**
 * Zod validation schema for POST /api/sberbank/cancel-or-reconcile request body.
 */
export const sberbankCancelReconcileBodySchema = z
	.object({
		orderId: z.string().trim().min(1, "Идентификатор заказа обязателен"),
		forceReverse: z.boolean().optional(),
	})
	.strict();

export type SberbankCancelReconcileBody = z.infer<typeof sberbankCancelReconcileBodySchema>;

/**
 * Fastify route schema for POST /api/sberbank/pay.
 */
export const sberbankPayFastifySchema = {
	schema: {
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				"x-idempotency-key": { type: "string" },
			},
		},
		body: {
			type: "object",
			required: ["patientId"],
			properties: {
				patientId: { type: "string", format: "uuid" },
				amountKopecks: { type: "integer", minimum: 1 },
				amount: { type: "integer", minimum: 1 },
				visitId: { type: "string" },
				documentId: { type: "string" },
				invoiceId: { type: "string" },
			},
		},
	},
} as const;

/**
 * Fastify route schema for GET /api/sberbank/status/:orderId.
 */
export const sberbankStatusFastifySchema = {
	schema: {
		params: {
			type: "object",
			required: ["orderId"],
			properties: {
				orderId: { type: "string" },
			},
		},
	},
} as const;

/**
 * Fastify route schema for POST /api/sberbank/cancel-or-reconcile.
 */
export const sberbankCancelReconcileFastifySchema = {
	schema: {
		body: {
			type: "object",
			required: ["orderId"],
			properties: {
				orderId: { type: "string" },
				forceReverse: { type: "boolean" },
			},
		},
	},
} as const;

/**
 * Incoming Sberbank Acquiring Webhook Payload DTO.
 */
export interface SberbankWebhookPayload extends Record<string, unknown> {
	checksum?: string;
	sign?: string;
	signature?: string;
	sign_alias?: string;
	orderId?: string;
	mdOrder?: string;
	orderNumber?: string;
	amount?: number | string;
	operation?: string;
	status?: string;
	actionCode?: string | number;
}

/**
 * Valid terminal and intermediate Sberbank acquiring transaction statuses.
 */
export type SberbankTransactionStatus =
	| "pending"
	| "approved"
	| "success"
	| "failed"
	| "refunded"
	| "reversed";

/**
 * Standard Sberbank payment operation response DTO.
 */
export interface SberbankPaymentResult {
	success: boolean;
	orderId?: string;
	formUrl?: string;
	status?: string;
	amount?: number;
	amountRub?: number;
	message?: string;
	processed?: boolean;
	reason?: string;
	paymentId?: string;
}
