import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { calculateLabOrderCostAndMarkup } from "../routes/lab/ordersCrudModules/labOrderCostCalculator.js";
import { labOrderMarkInstalledHandler } from "../routes/lab/paymentModules/labOrderMarkInstalledHandler.js";
import { generateUuidV7 } from "@dental/shared";

describe("Domain 25 Red Team Fixer Surgeon: API & Lab Cost Calculator", () => {
	it("1. Дифференцированный расчет стоимости мостовидного протеза в labOrderCostCalculator", () => {
		// Обычная коронка (1 единица)
		const singleCrown = calculateLabOrderCostAndMarkup({
			materialOrConstruction: "crown_zirconia",
			unitsCount: 1,
			customCostPerUnitKopecks: 750000, // 7500 руб
			priceKopecks: 2400000, // 24000 руб
		});
		assert.equal(singleCrown.unitsCount, 1);
		assert.equal(singleCrown.estimatedCostKopecks, 750000);
		assert.equal(singleCrown.suggestedPriceKopecks, 2400000);

		// Мостовидный протез: 3 зуба (14, 15, 16) -> 2 опоры + 1 понтик
		// Опора: 24 000 руб (себестоимость 7500 руб), Понтик: 70% = 16 800 руб (себестоимость 5250 руб)
		const bridge = calculateLabOrderCostAndMarkup({
			materialOrConstruction: "bridge_zirconia",
			unitsCount: 3,
			abutmentsCount: 2,
			ponticsCount: 1,
			abutmentPriceKopecks: 2400000,
			ponticPriceKopecks: 1680000,
			abutmentCostKopecks: 750000,
			ponticCostKopecks: 525000,
		});

		assert.equal(bridge.abutmentsCount, 2);
		assert.equal(bridge.ponticsCount, 1);
		// Цена: 2 * 24 000 + 1 * 16 800 = 64 800 руб = 6 480 000 коп
		assert.equal(bridge.suggestedPriceKopecks, 6480000, "Цена моста обязана исключать плоское умножение");
		// Себестоимость: 2 * 7500 + 1 * 5250 = 20 250 руб = 2 025 000 коп
		assert.equal(bridge.estimatedCostKopecks, 2025000, "Себестоимость ЗТЛ обязана исключать плоское умножение");
		assert.equal(bridge.grossMarginKopecks, 6480000 - 2025000);
	});

	it("2. Канонический Fastify app.inject() для валидации Idempotency-Key в labOrderMarkInstalledHandler", async () => {
		const app = Fastify();
		app.post<{ Params: { id: string } }>("/api/lab-orders/:id/mark-installed", labOrderMarkInstalledHandler);
		await app.ready();

		try {
			// Тест 1: Запрос с невалидным Idempotency-Key (не UUID) должен вернуть 400 InvalidIdempotencyKey
			const resInvalid = await app.inject({
				method: "POST",
				url: `/api/lab-orders/${generateUuidV7()}/mark-installed`,
				headers: { "idempotency-key": "not-a-valid-uuid" },
				payload: {},
			});

			assert.equal(resInvalid.statusCode, 400);
			const jsonInvalid = resInvalid.json<{ error: string }>();
			assert.equal(jsonInvalid.error, "InvalidIdempotencyKey");

			// Тест 2: Запрос без переданного Idempotency-Key отклоняется с 400 IdempotencyKeyRequired (Мандат 8d/8zp)
			const resNoKey = await app.inject({
				method: "POST",
				url: `/api/lab-orders/${generateUuidV7()}/mark-installed`,
				headers: {},
				payload: {},
			});

			assert.equal(resNoKey.statusCode, 400);
			const jsonNoKey = resNoKey.json<{ error: string }>();
			assert.equal(jsonNoKey.error, "IdempotencyKeyRequired");

			// Тест 3: Запрос с валидным UUIDv7 выставляет эхо-заголовок Idempotency-Key
			const validKey = generateUuidV7();
			const resValid = await app.inject({
				method: "POST",
				url: `/api/lab-orders/${generateUuidV7()}/mark-installed`,
				headers: { "idempotency-key": validKey },
				payload: {},
			});

			assert.equal(resValid.headers["idempotency-key"], validKey);
		} finally {
			await app.close();
		}
	});
});
