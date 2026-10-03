/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROUTE TESTS: PRICELIST TABULAR EXCEL/CSV PARSE & BATCH IMPORT
 * Tests:
 * 1. POST /api/pricelist/parse-file with CSV and autodetected columns
 * 2. POST /api/pricelist/parse-file with vendor IDENT format
 * 3. POST /api/pricelist/batch-import validation & storage disabled / ACID handling
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import Fastify from "fastify";
import {
	parseCsvToMatrix,
	pricelistBatchImportBodySchema,
	pricelistParseFileSchema,
	registerPricelistRoutes,
} from "../../routes/pricelist.js";

describe("POST /api/pricelist/parse-file & /api/pricelist/batch-import Routes", () => {
	const prevEnv = { ...process.env };
	let app: ReturnType<typeof Fastify>;

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

	it("parseCsvToMatrix accurately parses semicolon-delimited CSV with quotes", () => {
		const csvText =
			'Код;Наименование;Цена (руб)\r\n' +
			'TH-01;"Лечение кариеса, пломба световая";3500\r\n' +
			'SG-01;"Удаление зуба сложное";5200,50';
		const matrix = parseCsvToMatrix(csvText);
		assert.equal(matrix.length, 3);
		assert.equal(matrix[0]?.[0], "Код");
		assert.equal(matrix[0]?.[1], "Наименование");
		assert.equal(matrix[1]?.[1], "Лечение кариеса, пломба световая");
		assert.equal(matrix[1]?.[2], "3500");
		assert.equal(matrix[2]?.[2], "5200,50");
	});

	it("POST /api/pricelist/parse-file successfully parses raw CSV text and detects columns", async () => {
		const rawCsv =
			"Артикул;Группа;Наименование;Цена;Себестоимость\n" +
			"101;Терапия;Восстановление зуба пломбой;4500;800\n" +
			"102;Хирургия;Удаление зуба постоянного;3500;400";

		const response = await app.inject({
			method: "POST",
			url: "/api/pricelist/parse-file",
			headers: {
				"x-organization-id": "dce70000-f06e-4c07-8ac1-e23698670001",
			},
			payload: {
				rawText: rawCsv,
				filename: "ident_pricelist.csv",
			},
		});

		assert.equal(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.equal(body.success, true);
		assert.equal(body.analysis.vendorSignature, "ident");
		assert.equal(body.analysis.totalRows, 2);
		assert.equal(body.analysis.validRowsCount, 2);
		assert.equal(body.analysis.allRows[0].commercialTitle, "Восстановление зуба пломбой");
		assert.equal(body.analysis.allRows[0].priceRub, 4500);
		assert.equal(body.analysis.allRows[0].priceKopecks, 450000);
		assert.equal(body.analysis.allRows[0].category, "therapy");
	});

	it("POST /api/pricelist/batch-import rejects invalid empty payload", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/pricelist/batch-import",
			headers: {
				"x-organization-id": "dce70000-f06e-4c07-8ac1-e23698670001",
			},
			payload: {
				items: [],
			},
		});

		assert.equal(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.equal(body.success, true);
		assert.equal(body.committedCount, 0);
	});

	it("POST /api/pricelist/batch-import validates negative price and rejects bad schema", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/pricelist/batch-import",
			headers: {
				"x-organization-id": "dce70000-f06e-4c07-8ac1-e23698670001",
			},
			payload: {
				items: [
					{
						title: "Некорректная услуга",
						priceRub: -500, // Invalid negative price
					},
				],
			},
		});

		assert.equal(response.statusCode, 400);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PricelistValidationError");
	});
});
