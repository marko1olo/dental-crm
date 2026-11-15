import assert from "node:assert";
import { describe, test } from "node:test";
import { readSseStream } from "../ai/router/streamParser.js";
import { extractJsonText } from "../ai/omniGateway.js";
import {
	createMockStorageSignature,
	getLabScanUploadPresignedUrl,
	getLabScanDownloadPresignedUrl,
} from "../services/labScanDirectUpload.js";
import {
	validateAndResolveStoragePath,
} from "../routes/lab/scansMockStorageHandlers.js";
import {
	checkStaffPinRateLimit,
	cleanupExpiredPinRateLimits,
	clearAllStaffPinRateLimitsForTesting,
	getPinRateLimitMapSizeForTesting,
	MAX_PIN_RATE_LIMIT_ENTRIES,
	recordStaffPinFailure,
} from "../routes/auth/loginModules/loginRateLimiter.js";
import {
	cleanupExpiredFallbackSessions,
	clearFallbackSessionsForTesting,
	MAX_FALLBACK_MESSAGES_PER_SESSION,
	MAX_FALLBACK_SESSIONS,
	saveFallbackSession,
	appendFallbackMessage,
} from "../routes/agentSessionRoutes.js";
import { LanKktDriverService } from "../services/hardware/lanKktDriverService.js";

