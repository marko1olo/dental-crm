import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateLabOrderCostAndMarkup } from "../routes/lab/ordersCrudModules/labOrderCostCalculator.js";
import { labOrderMarkInstalledHandler } from "../routes/lab/paymentModules/labOrderMarkInstalledHandler.js";
import type { FastifyReply, FastifyRequest } from "fastify";
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

	it("2. Валидация Idempotency-Key (UUIDv7) в labOrderMarkInstalledHandler", async () => {
		// Тест 1: Запрос без заголовка Idempotency-Key должен вернуть 400 IdempotencyKeyRequired
		let statusCode = 200;
		let jsonResponse: unknown = null;

		const mockReplyNoKey: Partial<FastifyReply> = {
			code(c: number) {
				statusCode = c;
				return this as FastifyReply;
			},
			send(payload: unknown) {
				jsonResponse = payload;
				return this as FastifyReply;
			},
			header() {
				return this as FastifyReply;
			},
		};

		const mockReqNoKey: Partial<FastifyRequest<{ Params: { id: string } }>> = {
			headers: {},
			params: { id: generateUuidV7() },
			body: {},
		};

		await labOrderMarkInstalledHandler(
			mockReqNoKey as FastifyRequest<{ Params: { id: string } }>,
			mockReplyNoKey as FastifyReply,
		);

		assert.equal(statusCode, 400);
		assert.deepEqual((jsonResponse as { error: string })?.error, "IdempotencyKeyRequired");

		// Тест 2: Запрос с невалидным Idempotency-Key (не UUID) должен вернуть 400 InvalidIdempotencyKey
		const mockReqInvalidKey: Partial<FastifyRequest<{ Params: { id: string } }>> = {
			headers: { "idempotency-key": "not-a-valid-uuid" },
			params: { id: generateUuidV7() },
			body: {},
		};

		await labOrderMarkInstalledHandler(
			mockReqInvalidKey as FastifyRequest<{ Params: { id: string } }>,
			mockReplyNoKey as FastifyReply,
		);

		assert.equal(statusCode, 400);
		assert.deepEqual((jsonResponse as { error: string })?.error, "InvalidIdempotencyKey");

		// Тест 3: Запрос с валидным UUIDv7 выставляет эхо-заголовок Idempotency-Key
		let headerSetKey = "";
		let headerSetValue = "";
		const validKey = generateUuidV7();

		const mockReplyValid: Partial<FastifyReply> = {
			code(c: number) {
				statusCode = c;
				return this as FastifyReply;
			},
			send(payload: unknown) {
				jsonResponse = payload;
				return this as FastifyReply;
			},
			header(k: string, v: string) {
				headerSetKey = k;
				headerSetValue = v;
				return this as FastifyReply;
			},
		};

		const mockReqValid: Partial<FastifyRequest<{ Params: { id: string } }>> = {
			headers: { "idempotency-key": validKey },
			params: { id: generateUuidV7() },
			body: {},
		};

		await labOrderMarkInstalledHandler(
			mockReqValid as FastifyRequest<{ Params: { id: string } }>,
			mockReplyValid as FastifyReply,
		);

		assert.equal(headerSetKey, "Idempotency-Key");
		assert.equal(headerSetValue, validKey);
	});
});
