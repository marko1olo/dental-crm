import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PatientRecallsHubModal } from "../../PatientRecallsHubModal";
import {
	generateSmsRecallMessage,
	generateTelegramRecallMessage,
	generateWhatsAppRecallMessage,
	type PatientRecallRecord,
	type RecallCycleType,
} from "../../patientRecallEngine";
import { CLINICAL_CALLING_SCRIPTS } from "../../recallTemplates";

describe("2. Zero Cartoon Emojis (Mandate 8d pt 7)", () => {
	const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
	const forbiddenChars = ["✓", "✔", "❌", "🦷", "📅", "📞", "💬", "⭐", "⚠️", "🔥"];

	const mockCand: PatientRecallRecord = {
		id: "cand-hygiene-01",
		patientId: "pat-101",
		fullName: "Волкова Мария Сергеевна",
		phone: "+7 (916) 123-45-67",
		cycleType: "standard_prophylaxis",
		lastVisitDate: "2026-03-01",
		dueDate: "2026-09-01",
		daysOverdue: 24,
		urgencyStatus: "due_now",
		status: "due_now",
		attendingDoctorName: "Д-р Кузнецова Е.В.",
		historicalRevenueRub: 18500,
		visitsCount: 2,
	};

	const allCycleTypes: readonly RecallCycleType[] = [
		"standard_prophylaxis",
		"periodontal_maintenance",
		"implant_monitoring",
		"orthodontic_braces",
		"orthodontic_aligners",
		"orthodontic_retention",
		"pediatric_fluoridation",
		"caries_high_risk",
		"prosthetic_check",
	];

	it("verifies zero emojis or unicode checkmarks across all 9 clinical cycles in WhatsApp/Telegram/SMS", () => {
		for (const cycle of allCycleTypes) {
			const cand: PatientRecallRecord = { ...mockCand, cycleType: cycle };
			const wa = generateWhatsAppRecallMessage(cand, { clinicName: "ДЕНТЕ" });
			const tg = generateTelegramRecallMessage(cand, { clinicName: "ДЕНТЕ" });
			const sms = generateSmsRecallMessage(cand, { clinicName: "ДЕНТЕ" });

			for (const text of [wa, tg, sms]) {
				assert.strictEqual(emojiRegex.test(text), false, `Emoji in cycle ${cycle}: "${text}"`);
				for (const sym of forbiddenChars) {
					assert.ok(!text.includes(sym), `Forbidden symbol "${sym}" in cycle ${cycle}: "${text}"`);
				}
			}
		}
	});

	it("verifies zero cartoon emojis in speech calling scripts and objection handling", () => {
		for (const cycle of allCycleTypes) {
			const script = CLINICAL_CALLING_SCRIPTS[cycle];
			if (!script) continue;
			assert.strictEqual(emojiRegex.test(script.greeting), false);
			assert.strictEqual(emojiRegex.test(script.clinicalContext), false);
			assert.strictEqual(emojiRegex.test(script.callToAction), false);
			for (const obj of script.objections) {
				assert.strictEqual(emojiRegex.test(obj.suggestedResponse), false);
				assert.strictEqual(emojiRegex.test(obj.psychologicalTip), false);
			}
		}
	});

	it("verifies rendered modal HTML is completely free of raw unicode emojis and checkmarks", () => {
		const html = renderToStaticMarkup(
			createElement(PatientRecallsHubModal, { isOpen: true, onClose: () => {}, initialCandidates: [mockCand] }),
		);
		assert.strictEqual(emojiRegex.test(html), false);
		assert.ok(!html.includes("✓") && !html.includes("✔"));
	});
});
