import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
	cacheUpcomingVisit,
	getCachedUpcomingVisit,
	clearCachedUpcomingVisit,
	enqueueOfflinePatientBooking,
	getQueuedOfflinePatientBookings,
	removeQueuedOfflinePatientBooking,
	flushOfflinePatientBookings,
	type UpcomingVisit,
	type OfflinePatientBookingRequest,
} from "../patientOfflineStorage";

describe("patientOfflineStorage — Subway Offline Storage & Booking Queue", () => {
	// Polyfill localStorage if running in standard Node.js test environment
	beforeEach(() => {
		if (typeof globalThis.localStorage === "undefined") {
			const store = new Map<string, string>();
			(globalThis as any).localStorage = {
				getItem: (k: string) => store.get(k) || null,
				setItem: (k: string, v: string) => store.set(k, String(v)),
				removeItem: (k: string) => store.delete(k),
				clear: () => store.clear(),
			};
		} else {
			globalThis.localStorage.clear();
		}
	});

	it("1. Caches and retrieves upcoming visit data via dual-storage fallback", async () => {
		const sampleVisit: UpcomingVisit = {
			id: "visit-test-01",
			patientId: "PAT-001",
			patientFullName: "Иванов Иван Иванович",
			dateIso: "2026-09-05",
			timeRu: "15:00",
			doctorId: "doc-1",
			doctorName: "Д-р Смирнов А. П.",
			doctorSpecialty: "Стоматолог-терапевт",
			clinicName: "ООО Стоматология ДЕНТЕ",
			clinicAddress: "г. Санкт-Петербург, Невский пр-т 140",
			metroStationRu: "Площадь Восстания",
			metroLineColor: "#ef4444",
			clinicPhone: "+7 (812) 409-32-10",
			cabinetNumber: "104",
			procedureTitle: "Лечение кариеса 1.6",
			cachedAtIso: new Date().toISOString(),
		};

		await cacheUpcomingVisit(sampleVisit);

		const retrieved = await getCachedUpcomingVisit();
		assert.ok(retrieved !== null);
		assert.equal(retrieved?.id, "visit-test-01");
		assert.equal(retrieved?.metroStationRu, "Площадь Восстания");
		assert.equal(retrieved?.clinicPhone, "+7 (812) 409-32-10");

		await clearCachedUpcomingVisit();
		const cleared = await getCachedUpcomingVisit();
		assert.equal(cleared, null);
	});

	it("2. Enqueues and manages offline booking requests in subway offline mode", async () => {
		const bookingReq: OfflinePatientBookingRequest = {
			id: "offline-book-01",
			patientId: "PAT-001",
			patientFullName: "Иванов Иван",
			patientPhone: "+7 (926) 555-12-34",
			branchId: "branch-central",
			doctorId: "doc-1",
			doctorName: "Д-р Смирнов А. П.",
			serviceId: "srv-caries",
			serviceTitle: "Лечение кариеса",
			dateIso: "2026-09-10",
			slotId: "slot-1600",
			timeRu: "16:00",
			consentPersonalData152Fz: true,
			status: "queued",
			createdAtIso: new Date().toISOString(),
			retryCount: 0,
		};

		const booking = await enqueueOfflinePatientBooking(bookingReq);

		const queued = await getQueuedOfflinePatientBookings();
		assert.equal(queued.length, 1);
		assert.ok(queued[0]);
		assert.equal(queued[0].id, booking.id);
		assert.equal(queued[0].serviceTitle, "Лечение кариеса");

		await removeQueuedOfflinePatientBooking(booking.id);
		const remaining = await getQueuedOfflinePatientBookings();
		assert.equal(remaining.length, 0);
	});

	it("3. Flushes queued offline bookings and drains queue upon reconnection", async () => {
		const bookingReq1: OfflinePatientBookingRequest = {
			id: "offline-book-flush-01",
			patientId: "PAT-002",
			patientFullName: "Сидорова Анна",
			patientPhone: "+7 (911) 222-33-44",
			branchId: "branch-north",
			doctorId: "doc-2",
			doctorName: "Д-р Кузнецова Е. В.",
			serviceId: "srv-clean",
			serviceTitle: "Профгигиена Air-Flow",
			dateIso: "2026-09-12",
			slotId: "slot-1100",
			timeRu: "11:00",
			consentPersonalData152Fz: true,
			status: "queued",
			createdAtIso: new Date().toISOString(),
			retryCount: 0,
		};

		await enqueueOfflinePatientBooking(bookingReq1);
		const beforeFlush = await getQueuedOfflinePatientBookings();
		assert.equal(beforeFlush.length, 1);

		// Drain using mock syncFn simulating network recovery
		const syncedIds: string[] = [];
		const result = await flushOfflinePatientBookings(async (booking) => {
			syncedIds.push(booking.id);
			return true;
		});

		assert.equal(result.successCount, 1);
		assert.equal(result.failedCount, 0);
		assert.equal(syncedIds.length, 1);
		assert.equal(syncedIds[0], bookingReq1.id);

		const afterFlush = await getQueuedOfflinePatientBookings();
		assert.equal(afterFlush.length, 0);
	});

	it("4. Automatically triggers toast event on successful flush", async () => {
		let toastDetail: { text: string; type: string } | null = null;
		if (typeof window === "undefined") {
			(globalThis as any).window = {
				dispatchEvent: (event: CustomEvent) => {
					if (event.type === "dente-toast") {
						toastDetail = event.detail;
					}
					return true;
				},
			};
			(globalThis as any).CustomEvent = class {
				type: string;
				detail: any;
				constructor(type: string, opts: any) {
					this.type = type;
					this.detail = opts?.detail;
				}
			};
		}

		const bookingReq: OfflinePatientBookingRequest = {
			id: "offline-book-toast-01",
			patientFullName: "Петров Петр",
			patientPhone: "+7 (999) 888-77-66",
			branchId: "branch-main",
			doctorId: "doc-1",
			doctorName: "Д-р Смирнов А. П.",
			serviceId: "srv-consult",
			serviceTitle: "Консультация",
			dateIso: "2026-09-15",
			slotId: "slot-1400",
			timeRu: "14:00",
			consentPersonalData152Fz: true,
			status: "queued",
			createdAtIso: new Date().toISOString(),
			retryCount: 0,
		};

		await enqueueOfflinePatientBooking(bookingReq);
		await flushOfflinePatientBookings(async () => true);

		const resultToast = toastDetail as unknown as { text: string; type: string } | null;
		assert.ok(resultToast !== null);
		assert.equal(resultToast?.text, "Заявка синхронизирована");
		assert.equal(resultToast?.type, "success");
	});
});
