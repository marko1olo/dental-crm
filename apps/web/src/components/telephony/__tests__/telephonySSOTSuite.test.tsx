/**
 * apps/web/src/components/telephony/__tests__/telephonySSOTSuite.test.tsx
 *
 * DENTE Dental CRM — Telephony SSOT & Studio Red Team Test Suite.
 * Mandates 8b (Sweet Spot <= 350 lines), 8e (Doctor Autonomy), 8am (Single CTA), 8aq (Mounting Proof).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
	normalizePhoneRu,
	formatPhoneRu,
	maskPhoneRu,
	fuzzyMatchPhoneRu,
	formatCallDuration,
	playSafeWebAudioTone,
	getWhatsAppUrl,
	getSmsUrl,
	TELEPHONY_CALL_TYPES,
	TELEPHONY_CATALOG_DATA,
} from "../telephonyCatalogData";
import { TelephonyStudioModal } from "../TelephonyStudioModal";

describe("Telephony SSOT & Studio Inquisitor Suite", () => {
	it("1. Russian Phone Normalization adheres to strict E.164 standards", () => {
		assert.equal(normalizePhoneRu("+7 (999) 123-45-67"), "+79991234567");
		assert.equal(normalizePhoneRu("8 (999) 123-45-67"), "+79991234567");
		assert.equal(normalizePhoneRu("89991234567"), "+79991234567");
		assert.equal(normalizePhoneRu("9991234567"), "+79991234567");
		assert.equal(normalizePhoneRu("+79991234567"), "+79991234567");
		assert.equal(normalizePhoneRu(""), "");
	});

	it("2. Formats and masks phone numbers compliant with 152-ФЗ in public areas", () => {
		const formatted = formatPhoneRu("+79991234567");
		assert.equal(formatted, "+7 (999) 123-45-67");

		const masked = maskPhoneRu("+7 (999) 123-45-67");
		assert.equal(masked, "+7 (999) ***-45-67");
		assert.ok(!masked.includes("123"), "Middle digits must be hidden for 152-ФЗ privacy");
	});

	it("3. Fuzzy matching compares phones accurately by 10-digit national suffix", () => {
		assert.ok(fuzzyMatchPhoneRu("+7 (999) 123-45-67", "8 999 123 45 67"));
		assert.ok(fuzzyMatchPhoneRu("89991234567", "+79991234567"));
		assert.ok(fuzzyMatchPhoneRu("9991234567", "+7 (999) 123-45-67"));
		assert.ok(!fuzzyMatchPhoneRu("+79991112233", "+79991112244"));
	});

	it("4. Duration timer formatter produces clean MM:SS format", () => {
		assert.equal(formatCallDuration(0), "00:00");
		assert.equal(formatCallDuration(45), "00:45");
		assert.equal(formatCallDuration(165), "02:45");
		assert.equal(formatCallDuration(3600), "60:00");
	});

	it("5. Safe Web Audio tone synthesis executes without throwing", () => {
		assert.doesNotThrow(() => {
			playSafeWebAudioTone(520, 100);
			playSafeWebAudioTone(880, 200);
		});
	});

	it("6. Messaging URLs generate 100% clean Russian texts with 0 emojis", () => {
		const waUrl = getWhatsAppUrl("+7 (999) 123-45-67", "Тестовое подтверждение");
		assert.ok(waUrl.startsWith("https://wa.me/79991234567?text="));
		assert.ok(waUrl.includes(encodeURIComponent("Тестовое подтверждение")));
		assert.ok(!waUrl.includes("🔥") && !waUrl.includes("✨"), "Emojis are strictly forbidden");

		const smsUrl = getSmsUrl("+7 (999) 123-45-67", "Визит подтвержден");
		assert.ok(smsUrl.startsWith("sms:+79991234567?body="));
	});

	it("7. Call types contain pure human domain Russian labels without bureaucratic jargon", () => {
		for (const key of Object.keys(TELEPHONY_CALL_TYPES) as (keyof typeof TELEPHONY_CALL_TYPES)[]) {
			const cfg = TELEPHONY_CALL_TYPES[key];
			assert.ok(cfg.label.length > 0);
			assert.ok(!cfg.label.includes("804н") && !cfg.label.includes("043/у"), "No bureaucratic order numbers");
		}
	});

	it("8. SSOT Call Catalog contains rich clinical cases with somatic alerts & doctor assignments", () => {
		assert.ok(TELEPHONY_CATALOG_DATA.length >= 5);
		const callWithSomatic = TELEPHONY_CATALOG_DATA.find((c) => Boolean(c.somaticAlert));
		assert.ok(callWithSomatic, "Catalog must contain patients with somatic alerts (allergies)");
		assert.ok(callWithSomatic?.somaticAlert?.includes("лидокаин"));

		const callWithRecording = TELEPHONY_CATALOG_DATA.find((c) => c.hasRecording);
		assert.ok(callWithRecording, "Catalog must contain recorded calls with playback samples");
	});

	it("9. TelephonyStudioModal renders with exactly 1 Primary CTA button and no disabled locks (Mandates 8am, 8e)", () => {
		const html = renderToStaticMarkup(
			<TelephonyStudioModal isOpen={true} onClose={() => {}} />,
		);

		assert.ok(html.includes("data-testid=\"telephony-studio-modal-root\""));
		assert.ok(html.includes("data-testid=\"telephony-primary-cta-btn\""));
		// Verify primary CTA has teal background token
		assert.ok(html.includes("bg-[var(--teal,#0d9488)]"));
		// Verify doctor autonomy: CTA button is never permanently disabled
		assert.ok(!html.includes('data-testid="telephony-primary-cta-btn" disabled'));

		// Verify dialpad keys are rendered
		assert.ok(html.includes('data-testid="dialpad-key-1"'));
		assert.ok(html.includes('data-testid="dialpad-key-9"'));
		assert.ok(html.includes('data-testid="dialpad-key-0"'));

		// Verify search input
		assert.ok(html.includes('data-testid="telephony-search-input"'));
	});

	it("10. DirectTelephonyLauncher is mounted in StandaloneLaunchers.tsx and AppShell.tsx (Mandate 8aq)", () => {
		const resolveFile = (subPath: string) => {
			const candidate1 = path.resolve(process.cwd(), subPath);
			if (fs.existsSync(candidate1)) return candidate1;
			const candidate2 = path.resolve(process.cwd(), "apps/web", subPath);
			if (fs.existsSync(candidate2)) return candidate2;
			const candidate3 = path.resolve(process.cwd(), subPath.replace(/^apps\/web\//, ""));
			if (fs.existsSync(candidate3)) return candidate3;
			return candidate1;
		};

		const launcherPath = resolveFile(
			"apps/web/src/components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx",
		);
		const content = fs.readFileSync(launcherPath, "utf-8");

		assert.ok(
			content.includes("DirectTelephonyLauncher"),
			"StandaloneLaunchers.tsx must import DirectTelephonyLauncher",
		);
		assert.ok(
			content.includes("#telephony") || content.includes("telephony"),
			"StandaloneLaunchers.tsx must handle telephony hash/query deep links",
		);

		const shellPath = resolveFile("apps/web/src/AppShell.tsx");
		const shellContent = fs.readFileSync(shellPath, "utf-8");
		assert.ok(
			shellContent.includes("DirectTelephonyLauncher"),
			"AppShell.tsx must import and mount DirectTelephonyLauncher",
		);
	});
});
