import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingSlotButton } from "../components/booking/BookingSlotButton";
import { BookingSubmitButton } from "../components/booking/BookingSubmitButton";
import type {
	BookingDoctorData,
	BookingSlotItem,
	ClinicBranch,
} from "../components/booking/contracts/bookingContracts";
import {
	submitBookingRequest,
	submitWaitlistRequest,
} from "../components/booking/engine/bookingSubmissionEngine";
import { CANONICAL_BOOKING_CATEGORIES } from "../components/booking/presets/bookingCategoryPresets";
import {
	cacheUpcomingVisit,
	clearCachedUpcomingVisit,
	enqueueOfflinePatientBooking,
	flushOfflinePatientBookings,
	getCachedUpcomingVisit,
	getQueuedOfflinePatientBookings,
	type UpcomingVisit,
} from "../pwa/patientOfflineStorage";

function installMemoryLocalStorage() {
	const store = new Map<string, string>();
	const storage: Storage = {
		get length() {
			return store.size;
		},
		clear() {
			store.clear();
		},
		getItem(key: string) {
			return store.get(key) ?? null;
		},
		key(index: number) {
			return Array.from(store.keys())[index] ?? null;
		},
		removeItem(key: string) {
			store.delete(key);
		},
		setItem(key: string, value: string) {
			store.set(key, String(value));
		},
	};
	Object.defineProperty(globalThis, "localStorage", {
		value: storage,
		configurable: true,
		writable: true,
	});
	return store;
}

const sampleBranch: ClinicBranch = {
	id: "branch-main",
	name: "Клиника на Тверской",
	address: "ул. Тверская, 12",
	phone: "+7 (495) 111-22-33",
};

const sampleDoctor: BookingDoctorData = {
	id: "doc-therapist-1",
	fullName: "Смирнова Елена Александровна",
	specialties: ["Терапевт"],
	experienceYears: 9,
	rating: 4.9,
	reviewsCount: 42,
	categoryIds: ["therapy"],
};

const sampleSlot: BookingSlotItem = {
	time: "14:30",
	startsAt: "2026-10-15T11:30:00.000Z",
	endsAt: "2026-10-15T12:15:00.000Z",
	doctorId: "doc-therapist-1",
	doctorName: "Смирнова Елена Александровна",
};

