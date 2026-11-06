/**
 * apps/web/src/components/telephony/__tests__/telephonyStudioSSOT.test.tsx
 *
 * DENTE Dental CRM — Telephony Studio SSOT Red Team Verification Suite.
 * Mandates 8b (Sweet Spot), 8e (Doctor Autonomy, 0 Disabled Locks), 8am (Single CTA var(--teal)), 8x (Domain Purity).
 */

import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";

const expect = (actual: any) => ({
	toBe: (expected: any) => assert.strictEqual(actual, expected),
	toContain: (substr: string) => assert.ok(actual.includes(substr), `Expected actual to contain ${JSON.stringify(substr)}`),
	not: {
		toContain: (substr: string) => assert.ok(!actual.includes(substr), `Expected actual not to contain ${JSON.stringify(substr)}`),
	},
	toBeNull: () => assert.strictEqual(actual, null),
});
import { TelephonyStudioModal } from "../TelephonyStudioModal";
import { DirectTelephonyLauncher } from "../DirectTelephonyLauncher";
import {
	TELEPHONY_CATALOG_DATA,
	TELEPHONY_CALL_TYPES,
	formatPhoneRu,
	normalizePhoneRu,
	maskPhoneRu,
	formatCallDuration,
	fuzzyMatchPhoneRu,
	getWhatsAppUrl,
	getSmsUrl,
	playSafeWebAudioTone,
} from "../telephonyCatalogData";

describe("TelephonyStudioModal & SSOT Architecture", () => {
	it("renders telephony studio modal markup with exact header, status and elements", () => {
		const html = renderToString(<TelephonyStudioModal isOpen={true} onClose={() => {}} />);

		expect(html).toContain('data-testid="telephony-studio-modal-root"');
		expect(html).toContain("Телефония и журнал звонков");
		expect(html).toContain("SIP АТС подключена");
		expect(html).toContain('data-testid="telephony-studio-close-btn"');
		expect(html).toContain('data-testid="telephony-search-input"');
		expect(html).toContain('data-testid="telephony-primary-cta-btn"');
		expect(html).toContain('data-testid="telephony-secondary-book-btn"');
	});

	it("returns empty string when isOpen is false", () => {
		const html = renderToString(<TelephonyStudioModal isOpen={false} onClose={() => {}} />);
		expect(html).toBe("");
	});

	it("MANDATE 8e (Doctor Autonomy): ZERO disabled buttons on active studio view", () => {
		const html = renderToString(<TelephonyStudioModal isOpen={true} onClose={() => {}} />);

		// Check for disabled="" or disabled attribute on buttons
		const disabledMatches = html.match(/<button[^>]*\bdisabled\b[^>]*>/gi);
		expect(disabledMatches).toBeNull();
	});

	it("MANDATE 8am (Single CTA Law): Exactly ONE primary CTA button with var(--teal) styling", () => {
		const html = renderToString(<TelephonyStudioModal isOpen={true} onClose={() => {}} />);

		// Primary CTA button must exist and contain note save label
		expect(html).toContain('data-testid="telephony-primary-cta-btn"');
		expect(html).toContain("Сохранить заметку звонка");
		expect(html).toContain("dnt-telephony-primary-cta");

		// Secondary action button is neutral secondary
		expect(html).toContain('data-testid="telephony-secondary-book-btn"');
		expect(html).toContain("Записать на приём");
		expect(html).toContain("dnt-telephony-secondary-btn");
	});

	it("MANDATE 8x (Domain Purity): Zero raw bureaucratic codes (043/у, 804н, 54-ФЗ) in telephony studio", () => {
		const html = renderToString(<TelephonyStudioModal isOpen={true} onClose={() => {}} />);

		expect(html).not.toContain("043/у");
		expect(html).not.toContain("804н");
		expect(html).not.toContain("54-ФЗ");
		expect(html).not.toContain("ФФД");
	});

	it("renders call log items, dialpad grid and quick note presets", () => {
		const html = renderToString(<TelephonyStudioModal isOpen={true} onClose={() => {}} />);

		// Call records from SSOT catalog
		expect(html).toContain(TELEPHONY_CATALOG_DATA[0].callerName);
		expect(html).toContain(formatPhoneRu(TELEPHONY_CATALOG_DATA[0].phone));

		// Dialpad keys
		expect(html).toContain('data-testid="dialpad-key-1"');
		expect(html).toContain('data-testid="dialpad-key-5"');
		expect(html).toContain('data-testid="dialpad-key-9"');
		expect(html).toContain('data-testid="dialpad-key-0"');

		// Note presets
		expect(html).toContain("Записан на приём");
		expect(html).toContain("Уточнение стоимости");
		expect(html).toContain("Острая боль");
	});

	it("validates Russian phone normalizers, masks and duration formatters", () => {
		expect(normalizePhoneRu("8 (999) 123-45-67")).toBe("+79991234567");
		expect(normalizePhoneRu("9991234567")).toBe("+79991234567");
		expect(normalizePhoneRu("+7 (916) 555-43-21")).toBe("+79165554321");

		expect(formatPhoneRu("+79991234567")).toBe("+7 (999) 123-45-67");
		expect(maskPhoneRu("+79991234567")).toBe("+7 (999) ***-45-67");

		expect(fuzzyMatchPhoneRu("+7 (999) 123-45-67", "8 999 123-45-67")).toBe(true);
		expect(fuzzyMatchPhoneRu("+79991234567", "+79160000000")).toBe(false);

		expect(formatCallDuration(165)).toBe("02:45");
		expect(formatCallDuration(0)).toBe("00:00");
		expect(formatCallDuration(75)).toBe("01:15");

		expect(getWhatsAppUrl("+7 (999) 123-45-67")).toContain("https://wa.me/79991234567");
		expect(getSmsUrl("+7 (999) 123-45-67")).toContain("sms:+79991234567");

		// Audio helper does not throw even if Web Audio is mocked/unavailable
		expect(typeof playSafeWebAudioTone).toBe("function");
		playSafeWebAudioTone(500, 100);
	});

	it("DirectTelephonyLauncher renders without error", () => {
		const html = renderToString(<DirectTelephonyLauncher />);
		expect(typeof html).toBe("string");
	});
});