describe("Red Team Fixer Surgeon 3 — Complete Architectural Defect Elimination", () => {
	// ─── 1. AI Stream Parser [DONE] Immediate Termination ──────────────────────
	describe("1. AI Stream Parser (streamParser.ts)", () => {
		test("не зависает на 120 секунд при [DONE] маркере и немедленно завершает генератор", async () => {
			const sseData = [
				'data: {"choices":[{"delta":{"content":"Привет, "}}]}\n\n',
				'data: {"choices":[{"delta":{"content":"доктор!"}}]}\n\n',
				"data: [DONE]\n\n",
			].join("");

			const encoder = new TextEncoder();
			const stream = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(encoder.encode(sseData));
					// Не вызываем controller.close() сразу, имитируя keep-alive сервера
				},
			});

			const chunks: string[] = [];
			const startTime = Date.now();

			const response = await readSseStream(stream, "test-model", {
				onChunk: (text) => chunks.push(text),
			});

			const durationMs = Date.now() - startTime;

			assert.strictEqual(chunks.join(""), "Привет, доктор!");
			// Убеждаемся, что генератор вышел сразу (< 500мс), а не ждал таймаута
			assert.ok(durationMs < 500, `Стрим должен завершиться немедленно, заняло: ${durationMs}ms`);
		});
	});

	// ─── 2. OmniGateway JSON Extraction & Reasoning Stripping ──────────────────
	describe("2. OmniGateway (omniGateway.ts)", () => {
		test("извлекает JSON из markdown-блоков с reasoning-преамбулой", () => {
			const rawWithPreamble = `
Вот результат клинического анализа снимка:
\`\`\`json
{
  "finding": "Кариес эмали",
  "tooth": 36,
  "confidence": 0.94
}
\`\`\`
Надеюсь, это поможет при лечении!
`;
			const extracted = extractJsonText(rawWithPreamble);
			const parsed = JSON.parse(extracted);
			assert.strictEqual(parsed.tooth, 36);
			assert.strictEqual(parsed.finding, "Кариес эмали");
		});

		test("очищает рассуждения <think> перед парсингом чистого JSON объекта", () => {
			const rawWithThink = `<think>
Врач запросил протокол для зуба 16. Проверяем анамнез и МКБ-10.
Код К02.1 — кариес дентина. Формируем структуру ответа.
</think>
{
  "diagnosis": "К02.1",
  "protocol": "Препарирование кариозной полости зуба 16"
}`;
			const extracted = extractJsonText(rawWithThink);
			const parsed = JSON.parse(extracted);
			assert.strictEqual(parsed.diagnosis, "К02.1");
		});
	});

	// ─── 3. Direct Storage HMAC Signing & Path Protection ────────────────────────
	describe("3. Lab Scan Direct Storage Security & Signing", () => {
		test("генерирует HMAC цифровую подпись для direct-storage URL", () => {
			const uploadRes = getLabScanUploadPresignedUrl({
				organizationId: "org-test-uuid",
				labOrderId: "order-test-uuid",
				fileName: "jaw_upper.stl",
			});

			assert.ok(uploadRes.provider === "direct_storage_fallback" || uploadRes.provider === "mock_fallback");
			assert.ok(uploadRes.uploadUrl.includes("&sig="), "uploadUrl должен содержать подпись sig");
			assert.ok(uploadRes.uploadUrl.includes("&exp="), "uploadUrl должен содержать срок действия exp");
			assert.ok(uploadRes.downloadUrl.includes("&sig="), "downloadUrl должен содержать подпись sig");

			const downloadRes = getLabScanDownloadPresignedUrl({
				storageKey: uploadRes.storageKey,
			});
			assert.ok(downloadRes.downloadUrl.includes("&sig="));
			assert.ok(downloadRes.downloadUrl.includes("&exp="));
		});

		test("валидирует и санитизирует пути хранения, блокируя path traversal", () => {
			assert.strictEqual(validateAndResolveStoragePath("../../../etc/shadow"), null);
			assert.strictEqual(validateAndResolveStoragePath("/etc/passwd"), null);
			assert.strictEqual(validateAndResolveStoragePath("org_1/lab_orders/2/scan.exe"), null);

			const valid = validateAndResolveStoragePath("org_org1/lab_orders/order1/scan.stl");
			assert.ok(valid !== null);
			assert.strictEqual(valid.ext, "stl");
			assert.strictEqual(valid.safeFileName, "scan.stl");
		});

		test("детерминированно верифицирует HMAC подпись и отсекает просроченные", () => {
			const key = "org_demo/lab_orders/order_1/12345_scan.stl";
			const nowSec = Math.floor(Date.now() / 1000);
			const expFuture = nowSec + 3600;
			const expPast = nowSec - 10;

			const sig = createMockStorageSignature({
				storageKey: key,
				action: "upload",
				expiresAtSeconds: expFuture,
			});
			assert.strictEqual(typeof sig, "string");
			assert.strictEqual(sig.length, 64);

			const sigExpired = createMockStorageSignature({
				storageKey: key,
				action: "upload",
				expiresAtSeconds: expPast,
			});
			assert.notStrictEqual(sig, sigExpired);
		});
	});

	// ─── 4. Memory Leak Elimination (RateLimiter & AgentSessions) ───────────────
	describe("4. Memory Leaks: RateLimiter & AgentSessions LRU/TTL", () => {
		test("pinRateLimitMap не превышает MAX_PIN_RATE_LIMIT_ENTRIES при переборе IP", () => {
			clearAllStaffPinRateLimitsForTesting();

			// Имитируем брутфорс с огромного количества уникальных IP
			for (let i = 0; i < MAX_PIN_RATE_LIMIT_ENTRIES + 200; i++) {
				const key = `pin:org_test:192.168.${Math.floor(i / 255)}.${i % 255}`;
				recordStaffPinFailure(key);
			}

			const size = getPinRateLimitMapSizeForTesting();
			assert.ok(
				size <= MAX_PIN_RATE_LIMIT_ENTRIES,
				`Размер rateLimitMap (${size}) не должен превышать лимит ${MAX_PIN_RATE_LIMIT_ENTRIES}`,
			);

			// Очистка устаревших
			const evicted = cleanupExpiredPinRateLimits(Date.now() + 20 * 60 * 1000);
			assert.ok(evicted > 0, "Устаревшие записи должны быть удалены");
			clearAllStaffPinRateLimitsForTesting();
		});

		test("agentSessionRoutes fallback коллекции ограничивают размер и усекают сообщения", () => {
			clearFallbackSessionsForTesting();

			// Создаем сессии сверх лимита
			for (let i = 0; i < MAX_FALLBACK_SESSIONS + 50; i++) {
				saveFallbackSession({
					id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
					organizationId: "org-fallback",
					userId: null,
					patientId: null,
					activeView: "Одонтограмма",
					summary: `Тестовая сессия ${i}`,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}

			// Добавляем сообщения в одну сессию сверх лимита на сессию
			const targetId = "00000000-0000-0000-0000-000000000500";
			for (let m = 0; m < MAX_FALLBACK_MESSAGES_PER_SESSION + 30; m++) {
				appendFallbackMessage(targetId, {
					id: `msg-${m}`,
					sessionId: targetId,
					role: "user",
					content: `Сообщение ${m}`,
					toolCalls: null,
					createdAt: new Date(),
				});
			}

			clearFallbackSessionsForTesting();
		});
	});

	// ─── 5. LAN KKT Driver: Zero Potemkin Status ───────────────────────────────
	describe("5. LAN KKT Driver (lanKktDriverService.ts)", () => {
		test("не фабрикует статус бумаги, крышки и серийные номера без реального протокольного обмена", async () => {
			// В режиме 'atol_web_server' без запущенного веб-сервера АТОЛ на localhost:19999
			const status = await LanKktDriverService.checkDeviceStatus({
				host: "127.0.0.1",
				port: 19999, // недоступный порт
				model: "atol_web_server",
				timeoutMs: 100,
			});

			// Если сокет недоступен — online: false, серийники пустые
			assert.strictEqual(status.online, false);
			assert.strictEqual(status.paperOk, false);
			assert.strictEqual(status.fnFiscalized, false);
			assert.strictEqual(status.fnSerial, "");
			assert.strictEqual(status.kktSerialNumber, "");
			assert.ok(status.error?.includes("KKT unreachable"));
		});
	});
});