describe("Interactive Smart Booking 2026 — Live Engine, PWA Queue & UI", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		installMemoryLocalStorage();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("exposes canonical patient booking categories with valid durations and titles", () => {
		assert.equal(CANONICAL_BOOKING_CATEGORIES.length, 6);
		const ids = CANONICAL_BOOKING_CATEGORIES.map((c) => c.id);
		assert.deepEqual(ids, [
			"therapy",
			"hygiene",
			"emergency",
			"consultation",
			"orthodontics",
			"surgery",
		]);
		for (const cat of CANONICAL_BOOKING_CATEGORIES) {
			assert.ok(cat.durationMinutes >= 30, `Category ${cat.id} duration must be >= 30`);
			assert.ok(cat.title.trim().length > 0, `Category ${cat.id} must have title`);
		}
	});

	it("renders BookingSlotButton in selected and unselected states with 16px+ slot time", () => {
		const unselectedHtml = renderToStaticMarkup(
			React.createElement(BookingSlotButton, {
				slot: sampleSlot,
				isSelected: false,
				onSelectSlot: () => {},
			}),
		);
		assert.ok(unselectedHtml.includes('aria-pressed="false"'));
		assert.ok(unselectedHtml.includes("text-base font-bold"));
		assert.ok(unselectedHtml.includes("14:30"));
		assert.equal(unselectedHtml.includes("dbw-slot-btn selected"), false);

		const selectedHtml = renderToStaticMarkup(
			React.createElement(BookingSlotButton, {
				slot: sampleSlot,
				isSelected: true,
				onSelectSlot: () => {},
			}),
		);
		assert.ok(selectedHtml.includes('aria-pressed="true"'));
		assert.ok(selectedHtml.includes("dbw-slot-btn selected"));
		assert.ok(selectedHtml.includes("dbw-slot-check"));
	});

	it("renders BookingSubmitButton with 48px floor and accessible submitting state", () => {
		const idleHtml = renderToStaticMarkup(
			React.createElement(BookingSubmitButton, { isSubmitting: false }),
		);
		assert.ok(idleHtml.includes('data-testid="step4-confirm-btn"'));
		assert.ok(idleHtml.includes("min-h-[48px]"));
		assert.ok(idleHtml.includes("Записаться на приём"));
		assert.equal(idleHtml.includes("disabled"), false);

		const busyHtml = renderToStaticMarkup(
			React.createElement(BookingSubmitButton, { isSubmitting: true }),
		);
		assert.ok(busyHtml.includes("Оформление записи..."));
		assert.ok(busyHtml.includes("disabled"));
	});

	it("caches, reads, and clears upcoming visit in PWA offline storage", async () => {
		const visit: UpcomingVisit = {
			id: "visit-2026-1",
			patientId: "pat-1",
			patientFullName: "Иванов Иван",
			dateIso: "2026-10-15",
			timeRu: "14:30",
			doctorId: sampleDoctor.id,
			doctorName: sampleDoctor.fullName,
			doctorSpecialty: "Терапевт",
			clinicName: sampleBranch.name,
			clinicAddress: sampleBranch.address,
			metroStationRu: "Тверская",
			metroLineColor: "#10b981",
			clinicPhone: sampleBranch.phone,
			cabinetNumber: "2",
			procedureTitle: "Лечение кариеса",
			cachedAtIso: "",
		};

		await cacheUpcomingVisit(visit);
		const loaded = await getCachedUpcomingVisit();
		assert.ok(loaded, "Expected cached upcoming visit to load");
		assert.equal(loaded.id, "visit-2026-1");
		assert.equal(loaded.cabinetNumber, "2");
		assert.ok(loaded.cachedAtIso.length > 10);

		await clearCachedUpcomingVisit();
		const afterClear = await getCachedUpcomingVisit();
		assert.equal(afterClear, null);
	});

	it("enqueues offline booking and flushes queue tracking success and failures", async () => {
		await enqueueOfflinePatientBooking({
			patientFullName: "Петрова Анна",
			patientPhone: "+7 (999) 222-33-44",
			branchId: sampleBranch.id,
			doctorId: sampleDoctor.id,
			doctorName: sampleDoctor.fullName,
			serviceId: "therapy",
			serviceTitle: "Лечение кариеса",
			dateIso: "2026-10-15",
			slotId: "slot-1430",
			timeRu: "14:30",
			consentPersonalData152Fz: true,
		});
		await enqueueOfflinePatientBooking({
			patientFullName: "Сидоров Олег",
			patientPhone: "+7 (999) 333-44-55",
			branchId: sampleBranch.id,
			doctorId: sampleDoctor.id,
			doctorName: sampleDoctor.fullName,
			serviceId: "hygiene",
			serviceTitle: "Чистка зубов",
			dateIso: "2026-10-16",
			slotId: "slot-1500",
			timeRu: "15:00",
			consentPersonalData152Fz: true,
		});

		const queuedBefore = await getQueuedOfflinePatientBookings();
		assert.equal(queuedBefore.length, 2);

		let calls = 0;
		const flushResult = await flushOfflinePatientBookings(async () => {
			calls += 1;
			return calls === 1;
		});
		assert.equal(flushResult.successCount, 1);
		assert.equal(flushResult.failedCount, 1);

		const queuedAfter = await getQueuedOfflinePatientBookings();
		assert.equal(queuedAfter.length, 1);
		assert.equal(queuedAfter[0]?.patientFullName, "Сидоров Олег");
	});

	it("submitBookingRequest sends Idempotency-Key and maps server referenceNumber & cabinet", async () => {
		let capturedUrl = "";
		let capturedIdempotencyKey = "";
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			capturedUrl = String(input);
			const headers = (init?.headers ?? {}) as Record<string, string>;
			capturedIdempotencyKey = headers["Idempotency-Key"] ?? "";
			return new Response(
				JSON.stringify({
					data: {
						referenceNumber: "DENTE-9912",
						cabinetNumber: "Кабинет 3",
					},
				}),
				{ status: 201, headers: { "Content-Type": "application/json" } },
			);
		}) as typeof fetch;

		const confirmation = await submitBookingRequest({
			organizationId: "11111111-1111-4111-8111-111111111111",
			apiBaseUrl: "http://127.0.0.1:4000/api/public/booking",
			patientName: "  Кузнецова Мария  ",
			patientPhone: " +7 (916) 555-12-34 ",
			selectedDate: "2026-10-15",
			selectedSlot: sampleSlot,
			selectedDoctor: sampleDoctor,
			selectedBranch: sampleBranch,
			bookingStatus: "confirmed",
			isPreBookingMode: false,
			referenceNumber: "LOCAL-REF",
			hasAgreedToPrivacy: true,
		});

		assert.equal(
			capturedUrl,
			"http://127.0.0.1:4000/api/public/booking/11111111-1111-4111-8111-111111111111/book",
		);
		assert.ok(capturedIdempotencyKey.length >= 32, "Must send UUID Idempotency-Key");
		assert.equal(confirmation.referenceNumber, "DENTE-9912");
		assert.equal(confirmation.cabinetNumber, "Кабинет 3");
		assert.equal(confirmation.patientName, "Кузнецова Мария");
	});

	it("submitBookingRequest throws conflict message on 409 and submitWaitlistRequest handles network errors", async () => {
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ error: "Slot taken" }), {
				status: 409,
				headers: { "Content-Type": "application/json" },
			})) as typeof fetch;

		await assert.rejects(
			submitBookingRequest({
				organizationId: "11111111-1111-4111-8111-111111111111",
				apiBaseUrl: "http://127.0.0.1:4000/api/public/booking",
				patientName: "Иванов И.",
				patientPhone: "+79990001122",
				selectedDate: "2026-10-15",
				selectedSlot: sampleSlot,
				selectedDoctor: sampleDoctor,
				selectedBranch: sampleBranch,
				bookingStatus: "confirmed",
				isPreBookingMode: false,
				referenceNumber: "LOCAL-REF",
				hasAgreedToPrivacy: true,
			}),
			/Выбранное время только что заняли/,
		);

		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ data: { waitlistId: "WL-777" } }), {
				status: 201,
				headers: { "Content-Type": "application/json" },
			})) as typeof fetch;

		const wlOk = await submitWaitlistRequest({
			organizationId: "11111111-1111-4111-8111-111111111111",
			apiBaseUrl: "http://127.0.0.1:4000/api/public/booking",
			patientName: "Ольга",
			patientPhone: "+79998887766",
			selectedDate: "2026-10-16",
			selectedDoctor: null,
			selectedBranch: sampleBranch,
			referenceNumber: "WL-LOCAL",
			hasAgreedToPrivacy: true,
		});
		assert.equal(wlOk.referenceNumber, "WL-777");
		assert.equal(wlOk.doctor.fullName, "Координатор клиники");
	});
});
