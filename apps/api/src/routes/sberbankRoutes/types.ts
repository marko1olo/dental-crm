import { z } from "zod";

/**
 * Zod validation schema for POST /api/sberbank/pay request body.
 */
export const sberbankPayBodySchema = z.object({
	patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID"),
	amount: z.number().int().positive("Сумма должна быть положительным целым числом копеек"),
	visitId: z.string().uuid().optional().nullable(),
	documentId: z.string().uuid().optional().nullable(),
	invoiceId: z.string().uuid().optional().nullable(),
});

export type SberbankPayBody = z.infer<typeof sberbankPayBodySchema>;

/**
 * Zod validation schema for GET /api/sberbank/status/:orderId route params.
 */
export const sberbankStatusParamsSchema = z.object({
	orderId: z.string().trim().min(1, "orderId обязателен"),
});

export type SberbankStatusParams = z.infer<typeof sberbankStatusParamsSchema>;

/**
 * Zod validation schema for POST /api/sberbank/cancel-or-reconcile request body.
 */
export const sberbankCancelReconcileBodySchema = z.object({
	orderId: z.string().trim().min(1, "Идентификатор заказа обязателен"),
	forceReverse: z.boolean().optional(),
});

export type SberbankCancelReconcileBody = z.infer<typeof sberbankCancelReconcileBodySchema>;

/**
 * Fastify route schema for POST /api/sberbank/pay.
 */
export const sberbankPayFastifySchema = {
	schema: {
		body: {
			type: "object",
			required: ["patientId", "amount"],
			properties: {
				patientId: { type: "string", format: "uuid" },
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
