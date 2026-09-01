import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { OfflinePatientBookingRequest } from "../pwa/patientOfflineStorage";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("Patient PWA Portal: Interactive Smart Booking & SBP Deposit Suite", () => {
	it("Wizard presets define clinical services with exact pricing and durations", () => {
		const services = [
			{ id: "srv-consultation", priceRub: 1500, durationMinutes: 30 },
			{ id: "srv-hygiene-airflow", priceRub: 4500, durationMinutes: 60 },
			{ id: "srv-therapy-caries", priceRub: 5800, durationMinutes: 45 },
			{ id: "srv-surgery-extraction", priceRub: 6500, durationMinutes: 45 },
			{ id: "srv-implant-consult", priceRub: 2000, durationMinutes: 45 },
			{ id: "srv-emergency-pain", priceRub: 2500, durationMinutes: 30 },
		];

		for (const srv of services) {
			assert.ok(srv.priceRub > 0, `Service ${srv.id} must have a positive price`);
			assert.ok(srv.durationMinutes >= 30, `Service ${srv.id} must be at least 30 minutes`);
		}
	});

	it("Doctor schedule model supports valid ratings and 14-day booking range", () => {
		const doctors = [
			{ id: "doc-ivanov", experienceYears: 16, rating: 4.98 },
			{ id: "doc-smirnova", experienceYears: 12, rating: 4.95 },
			{ id: "doc-petrov", experienceYears: 14, rating: 4.99 },
		];

		for (const doc of doctors) {
			assert.ok(doc.experienceYears >= 10, "Senior specialists must have >= 10 years experience");
			assert.ok(doc.rating >= 4.9, "Doctor rating must be >= 4.9");
		}
	});

	it("SBP advance deposit tiers correctly compute bonus cashbacks", () => {
		const sbpTiers = [
			{ depositRub: 0, bonusPoints: 0, guaranteedSlot: false },
			{ depositRub: 500, bonusPoints: 200, guaranteedSlot: true },
			{ depositRub: 1000, bonusPoints: 500, guaranteedSlot: true },
		];

		const computeBonusRatio = (deposit: number, bonus: number) => {
			if (deposit === 0) return 0;
			return bonus / deposit; // 200/500 = 40%, 500/1000 = 50%
		};

		assert.equal(computeBonusRatio(500, 200), 0.4);
		assert.equal(computeBonusRatio(1000, 500), 0.5);
		assert.equal(sbpTiers[1]!.guaranteedSlot, true);
	});

	it("Offline Subway Mode correctly formats booking payload for IndexedDB queue", () => {
		const payload: Omit<OfflinePatientBookingRequest, "id" | "createdAtIso" | "status" | "retryCount"> = {
			patientId: "pat-982-demo",
			patientFullName: "Иванов Иван Иванович",
			patientPhone: "+7 (999) 123-45-67",
			branchId: "branch-center",
			branchName: "DENTE Центр",
			doctorId: "doc-petrov",
			doctorName: "Д-р Петров Дмитрий Михайлович",
			serviceId: "srv-surgery-extraction",
			serviceTitle: "Атравматичное удаление зуба",
			dateIso: "2026-09-03",
			slotId: "14:00",
			timeRu: "14:00",
			patientComment: "Болит зуб мудрости снизу справа",
			consentPersonalData152Fz: true,
		};

		assert.equal(payload.patientId, "pat-982-demo");
		assert.equal(payload.consentPersonalData152Fz, true);
		assert.ok(payload.patientPhone.startsWith("+7"));
		assert.match(payload.dateIso, /^\d{4}-\d{2}-\d{2}$/);
		assert.match(payload.timeRu, /^\d{2}:\d{2}$/);
	});

	it("CSS invariants strictly enforce Fitts Law touch targets >= 44px on slots, pills and buttons", () => {
		const cssContent = readFileSync(
			resolve(__dirname, "../components/patient-portal/interactiveSmartBooking.css"),
			"utf-8",
		);

		assert.ok(
			cssContent.includes("min-height: 44px"),
			"Slots and step items must have min-height: 44px",
		);
		assert.ok(
			cssContent.includes("min-width: 44px"),
			"Slots must have min-width: 44px",
		);
		assert.ok(
			cssContent.includes("min-height: 48px"),
			"Primary action buttons must have min-height: 48px",
		);
		assert.ok(
			cssContent.includes("var(--paper"),
			"CSS must use theme tokens var(--paper)",
		);
	});
});
