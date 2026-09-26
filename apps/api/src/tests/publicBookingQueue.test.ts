import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	publicBookingQueueService,
	type BookingRequestInput,
	type GracefulBumpSlotOption,
} from "../services/publicBookingQueueService.js";

describe("Public Booking Queue & 24/7 Offline Holding Relay (Mandates 8b, 8e, 8n)", () => {
	const TEST_ORG_ID = `org-test-${randomUUID().slice(0, 8)}`;
	const TEST_DOCTOR_ID = `doc-test-${randomUUID().slice(0, 8)}`;

	beforeEach(() => {
		publicBookingQueueService.clearHoldingQueue(TEST_ORG_ID);
	});

	afterEach(() => {
		publicBookingQueueService.clearHoldingQueue(TEST_ORG_ID);
	});

	it("1. Daytime Mode: Instant slot confirmation with status CONFIRMED", async (t) => {
		// Simulate clinic daytime online status
		publicBookingQueueService.setClinicOnlineOverride(TEST_ORG_ID, true);

		const request: BookingRequestInput = {
			organizationId: TEST_ORG_ID,
			doctorId: TEST_DOCTOR_ID,
			patientName: "Кузнецов Дмитрий Иванович",
			patientPhone: "+7 (927) 111-22-33",
			startsAt: "2026-09-28T10:00:00.000Z",
			endsAt: "2026-09-28T10:30:00.000Z",
			comment: "Острая боль",
			source: "widget",
		};

		const receipt = await publicBookingQueueService.submitBooking(request);

		assert.equal(receipt.status, "CONFIRMED");
		assert.equal(receipt.isNightMode, false);
		assert.ok(receipt.bookingId);
		assert.ok(receipt.referenceNumber.startsWith("BKG-"));
		assert.ok(receipt.appointmentId);
		assert.match(receipt.message, /успешно подтверждена/i);
	});

	it("2. Daytime Collision: Rejects overlapping slot with REJECTED_CONFLICT", async (t) => {
		publicBookingQueueService.setClinicOnlineOverride(TEST_ORG_ID, true);

		const firstBooking: BookingRequestInput = {
			organizationId: TEST_ORG_ID,
			doctorId: TEST_DOCTOR_ID,
			patientName: "Кузнецов Дмитрий Иванович",
			patientPhone: "+7 (927) 111-22-33",
			startsAt: "2026-09-28T11:00:00.000Z",
			endsAt: "2026-09-28T11:30:00.000Z",
		};

		const firstReceipt = await publicBookingQueueService.submitBooking(firstBooking);
		assert.equal(firstReceipt.status, "CONFIRMED");

		// Second booking on exact same doctor and overlapping time
		const secondBooking: BookingRequestInput = {
			organizationId: TEST_ORG_ID,
			doctorId: TEST_DOCTOR_ID,
			patientName: "Смирнова Ольга Павловна",
			patientPhone: "+7 (927) 444-55-66",
			startsAt: "2026-09-28T11:15:00.000Z",
			endsAt: "2026-09-28T11:45:00.000Z",
		};

		const secondReceipt = await publicBookingQueueService.submitBooking(secondBooking);
		assert.equal(secondReceipt.status, "REJECTED_CONFLICT");
		assert.match(secondReceipt.message, /уже занято/i);
	});

	it("3. Nighttime Mode (Clinic Offline at 03:00): Buffers in holding queue with PENDING_RESERVATION and receipt", async (t) => {
		// Simulate cleaner disconnecting server at 03:00 (offline)
		publicBookingQueueService.setClinicOnlineOverride(TEST_ORG_ID, false);

		const nightRequest: BookingRequestInput = {
			organizationId: TEST_ORG_ID,
			doctorId: TEST_DOCTOR_ID,
			patientName: "Васильев Пётр Сергеевич",
			patientPhone: "+7 (917) 888-99-00",
			startsAt: "2026-09-28T14:00:00.000Z",
			endsAt: "2026-09-28T14:30:00.000Z",
			comment: "Ночная самозапись",
		};

		const receipt = await publicBookingQueueService.submitBooking(nightRequest);

		assert.equal(receipt.status, "PENDING_RESERVATION");
		assert.equal(receipt.isNightMode, true);
		assert.equal(receipt.morningConfirmTime, "08:30");
		assert.ok(receipt.softHoldExpiresAt);
		assert.match(receipt.message, /Заявка принята! За вами зафиксировано время/);
		assert.match(receipt.message, /Администратор подтвердит запись в 08:30/);

		// Verify queue contains the item with soft hold
		const queue = publicBookingQueueService.getHoldingQueue(TEST_ORG_ID, "PENDING_RESERVATION");
		assert.equal(queue.length, 1);
		assert.equal(queue[0]?.patientName, "Васильев Пётр Сергеевич");

		// Another night reservation for the same slot should be rejected
		const duplicateNight = await publicBookingQueueService.submitBooking({
			...nightRequest,
			patientName: "Другой Пациент",
			patientPhone: "+7 (917) 000-11-22",
		});
		assert.equal(duplicateNight.status, "REJECTED_CONFLICT");
	});

	it("4. Morning Relay Sync: Automatically drains holding queue and confirms reservations", async (t) => {
		// 1. Enqueue nighttime reservation
		publicBookingQueueService.setClinicOnlineOverride(TEST_ORG_ID, false);

		const nightRequest: BookingRequestInput = {
			organizationId: TEST_ORG_ID,
			doctorId: TEST_DOCTOR_ID,
			patientName: "Алексеев Михаил Викторович",
			patientPhone: "+7 (927) 333-44-55",
			startsAt: "2026-09-28T15:00:00.000Z",
			endsAt: "2026-09-28T15:30:00.000Z",
		};
		await publicBookingQueueService.submitBooking(nightRequest);

		// 2. Clinic turns online at 08:30 in the morning
		publicBookingQueueService.setClinicOnlineOverride(TEST_ORG_ID, true);

		// 3. Process holding queue
		const syncResult = await publicBookingQueueService.processHoldingQueue(TEST_ORG_ID);

		assert.equal(syncResult.processed, 1);
		assert.equal(syncResult.confirmed, 1);
		assert.equal(syncResult.bumped, 0);

		const updatedQueue = publicBookingQueueService.getHoldingQueue(TEST_ORG_ID);
		assert.equal(updatedQueue[0]?.status, "CONFIRMED");
		assert.ok(updatedQueue[0]?.appointmentId);
	});

	it("5. Graceful Bump on Collision: Generates adjacent slots and 10% priority discount when morning conflict occurs", async (t) => {
		// 1. Patient places nighttime reservation for 16:00
		publicBookingQueueService.setClinicOnlineOverride(TEST_ORG_ID, false);

		const nightRequest: BookingRequestInput = {
			organizationId: TEST_ORG_ID,
			doctorId: TEST_DOCTOR_ID,
			patientName: "Федорова Анна Николаевна",
			patientPhone: "+7 (937) 555-66-77",
			startsAt: "2026-09-28T16:00:00.000Z",
			endsAt: "2026-09-28T16:30:00.000Z",
		};
		const nightReceipt = await publicBookingQueueService.submitBooking(nightRequest);
		assert.equal(nightReceipt.status, "PENDING_RESERVATION");

		// 2. Morning arrives, clinic is online, but someone manually booked 16:00 before the queue processed
		publicBookingQueueService.setClinicOnlineOverride(TEST_ORG_ID, true);
		await publicBookingQueueService.submitBooking({
			organizationId: TEST_ORG_ID,
			doctorId: TEST_DOCTOR_ID,
			patientName: "Внеплановый очный пациент",
			patientPhone: "+7 (937) 000-00-00",
			startsAt: "2026-09-28T16:00:00.000Z",
			endsAt: "2026-09-28T16:30:00.000Z",
		});

		// 3. Process holding queue -> collision should trigger Graceful Bump
		const syncResult = await publicBookingQueueService.processHoldingQueue(TEST_ORG_ID);

		assert.equal(syncResult.processed, 1);
		assert.equal(syncResult.confirmed, 0);
		assert.equal(syncResult.bumped, 1);

		const bumpedItem = publicBookingQueueService.getHoldingQueueItem(nightReceipt.bookingId);
		assert.ok(bumpedItem);
		assert.equal(bumpedItem.status, "BUMPED_OFFER_PENDING");
		assert.equal(bumpedItem.appliedDiscountPercent, 10);

		// Verify Graceful Bump Offer details
		const offer = bumpedItem.bumpOffer;
		assert.ok(offer);
		assert.equal(offer.discountPercent, 10);
		assert.match(offer.discountNote, /Приоритетная скидка 10%/);
		assert.ok(offer.recommendedSlots.length > 0);
		assert.ok(offer.notificationPayload.messageText.includes("10%"));
		assert.ok(offer.notificationPayload.oneClickConfirmUrl.includes(nightReceipt.bookingId));
	});

	it("6. 1-Click Acceptance of Bumped Slot: Confirms bumped reservation with priority discount", async (t) => {
		// Enqueue night reservation
		publicBookingQueueService.setClinicOnlineOverride(TEST_ORG_ID, false);
		const nightReceipt = await publicBookingQueueService.submitBooking({
			organizationId: TEST_ORG_ID,
			doctorId: TEST_DOCTOR_ID,
			patientName: "Морозов Илья Романович",
			patientPhone: "+7 (927) 999-88-77",
			startsAt: "2026-09-28T17:00:00.000Z",
			endsAt: "2026-09-28T17:30:00.000Z",
		});

		// Clinic online with conflict
		publicBookingQueueService.setClinicOnlineOverride(TEST_ORG_ID, true);
		await publicBookingQueueService.submitBooking({
			organizationId: TEST_ORG_ID,
			doctorId: TEST_DOCTOR_ID,
			patientName: "Ранее записанный пациент",
			patientPhone: "+7 (927) 000-00-01",
			startsAt: "2026-09-28T17:00:00.000Z",
			endsAt: "2026-09-28T17:30:00.000Z",
		});

		// Trigger Graceful Bump
		await publicBookingQueueService.processHoldingQueue(TEST_ORG_ID);

		const bumpedItem = publicBookingQueueService.getHoldingQueueItem(nightReceipt.bookingId);
		assert.ok(bumpedItem?.bumpOffer);
		const chosenSlot = bumpedItem.bumpOffer.recommendedSlots[0] as GracefulBumpSlotOption;
		assert.ok(chosenSlot);

		// Patient clicks 1-click accept
		const acceptedReceipt = await publicBookingQueueService.acceptBumpedSlot(
			TEST_ORG_ID,
			nightReceipt.bookingId,
			{ startsAt: chosenSlot.startsAt, endsAt: chosenSlot.endsAt },
		);

		assert.equal(acceptedReceipt.status, "BUMPED_CONFIRMED");
		assert.equal(acceptedReceipt.discountPercent, 10);
		assert.match(acceptedReceipt.message, /со скидкой 10%/);

		const finalQueueItem = publicBookingQueueService.getHoldingQueueItem(nightReceipt.bookingId);
		assert.equal(finalQueueItem?.status, "BUMPED_CONFIRMED");
	});

	it("7. Solo Doctor Sovereignty (Mandate 8n): Operates flawlessly without secondary staff", async (t) => {
		publicBookingQueueService.setClinicOnlineOverride(TEST_ORG_ID, true);

		// Solo doctor scenario: 1 doctor, no assistant, no chair specified
		const soloBooking: BookingRequestInput = {
			organizationId: TEST_ORG_ID,
			doctorId: "solo-doc-01",
			patientName: "Тарасов Олег Григорьевич",
			patientPhone: "+7 (999) 123-45-67",
			startsAt: "2026-09-29T09:00:00.000Z",
			endsAt: "2026-09-29T09:30:00.000Z",
		};

		const receipt = await publicBookingQueueService.submitBooking(soloBooking);
		assert.equal(receipt.status, "CONFIRMED");
		assert.ok(receipt.appointmentId);
	});
});
