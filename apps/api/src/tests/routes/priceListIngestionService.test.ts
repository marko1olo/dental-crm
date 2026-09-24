import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { ServiceCatalogItem } from "@dental/shared";
import {
	extractLinesFromPriceList,
	extractPriceAndTitleFromLine,
	matchOrder804nNomenclature,
	crossReferenceWithExistingCatalog,
	ingestPriceList,
} from "../../services/ai/priceListIngestionService.js";
import { createDenteApiApp } from "../../server.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { fixtureUuid } from "../support/fixtureOrganizations.js";

const NAMESPACE = "priceIngestTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const USER_ID = fixtureUuid(NAMESPACE, 2);

describe("Minzdrav Order 804n Price List Ingestion Service & Ingest Route Tests", () => {
	it("extracts lines and cleans headers/footers from messy price list text", () => {
		const raw = `
			Прейскурант цен ООО "Дента Люкс"
			Утверждаю: Главный врач Иванов И.И. 2026 г.
			====================================
			A16.07.002 Восстановление зуба световой пломбой   4 500,50 руб.
			1. Лечение глубокого кариеса (световая пломба) - 3500 ₽
			2. Удаление постоянного зуба сложное  -- 5200 р.
			Установка имплантата Osstem   35000
			------------------------------------
			Страница 1 из 5
		`;

		const lines = extractLinesFromPriceList(raw, "text");
		assert.ok(lines.length >= 4, `Expected at least 4 items, got ${lines.length}`);
		assert.ok(!lines.some((l) => l.includes("Утверждаю")), "Headers should be stripped");
		assert.ok(!lines.some((l) => l.includes("Страница 1")), "Footers should be stripped");
	});

	it("extracts prices with exact kopecks and cleans commercial titles", () => {
		const res1 = extractPriceAndTitleFromLine("A16.07.002.001 Наложение пломбы светоотверждаемой 4 500,50 руб");
		assert.equal(res1.priceRub, 4500.50);
		assert.equal(res1.priceKopecks, 450050);
		assert.ok(res1.cleanTitleWithoutPrice.includes("Наложение пломбы светоотверждаемой"));

		const res2 = extractPriceAndTitleFromLine("1.2.3. Лечение кариеса эмали - 2500 ₽");
		assert.equal(res2.priceRub, 2500);
		assert.equal(res2.priceKopecks, 250000);
		assert.equal(res2.cleanTitleWithoutPrice, "Лечение кариеса эмали");

		const res3 = extractPriceAndTitleFromLine("Коронка из диоксида циркония   18000");
		assert.equal(res3.priceRub, 18000);
		assert.equal(res3.cleanTitleWithoutPrice, "Коронка из диоксида циркония");
	});

	it("matches Order 804n nomenclature by explicit code and clinical keywords", () => {
		const matchExplicit = matchOrder804nNomenclature(
			"A16.07.002 Восстановление зуба пломбой",
			"Восстановление зуба пломбой",
		);
		assert.equal(matchExplicit.code804n, "A16.07.002");
		assert.equal(matchExplicit.confidenceKind, "exact_code");
		assert.ok(matchExplicit.confidence >= 0.95);

		const matchTherapy = matchOrder804nNomenclature(
			"Лечение глубокого кариеса светоотверждаемым композитом",
			"Лечение глубокого кариеса светоотверждаемым композитом",
		);
		assert.equal(matchTherapy.code804n, "A16.07.002");
		assert.equal(matchTherapy.category, "therapy");

		const matchSurgery = matchOrder804nNomenclature(
			"Сложное удаление ретинированного зуба мудрости",
			"Сложное удаление ретинированного зуба мудрости",
		);
		assert.equal(matchSurgery.code804n, "A16.07.024");
		assert.equal(matchSurgery.category, "surgery");

		const matchImplant = matchOrder804nNomenclature(
			"Установка дентального имплантата Straumann Roxolid",
			"Установка дентального имплантата Straumann Roxolid",
		);
		assert.equal(matchImplant.code804n, "A16.07.054");
	});

	it("cross-references with existing catalog and suggests correct actions", () => {
		const existingCatalog: ServiceCatalogItem[] = [
			{
				id: "srv-1",
				organizationId: ORG_ID,
				code: "A16.07.002",
				title: "Лечение кариеса",
				category: "therapy",
				specialty: "therapist",
				basePriceRub: 4500,
				durationMinutes: 30,
				taxDeductible: true,
				active: true,
				aliases: [],
			},
			{
				id: "srv-2",
				organizationId: ORG_ID,
				code: "A16.07.001",
				title: "Удаление зуба",
				category: "surgery",
				specialty: "surgeon",
				basePriceRub: 3000,
				durationMinutes: 30,
				taxDeductible: true,
				active: true,
				aliases: [],
			},
		];

		// Identical match (code/title & same price)
		const refIdentical = crossReferenceWithExistingCatalog("A16.07.002", "Лечение кариеса", 4500, existingCatalog);
		assert.equal(refIdentical.suggestedAction, "identical");
		assert.equal(refIdentical.matchedExistingServiceId, "srv-1");

		// Update existing (same service, different price)
		const refUpdate = crossReferenceWithExistingCatalog("A16.07.002", "Лечение кариеса", 5000, existingCatalog);
		assert.equal(refUpdate.suggestedAction, "update_existing");
		assert.equal(refUpdate.matchedExistingServiceId, "srv-1");

		// Brand new service
		const refNew = crossReferenceWithExistingCatalog("A16.07.054", "Имплантация Osstem", 35000, existingCatalog);
		assert.equal(refNew.suggestedAction, "create_new");
	});

	it("runs full ingestPriceList pipeline and calculates stats", async () => {
		const rawText = `
			A16.07.002 Лечение кариеса 4500 руб
			Удаление зуба мудрости 8500 ₽
			Профессиональная гигиена полости рта 4500
		`;
		const response = await ingestPriceList({
			rawContent: rawText,
			sourceType: "text",
			commit: false,
		});

		assert.equal(response.success, true);
		assert.equal(response.proposals.length, 3);
		assert.ok(response.stats.recognizedCount === 3);
		assert.ok(response.stats.averageConfidence > 0.8);
	});
});

