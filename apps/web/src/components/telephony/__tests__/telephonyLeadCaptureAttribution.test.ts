/**
 * telephonyLeadCaptureAttribution.test.ts
 *
 * Test suite for 1-Click Inbound Telephony Lead Capture with Automatic Marketing Channel Attribution
 * (UTM tags, Virtual PBX / Trunk numbers, Call tracking).
 *
 * Mandates:
 * - Mandate 8e & 8n (Solo Doctor & Reception Autonomy: 1-click capture, non-blocking)
 * - Mandate 8c & 8d (Luxury tokens, quiet telemetry, zero carnival colors)
 * - Miller's Law (Strictly <= 2 primary direct buttons + consolidated more menu)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it, beforeEach, test } from "vitest";
import {
	resolveCallAdvertisingAttribution,
	captureLeadFromIncomingCall,
	CHANNEL_DISPLAY_NAMES,
	CHANNEL_BADGE_COLORS,
} from "../telephonyAttribution";
import type { IncomingCallPayload } from "../../../store/telephonyTypes";
import { useTelephonyStore } from "../../../store/telephonyStore";
import { useLeadsStore } from "../../../store/leadsStore";

describe("Telephony & Inbound Lead Capture with Marketing Attribution", () => {
	beforeEach(() => {
		useTelephonyStore.setState({
			activeCall: null,
			callHistory: [],
		});
		useLeadsStore.setState({
			leads: [],
		});
	});

	describe("1. Advertising Channel Attribution from UTM & PBX Trunks", () => {
		it("1.1. Detects Yandex.Direct from utmSource / utmCampaign", () => {
			const call: IncomingCallPayload = {
				phone: "+79991112233",
				patientId: null,
				patientName: "Неизвестный номер",
				provider: "uis",
				utmSource: "yandex_cpc",
				utmCampaign: "implants_msk",
				virtualNumber: "+74951234567",
			};

			const attr = resolveCallAdvertisingAttribution(call);
			assert.strictEqual(attr.channelKey, "yandex_direct");
			assert.strictEqual(attr.channelLabel, "Яндекс.Директ");
			assert.ok(attr.notesPayload.includes("Яндекс.Директ"));
			assert.ok(attr.notesPayload.includes("implants_msk"));
			assert.ok(attr.notesPayload.includes("UIS / CoMagic"));
		});

		it("1.2. Detects 2GIS Maps from utmSource", () => {
			const call: IncomingCallPayload = {
				phone: "+79992223344",
				patientId: null,
				patientName: "Неизвестный номер",
				provider: "mango",
				utmSource: "2gis_geo",
				virtualNumber: "+74957654321",
			};

			const attr = resolveCallAdvertisingAttribution(call);
			assert.strictEqual(attr.channelKey, "gis_2");
			assert.strictEqual(attr.channelLabel, "2ГИС Карты");
			assert.ok(attr.notesPayload.includes("2ГИС Карты"));
			assert.ok(attr.notesPayload.includes("Mango Telecom"));
		});

		it("1.3. Detects ProDoctorov from UTM source", () => {
			const call: IncomingCallPayload = {
				phone: "+79993334455",
				patientId: null,
				patientName: "Неизвестный номер",
				utmSource: "prodoctorov_portal",
			};

			const attr = resolveCallAdvertisingAttribution(call);
			assert.strictEqual(attr.channelKey, "prodoctorov");
			assert.strictEqual(attr.channelLabel, "ПроДокторов");
		});

		it("1.4. Detects NaPopravku from UTM source", () => {
			const call: IncomingCallPayload = {
				phone: "+79994445566",
				patientId: null,
				patientName: "Неизвестный номер",
				utmSource: "napopravku_booking",
			};

			const attr = resolveCallAdvertisingAttribution(call);
			assert.strictEqual(attr.channelKey, "napopravku");
			assert.strictEqual(attr.channelLabel, "НаПоправку");
		});

		it("1.5. Detects Website / SEO from organic search UTMs", () => {
			const call: IncomingCallPayload = {
				phone: "+79995556677",
				patientId: null,
				patientName: "Неизвестный номер",
				utmSource: "google_organic",
				utmMedium: "organic",
			};

			const attr = resolveCallAdvertisingAttribution(call);
			assert.strictEqual(attr.channelKey, "site_seo");
			assert.strictEqual(attr.channelLabel, "Сайт / SEO");
		});

		it("1.6. Detects Social Media (VK / Telegram) from UTM", () => {
			const call: IncomingCallPayload = {
				phone: "+79996667788",
				patientId: null,
				patientName: "Неизвестный номер",
				utmSource: "vk_ads",
			};

			const attr = resolveCallAdvertisingAttribution(call);
			assert.strictEqual(attr.channelKey, "social_media");
			assert.strictEqual(attr.channelLabel, "Соцсети (VK / TG)");
		});

		it("1.7. Resolves channel from clinic virtual trunk number map", () => {
			const clinicTrunks = {
				"+74950001111": "yandex_direct",
				"+74950002222": "gis_2",
				"+74950003333": "prodoctorov",
			};

			const call: IncomingCallPayload = {
				phone: "+79997778899",
				patientId: null,
				patientName: "Неизвестный номер",
				virtualNumber: "+74950002222",
			};

			const attr = resolveCallAdvertisingAttribution(call, clinicTrunks);
			assert.strictEqual(attr.channelKey, "gis_2");
			assert.strictEqual(attr.channelLabel, "2ГИС Карты");
		});

		it("1.8. Gracefully falls back to 'other' (Прямой звонок / ВАТС) on unknown source", () => {
			const call: IncomingCallPayload = {
				phone: "+79998889900",
				patientId: null,
				patientName: "Неизвестный номер",
				provider: "zadarma",
			};

			const attr = resolveCallAdvertisingAttribution(call);
			assert.strictEqual(attr.channelKey, "other");
			assert.strictEqual(attr.channelLabel, "Прямой звонок / ВАТС");
			assert.ok(attr.notesPayload.includes("Zadarma PBX"));
		});
	});

	describe("2. 1-Click Lead Capture Action", () => {
		it("2.1. captureLeadFromIncomingCall creates lead and updates telephony store", async () => {
			const originalFetch = global.fetch;
			let sentUrl = "";
			let sentBody: Record<string, unknown> = {};

			// Mock successful API response
			global.fetch = (async (url: string | URL, init?: RequestInit) => {
				sentUrl = String(url);
				if (init?.body) {
					sentBody = JSON.parse(String(init.body));
				}
				return {
					ok: true,
					status: 201,
					json: async () => ({
						id: "lead-new-123",
						name: sentBody.name,
						phone: sentBody.phone,
						source: sentBody.source,
						status: "new",
						notes: sentBody.notes,
					}),
				} as Response;
			}) as unknown as typeof fetch;

			try {
				const call: IncomingCallPayload = {
					callId: "call-xyz-777",
					phone: "+79997771122",
					patientId: null,
					patientName: "Неизвестный номер",
					provider: "uis",
					utmSource: "yandex_direct",
					utmCampaign: "retargeting",
					virtualNumber: "+74951112233",
				};

				useTelephonyStore.setState({ activeCall: call });

				const res = await captureLeadFromIncomingCall(call, {
					customName: "Сергей Николаевич",
					customNotes: "Интересуется керамическими винирами E.max",
				});

				assert.strictEqual(res.success, true);
				assert.strictEqual(sentUrl, "/api/leads");
				assert.strictEqual(sentBody.name, "Сергей Николаевич");
				assert.strictEqual(sentBody.phone, "+79997771122");
				assert.strictEqual(sentBody.source, "yandex_direct");
				assert.strictEqual(sentBody.status, "new");
				assert.ok(String(sentBody.notes).includes("Яндекс.Директ"));
				assert.ok(String(sentBody.notes).includes("UIS / CoMagic"));
				assert.ok(String(sentBody.notes).includes("винирами E.max"));

				// Check active call updated with captured lead ID
				const active = useTelephonyStore.getState().activeCall;
				assert.strictEqual(active?.leadId, "lead-new-123");
				assert.strictEqual(active?.isLeadCaptured, true);
			} finally {
				global.fetch = originalFetch;
			}
		});

		it("2.2. Handles server failure gracefully without unhandled rejection", async () => {
			const originalFetch = global.fetch;
			global.fetch = (async () => {
				return {
					ok: false,
					status: 500,
					json: async () => ({ message: "Ошибка базы данных" }),
				} as Response;
			}) as unknown as typeof fetch;

			try {
				const call: IncomingCallPayload = {
					phone: "+79990001122",
					patientId: null,
					patientName: "Неизвестный",
				};

				const res = await captureLeadFromIncomingCall(call);
				assert.strictEqual(res.success, false);
				assert.strictEqual(res.message, "Ошибка базы данных");
			} finally {
				global.fetch = originalFetch;
			}
		});
	});

	describe("3. Visual & Ergonomics Integrity (Miller's Law & Tokens)", () => {
		const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
			? path.resolve(process.cwd(), "apps/web/src")
			: path.resolve(process.cwd(), "src");

		const popupPath = path.resolve(
			srcDir,
			"components/telephony/IncomingCallPopup.tsx",
		);
		const drawerPath = path.resolve(
			srcDir,
			"components/telephony/TelephonyDrawer.tsx",
		);
		const widgetPath = path.resolve(
			srcDir,
			"components/telephony/TelephonyFloatingWidget.tsx",
		);

		const popupSource = fs.readFileSync(popupPath, "utf-8");
		const drawerSource = fs.readFileSync(drawerPath, "utf-8");
		const widgetSource = fs.readFileSync(widgetPath, "utf-8");

		it("3.1. IncomingCallPopup provides 1-click lead capture and marketing attribution badge", () => {
			assert.ok(
				popupSource.includes('data-testid="incoming-call-marketing-channel-badge"'),
				"IncomingCallPopup must display marketing channel attribution badge for unfamiliar callers",
			);
			assert.ok(
				popupSource.includes('data-testid="badge-action-capture-lead"'),
				"IncomingCallPopup must provide 1-click capture action in more menu",
			);
			assert.ok(
				popupSource.includes('data-testid="drawer-action-capture-lead"'),
				"IncomingCallPopup drawer view must provide 1-click lead capture button",
			);
		});

		it("3.2. TelephonyDrawer provides dedicated 1-click lead capture card with attribution", () => {
			assert.ok(
				drawerSource.includes('data-testid="telephony-drawer-marketing-channel-badge"'),
				"TelephonyDrawer must display marketing channel badge in caller header",
			);
			assert.ok(
				drawerSource.includes('data-testid="telephony-drawer-lead-capture-card"'),
				"TelephonyDrawer must render dedicated 1-click lead capture card for unknown callers",
			);
			assert.ok(
				drawerSource.includes('data-testid="drawer-action-capture-lead"'),
				"TelephonyDrawer must provide drawer-action-capture-lead button",
			);
		});

		it("3.3. TelephonyFloatingWidget provides 1-click lead capture in consolidated more menu", () => {
			assert.ok(
				widgetSource.includes('data-testid="widget-action-capture-lead"'),
				"TelephonyFloatingWidget must provide 1-click lead capture option in widget-more-menu-dropdown",
			);
		});

		it("3.4. All 8 canonical marketing channels have defined display names and tokens", () => {
			const expectedKeys = [
				"yandex_direct",
				"gis_2",
				"prodoctorov",
				"napopravku",
				"site_seo",
				"social_media",
				"recommendations",
				"other",
			];

			for (const key of expectedKeys) {
				assert.ok(
					CHANNEL_DISPLAY_NAMES[key as keyof typeof CHANNEL_DISPLAY_NAMES],
					`Missing display name for ${key}`,
				);
				assert.ok(
					CHANNEL_BADGE_COLORS[key as keyof typeof CHANNEL_BADGE_COLORS],
					`Missing badge colors for ${key}`,
				);
			}
		});
	});
});
