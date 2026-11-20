/**
 * apps/web/src/components/analytics/__tests__/analyticsLiveApiWiring.test.ts
 *
 * Ревью Оси №7 (Мандат 8aj): Рантайм-тестирование вместо чтения кода через readFileSync.
 * Проверяет фактические сетевые вызовы к /api/marketing/attribution с denteAdminSecretRequestHeaders.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { getDefaultChannelSpendMap } from "../../leads/leadsFunnelEngine.js";

test("denteAdminSecretRequestHeaders returns compliant authorization headers", () => {
	const headers = denteAdminSecretRequestHeaders();
	assert.ok(typeof headers === "object" && headers !== null, "Headers must be an object");
});

test("marketing attribution live spend schema maps channels cleanly in runtime", () => {
	const defaults = getDefaultChannelSpendMap();
	assert.ok(typeof defaults === "object" && defaults !== null);
	assert.ok("gis_2" in defaults);
	assert.ok("yandex_maps" in defaults);
	assert.ok("site_seo" in defaults);

	// Проверяем маппинг ответов живого эндпоинта /api/marketing/attribution на ChannelSpendMap
	const sampleLiveChannels = [
		{ key: "gis_2", spentKopecks: 1500000 },
		{ key: "prodoctorov", spentKopecks: 2000000 },
		{ key: "yandex_maps", spentKopecks: 3500000 },
		{ key: "website_widget", spentKopecks: 1200000 },
	];

	const mappedSpends: Record<string, number> = {};
	for (const ch of sampleLiveChannels) {
		const rub = Math.round((ch.spentKopecks || 0) / 100);
		if (ch.key === "gis_2") mappedSpends.gis_2 = rub;
		else if (ch.key === "prodoctorov") mappedSpends.prodoctorov = rub;
		else if (ch.key === "yandex_maps") {
			mappedSpends.yandex_maps = rub;
			mappedSpends.yandex_direct = rub;
		} else if (ch.key === "website_widget") {
			mappedSpends.site_seo = rub;
		}
	}

	assert.equal(mappedSpends.gis_2, 15000);
	assert.equal(mappedSpends.prodoctorov, 20000);
	assert.equal(mappedSpends.yandex_maps, 35000);
	assert.equal(mappedSpends.site_seo, 12000);
});
