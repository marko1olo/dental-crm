import { and, eq, or } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { namedDevelopmentModeActive } from "../../accessGuard.js";
import { withSuperuserBypass } from "../../db/rls.js";
import { organizations, payments, sberbankTransactions } from "../../db/schema.js";
import { isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { verifySbpWebhookSignature } from "../sbp/bankGatewaySecurity.js";
import { verifySberbankChecksum } from "./sberbankSecurityHelpers.js";

export type AcquiringWebhookChannel = "sber_pos" | "sberbank" | "sbp";

const SIGNATURE_ONLY_KEYS = new Set([
	"checksum",
	"sign",
	"signature",
	"sign_alias",
	"crc",
]);

function toPlainRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
	const value = record[key];
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function headerValue(request: FastifyRequest, name: string): string | undefined {
	const raw = request.headers[name];
	const value = Array.isArray(raw) ? raw[0] : raw;
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function resolveEnvWebhookSecret(channel: AcquiringWebhookChannel): string | null {
	if (channel === "sber_pos") {
		return (
			process.env.SBERBANK_POS_WEBHOOK_SECRET?.trim() ||
			process.env.SBERBANK_WEBHOOK_SECRET?.trim() ||
			process.env.DENTE_WEBHOOK_SECRET?.trim() ||
			process.env.SBERBANK_SECRET_KEY?.trim() ||
			null
		);
	}
	if (channel === "sberbank") {
		return (
			process.env.SBERBANK_WEBHOOK_SECRET?.trim() ||
			process.env.DENTE_WEBHOOK_SECRET?.trim() ||
			process.env.SBERBANK_SECRET_KEY?.trim() ||
			null
		);
	}
	return (
		process.env.SBP_WEBHOOK_SECRET?.trim() ||
		process.env.DENTE_WEBHOOK_SECRET?.trim() ||
		process.env.SBERBANK_WEBHOOK_SECRET?.trim() ||
		process.env.SBERBANK_SECRET_KEY?.trim() ||
		null
	);
}

function devFallbackSecret(channel: AcquiringWebhookChannel): string | null {
	if (!namedDevelopmentModeActive()) {
		return null;
	}
	if (channel === "sber_pos") return "dev-sberbank-pos-secret";
	if (channel === "sberbank") return "dev-sberbank-secret";
	return "dev-sbp-secret";
}

async function resolvePerClinicWebhookSecrets(
	channel: AcquiringWebhookChannel,
	orderId: string,
	payloadOrgId: string | undefined,
): Promise<readonly string[]> {
	return await withSuperuserBypass(async (tx) => {
		const secretColumn =
			channel === "sber_pos"
				? organizations.sberPosWebhookSecret
				: channel === "sberbank"
					? organizations.sberbankWebhookSecret
					: organizations.sbpWebhookSecret;

		const txRows = await tx
			.select({ secret: secretColumn })
			.from(sberbankTransactions)
			.innerJoin(organizations, eq(organizations.id, sberbankTransactions.organizationId))
			.where(eq(sberbankTransactions.orderId, orderId))
			.limit(5);

		const orgSecrets = txRows
			.map((row) => row.secret?.trim() ?? "")
			.filter((s) => s.length > 0);
		if (orgSecrets.length > 0) {
			return Array.from(new Set(orgSecrets));
		}

		if (channel === "sbp") {
			const mutationId = `sbp:${orderId}`;
			const paymentRows = await tx
				.select({ secret: secretColumn })
				.from(payments)
				.innerJoin(organizations, eq(organizations.id, payments.organizationId))
				.where(
					or(
						eq(payments.clientMutationId, mutationId),
						eq(payments.clientMutationId, orderId),
					),
				)
				.limit(5);
			const paymentSecrets = paymentRows
				.map((row) => row.secret?.trim() ?? "")
				.filter((s) => s.length > 0);
			if (paymentSecrets.length > 0) {
				return Array.from(new Set(paymentSecrets));
			}
		}

		if (txRows.length === 0 && payloadOrgId && isValidUuid(payloadOrgId)) {
			const [orgRow] = await tx
				.select({ secret: secretColumn })
				.from(organizations)
				.where(eq(organizations.id, payloadOrgId))
				.limit(1);
			const trimmed = orgRow?.secret?.trim() ?? "";
			if (trimmed.length > 0) {
				return [trimmed];
			}
		}

		return [];
	});
}

function buildValidatedPayload(
	bodyRecord: Record<string, unknown>,
	queryRecord: Record<string, unknown>,
): { ok: true; payload: Record<string, unknown> } | { ok: false } {
	for (const key of Object.keys(queryRecord)) {
		if (SIGNATURE_ONLY_KEYS.has(key)) continue;
		const qVal = queryRecord[key];
		const bVal = bodyRecord[key];
		if (qVal !== undefined && qVal !== null && bVal !== undefined && bVal !== null) {
			if (String(qVal) !== String(bVal)) {
				return { ok: false };
			}
		}
	}
	// Body keys override only signature keys if present; non-conflicting business keys are combined
	// so every supplied parameter is covered by cryptographic verification.
	return { ok: true, payload: { ...queryRecord, ...bodyRecord } };
}

export interface VerifiedAcquiringWebhook {
	readonly ok: true;
	readonly orderId: string;
	readonly payload: Record<string, unknown>;
}

export async function verifyAndResolveAcquiringWebhook(
	request: FastifyRequest,
	reply: FastifyReply,
	channel: AcquiringWebhookChannel,
): Promise<VerifiedAcquiringWebhook | { readonly ok: false }> {
	const bodyRecord = toPlainRecord(request.body);
	const queryRecord = toPlainRecord(request.query);
	const validatedPayload = buildValidatedPayload(bodyRecord, queryRecord);
	if (!validatedPayload.ok) {
		await reply.status(400).send({
			error: "AmbiguousWebhookPayload",
			message: "Конфликт параметров между query и телом вебхука.",
		});
		return { ok: false };
	}

	const payload = validatedPayload.payload;
	const incomingSignature =
		(channel === "sbp"
			? stringField(bodyRecord, "signature") ||
				stringField(queryRecord, "signature") ||
				stringField(bodyRecord, "sign") ||
				stringField(queryRecord, "sign") ||
				stringField(bodyRecord, "checksum") ||
				stringField(queryRecord, "checksum") ||
				headerValue(request, "x-sbp-signature") ||
				headerValue(request, "x-signature") ||
				headerValue(request, "x-dente-webhook-secret") ||
				headerValue(request, "x-webhook-secret")
			: stringField(bodyRecord, "checksum") ||
				stringField(queryRecord, "checksum") ||
				stringField(bodyRecord, "sign") ||
				stringField(queryRecord, "sign") ||
				stringField(bodyRecord, "signature") ||
				stringField(queryRecord, "signature") ||
				headerValue(request, "x-sberbank-signature") ||
				headerValue(request, "x-dente-webhook-secret"));

	if (!incomingSignature) {
		await reply.status(400).send(
			channel === "sbp"
				? {
						error: "MissingSignature",
						message: "Параметр подписи/контрольной суммы (signature) отсутствует.",
					}
				: {
						error: "MissingChecksum",
						message:
							channel === "sber_pos"
								? "Параметр подписи/контрольной суммы (checksum) отсутствует в теле вебхука."
								: "Параметр подписи/контрольной суммы (checksum) отсутствует.",
					},
		);
		return { ok: false };
	}

	const orderId =
		channel === "sbp"
			? stringField(payload, "operationId") ||
				stringField(payload, "orderId") ||
				stringField(payload, "mdOrder") ||
				stringField(payload, "trxId") ||
				stringField(payload, "paymentId") ||
				stringField(payload, "clientMutationId")
			: channel === "sber_pos"
				? stringField(payload, "orderId") ||
					stringField(payload, "mdOrder") ||
					stringField(payload, "orderNumber") ||
					stringField(payload, "terminalTxId")
				: stringField(payload, "orderId") ||
					stringField(payload, "mdOrder") ||
					stringField(payload, "orderNumber");

	if (!orderId) {
		await reply.status(400).send(
			channel === "sbp"
				? {
						error: "MissingOperationId",
						message: "Идентификатор операции (operationId) отсутствует в запросе.",
					}
				: {
						error: "MissingOrderId",
						message: "Параметр orderId отсутствует в запросе.",
					},
		);
		return { ok: false };
	}

	const payloadOrgId = stringField(payload, "organizationId");
	const perClinicSecrets = await resolvePerClinicWebhookSecrets(
		channel,
		orderId,
		payloadOrgId,
	);

	// Per-clinic secret exclusively isolates that clinic: never accept global env fallback when org secret is set.
	const envOrDevSecret = resolveEnvWebhookSecret(channel) || devFallbackSecret(channel);
	const candidateSecrets =
		perClinicSecrets.length > 0
			? perClinicSecrets
			: envOrDevSecret
				? [envOrDevSecret]
				: [];

	if (candidateSecrets.length === 0) {
		await reply.status(503).send({
			error: "WebhookSecretNotConfigured",
			message:
				channel === "sber_pos"
					? "Приём уведомлений от POS-терминалов Сбербанка временно недоступен: защищенный ключ не настроен."
					: channel === "sbp"
						? "Приём уведомлений от СБП временно недоступен: клиника не подключила защищённую интеграцию."
						: "Приём уведомлений от банка временно недоступен: клиника не подключила защищённую интеграцию. Обратитесь к администратору клиники.",
		});
		return { ok: false };
	}

	const isValidSignature = candidateSecrets.some((secret) =>
		channel === "sbp"
			? verifySbpWebhookSignature(payload, secret, incomingSignature)
			: verifySberbankChecksum(payload, secret, incomingSignature),
	);

	if (!isValidSignature) {
		await reply.status(401).send(
			channel === "sbp"
				? {
						error: "InvalidSignature",
						message: "Неверная подпись/контрольная сумма вебхука СБП.",
					}
				: {
						error: "InvalidChecksum",
						message:
							channel === "sber_pos"
								? "Неверная криптографическая подпись вебхука Сбербанк POS."
								: "Неверная подпись/контрольная сумма вебхука.",
					},
		);
		return { ok: false };
	}

	return { ok: true, orderId, payload };
}
