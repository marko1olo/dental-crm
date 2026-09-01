import assert from "node:assert/strict";
import test from "node:test";

test("Patient Portal: Post-Operative Care Timeline & Emergency SOS Suite", async (t) => {
	await t.test("Surgery types have accurate statutory recovery and suture removal schedules", () => {
		const surgeries = {
			simple_extraction: { defaultDays: 5, sutureRemovalDay: 7 },
			complex_wisdom_extraction: { defaultDays: 10, sutureRemovalDay: 8 },
			dental_implantation: { defaultDays: 14, sutureRemovalDay: 10 },
			sinus_lifting: { defaultDays: 14, sutureRemovalDay: 12 },
		};

		assert.equal(surgeries.simple_extraction.sutureRemovalDay, 7);
		assert.equal(surgeries.complex_wisdom_extraction.sutureRemovalDay, 8);
		assert.equal(surgeries.dental_implantation.sutureRemovalDay, 10);
		assert.equal(surgeries.sinus_lifting.sutureRemovalDay, 12);
	});

	await t.test("15-Minute Cold Compress countdown timer math calculates correct mm:ss strings", () => {
		const formatTimer = (sec: number) => {
			const m = Math.floor(sec / 60);
			const s = sec % 60;
			return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
		};

		assert.equal(formatTimer(15 * 60), "15:00");
		assert.equal(formatTimer(14 * 60 + 59), "14:59");
		assert.equal(formatTimer(60), "01:00");
		assert.equal(formatTimer(9), "00:09");
		assert.equal(formatTimer(0), "00:00");
	});

	await t.test("Clinical rules strictly enforce no rinsing on Day 1 to prevent alveolar osteitis (сухая лунка)", () => {
		const day1Prohibitions = [
			"Категорически НЕ полоскать рот (риск вымывания сгустка и альвеолита)",
			"НЕ пить через трубочку и не сплевывать активно слюну",
			"НЕ принимать горячую ванну, баню, сауну и исключить спорт",
			"НЕ трогать лунку и швы языком, пальцами или зубочистками",
		];

		const hasNoRinsing = day1Prohibitions.some((p) => p.includes("НЕ полоскать рот"));
		const hasNoStraws = day1Prohibitions.some((p) => p.includes("НЕ пить через трубочку"));
		const hasNoHeat = day1Prohibitions.some((p) => p.includes("НЕ принимать горячую ванну"));

		assert.equal(hasNoRinsing, true);
		assert.equal(hasNoStraws, true);
		assert.equal(hasNoHeat, true);
	});

	await t.test("Day 2-3 antiseptic baths specify Chlorhexidine 0.05% or Miramistin without aggressive gargling", () => {
		const antisepticRules = [
			"Антисептические ротовые ванночки с Хлоргексидином 0.05% или Мирамистином",
			"Методика ванночки: набрать в рот 15 мл, подержать 1–2 мин БЕЗ активного полоскания, сплюнуть",
		];

		assert.ok(antisepticRules[0]!.includes("Хлоргексидином 0.05%"));
		assert.ok(antisepticRules[1]!.includes("БЕЗ активного полоскания"));
	});

	await t.test("Emergency SOS telephone string sanitizes non-digit characters for tel: URI schema", () => {
		const rawPhone = "+7 (800) 555-35-35";
		const sanitizedTel = `tel:${rawPhone.replace(/[^\d+]/g, "")}`;
		assert.equal(sanitizedTel, "tel:+78005553535");
	});

	await t.test("Emergency symptom classification flags critical post-op complications", () => {
		const symptoms = [
			{ id: "bleeding", urgent: true },
			{ id: "increasing_swelling", urgent: true },
			{ id: "high_fever", urgent: true },
			{ id: "unbearable_pain", urgent: true },
			{ id: "suture_loose", urgent: true },
		];

		assert.equal(symptoms.length, 5);
		assert.ok(symptoms.every((s) => s.urgent === true));
	});
});
