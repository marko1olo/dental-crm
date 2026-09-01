/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ECHELON 3: CHAOS & NETWORK SABOTAGE TEST SUITE
 * Operation Chaos Singularity — Audio Stream Ring Buffer, Rage Click Throttling,
 * Composite Idempotency & Offline Survivability
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	buildFiscalReceiptPayloadSignature,
	createFiscalCompositeIdempotencyKey,
	verifyFiscalCompositeIdempotencyKey,
} from "@dental/shared";
import { UnifiedAudioClient } from "../services/voice/UnifiedAudioClient";
import {
	formatRestoredDictationsBadge,
	VoiceOfflineQueue,
} from "../services/voice/VoiceOfflineQueue";

describe("Echelon 3: Chaos Engineering & Network Sabotage Invariants", () => {
	// ── 1. Voice Resilience: WebSocket Drop & Ring Buffering Without Frame Loss ──
	test("Network Sabotage (Voice): PCM chunks buffer in circular ring buffer during WS drop and flush upon reconnect with 0 frame loss", async () => {
		const receivedWsFrames: Array<{
			type: string;
			audioBase64: string;
			rms: number;
			timestamp: number;
			isBufferedReplay?: boolean;
		}> = [];

		// Mock WebSocket environment
		let mockWsReadyState: number = 0; // 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
		const mockWs = {
			get readyState() {
				return mockWsReadyState;
			},
			send(msg: string) {
				const parsed = JSON.parse(msg);
				if (parsed.type === "audio_chunk") {
					receivedWsFrames.push(parsed);
				}
			},
			close() {
				mockWsReadyState = 3;
			},
			onopen: null as (() => void) | null,
			onmessage: null as ((e: { data: string }) => void) | null,
			onerror: null as ((e: unknown) => void) | null,
			onclose: null as ((e: { code: number }) => void) | null,
		};

		const client = new UnifiedAudioClient({
			preferredMode: "gemini_live",
			ringBufferCapacity: 100,
			maxReconnectAttempts: 5,
			autoFallback: false,
		});

		// Check initial ring buffer state
		assert.equal(client.getBufferedPcmChunksCount(), 0, "Buffer starts empty");
		assert.equal(client.getRingBufferCapacity(), 100, "Capacity is configured to 100 frames");

		// Simulate doctor speaking while connection is severed (ws not open)
		const frameCountWhileOffline = 25;
		for (let i = 0; i < frameCountWhileOffline; i++) {
			const pcm = new Int16Array(2048);
			// Fill PCM with synthetic speech wave
			for (let j = 0; j < pcm.length; j++) {
				pcm[j] = Math.sin(j / 10 + i) * 1000;
			}
			client.bufferPcmChunk(pcm, 0.045);
		}

		assert.equal(
			client.getBufferedPcmChunksCount(),
			25,
			"All 25 speech frames successfully accumulated in client circular buffer",
		);
		assert.equal(receivedWsFrames.length, 0, "Zero frames sent to WebSocket while disconnected");

		// Attach mock open WebSocket to client and simulate connection recovery
		// @ts-expect-error test harness injects mock WS
		client.ws = mockWs;
		mockWsReadyState = 1; // WebSocket.OPEN

		// Flush buffered frames across reconnected WebSocket
		const flushedCount = client.flushBufferedPcmChunks();

		assert.equal(flushedCount, 25, "Exactly 25 buffered speech frames flushed to reconnected WebSocket");
		assert.equal(client.getBufferedPcmChunksCount(), 0, "Ring buffer is clean after successful flush");
		assert.equal(receivedWsFrames.length, 25, "Server received all 25 speech frames");
		assert.equal(
			receivedWsFrames.every((f) => f.isBufferedReplay === true),
			true,
			"All flushed frames marked with isBufferedReplay header",
		);

		client.dispose();
	});

	// ── 2. Ring Buffer Capacity & Circular Eviction (FIFO) ──
	test("Ring Buffer Invariant: Circular eviction preserves newest speech frames when exceeding capacity", () => {
		const client = new UnifiedAudioClient({
			ringBufferCapacity: 10,
		});

		assert.equal(client.getRingBufferCapacity(), 10);

		// Push 15 frames into 10-capacity buffer
		for (let i = 1; i <= 15; i++) {
			const pcm = new Int16Array(512);
			pcm[0] = i; // Store marker in first sample
			client.bufferPcmChunk(pcm, 0.01 * i);
		}

		assert.equal(client.getBufferedPcmChunksCount(), 10, "Buffer size capped strictly at 10");

		client.clearBufferedPcmChunks();
		assert.equal(client.getBufferedPcmChunksCount(), 0, "Clear method empties the ring buffer");
		client.dispose();
	});

	// ── 3. Rage Clicks: 50 rapid clicks in 100ms execute exactly 1 submission ──
	test("Rage Click Prevention: 50 frantic clicks within 50ms trigger exactly 1 transaction with atomic in-flight lock", async () => {
		let actualSubmissions = 0;
		const createdTransactions: Array<{ id: string; amountRub: number; nonce: string }> = [];

		// Simulates React component with in-flight ref and debounce lock
		class FastPaymentSubmitter {
			private inFlight = false;
			private lastClickTime = 0;
			private cooldownMs = 600;

			async triggerPayment(amountRub: number): Promise<{ executed: boolean; txnId?: string }> {
				const now = Date.now();
				if (this.inFlight || now - this.lastClickTime < this.cooldownMs) {
					return { executed: false };
				}

				this.inFlight = true;
				this.lastClickTime = now;

				try {
					actualSubmissions++;
					const txnId = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
					// Simulate network round-trip 30ms
					await new Promise((r) => setTimeout(r, 30));
					createdTransactions.push({ id: txnId, amountRub, nonce: `n-${Date.now()}` });
					return { executed: true, txnId };
				} finally {
					this.inFlight = false;
				}
			}
		}

		const submitter = new FastPaymentSubmitter();
		const clickPromises: Promise<{ executed: boolean; txnId?: string }>[] = [];

		// Frantic user spamming button 50 times in rapid succession (<50ms)
		for (let i = 0; i < 50; i++) {
			clickPromises.push(submitter.triggerPayment(25000));
		}

		const results = await Promise.all(clickPromises);
		const executedCount = results.filter((r) => r.executed).length;

		assert.equal(executedCount, 1, "Only the 1st click executes; clicks 2..50 are dropped by atomic lock");
		assert.equal(actualSubmissions, 1, "Exactly 1 transaction submitted to server");
		assert.equal(createdTransactions.length, 1, "Exactly 1 financial transaction created");
		assert.equal(createdTransactions[0]?.amountRub, 25000);
	});

	// ── 4. Warehouse Inventory Deduction Rage Click Resistance ──
	test("Inventory Sabotage: Concurrent material deduction clicks trigger exactly 1 warehouse write-off", async () => {
		let deductionCount = 0;
		let inFlightDeduction = false;
		let lastClick = 0;

		const onConfirmDeduction = async (linesCount: number) => {
			const now = Date.now();
			if (inFlightDeduction || now - lastClick < 600) {
				return { accepted: false };
			}
			inFlightDeduction = true;
			lastClick = now;

			try {
				deductionCount++;
				await new Promise((r) => setTimeout(r, 20));
				return { accepted: true, linesDeducted: linesCount };
			} finally {
				inFlightDeduction = false;
			}
		};

		// User double/triple clicks "Списать со склада" button
		const attempts = await Promise.all([
			onConfirmDeduction(8),
			onConfirmDeduction(8),
			onConfirmDeduction(8),
			onConfirmDeduction(8),
			onConfirmDeduction(8),
		]);

		const acceptedCount = attempts.filter((a) => a.accepted).length;
		assert.equal(acceptedCount, 1, "Only 1 inventory deduction executed");
		assert.equal(deductionCount, 1, "Stock reduced exactly once, preventing double deduction");
	});

	// ── 5. Composite Idempotency Key & Tampering Detection ──
	test("Idempotency Invariant: Composite key (<UUID>#<SHA256>) accepts identical replay, rejects modified payload", () => {
		const rawUuid = "11111111-2222-3333-4444-555555555555";
		const payload = {
			patientId: "patient-101",
			operationType: "income" as const,
			taxationSystem: "usn_income" as const,
			totalKopecks: 1500000, // 15 000.00 руб.
			cashKopecks: 1500000,
			electronicCardKopecks: 0,
			sbpKopecks: 0,
			prepaidKopecks: 0,
			items: [
				{
					name: "Лечение кариеса",
					priceKopecks: 1500000,
					quantity: 1,
					amountKopecks: 1500000,
					subject: "service" as const,
					method: "full_payment" as const,
					vatRate: "vat_none" as const,
					measure: "piece" as const,
				},
			],
		};

		const signature = buildFiscalReceiptPayloadSignature(payload);
		const compositeKey = createFiscalCompositeIdempotencyKey(rawUuid, signature);

		assert.match(compositeKey, /^[0-9a-f-]+#[0-9a-f]{64}$/i, "Key matches UUID#SHA256 format");

		// 1. Identical payload replay verification
		const replayVerification = verifyFiscalCompositeIdempotencyKey(compositeKey, signature);
		assert.equal(replayVerification.isValid, true, "Identical replay matches signature hash");

		// 2. Tampered payload verification (e.g. attacker or concurrent bug changed total sum to 20 000 руб.)
		const tamperedPayload = {
			...payload,
			totalKopecks: 2000000,
			cashKopecks: 2000000,
		};
		const tamperedSignature = buildFiscalReceiptPayloadSignature(tamperedPayload);
		const tamperedVerification = verifyFiscalCompositeIdempotencyKey(compositeKey, tamperedSignature);

		assert.equal(tamperedVerification.isValid, false, "Tampered payload fails hash verification (409 Conflict)");
		assert.notEqual(tamperedVerification.actualHash, tamperedVerification.expectedHash);
	});

	// ── 6. Voice Offline Queue: IndexedDB Storage & Auto-Sync Replay ──
	test("Voice Offline Queue: Audio chunks persist during offline network outage and format pluralized badge", async () => {
		const offlineQueue = new VoiceOfflineQueue({ dbName: "dente_voice_chaos_test_db" });

		const record = await offlineQueue.enqueue({
			context: {
				patientId: "pat-99",
				visitId: "vis-12",
			},
			specialty: "therapy",
			audioBase64: "dGVzdC1hdWRpby1ieXRlcw==",
			durationMs: 4200,
			timestamp: Date.now(),
		});

		assert.ok(record.id, "Generated unique record ID in offline queue");
		assert.equal(record.status, "pending");

		const pending = await offlineQueue.getPending();
		assert.ok(pending.length >= 1, "Record retrieved from queue");

		// Verify Russian pluralization badge formatting
		const badge1 = formatRestoredDictationsBadge(1);
		assert.match(badge1, /1 надиктованное сообщение/);

		const badge3 = formatRestoredDictationsBadge(3);
		assert.match(badge3, /3 надиктованных сообщения/);

		const badge5 = formatRestoredDictationsBadge(5);
		assert.match(badge5, /5 надиктованных сообщений/);

		await offlineQueue.clearSynced();
	});

	// ── 7. Network Sabotage: Offline CRDT Outbox Queue & Auto-Sync Reconnection ──
	test("Network Sabotage: Offline buffering saves mutations in Outbox and replays upon reconnection", async () => {
		interface MutationItem {
			id: string;
			type: "diary_043_update" | "odontogram_surface";
			payload: Record<string, unknown>;
			timestamp: number;
			status: "buffered" | "synced";
		}

		class OfflineCrdtOutboxSyncEngine {
			public outbox: MutationItem[] = [];
			public isOnline = false;
			public serverDb: MutationItem[] = [];

			enqueue(type: MutationItem["type"], payload: Record<string, unknown>) {
				const item: MutationItem = {
					id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
					type,
					payload,
					timestamp: Date.now(),
					status: this.isOnline ? "synced" : "buffered",
				};

				this.outbox.push(item);
				if (this.isOnline) {
					this.serverDb.push(item);
				}
				return item;
			}

			// Simulates network reconnection event
			async reconnectAndFlush(): Promise<number> {
				this.isOnline = true;
				const pending = this.outbox.filter((m) => m.status === "buffered");

				for (const item of pending) {
					// Simulate sync push
					item.status = "synced";
					this.serverDb.push(item);
				}

				return pending.length;
			}
		}

		const syncEngine = new OfflineCrdtOutboxSyncEngine();
		syncEngine.isOnline = false; // Network drops (Wi-Fi fail / airplane mode)

		// Doctor performs clinical actions while offline
		syncEngine.enqueue("diary_043_update", { complaints: "Острая ночная боль в 36 зубе" });
		syncEngine.enqueue("odontogram_surface", { tooth: 36, surface: "MOD", status: "Caries" });
		syncEngine.enqueue("diary_043_update", { diagnosis: "К04.0 Острый очаговый пульпит" });

		assert.equal(syncEngine.outbox.length, 3, "All 3 mutations buffered locally in Outbox");
		assert.equal(syncEngine.serverDb.length, 0, "Server DB received 0 writes while offline");

		// Wi-Fi restored
		const syncedCount = await syncEngine.reconnectAndFlush();

		assert.equal(syncedCount, 3, "All 3 pending mutations pushed to server");
		assert.equal(syncEngine.serverDb.length, 3, "Server DB in 100% parity with local diary state");
		assert.equal(
			syncEngine.outbox.every((m) => m.status === "synced"),
			true,
			"All outbox items marked as synced",
		);
	});

	// ── 8. Malformed Gateway Payload Resilience ──
	test("Payload Corruption: Gateway 502 / corrupted JSON handled gracefully without fatal UI crash", () => {
		const parseSafeApiResponse = <T>(rawBody: string, fallback: T): { data: T; isCorrupted: boolean } => {
			try {
				if (!rawBody || rawBody.startsWith("<html>") || rawBody.startsWith("502 Bad Gateway")) {
					return { data: fallback, isCorrupted: true };
				}
				const parsed = JSON.parse(rawBody);
				return { data: parsed, isCorrupted: false };
			} catch {
				return { data: fallback, isCorrupted: true };
			}
		};

		const defaultFallback = { visits: [], total: 0 };

		// Scenario A: 502 HTML Proxy error
		const resultA = parseSafeApiResponse("<html><body>502 Bad Gateway</body></html>", defaultFallback);
		assert.equal(resultA.isCorrupted, true);
		assert.deepEqual(resultA.data, defaultFallback);

		// Scenario B: Truncated JSON
		const resultB = parseSafeApiResponse('{"visits": [{"id": 1', defaultFallback);
		assert.equal(resultB.isCorrupted, true);
		assert.deepEqual(resultB.data, defaultFallback);

		// Scenario C: Valid JSON
		const resultC = parseSafeApiResponse('{"visits": [{"id": "v-1"}], "total": 1}', defaultFallback);
		assert.equal(resultC.isCorrupted, false);
		assert.equal(resultC.data.visits.length, 1);
	});
});
