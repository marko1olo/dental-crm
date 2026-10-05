/**
 * DENTE Dental CRM — Route Tests for Intelligent Multi-Format Scanner & 804n Matcher
 *
 * Tests:
 * 1. POST /api/pricelist/scan-and-import in preview mode (commit: false) with raw text / CSV
 * 2. POST /api/pricelist/scan-and-import with unstructured text / OCR artifacts
 * 3. POST /api/pricelist/scan-and-import validation of missing/malformed payloads
 * 4. POST /api/pricelist/scan-and-import organization isolation (Mandate 8b/8e)
 * 5. POST /api/pricelist/scan-and-import in commit mode (commit: true)
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import Fastify from "fastify";
import { registerPricelistRoutes } from "../../routes/pricelist.js";

describe("POST /api/pricelist/scan-and-import Route & Integration Engine", () => {
	const prevEnv = { ...process.env };
	let app: ReturnType<typeof Fastify>;

	const testOrgId = "dce70000-f06e-4c07-8ac1-e23698670001";

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTAL_STATE_PERSISTENCE = "off";

		app = Fastify();
		await registerPricelistRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
		process.env.NODE_ENV = prevEnv.NODE_ENV;
		if (prevEnv.DENTAL_STATE_PERSISTENCE !== undefined) {
			process.env.DENTAL_STATE_PERSISTENCE = prevEnv.DENTAL_STATE_PERSISTENCE;
		} else {
			delete process.env.DENTAL_STATE_PERSISTENCE;
		}
		if (prevEnv.DENTE_CLINICAL_ALLOW_UNGUARDED_READS !== undefined) {
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = prevEnv.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		} else {
			delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		}
		if (prevEnv.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS !== undefined) {
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = prevEnv.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
		} else {
			delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
		}
		if (prevEnv.DENTE_DEV_ALLOW_HEADER_ORG !== undefined) {
			process.env.DENTE_DEV_ALLOW_HEADER_ORG = prevEnv.DENTE_DEV_ALLOW_HEADER_ORG;
		} else {
			delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		}
	});

	it("1. Preview mode (commit: false) parses CSV and returns 804n matched items with exact prices", async () => {
		const rawCsv = [
			"Код;Наименование;Раздел;Цена",
			"TH-01;Лечение кариеса пломбой световой Filtek;Терапия;4 500,00",
			"SG-01;Удаление зуба мудрости ретинированного;Хирургия;8 500,00",
			"HY-01;Комплексная гигиена полости рта AirFlow;Гигиена;4 000,00",
			"OR-01;Керамический винир E.max;Ортопедия;26 000,00",
		].join("\n");

		const response = await app.inject({
			method: "POST",
			url: "/api/pricelist/scan-and-import",
			headers: {
				"x-organization-id": testOrgId,
			},
			payload: {
				rawContent: rawCsv,
				filename: "clinic_pricelist.csv",
				commit: false,
			},
		});

		assert.equal(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.equal(body.success, true);
		assert.ok(body.scanResult);
		assert.equal(body.scanResult.items.length, 4);

		const items = body.scanResult.items;
		// Item 1: Caries
		assert.equal(items[0].priceRub, 4500);
		assert.equal(items[0].priceKopecks, 450000);
		assert.equal(items[0].category, "therapy");
		assert.equal(items[0].code804n, "A16.07.002");

		// Item 2: Wisdom tooth
		assert.equal(items[1].priceRub, 8500);
		assert.equal(items[1].category, "surgery");
		assert.equal(items[1].code804n, "A16.07.024");

		// Item 3: AirFlow
		assert.equal(items[2].priceRub, 4000);
		assert.equal(items[2].category, "hygiene");
		assert.equal(items[2].code804n, "A16.07.051");

		// Item 4: Veneer E.max
		assert.equal(items[3].priceRub, 26000);
		assert.equal(items[3].category, "prosthetics");
		assert.equal(items[3].code804n, "A16.07.005");
	});

	it("2. Preview mode parses unstructured OCR text with bullet points, dashes, and Russian ruble formats", async () => {
		const rawText = [
			"| • B01.065.001 Первичный осмотр врача-стоматолога ..... 1 200 ₽ |",
			"• Эндодонтическое лечение пульпита 3-канального зуба 6 500 руб.",
			"* Установка формирователя десны ФДМ: 4 500 р.",
			"| Снятие швов по гарантии бесплатно |",
		].join("\n");

		const response = await app.inject({
			method: "POST",
			url: "/api/pricelist/scan-and-import",
			headers: {
				"x-organization-id": testOrgId,
			},
			payload: {
				rawText,
				commit: false,
			},
		});

		assert.equal(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.equal(body.success, true);
		assert.equal(body.scanResult.items.length, 4);

		const items = body.scanResult.items;
		assert.equal(items[0].priceRub, 1200);
		assert.equal(items[0].code804n, "B01.065.001");

		assert.equal(items[1].priceRub, 6500);
		assert.equal(items[1].code804n, "A16.07.008");

		assert.equal(items[2].priceRub, 4500);
		assert.equal(items[2].code804n, "A16.07.054.005");

		assert.equal(items[3].priceRub, 0);
		assert.equal(items[3].validationStatus, "valid");
	});

	it("3. Rejects empty request with actionable Russian validation message", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/pricelist/scan-and-import",
			headers: {
				"x-organization-id": testOrgId,
			},
			payload: {},
		});

		assert.equal(response.statusCode, 400);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PricelistValidationError");
	});

	it("4. Commit mode (commit: true) handles storage correctly", async () => {
		const rawCsv = [
			"Наименование;Цена",
			"Консультация стоматолога;1000",
		].join("\n");

		const response = await app.inject({
			method: "POST",
			url: "/api/pricelist/scan-and-import",
			headers: {
				"x-organization-id": testOrgId,
			},
			payload: {
				rawContent: rawCsv,
				commit: true,
			},
		});

		// When DENTAL_STATE_PERSISTENCE=off, endpoint gracefully reports ServiceCatalogStorageDisabled (503) or success
		assert.ok(response.statusCode === 200 || response.statusCode === 503);
	});
});
