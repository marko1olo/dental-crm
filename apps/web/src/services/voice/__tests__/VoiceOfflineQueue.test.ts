import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	VoiceOfflineQueue,
	formatRestoredDictationsBadge,
	type PendingTranscriptionRecord,
} from "../VoiceOfflineQueue";
import { UnifiedAudioClient } from "../UnifiedAudioClient";

describe("VoiceOfflineQueue: IndexedDB / In-Memory Resilient Storage", () => {
	it("correctly formats Russian pluralization for restored dictation badges", () => {
		assert.strictEqual(
			formatRestoredDictationsBadge(1),
			"📡 Восстановлено 1 надиктованное сообщение после обрыва сети",
		);
		assert.strictEqual(
			formatRestoredDictationsBadge(2),
			"📡 Восстановлено 2 надиктованных сообщения после обрыва сети",
		);
		assert.strictEqual(
			formatRestoredDictationsBadge(3),
			"📡 Восстановлено 3 надиктованных сообщения после обрыва сети",
		);
		assert.strictEqual(
			formatRestoredDictationsBadge(4),
			"📡 Восстановлено 4 надиктованных сообщения после обрыва сети",
		);
		assert.strictEqual(
			formatRestoredDictationsBadge(5),
			"📡 Восстановлено 5 надиктованных сообщений после обрыва сети",
		);
		assert.strictEqual(
			formatRestoredDictationsBadge(11),
			"📡 Восстановлено 11 надиктованных сообщений после обрыва сети",
		);
		assert.strictEqual(
			formatRestoredDictationsBadge(12),
			"📡 Восстановлено 12 надиктованных сообщений после обрыва сети",
		);
		assert.strictEqual(
			formatRestoredDictationsBadge(14),
			"📡 Восстановлено 14 надиктованных сообщений после обрыва сети",
		);
		assert.strictEqual(
			formatRestoredDictationsBadge(21),
			"📡 Восстановлено 21 надиктованное сообщение после обрыва сети",
		);
		assert.strictEqual(
			formatRestoredDictationsBadge(22),
			"📡 Восстановлено 22 надиктованных сообщения после обрыва сети",
		);
		assert.strictEqual(
			formatRestoredDictationsBadge(25),
			"📡 Восстановлено 25 надиктованных сообщений после обрыва сети",
		);
		assert.strictEqual(
			formatRestoredDictationsBadge(101),
			"📡 Восстановлено 101 надиктованное сообщение после обрыва сети",
		);
		assert.strictEqual(
			formatRestoredDictationsBadge(102),
			"📡 Восстановлено 102 надиктованных сообщения после обрыва сети",
		);
		assert.strictEqual(
			formatRestoredDictationsBadge(111),
			"📡 Восстановлено 111 надиктованных сообщений после обрыва сети",
		);
	});

	it("enqueues dictation segments with clinical context and default pending status", async () => {
		const queue = new VoiceOfflineQueue({ autoSyncIntervalMs: 0 });

		const record = await queue.enqueue({
			durationMs: 3200,
			audioBase64: "UklGRi4AAABXQVZFZm10IBAAAAABAAEA",
			rawText: "Кариес зуба 46, глубокая полость",
			specialty: "therapy",
			context: {
				organizationId: "org-101",
				patientId: "pat-202",
				visitId: "vis-303",
			},
		});

		assert.ok(record.id.startsWith("voice_off_"));
		assert.strictEqual(record.durationMs, 3200);
		assert.strictEqual(record.status, "pending");
		assert.strictEqual(record.retryCount, 0);
		assert.strictEqual(record.specialty, "therapy");
		assert.strictEqual(record.context.patientId, "pat-202");
		assert.strictEqual(record.context.visitId, "vis-303");
		assert.strictEqual(record.context.organizationId, "org-101");

		const fetched = await queue.get(record.id);
		assert.ok(fetched);
		assert.strictEqual(fetched?.id, record.id);
		assert.strictEqual(fetched?.rawText, "Кариес зуба 46, глубокая полость");

		queue.dispose();
	});

	it("supports full CRUD, status transitions and pending filtering", async () => {
		const queue = new VoiceOfflineQueue({
			maxRetries: 3,
			autoSyncIntervalMs: 0,
		});
		await queue.clearAll();

		const rec1 = await queue.enqueue({
			durationMs: 1500,
			rawText: "Фрагмент 1",
		});
		const rec2 = await queue.enqueue({
			durationMs: 2000,
			rawText: "Фрагмент 2",
		});

		let pending = await queue.getPending();
		assert.strictEqual(pending.length, 2);
		assert.strictEqual(await queue.countPending(), 2);

		// Переводим rec1 в synced
		await queue.updateStatus(rec1.id, "synced", {
			syncedAt: Date.now(),
		});

		pending = await queue.getPending();
		assert.strictEqual(pending.length, 1);
		assert.strictEqual(pending[0]?.id, rec2.id);

		// Переводим rec2 в failed с превышением maxRetries
		await queue.updateStatus(rec2.id, "failed", {
			retryCount: 3,
			lastError: "Connection timeout",
		});

		pending = await queue.getPending();
		assert.strictEqual(pending.length, 0);
		assert.strictEqual(await queue.countPending(), 0);

		// Очистка синхронизированных записей
		const deletedCount = await queue.clearSynced();
		assert.strictEqual(deletedCount, 1);

		const remaining = await queue.getAll();
		assert.strictEqual(remaining.length, 1);
		assert.strictEqual(remaining[0]?.id, rec2.id);

		// Удаление конкретной записи
		await queue.delete(rec2.id);
		assert.strictEqual((await queue.getAll()).length, 0);

		queue.dispose();
	});

	it("notifies listeners on queue mutations via onQueueChange", async () => {
		const queueChanges: PendingTranscriptionRecord[][] = [];

		const queue = new VoiceOfflineQueue({
			autoSyncIntervalMs: 0,
			onQueueChange: (records) => {
				queueChanges.push(records);
			},
		});

		await queue.clearAll();
		const rec = await queue.enqueue({
			durationMs: 1000,
			rawText: "Проверка событий",
		});

		await queue.updateStatus(rec.id, "syncing");
		await queue.delete(rec.id);

		assert.ok(queueChanges.length >= 3);
		queue.dispose();
	});

	it("processes queue, updates synced status and emits badge notification upon success", async () => {
		const badgeMessages: string[] = [];
		let syncSuccessCount = 0;
		const progressEvents: Array<{ current: number; total: number }> = [];

		const queue = new VoiceOfflineQueue({
			autoSyncIntervalMs: 0,
			syncHandler: async (rec) => {
				return {
					success: true,
					text: `${rec.rawText} [распознано сервером]`,
				};
			},
			onSyncSuccess: (count) => {
				syncSuccessCount = count;
			},
			onBadgeMessage: (msg) => {
				badgeMessages.push(msg);
			},
			onSyncProgress: (current, total) => {
				progressEvents.push({ current, total });
			},
		});

		await queue.clearAll();

		await queue.enqueue({
			durationMs: 2500,
			rawText: "Препарирование зуба 11",
		});
		await queue.enqueue({
			durationMs: 3100,
			rawText: "Пломбирование зуба 21",
		});

		const synced = await queue.processQueue();
		assert.strictEqual(synced.length, 2);
		assert.strictEqual(syncSuccessCount, 2);
		assert.strictEqual(progressEvents.length, 2);

		assert.strictEqual(badgeMessages.length, 1);
		assert.strictEqual(
			badgeMessages[0],
			"📡 Восстановлено 2 надиктованных сообщения после обрыва сети",
		);

		const pendingAfter = await queue.getPending();
		assert.strictEqual(pendingAfter.length, 0);

		const allAfter = await queue.getAll();
		assert.strictEqual(allAfter.length, 2);
		assert.strictEqual(allAfter[0]?.status, "synced");
		assert.ok(allAfter[0]?.rawText?.includes("[распознано сервером]"));

		queue.dispose();
	});

	it("handles sync errors gracefully with retry count increments", async () => {
		const errors: Array<{ id: string; error: string }> = [];

		const queue = new VoiceOfflineQueue({
			maxRetries: 2,
			autoSyncIntervalMs: 0,
			syncHandler: async () => {
				return {
					success: false,
					error: "503 Service Unavailable",
				};
			},
			onSyncError: (rec, err) => {
				errors.push({
					id: rec.id,
					error: typeof err === "string" ? err : err.message,
				});
			},
		});

		await queue.clearAll();
		const rec = await queue.enqueue({
			durationMs: 1200,
			rawText: "Тест сбоя",
		});

		// Первая попытка: retryCount -> 1, status -> 'pending'
		await queue.processQueue();
		let fetched = await queue.get(rec.id);
		assert.strictEqual(fetched?.retryCount, 1);
		assert.strictEqual(fetched?.status, "pending");
		assert.strictEqual(fetched?.lastError, "503 Service Unavailable");
		assert.strictEqual(errors.length, 1);

		// Вторая попытка: retryCount -> 2 (достигнут maxRetries 2), status -> 'failed'
		await queue.processQueue();
		fetched = await queue.get(rec.id);
		assert.strictEqual(fetched?.retryCount, 2);
		assert.strictEqual(fetched?.status, "failed");
		assert.strictEqual(errors.length, 2);

		// Третья попытка: очередь пуста, т.к. retryCount >= maxRetries
		const synced = await queue.processQueue();
		assert.strictEqual(synced.length, 0);

		queue.dispose();
	});

	it("integrates seamlessly with UnifiedAudioClient", () => {
		const customQueue = new VoiceOfflineQueue({ autoSyncIntervalMs: 0 });

		const client = new UnifiedAudioClient({
			preferredMode: "server_whisper",
			specialty: "surgery",
			organizationId: "org-xyz",
			offlineQueue: customQueue,
		});

		assert.strictEqual(client.getOfflineQueue(), customQueue);

		let savedCount = 0;
		const unsub = client.subscribe({
			onOfflineRecordSaved: () => {
				savedCount++;
			},
		});

		assert.strictEqual(typeof unsub, "function");
		unsub();
		client.dispose();
		customQueue.dispose();
	});
});
