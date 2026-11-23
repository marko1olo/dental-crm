import { generateUuidV7 } from "@dental/shared";
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

export interface MdlpOutboxDaemonOptions {
	organizationId?: string | undefined;
	batchSize?: number | undefined;
	timeoutMs?: number | undefined;
	transport?: MdlpTransportFn | undefined;
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

/**
 * Стандартный HTTP транспорт к шлюзу ЦРПТ «Честный Знак».
 * Использует AbortController с таймаутом сокета 8000 мс.
 */
async function defaultCrptTransport(
	record: MdlpOutboxRecord,
	signal: AbortSignal,
): Promise<MdlpTransportResult> {
	const token = process.env.MDLP_CLIENT_TOKEN || process.env.CRPT_API_KEY;
	const crptApiUrl =
		process.env.CRPT_API_URL ||
		process.env.MDLP_API_URL ||
		"https://api.mdlp.crpt.ru/api/v1";

	const schemaDoc = (record.payload?.schemaDoc as { xmlContent?: string } | undefined) ?? {};
	const xmlContent = schemaDoc.xmlContent || "";

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

	const response = await fetch(`${crptApiUrl}/documents/send`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			document: Buffer.from(xmlContent, "utf-8").toString("base64"),
			sign: "",
			request_id: record.idempotencyKey,
		}),
		signal,
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		throw new Error(
			`Шлюз ЦРПТ вернул HTTP ${response.status} (${response.statusText}): ${errorText.slice(0, 300)}`,
		);
	}

	const responseData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
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
	const transport = options.transport ?? defaultCrptTransport;
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
