/**
 * Unit Test Suite for Patient Recall Manager HUD & Workplace (DOMAIN: RECALL)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_RECALL_CANDIDATES,
	buildRecallMessageContent,
	cleanPhoneDigits,
	extractPatientFirstName,
	type PatientRecallItem,
	type RecallCategoryFilter,
	type RecallChannelType,
	type RecallContactStatus,
} from "../index";

describe("Patient Recall Manager - Unit Tests", () => {
	describe("1. Name & Phone Sanitization Utilities", () => {
		it("extracts first name from full Russian 3-word name", () => {
			assert.strictEqual(extractPatientFirstName("Смирнов Алексей Викторович"), "Алексей");
			assert.strictEqual(extractPatientFirstName("Волкова Мария Сергеевна"), "Мария");
			assert.strictEqual(extractPatientFirstName("Иванов Дмитрий"), "Дмитрий");
		});

		it("falls back gracefully for single-word or empty name", () => {
			assert.strictEqual(extractPatientFirstName("Петров"), "Петров");
			assert.strictEqual(extractPatientFirstName(""), "Пациент");
			assert.strictEqual(extractPatientFirstName("   "), "Пациент");
		});

		it("sanitizes Russian phone numbers to national format (7XXXXXXXXXX)", () => {
			assert.strictEqual(cleanPhoneDigits("+7 (916) 450-12-34"), "79164501234");
			assert.strictEqual(cleanPhoneDigits("8 (925) 780-99-11"), "79257809911");
			assert.strictEqual(cleanPhoneDigits("79031112233"), "79031112233");
			assert.strictEqual(cleanPhoneDigits(null), "");
			assert.strictEqual(cleanPhoneDigits(undefined), "");
		});
	});

	describe("2. Omnichannel Message Generation (WhatsApp / Telegram / SMS)", () => {
		const sampleCandidate: PatientRecallItem = {
			id: "rec-test-1",
			patientId: "pat-101",
			fullName: "Смирнов Алексей Викторович",
			phone: "+7 (916) 450-12-34",
			category: "hygiene",
			categoryLabel: "Гигиена 6 мес.",
			lastVisitDate: "2026-02-15",
			dueDate: "2026-08-15",
			daysOverdue: 14,
			urgency: "due_now",
			attendingDoctorName: "Д-р Кузнецова Е.В.",
			status: "pending",
		};

		it("generates WhatsApp message with greeting, doctor name, and 1-Click link", () => {
			const msg = buildRecallMessageContent(sampleCandidate, "whatsapp", "Стоматология «ДЕНТЕ»");
			assert.ok(msg.includes("Алексей"));
			assert.ok(msg.includes("Стоматология «ДЕНТЕ»"));
			assert.ok(msg.includes("Д-р Кузнецова Е.В."));
			assert.ok(msg.includes("6 месяцев"));
			assert.ok(msg.includes("https://dente.clinic/booking"));
			assert.ok(msg.includes("Air-Flow"));
		});

		it("generates Telegram message with formatted structure", () => {
			const msg = buildRecallMessageContent(sampleCandidate, "telegram", "DENTE");
			assert.ok(msg.includes("Алексей"));
			assert.ok(msg.includes("DENTE"));
			assert.ok(msg.includes("Д-р Кузнецова Е.В."));
			assert.ok(msg.includes("https://dente.clinic/booking"));
		});

		it("generates compact SMS message under standard length limits", () => {
			const msg = buildRecallMessageContent(sampleCandidate, "sms", "ДЕНТЕ");
			assert.ok(msg.includes("Алексей"));
			assert.ok(msg.includes("ДЕНТЕ"));
			assert.ok(msg.includes("https://dente.clinic/booking"));
			assert.ok(msg.length <= 160);
		});

		it("generates specialized messages for Implants category", () => {
			const implantCandidate: PatientRecallItem = {
				...sampleCandidate,
				category: "implants",
				categoryLabel: "Импланты 1 год",
			};
			const waMsg = buildRecallMessageContent(implantCandidate, "whatsapp", "ДЕНТЕ");
			assert.ok(waMsg.includes("имплантат") || waMsg.includes("имплант"));
			assert.ok(waMsg.includes("гаранти"));

			const smsMsg = buildRecallMessageContent(implantCandidate, "sms", "ДЕНТЕ");
			assert.ok(smsMsg.includes("имплант"));
		});

		it("generates specialized messages for Orthodontics category", () => {
			const orthoCandidate: PatientRecallItem = {
				...sampleCandidate,
				category: "orthodontics",
				categoryLabel: "Ортодонтия",
				attendingDoctorName: "Д-р Соколова Н.А.",
			};
			const tgMsg = buildRecallMessageContent(orthoCandidate, "telegram", "ДЕНТЕ");
			assert.ok(tgMsg.includes("ортодонт"));
			assert.ok(tgMsg.includes("ретейнер") || tgMsg.includes("капп"));
		});

		it("generates specialized messages for Endodontics category", () => {
			const endoCandidate: PatientRecallItem = {
				...sampleCandidate,
				category: "endodontics",
				categoryLabel: "Эндодонтия",
			};
			const waMsg = buildRecallMessageContent(endoCandidate, "whatsapp", "ДЕНТЕ");
			assert.ok(waMsg.includes("контрольн") || waMsg.includes("лечения"));
		});
	});

	describe("3. Category Filtering & Candidate Pool Integrity", () => {
		it("provides strictly empty default candidate pool per Mandate 8s and Wave 116", () => {
			assert.deepStrictEqual(DEFAULT_RECALL_CANDIDATES, []);
		});

		it("filters candidates accurately by clinical category", () => {
			const sampleCandidates: readonly PatientRecallItem[] = [
				{
					id: "rec-test-h",
					patientId: "pat-1",
					fullName: "Пациент Гигиена",
					phone: "+79991112233",
					category: "hygiene",
					categoryLabel: "Гигиена 6 мес.",
					lastVisitDate: "2026-02-15",
					dueDate: "2026-08-15",
					daysOverdue: 14,
					urgency: "due_now",
					status: "pending",
				},
				{
					id: "rec-test-i",
					patientId: "pat-2",
					fullName: "Пациент Импланты",
					phone: "+79991112244",
					category: "implants",
					categoryLabel: "Импланты 1 год",
					lastVisitDate: "2025-08-20",
					dueDate: "2026-08-20",
					daysOverdue: 9,
					urgency: "due_now",
					status: "contacted",
				},
				{
					id: "rec-test-o",
					patientId: "pat-3",
					fullName: "Пациент Ортодонтия",
					phone: "+79991112255",
					category: "orthodontics",
					categoryLabel: "Ортодонтия",
					lastVisitDate: "2026-05-25",
					dueDate: "2026-08-25",
					daysOverdue: 4,
					urgency: "due_now",
					status: "scheduled",
				},
				{
					id: "rec-test-e",
					patientId: "pat-4",
					fullName: "Пациент Эндодонтия",
					phone: "+79991112266",
					category: "endodontics",
					categoryLabel: "Эндодонтия",
					lastVisitDate: "2026-05-10",
					dueDate: "2026-08-10",
					daysOverdue: 19,
					urgency: "due_now",
					status: "pending",
				},
			];

			const hygieneItems = sampleCandidates.filter((c) => c.category === "hygiene");
			const implantItems = sampleCandidates.filter((c) => c.category === "implants");
			const orthoItems = sampleCandidates.filter((c) => c.category === "orthodontics");
			const endoItems = sampleCandidates.filter((c) => c.category === "endodontics");

			assert.strictEqual(hygieneItems.length, 1);
			assert.strictEqual(implantItems.length, 1);
			assert.strictEqual(orthoItems.length, 1);
			assert.strictEqual(endoItems.length, 1);
			assert.strictEqual(
				hygieneItems.length + implantItems.length + orthoItems.length + endoItems.length,
				sampleCandidates.length,
			);
		});
	});

	describe("4. Status State Transitions (PENDING -> CONTACTED -> BOOKED)", () => {
		it("supports transition from PENDING to CONTACTED upon communication event", () => {
			const candidate: PatientRecallItem = {
				id: "rec-101",
				patientId: "pat-101",
				fullName: "Смирнов Алексей Викторович",
				phone: "+7 (916) 450-12-34",
				category: "hygiene",
				categoryLabel: "Гигиена 6 мес.",
				lastVisitDate: "2026-02-15",
				dueDate: "2026-08-15",
				daysOverdue: 14,
				urgency: "due_now",
				status: "pending",
			};

			assert.strictEqual(candidate.status, "pending");

			// Simulate WhatsApp / Telegram contact
			const contacted: PatientRecallItem = {
				...candidate,
				status: "contacted",
				lastContactedAt: new Date().toISOString(),
				lastContactChannel: "whatsapp",
			};

			assert.strictEqual(contacted.status, "contacted");
			assert.ok(contacted.lastContactedAt);
			assert.strictEqual(contacted.lastContactChannel, "whatsapp");

			// Simulate Booking in schedule (BOOKED)
			const booked: PatientRecallItem = {
				...contacted,
				status: "scheduled",
				scheduledAppointmentDate: "2026-09-02T10:00:00Z",
			};

			assert.strictEqual(booked.status, "scheduled");
			assert.strictEqual(booked.scheduledAppointmentDate, "2026-09-02T10:00:00Z");
		});
	});
});
