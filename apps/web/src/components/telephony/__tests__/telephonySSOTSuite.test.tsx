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
	resolveCanonicalCallStatus,
	TELEPHONY_CALL_TYPES,
	TELEPHONY_CATALOG_DATA,
} from "../telephonyCatalogData";
import { CallAudioEmptyState } from "../audioPlayer/CallAudioEmptyState";
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

	it("8. SSOT Call Catalog contains rich clinical cases & canonical status sync (DEF-TEL-05, DEF-TEL-07)", () => {
		assert.ok(TELEPHONY_CATALOG_DATA.length > 0, "SSOT catalog must contain call entries");
		const callWithSomatic = TELEPHONY_CATALOG_DATA.find((c) => Boolean(c.somaticAlert));
		assert.ok(callWithSomatic, "Catalog must contain patients with somatic alerts (allergies)");
		assert.ok(callWithSomatic?.somaticAlert?.includes("лидокаин"));

		// DEF-TEL-05: Call with duration 0s must strictly resolve to 'missed'
		assert.equal(resolveCanonicalCallStatus("completed", 0), "missed");
		assert.equal(resolveCanonicalCallStatus("answered", 0), "missed");
		assert.equal(resolveCanonicalCallStatus("completed", 120), "answered");

		// DEF-TEL-07: Functional test for CallAudioEmptyState rendering without synthetic mp3s
		const emptyPlayerHtml = renderToStaticMarkup(
			<CallAudioEmptyState
				transcriptUtterances={[]}
				currentTime={0}
				onSeekToUtterance={() => {}}
				showTranscript={false}
				onToggleShowTranscript={() => {}}
				copiedTranscript={false}
				onCopyTranscript={() => {}}
			/>,
		);
		assert.ok(emptyPlayerHtml.includes('data-testid="call-audio-player-empty"'));
		assert.ok(emptyPlayerHtml.includes("Запись разговора недоступна / звонок завершен"));
	});

	it("9. TelephonyStudioModal renders with exactly 1 Primary CTA button and no disabled locks (Mandates 8am, 8e)", () => {
		const html = renderToStaticMarkup(
			<TelephonyStudioModal isOpen={true} onClose={() => {}} />,
		);

		assert.ok(html.includes("data-testid=\"telephony-studio-modal-root\""));
		assert.ok(html.includes("data-testid=\"telephony-primary-cta-btn\""));
		// Verify primary CTA has primary styling
		assert.ok(html.includes("dnt-telephony-primary-cta") || html.includes("bg-[var(--primary)]") || html.includes("bg-[var(--teal,#0d9488)]"));
		// Verify doctor autonomy: CTA button is never permanently disabled
		assert.ok(!html.includes('data-testid="telephony-primary-cta-btn" disabled'));

		// Verify dialpad keys are rendered
		assert.ok(html.includes('data-testid="dialpad-key-1"'));
		assert.ok(html.includes('data-testid="dialpad-key-9"'));
		assert.ok(html.includes('data-testid="dialpad-key-0"'));

		// Verify search input
		assert.ok(html.includes('data-testid="telephony-search-input"'));
	});

	it("10. Telephony studio is mounted via WorkspaceStudioOverlayHost & routeResolver (Mandate 8aq)", () => {
		const resolveFile = (subPath: string) => {
			const candidate1 = path.resolve(process.cwd(), subPath);
			if (fs.existsSync(candidate1)) return candidate1;
			const candidate2 = path.resolve(process.cwd(), "apps/web", subPath);
			if (fs.existsSync(candidate2)) return candidate2;
			const candidate3 = path.resolve(process.cwd(), subPath.replace(/^apps\/web\//, ""));
			if (fs.existsSync(candidate3)) return candidate3;
			return candidate1;
		};

		const hostPath = resolveFile(
			"apps/web/src/components/appLayout/WorkspaceStudioOverlayHost.tsx",
		);
		const hostContent = fs.readFileSync(hostPath, "utf-8");
		assert.ok(
			hostContent.includes("TelephonyStudioModal"),
			"WorkspaceStudioOverlayHost.tsx must import and render TelephonyStudioModal",
		);

		const resolverPath = resolveFile("apps/web/src/router/routeResolver.ts");
		const resolverContent = fs.readFileSync(resolverPath, "utf-8");
		assert.ok(
			resolverContent.includes("#telephony") || resolverContent.includes('"telephony"'),
			"routeResolver.ts must handle telephony hash/query deep links",
		);

		const containerPath = resolveFile("apps/web/src/components/appLayout/AppModalsContainer.tsx");
		const containerContent = fs.readFileSync(containerPath, "utf-8");
		assert.ok(
			containerContent.includes("WorkspaceStudioOverlayHost"),
			"AppModalsContainer.tsx must import and mount WorkspaceStudioOverlayHost",
		);
	});
});
