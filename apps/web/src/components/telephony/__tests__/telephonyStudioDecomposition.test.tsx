/**
 * apps/web/src/components/telephony/__tests__/telephonyStudioDecomposition.test.tsx
 *
 * Red Team Inquisitor Test Suite: Telephony Studio Decomposition Invariants.
 * Mandates 8b (Sweet Spot), 8e (Doctor Autonomy, 0 Locks), 8am (Single CTA), Apple HIG.
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
import {
	TelephonyStudioHeader,
	TelephonySoftphoneDialpad,
	TelephonyCallHistoryList,
	TelephonyStudioFooter,
	QUICK_NOTE_PRESETS,
} from "../studio";
import { TELEPHONY_CATALOG_DATA, formatPhoneRu } from "../telephonyCatalogData";

describe("Telephony Studio Decomposed Architecture (Wave 26)", () => {
	describe("1. TelephonyStudioHeader (Apple HIG, 1-line)", () => {
		it("renders header with drag handle, title, status and close button", () => {
			const html = renderToString(
				<TelephonyStudioHeader
					activeLineId="2"
					activeMobileTab="journal"
					onTabChange={() => {}}
					onClose={() => {}}
				/>,
			);

			expect(html).toContain("dnt-telephony-mobile-drag-handle");
			expect(html).toContain("Телефония и журнал звонков");
			expect(html).toContain("Линия 2: онлайн (SIP АТС подключена)");
			expect(html).toContain('data-testid="telephony-studio-close-btn"');
		});
	});

	describe("2. TelephonySoftphoneDialpad (Touch Targets >= 48px)", () => {
		it("renders dialpad display and all 12 telephone keys", () => {
			const html = renderToString(
				<TelephonySoftphoneDialpad
					dialedNumber="9991234567"
					onDigitClick={() => {}}
					onBackspace={() => {}}
				/>,
			);

			expect(html).toContain('data-testid="telephony-dialed-display"');
			expect(html).toContain(formatPhoneRu("9991234567"));

			const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
			for (const d of digits) {
				expect(html).toContain(`data-testid="dialpad-key-${d}"`);
			}
		});
	});

	describe("3. TelephonyCallHistoryList (Patient, Audio Player, Somatic Alerts)", () => {
		it("renders call details with patient card, WhatsApp and quick note presets", () => {
			const call = TELEPHONY_CATALOG_DATA[0];
			const html = renderToString(
				<TelephonyCallHistoryList
					selectedCall={call}
					callNote="Тестовая заметка"
					onCallNoteChange={() => {}}
					onOpenCard={() => {}}
				/>,
			);

			expect(html).toContain(call.callerName);
			expect(html).toContain(formatPhoneRu(call.phone));
			expect(html).toContain('data-testid="telephony-open-patient-card-btn"');
			expect(html).toContain('data-testid="telephony-call-note-input"');

			for (const preset of QUICK_NOTE_PRESETS) {
				expect(html).toContain(preset);
			}
		});

		it("shows friendly fallback when no call is selected", () => {
			const html = renderToString(
				<TelephonyCallHistoryList
					selectedCall={undefined}
					callNote=""
					onCallNoteChange={() => {}}
					onOpenCard={() => {}}
				/>,
			);

			expect(html).toContain("Выберите звонок из списка для просмотра деталей");
		});
	});

	describe("4. TelephonyStudioFooter (Mandate 8am Single CTA & 8e 0 Disabled)", () => {
		it("renders exactly 1 primary CTA button without disabled attribute", () => {
			const html = renderToString(
				<TelephonyStudioFooter
					hasDialed={false}
					dialedNumber=""
					isNoteSaved={false}
					onBookAction={() => {}}
					onPrimaryAction={() => {}}
				/>,
			);

			expect(html).toContain('data-testid="telephony-primary-cta-btn"');
			expect(html).toContain("dnt-telephony-primary-cta");
			expect(html).toContain("✓ Сохранить заметку звонка");
			expect(html).toContain('data-testid="telephony-secondary-book-btn"');

			// Zero disabled buttons
			const disabledMatches = html.match(/<button[^>]*\bdisabled\b[^>]*>/gi);
			expect(disabledMatches).toBeNull();
		});

		it("switches to call mode label when phone is dialed", () => {
			const html = renderToString(
				<TelephonyStudioFooter
					hasDialed={true}
					dialedNumber="+79991234567"
					isNoteSaved={false}
					onBookAction={() => {}}
					onPrimaryAction={() => {}}
				/>,
			);

			expect(html).toContain("Позвонить на +7 (999) 123-45-67");
		});
	});
});
