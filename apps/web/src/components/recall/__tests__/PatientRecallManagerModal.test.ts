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
		it("provides realistic default candidate records", () => {
			assert.ok(DEFAULT_RECALL_CANDIDATES.length >= 6);
			for (const c of DEFAULT_RECALL_CANDIDATES) {
				assert.ok(c.id.startsWith("rec-"));
				assert.ok(c.patientId.startsWith("pat-"));
				assert.ok(c.fullName.length > 5);
				assert.ok(["hygiene", "implants", "orthodontics", "endodontics"].includes(c.category));
				assert.ok(["pending", "contacted", "scheduled", "completed", "declined"].includes(c.status));
				assert.ok(["upcoming", "due_now", "overdue_30", "overdue_90", "completed"].includes(c.urgency));
			}
		});

		it("filters candidates accurately by clinical category", () => {
			const hygieneItems = DEFAULT_RECALL_CANDIDATES.filter((c) => c.category === "hygiene");
			const implantItems = DEFAULT_RECALL_CANDIDATES.filter((c) => c.category === "implants");
			const orthoItems = DEFAULT_RECALL_CANDIDATES.filter((c) => c.category === "orthodontics");
			const endoItems = DEFAULT_RECALL_CANDIDATES.filter((c) => c.category === "endodontics");

			assert.ok(hygieneItems.length > 0);
			assert.ok(implantItems.length > 0);
			assert.ok(orthoItems.length > 0);
			assert.ok(endoItems.length > 0);
			assert.strictEqual(
				hygieneItems.length + implantItems.length + orthoItems.length + endoItems.length,
				DEFAULT_RECALL_CANDIDATES.length,
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