describe("POST /api/pricelist/ingest Route Integration", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTAL_STATE_PERSISTENCE = "off";
		process.env.AUTH_TOKEN_SECRET =
			process.env.AUTH_TOKEN_SECRET || "dente-test-secret-at-least-32-chars-long!!";

		clinicToken = signToken({ organizationId: ORG_ID }, authTokenSecret());
		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: USER_ID,
				role: "admin",
			},
			authTokenSecret(),
		);

		app = await createDenteApiApp({
			startTelegramWorker: false,
			startCommunicationWorker: false,
			startMigrationWorker: false,
		});
		await app.ready();
	});

	after(async () => {
		await app.close();
	});

	it("returns 400 for empty or invalid payload", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/pricelist/ingest",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: {
				rawContent: "",
			},
		});
		assert.equal(res.statusCode, 400);
	});

	it("successfully parses legacy price list and returns proposals with 804n mapping", async () => {
		const rawPricelist = `
			A16.07.002.001 Восстановление зуба светоотверждаемым композитом 4 500,50 руб.
			Удаление постоянного зуба сложное 3500 ₽
			Внутрикостная дентальная имплантация Straumann 45000 руб
		`;

		const res = await app.inject({
			method: "POST",
			url: "/api/pricelist/ingest",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: {
				rawContent: rawPricelist,
				sourceType: "text",
				commit: false,
			},
		});

		assert.equal(res.statusCode, 200);
		const data = JSON.parse(res.body);
		assert.equal(data.success, true);
		assert.ok(Array.isArray(data.proposals));
		assert.equal(data.proposals.length, 3);
		assert.equal(data.proposals[0].code804n, "A16.07.002.001");
		assert.equal(data.proposals[0].priceRub, 4500.50);
		assert.equal(data.proposals[0].priceKopecks, 450050);
		assert.ok(data.stats.recognizedCount === 3);
	});
});
