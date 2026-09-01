import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
	cacheUpcomingVisit,
	getCachedUpcomingVisit,
	clearCachedUpcomingVisit,
	enqueueOfflinePatientBooking,
	getQueuedOfflinePatientBookings,
	removeQueuedOfflinePatientBooking,
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

		await enqueueOfflinePatientBooking(bookingReq);

		const queued = await getQueuedOfflinePatientBookings();
		assert.equal(queued.length, 1);
		const first = queued[0];
		assert.ok(first);
		assert.equal(first.id, "offline-book-01");
		assert.equal(first.serviceTitle, "Лечение кариеса");

		await removeQueuedOfflinePatientBooking("offline-book-01");
		const remaining = await getQueuedOfflinePatientBookings();
		assert.equal(remaining.length, 0);
	});
});
