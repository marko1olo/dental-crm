import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { IncomingCallPayload } from "../../../store/telephonyTypes";
import { resolveCallAdvertisingAttribution } from "../telephonyAttribution";

describe("Telephony Advertising Channel Attribution from UTM & PBX Trunks", () => {
	it("1.1. Detects Yandex.Direct from utmSource / utmCampaign", () => {
		const call: IncomingCallPayload = { phone: "+79991112233", patientId: null, patientName: "Неизвестный номер", provider: "uis", utmSource: "yandex_cpc", utmCampaign: "implants_msk", virtualNumber: "+74951234567" };
		const attr = resolveCallAdvertisingAttribution(call);
		assert.strictEqual(attr.channelKey, "yandex_direct");
		assert.strictEqual(attr.channelLabel, "Яндекс.Директ");
		assert.ok(attr.notesPayload.includes("Яндекс.Директ"));
		assert.ok(attr.notesPayload.includes("implants_msk"));
	});

	it("1.2. Detects 2GIS Maps from utmSource", () => {
		const call: IncomingCallPayload = { phone: "+79992223344", patientId: null, patientName: "Неизвестный номер", provider: "mango", utmSource: "2gis_geo", virtualNumber: "+74957654321" };
		const attr = resolveCallAdvertisingAttribution(call);
		assert.strictEqual(attr.channelKey, "gis_2");
		assert.strictEqual(attr.channelLabel, "2ГИС Карты");
	});

	it("1.3. Detects ProDoctorov from UTM source", () => {
		const call: IncomingCallPayload = { phone: "+79993334455", patientId: null, patientName: "Неизвестный номер", utmSource: "prodoctorov_portal" };
		const attr = resolveCallAdvertisingAttribution(call);
		assert.strictEqual(attr.channelKey, "prodoctorov");
		assert.strictEqual(attr.channelLabel, "ПроДокторов");
	});

	it("1.4. Detects NaPopravku from UTM source", () => {
		const call: IncomingCallPayload = { phone: "+79994445566", patientId: null, patientName: "Неизвестный номер", utmSource: "napopravku_booking" };
		const attr = resolveCallAdvertisingAttribution(call);
		assert.strictEqual(attr.channelKey, "napopravku");
		assert.strictEqual(attr.channelLabel, "НаПоправку");
	});

	it("1.5. Detects Website / SEO from organic search UTMs", () => {
		const call: IncomingCallPayload = { phone: "+79995556677", patientId: null, patientName: "Неизвестный номер", utmSource: "google_organic", utmMedium: "organic" };
		const attr = resolveCallAdvertisingAttribution(call);
		assert.strictEqual(attr.channelKey, "site_seo");
		assert.strictEqual(attr.channelLabel, "Сайт / SEO");
	});

	it("1.6. Detects Social Media (VK / Telegram) from UTM", () => {
		const call: IncomingCallPayload = { phone: "+79996667788", patientId: null, patientName: "Неизвестный номер", utmSource: "vk_ads" };
		const attr = resolveCallAdvertisingAttribution(call);
		assert.strictEqual(attr.channelKey, "social_media");
		assert.strictEqual(attr.channelLabel, "Соцсети (VK / TG)");
	});

	it("1.7. Resolves channel from clinic virtual trunk number map", () => {
		const clinicTrunks = { "+74950001111": "yandex_direct", "+74950002222": "gis_2", "+74950003333": "prodoctorov" };
		const call: IncomingCallPayload = { phone: "+79997778899", patientId: null, patientName: "Неизвестный номер", virtualNumber: "+74950002222" };
		const attr = resolveCallAdvertisingAttribution(call, clinicTrunks);
		assert.strictEqual(attr.channelKey, "gis_2");
		assert.strictEqual(attr.channelLabel, "2ГИС Карты");
	});

	it("1.8. Gracefully falls back to 'other' on unknown source", () => {
		const call: IncomingCallPayload = { phone: "+79998889900", patientId: null, patientName: "Неизвестный номер", provider: "zadarma" };
		const attr = resolveCallAdvertisingAttribution(call);
		assert.strictEqual(attr.channelKey, "other");
		assert.strictEqual(attr.channelLabel, "Прямой звонок / ВАТС");
	});
});
