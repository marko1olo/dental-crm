import { generateUuidV7 } from "@dental/shared";
import {
	type CryptoProSignResult,
	executeSignDetachedGost,
} from "../../crypto/cryptoProCliEngine.js";
import {
	mdlpOutboxService,
	type MdlpOutboxRecord,
} from "../mdlp/mdlpOutboxService.js";
import { mdlpLogger } from "../mdlp/logger.js";

export interface MdlpTransportResult {
	crptOperationId: string;
	responsePayload?: Record<string, unknown> | undefined;
}

export type MdlpTransportFn = (
	record: MdlpOutboxRecord,
	signal: AbortSignal,
) => Promise<MdlpTransportResult>;

export type MdlpSignFn = (
	dataBuffer: Buffer,
	thumbprint: string,
	options?: { requestId?: string | undefined; pin?: string | undefined },
) => Promise<CryptoProSignResult>;

export interface MdlpOutboxDaemonOptions {
	organizationId?: string | undefined;
	batchSize?: number | undefined;
	timeoutMs?: number | undefined;
	transport?: MdlpTransportFn | undefined;
	signFn?: MdlpSignFn | undefined;
	certThumbprint?: string | undefined;
	certPin?: string | undefined;
	workerId?: string | undefined;
}

export interface MdlpOutboxDaemonDigest {
	processedCount: number;
	completedCount: number;
	failedCount: number;
	dlqCount: number;
	errors: string[];
	durationMs: number;
	scannedAt: string;
}

function readOptionalNonEmptyString(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

async function resolveCrptSignatureBase64(
	record: MdlpOutboxRecord,
	xmlContent: string,
	options?: MdlpOutboxDaemonOptions,
): Promise<string> {
	const preSigned =
		readOptionalNonEmptyString(record.payload?.signatureBase64) ??
		readOptionalNonEmptyString(record.payload?.sign);
	if (preSigned) {
		return preSigned;
	}

	const thumbprint =
		readOptionalNonEmptyString(record.payload?.certThumbprint) ??
		readOptionalNonEmptyString(record.payload?.certificateThumbprint) ??
		readOptionalNonEmptyString(record.payload?.thumbprint) ??
		readOptionalNonEmptyString(record.payload?.signThumbprint) ??
		readOptionalNonEmptyString(options?.certThumbprint) ??
		readOptionalNonEmptyString(process.env.MDLP_CERT_THUMBPRINT) ??
		readOptionalNonEmptyString(process.env.CRPT_CERT_THUMBPRINT) ??
		readOptionalNonEmptyString(process.env.CRYPTOPRO_THUMBPRINT);

	if (!thumbprint) {
		const allowUnsignedSandbox =
			process.env.NODE_ENV !== "production" &&
			process.env.MDLP_ALLOW_UNSIGNED_SANDBOX === "1";
		if (allowUnsignedSandbox) {
			mdlpLogger.warn(
				`[mdlpOutboxDaemon] Отправка в тестовую песочницу ЦРПТ без подписи УКЭП для задачи ${record.id} (MDLP_ALLOW_UNSIGNED_SANDBOX=1)`,
			);
			return "";
		}
		throw new Error(
			"Отправка Схемы 10560 в ЦРПТ отклонена: отсутствует подпись УКЭП и отпечаток сертификата (MDLP_CERT_THUMBPRINT / thumbprint).",
		);
	}

	const pin =
		readOptionalNonEmptyString(record.payload?.certPin) ??
		readOptionalNonEmptyString(options?.certPin) ??
		readOptionalNonEmptyString(process.env.MDLP_CERT_PIN) ??
		readOptionalNonEmptyString(process.env.CRPT_CERT_PIN) ??
		undefined;

	const signFn = options?.signFn ?? executeSignDetachedGost;
	const signResult = await signFn(Buffer.from(xmlContent, "utf-8"), thumbprint, {
		requestId: record.idempotencyKey,
		...(pin ? { pin } : {}),
	});

	if (!signResult.success) {
		throw new Error(
			`Ошибка подписания УКЭП КриптоПро (${signResult.code}): ${signResult.message}`,
		);
	}

	const signatureBase64 = signResult.signatureBase64.trim();
	if (!signatureBase64) {
		throw new Error("КриптоПро CSP вернул пустую отсоединённую подпись УКЭП для Схемы 10560.");
	}

	return signatureBase64;
}

/**
 * Стандартный HTTP транспорт к шлюзу ЦРПТ «Честный Знак».
 * Использует AbortController с таймаутом сокета 8000 мс и отсоединённую подпись УКЭП ГОСТ.
 */
export async function defaultCrptTransport(
	record: MdlpOutboxRecord,
	signal: AbortSignal,
	options?: MdlpOutboxDaemonOptions,
): Promise<MdlpTransportResult> {
	const token = process.env.MDLP_CLIENT_TOKEN || process.env.CRPT_API_KEY;
	const crptApiUrl = (
		process.env.CRPT_API_URL ||
		process.env.MDLP_API_URL ||
		"https://api.mdlp.crpt.ru/api/v1"
	).replace(/\/+$/, "");

	const schemaDoc = (record.payload?.schemaDoc as { xmlContent?: string } | undefined) ?? {};
	const xmlContent = typeof schemaDoc.xmlContent === "string" ? schemaDoc.xmlContent : "";

	// Если шлюз ЦРПТ не сконфигурирован (автономный режим клиники)
	if (!token) {
		mdlpLogger.info(
			`[mdlpOutboxDaemon] Клиника работает в автономном контуре. Сохранение Схемы 10560 для задачи ${record.id}`,
		);
		return {
			crptOperationId: `CRPT-AUTONOMOUS-${record.id.slice(0, 8).toUpperCase()}`,
			responsePayload: {
				mode: "offline_autonomous",
				storedXml: xmlContent,
				disposedAt: new Date().toISOString(),
				message: "Сформирован документ Схемы 10560. Готов к пакетной выгрузке старшей медсестрой.",
			},
		};
	}

	if (!xmlContent.trim()) {
		throw new Error("Пустой XML-документ Схемы 10560: отправка в ЦРПТ невозможна.");
	}

	const signatureBase64 = await resolveCrptSignatureBase64(record, xmlContent, options);

	const response = await fetch(`${crptApiUrl}/documents/send`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			document: Buffer.from(xmlContent, "utf-8").toString("base64"),
			sign: signatureBase64,
			request_id: record.idempotencyKey,
		}),
		signal,
	});

	if (!response.ok) {
		let errorText = "";
		try {
			errorText = await response.text();
		} catch (readErr: unknown) {
			mdlpLogger.debug(
				readErr,
				"[mdlpOutboxDaemon] Не удалось прочитать тело ответа ошибки ЦРПТ",
			);
		}
		throw new Error(
			`Шлюз ЦРПТ вернул HTTP ${response.status} (${response.statusText}): ${errorText.slice(0, 300)}`,
		);
	}

	let responseData: Record<string, unknown> = {};
	try {
		const parsed = (await response.json()) as unknown;
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			responseData = parsed as Record<string, unknown>;
		}
	} catch (jsonErr: unknown) {
		mdlpLogger.debug(
			jsonErr,
			"[mdlpOutboxDaemon] Не удалось распарсить JSON-ответ шлюза ЦРПТ",
		);
	}
	const crptOperationId =
		(responseData.operation_id as string | undefined) ||
		(responseData.document_id as string | undefined) ||
		`CRPT-${generateUuidV7()}`;

	return {
		crptOperationId,
		responsePayload: responseData,
	};
}

