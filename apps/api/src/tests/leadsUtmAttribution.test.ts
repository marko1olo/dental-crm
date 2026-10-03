/**
 * apps/api/src/tests/leadsUtmAttribution.test.ts
 *
 * DENTE Dental CRM — Leads UTM & Marketing Attribution Retention Tests
 *
 * Governed by:
 * - Mandate 8l (Marketing & Ad Campaign Retention)
 * - Mandate 8n (Zero Attribution Loss on Conversion)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractUtmAttribution } from "../routes/leadsConversion.js";

describe("Leads UTM Attribution & Retention Engine", () => {
	it("extracts standard UTM query parameters from notes or source", () => {
		const source = "Яндекс.Директ";
		const notes =
			"Пациент интересуется имплантацией All-on-4. utm_source=yandex&utm_medium=cpc&utm_campaign=all-on-4-msk&utm_content=banner1&utm_term=имплантация+зубов";

		const attribution = extractUtmAttribution(source, notes);

		assert.equal(attribution.utmSource, "yandex");
		assert.equal(attribution.utmMedium, "cpc");
		assert.equal(attribution.utmCampaign, "all-on-4-msk");
		assert.equal(attribution.utmContent, "banner1");
		assert.equal(
			attribution.formattedUtm,
			"UTM: source=yandex | medium=cpc | campaign=all-on-4-msk | content=banner1 | term=имплантация+зубов",
		);
	});

	it("handles colon formatted UTM pairs in lead notes", () => {
		const notes = "Заявка с сайта: utm_source: vk, utm_campaign: promo_spring, utm_medium: target";
		const attribution = extractUtmAttribution(null, notes);

		assert.equal(attribution.utmSource, "vk");
		assert.equal(attribution.utmCampaign, "promo_spring");
		assert.equal(attribution.utmMedium, "target");
		assert.equal(
			attribution.formattedUtm,
			"UTM: source=vk | medium=target | campaign=promo_spring",
		);
	});

	it("returns empty object when no UTM parameters exist without failing", () => {
		const attribution = extractUtmAttribution("Прямой звонок", "Острая боль в шестерке");

		assert.equal(attribution.utmSource, undefined);
		assert.equal(attribution.formattedUtm, undefined);
	});

	it("handles null or undefined inputs safely", () => {
		const attribution = extractUtmAttribution(null, null);
		assert.deepEqual(attribution, {});
	});
});
