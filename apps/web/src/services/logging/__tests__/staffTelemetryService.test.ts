import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
	LOCAL_STORAGE_STAFF_EVENTS_KEY,
	MAX_OFFLINE_STAFF_EVENTS,
	StaffTelemetryService,
} from "../staffTelemetryService.js";

// Mock localStorage for test environment
class MockLocalStorage {
	private store: Record<string, string> = {};

	getItem(key: string): string | null {
		return this.store[key] ?? null;
	}

	setItem(key: string, value: string): void {
		this.store[key] = value;
	}

	removeItem(key: string): void {
		delete this.store[key];
	}

	clear(): void {
		this.store = {};
	}
}

describe("StaffTelemetryService — Clinical & Staff Activity Forensic Audit", () => {
	let service: StaffTelemetryService;
	let mockStorage: MockLocalStorage;

	beforeEach(() => {
		mockStorage = new MockLocalStorage();
		Object.defineProperty(globalThis, "localStorage", {
			value: mockStorage,
			configurable: true,
			writable: true,
		});
		Object.defineProperty(globalThis, "navigator", {
			value: { userAgent: "NodeTestRunner", onLine: true },
			configurable: true,
			writable: true,
		});
		service = new StaffTelemetryService();
		service.setUserContext({
			organizationId: "11111111-1111-1111-1111-111111111111",
			userId: "22222222-2222-2222-2222-222222222222",
			role: "doctor",
			name: "Д-р Иванов И.И.",
		});
		service.clearQueue();
	});

	it("1. records clinical staff actions with sanitized payload into local queue", () => {
		const entry = service.recordAction({
			actionType: "emr_open",
			entityType: "emr",
			entityId: "visit-123",
			patientId: "patient-456",
			details: {
				notes: "Пациент с острой болью",
				secretToken: "Bearer should-be-redacted",
				icd10: "K02.1",
			},
		});

		assert.ok(entry.id);
		assert.equal(entry.actionType, "emr_open");
		assert.equal(entry.entityType, "emr");
		assert.equal(entry.entityId, "visit-123");
		assert.equal(entry.patientId, "patient-456");
		assert.equal(entry.actorRole, "doctor");
		assert.equal(entry.actorName, "Д-р Иванов И.И.");

		// Details should be sanitized: sensitive token redacted, clinical ICD-10 preserved
		const details = entry.details as Record<string, unknown>;
		assert.equal(details.icd10, "K02.1");
		assert.equal(details.secretToken, "Bearer [REDACTED_TOKEN]");

		// Check queue
		const queued = service.getQueuedEvents();
		assert.equal(queued.length, 1);
		assert.equal(queued[0]?.id, entry.id);

		// Check localStorage persistence
		const rawSaved = mockStorage.getItem(LOCAL_STORAGE_STAFF_EVENTS_KEY);
		assert.ok(rawSaved);
		assert.ok(rawSaved.includes("visit-123"));
	});

	it("2. enforces FIFO boundary (MAX_OFFLINE_STAFF_EVENTS) to prevent memory leak", () => {
		for (let i = 0; i < MAX_OFFLINE_STAFF_EVENTS + 25; i++) {
			service.recordAction({
				actionType: "custom_action",
				entityType: "test",
				entityId: `item-${i}`,
			});
		}

		const queued = service.getQueuedEvents();
		assert.equal(queued.length, MAX_OFFLINE_STAFF_EVENTS);
		// Oldest 25 items discarded, last item should be item-(MAX_OFFLINE_STAFF_EVENTS + 24)
		assert.equal(queued[queued.length - 1]?.entityId, `item-${MAX_OFFLINE_STAFF_EVENTS + 24}`);
	});

	it("3. correctly logs specialized clinical actions (diagnosis, service, discount, revision)", () => {
		// Diagnosis change
		const diagEntry = service.logDiagnosisChange(
			"pat-1",
			16,
			"K02.0 Кариес эмали",
			"K02.1 Кариес дентина",
			"Углубление кариозной полости",
		);
		assert.equal(diagEntry.actionType, "diagnosis_change");
		assert.equal(diagEntry.entityId, "tooth_16");
		assert.equal(diagEntry.reason, "Углубление кариозной полости");

		// Service add
		const srvEntry = service.logServiceAdd("pat-1", "A16.07.002", "Наложение пломбы", 450000, 1);
		assert.equal(srvEntry.actionType, "service_add");
		assert.equal(srvEntry.entityId, "A16.07.002");
		assert.equal((srvEntry.details as any).amountKopecks, 450000);

		// 100% warranty discount (Мандат 8e)
		const discEntry = service.logDiscountApply("pat-1", 100, "Гарантийная замена реставрации", 450000, 0);
		assert.equal(discEntry.actionType, "discount_apply");
		assert.equal((discEntry.details as any).discountPercent, 100);
		assert.equal((discEntry.details as any).discountedAmountKopecks, 0);

		// Shift lifecycle
		const shiftOpenEntry = service.logShiftOpen("SHIFT-042");
		assert.equal(shiftOpenEntry.actionType, "shift_open");
		assert.equal(shiftOpenEntry.entityId, "SHIFT-042");

		const shiftCloseEntry = service.logShiftClose("SHIFT-042", undefined, undefined, { patientsSeen: 8 });
		assert.equal(shiftCloseEntry.actionType, "shift_close");
		assert.equal((shiftCloseEntry.details as any).stats.patientsSeen, 8);

		// Revision protocol «Исправленному верить»
		const revEntry = service.logRevisionSaved("pat-1", "visit-99", "Уточнение описания рентгенограммы");
		assert.equal(revEntry.actionType, "custom_action");
		assert.equal(revEntry.entityType, "diary_revision");
		assert.equal((revEntry.details as any).protocol, "Исправленному верить");
	});

	it("4. flushes queue to /api/audit/events/batch and clears sent events on 200 OK", async () => {
		service.recordAction({
			actionType: "emr_open",
			entityType: "emr",
			entityId: "vis-1",
		});
		service.recordAction({
			actionType: "document_print",
			entityType: "document",
			entityId: "doc-1",
		});

		assert.equal(service.getQueuedEvents().length, 2);

		let fetchCalled = false;
		let fetchUrl = "";
		let sentBody: any = null;

		// @ts-expect-error Mocking fetch
		globalThis.fetch = async (url: string, options: any) => {
			fetchCalled = true;
			fetchUrl = url;
			sentBody = JSON.parse(options.body);
			return {
				ok: true,
				status: 201,
				json: async () => ({ success: true, count: 2 }),
			};
		};

		const flushed = await service.flushQueue();
		assert.equal(flushed, true);
		assert.equal(fetchCalled, true);
		assert.equal(fetchUrl, "/api/audit/events/batch");
		assert.equal(sentBody.events.length, 2);

		// Queue must be empty after successful flush
		assert.equal(service.getQueuedEvents().length, 0);
	});

	it("5. preserves events in queue if network request fails", async () => {
		service.recordAction({
			actionType: "payment_receive",
			entityType: "payment",
			entityId: "inv-1",
		});

		globalThis.fetch = (async () => {
			throw new Error("Network timeout / Server offline");
		}) as typeof fetch;

		const flushed = await service.flushQueue();
		assert.equal(flushed, false);

		// Events must remain in queue for retry
		assert.equal(service.getQueuedEvents().length, 1);
		assert.equal(service.getQueuedEvents()[0]?.entityId, "inv-1");
	});
});