/**
 * Фоновый цикл демона Transactional Outbox МДЛП.
 * Выбирает задачи 'pending' по алгоритму SKIP LOCKED, отправляет в ЦРПТ с таймаутом 8000мс,
 * защищен от блокировок между клиниками и дедлоков параллельных воркеров.
 */
export async function runMdlpOutboxDaemon(
	options: MdlpOutboxDaemonOptions = {},
): Promise<MdlpOutboxDaemonDigest> {
	const startTime = Date.now();
	const batchSize = options.batchSize ?? 20;
	const timeoutMs = options.timeoutMs ?? 8000;
	const transport: MdlpTransportFn =
		options.transport ?? ((record, signal) => defaultCrptTransport(record, signal, options));
	const workerId =
		options.workerId ?? `outbox_worker_${process.pid}_${Math.random().toString(36).slice(2, 7)}`;

	const digest: MdlpOutboxDaemonDigest = {
		processedCount: 0,
		completedCount: 0,
		failedCount: 0,
		dlqCount: 0,
		errors: [],
		durationMs: 0,
		scannedAt: new Date().toISOString(),
	};

	try {
		// 1. Атомарная выборка пачки с переводом в 'in_flight' через FOR UPDATE SKIP LOCKED
		const batch = await mdlpOutboxService.fetchPendingBatch(
			batchSize,
			workerId,
			options.organizationId,
		);

		digest.processedCount = batch.length;
		if (batch.length === 0) {
			digest.durationMs = Date.now() - startTime;
			return digest;
		}

		mdlpLogger.info(
			`[mdlpOutboxDaemon] Воркер ${workerId} захватил ${batch.length} задач МДЛП для отправки`,
		);

		// 2. Обработка каждой задачи независимо с изолированным таймаутом сокета (не более 8 секунд)
		for (const record of batch) {
			const controller = new AbortController();
			const timeoutTimer = setTimeout(() => {
				controller.abort(new Error(`Превышен лимит ожидания шлюза ЦРПТ (${timeoutMs} мс)`));
			}, timeoutMs);

			try {
				const result = await transport(record, controller.signal);
				clearTimeout(timeoutTimer);

				await mdlpOutboxService.markCompleted(
					record.id,
					result.crptOperationId,
					result.responsePayload,
					record.organizationId,
				);
				digest.completedCount++;

				mdlpLogger.info(
					`[mdlpOutboxDaemon] Задача ${record.id} успешно отправлена в МДЛП (Операция: ${result.crptOperationId})`,
				);
			} catch (itemErr: unknown) {
				clearTimeout(timeoutTimer);
				const errorMsg = itemErr instanceof Error ? itemErr.message : String(itemErr);
				digest.errors.push(`[Task ${record.id}] ${errorMsg}`);

				const outcome = await mdlpOutboxService.markFailedWithBackoff(
					record.id,
					record.attempts,
					record.maxAttempts,
					errorMsg,
					record.organizationId,
				);

				if (outcome === "escalated_to_dlq") {
					digest.dlqCount++;
				} else {
					digest.failedCount++;
				}
			}
		}
	} catch (loopErr: unknown) {
		const loopMsg = loopErr instanceof Error ? loopErr.message : String(loopErr);
		mdlpLogger.error(loopErr, `[mdlpOutboxDaemon] Критический сбой цикла демона МДЛП: ${loopMsg}`);
		digest.errors.push(`[LoopFatal] ${loopMsg}`);
	}

	digest.durationMs = Date.now() - startTime;
	return digest;
}
