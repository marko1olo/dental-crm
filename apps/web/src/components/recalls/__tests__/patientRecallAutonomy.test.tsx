/**
 * patientRecallAutonomy.test.tsx
 *
 * Unit tests for Patient Recall & Prophylaxis Autonomy (Canonical SSOT: PatientRecallsHubModal):
 * - Mandate 8d: 7 Deadly Sins & Touch Targets (Apple HIG min-height >= 44px, zero unicode checkmarks).
 * - Mandate 8e: Doctor & Staff Autonomy (Zero unexplained disabled/dead buttons, active guidance feedback).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty.
 * - Mandate 8o: Task-Scope Reporting.
 */

import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	PatientRecallsHubModal,
} from "../PatientRecallsHubModal.js";
import {
	generateSmsRecallMessage,
	generateTelegramRecallMessage,
	generateWhatsAppRecallMessage,
	buildWhatsAppUrl,
	buildTelegramUrl,
	type PatientRecallRecord,
} from "../patientRecallEngine.js";

describe("Patient Recall & Prophylaxis Autonomy (Mandates 8d, 8e, 8n)", () => {
	const hubCandidateWithoutPhone: PatientRecallRecord = {
		id: "hub-rec-no-phone",
		patientId: "pat-hub-no-phone",
		fullName: "Семенова Ольга Дмитриевна",
		phone: "",
		cycleType: "standard_prophylaxis",
		lastVisitDate: "2026-02-15",
		dueDate: "2026-08-15",
		daysOverdue: 10,
		urgencyStatus: "due_now",
		status: "due_now",
		historicalRevenueRub: 25000,
		visitsCount: 3,
	};

	it("1. Candidate action buttons are NOT disabled when phone is empty (Mandate 8e)", () => {
		const html = renderToStaticMarkup(
			createElement(PatientRecallsHubModal, {
				isOpen: true,
				onClose: () => {},
				initialCandidates: [hubCandidateWithoutPhone],
			})
		);

		assert.ok(html.includes('data-testid="recall-whatsapp-btn-hub-rec-no-phone"'), "WhatsApp button must be rendered");
		assert.ok(html.includes('data-testid="recall-telegram-btn-hub-rec-no-phone"'), "Telegram button must be rendered");
		assert.ok(html.includes('data-testid="recall-script-btn-hub-rec-no-phone"'), "Script button must be rendered");
		assert.ok(html.includes('data-testid="recall-book-btn-hub-rec-no-phone"'), "Book button must be rendered");
		assert.ok(html.includes('data-testid="recall-sms-btn-hub-rec-no-phone"'), "SMS button must be rendered");

		// Doctor autonomy: Buttons MUST NOT have disabled attribute
		assert.ok(!html.includes('data-testid="recall-whatsapp-btn-hub-rec-no-phone" disabled'), "WhatsApp button must NOT be disabled");
		assert.ok(!html.includes('data-testid="recall-telegram-btn-hub-rec-no-phone" disabled'), "Telegram button must NOT be disabled");
		assert.ok(!html.includes('data-testid="recall-script-btn-hub-rec-no-phone" disabled'), "Script button must NOT be disabled");
		assert.ok(!html.includes('data-testid="recall-book-btn-hub-rec-no-phone" disabled'), "Book button must NOT be disabled");
		assert.ok(!html.includes('data-testid="recall-sms-btn-hub-rec-no-phone" disabled'), "SMS button must NOT be disabled");
	});

	it("2. Candidate action buttons have Apple HIG touch target min-height >= 44px (Mandate 8d)", () => {
		const html = renderToStaticMarkup(
			createElement(PatientRecallsHubModal, {
				isOpen: true,
				onClose: () => {},
				initialCandidates: [hubCandidateWithoutPhone],
			})
		);

		// Touch-first buttons must have inline or CSS min-height 44px
		assert.ok(html.includes("min-height:44px") || html.includes("min-height: 44px"), "Touch targets must enforce Apple HIG min-height >= 44px");
	});

	it("3. Omnichannel message generators handle candidate without phone and format correctly", () => {
		const waMsg = generateWhatsAppRecallMessage(hubCandidateWithoutPhone, { clinicName: "ДЕНТЕ" });
		const tgMsg = generateTelegramRecallMessage(hubCandidateWithoutPhone, { clinicName: "ДЕНТЕ" });
		const smsMsg = generateSmsRecallMessage(hubCandidateWithoutPhone, { clinicName: "ДЕНТЕ" });

		assert.ok(waMsg.includes("Ольга"));
		assert.ok(tgMsg.includes("Ольга"));
		assert.ok(smsMsg.includes("Ольга"));

		// Booking URL generation with fallback
		const waUrl = buildWhatsAppUrl(hubCandidateWithoutPhone.phone, waMsg);
		assert.ok(waUrl.startsWith("https://wa.me/"));
		const tgUrl = buildTelegramUrl(hubCandidateWithoutPhone.phone, tgMsg);
		assert.ok(tgUrl.startsWith("https://t.me/"));
	});

	it("4. Zero emojis or raw unicode checkmarks in SMS copy button (Mandate 8d)", () => {
		const html = renderToStaticMarkup(
			createElement(PatientRecallsHubModal, {
				isOpen: true,
				onClose: () => {},
				initialCandidates: [hubCandidateWithoutPhone],
			})
		);

		// Extract SMS button portion
		const smsBtnMatch = html.match(/<button[^>]*data-testid="recall-sms-btn-hub-rec-no-phone"[^>]*>([\s\S]*?)<\/button>/);
		assert.ok(smsBtnMatch && smsBtnMatch[1], "SMS button must be found in markup");

		const btnContent = smsBtnMatch[1] ?? "";
		assert.ok(!btnContent.includes("✓"), "Must not contain raw unicode checkmark");
		const hasEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(btnContent);
		assert.strictEqual(hasEmoji, false, "SMS button must be completely free of raw emojis");
	});

	it("5. PatientRecallsHubModal returns empty markup when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(PatientRecallsHubModal, {
				isOpen: false,
				onClose: () => {},
			})
		);

		assert.strictEqual(html, "");
	});
});
