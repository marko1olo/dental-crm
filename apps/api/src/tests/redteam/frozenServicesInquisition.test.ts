/**
 * apps/api/src/tests/redteam/frozenServicesInquisition.test.ts
 *
 * RED TEAM INQUISITOR — MERCILLESS AUDIT OF FROZEN BACKEND SERVICES
 * Target modules:
 * - apps/api/src/services/money/ & apps/api/src/money/ (patient debt, fiscal billing, kkt receipt factory)
 * - apps/api/src/services/pricelist/ & apps/api/src/pricelist/ (analyzer, Order 804n ingestion)
 * - apps/api/src/services/ingestion/ (IdentityResolutionEngine, document extraction)
 *
 * Invariants tested:
 * 1. Mandate 8b: Zero IEEE-754 float drift in money parsing, balances, and split tenders.
 * 2. 54-FZ / FFD 1.2: Statutory requisites (Tags 1055, 1199, 1057, 1222, 1227, 1228).
 * 3. Identity Resolution: Rejection of false '+' phones, Russian date normalization, SNILS/Passport fast match.
 * 4. Mandate 8i: Zero hospital/inpatient bloat terms in dental services.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	parseKopecks,
	formatKopecksToRubles,
	rublesToKopecks,
	sumKopecks,
	multiplyKopecks,
	splitKopecks,
	FFD12_TAG_1057_AGENT_CODES,
	FFD12_TAG_1222_AGENT_CODES,
	FFD12_TAG_1199_VAT_CODES,
	createFiscalReceiptPayloadSchema,
} from "@dental/shared";

// Money service facades
import {
	FiscalReceiptFactory,
	Fiscal54FzService,
	buildPatientLedger,
	patientOwesClinicKopecks,
	validateSplitPaymentRow,
	MoneyPrecisionError,
} from "../../services/money/index.js";

// Pricelist service facades
import {
	parseMoney,
	extractPriceAndTitleFromLine,
	crossReferenceWithExistingCatalog,
} from "../../services/pricelist/index.js";

// Ingestion service
import {
	IdentityResolutionEngine,
	patientIdentityRecordSchema,
} from "../../services/ingestion/IdentityResolutionEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("RED TEAM INQUISITION: Frozen Services Integrity Audit", () => {
	// =========================================================================
	// 1. MANDATE 8b: KOPECK-EXACT ARITHMETIC & ZERO IEEE-754 FLOAT DRIFT
	// =========================================================================
	describe("1. Mandate 8b Kopeck-Exact Arithmetic & Zero Float Drift", () => {
		it("eliminates floating-point accumulation drift across split tenders and multi-payments", () => {
			// Classic IEEE-754 trap: 0.1 + 0.2 !== 0.3
			assert.notEqual(0.1 + 0.2, 0.3);

			// In Mandate 8b exact kopecks: 10 kop + 20 kop === 30 kop
			const kop10 = parseKopecks("0.10");
			const kop20 = parseKopecks("0.20");
			const kop30 = parseKopecks("0.30");
			assert.equal(kop10 + kop20, kop30);
			assert.equal(sumKopecks([kop10, kop20]), kop30);

			// Split 100.00 into 3 parts: must sum exactly to 100.00 (10000 kopecks)
			const total100Kop = parseKopecks(100);
			const splits = splitKopecks(total100Kop, 3);
			assert.equal(splits.length, 3);
			assert.equal(splits[0]! + splits[1]! + splits[2]!, 10000);
			assert.equal(splits[0], 3334); // largest remainder allocation
			assert.equal(splits[1], 3333);
			assert.equal(splits[2], 3333);
		});

		it("pricelist analyzer parseMoney enforces exact kopeck extraction without float rounding error", () => {
			assert.equal(parseMoney("1500,50"), 1500.5);
			assert.equal(parseMoney("4 500,75"), 4500.75);
			assert.equal(parseMoney("12000"), 12000);
			assert.equal(parseMoney("3 200"), 3200);

			// Exact kopecks verification
			assert.equal(parseKopecks(parseMoney("4 500,75")), 450075);
			assert.equal(parseKopecks(parseMoney("1500,50")), 150050);
		});

		it("priceListIngestionService extracts exact kopecks and matches existing catalog with zero float epsilon", () => {
			const parsed = extractPriceAndTitleFromLine("Кариес эмали 4 500,50 руб");
			assert.equal(parsed.priceRub, 4500.5);
			assert.equal(parsed.priceKopecks, 450050);
			assert.equal(parsed.cleanTitleWithoutPrice, "Кариес эмали");

			// Catalog cross reference with exact kopecks
			const existing = [
				{
					id: "srv-1",
					title: "Кариес эмали",
					basePriceRub: 4500.5,
					code: "A16.07.002",
				},
			];
			const xref = crossReferenceWithExistingCatalog(
				"A16.07.002",
				"Кариес эмали",
				4500.5,
				existing as any,
			);
			assert.equal(xref.suggestedAction, "identical");
			assert.equal(xref.matchedExistingServiceId, "srv-1");
		});

		it("patientDebt calculates patient debt and validates split payments strictly in kopecks", () => {
			const ledger = buildPatientLedger(
				"pat-1",
				[
					{
						patientId: "pat-1",
						unitPriceRub: "1500.50",
						quantity: 1,
						discountRub: 0,
						status: "completed",
					},
				],
				[
					{
						patientId: "pat-1",
						amountRub: "1000.00",
						status: "paid",
					},
				],
			);
			const debtKop = patientOwesClinicKopecks(ledger);
			assert.equal(debtKop, 50050);
			assert.equal(formatKopecksToRubles(debtKop), "500.50");

			// Validate split tender matching exact kopecks
			const validSplit = validateSplitPaymentRow({
				patientId: "pat-1",
				status: "paid",
				amountRub: "100.00",
				splitTenders: [
					{ kind: "cash", amountRub: "33.34" },
					{ kind: "card", amountRub: "33.33" },
					{ kind: "sbp", amountRub: "33.33" },
				],
			});
			assert.equal(validSplit, 10000);

			// Validate split tender mismatch throwing MoneyPrecisionError
			assert.throws(
				() =>
					validateSplitPaymentRow({
						patientId: "pat-1",
						status: "paid",
						amountRub: "100.00",
						splitTenders: [
							{ kind: "cash", amountRub: "33.33" }, // Missing 1 kopeck!
							{ kind: "card", amountRub: "33.33" },
							{ kind: "sbp", amountRub: "33.33" },
						],
					}),
				MoneyPrecisionError,
			);
		});
	});

	// =========================================================================
	// 2. 54-FZ & FFD 1.2 STATUTORY FISCAL REQUISITES
	// =========================================================================
	describe("2. 54-FZ & FFD 1.2 Statutory Fiscal Requisites", () => {
		it("validates statutory taxation system Tag 1055 and VAT rates Tag 1199", () => {
			assert.equal(FFD12_TAG_1199_VAT_CODES.vat_20, 1);
			assert.equal(FFD12_TAG_1199_VAT_CODES.vat_10, 2);
			assert.equal(FFD12_TAG_1199_VAT_CODES.vat_0, 5);
			assert.equal(FFD12_TAG_1199_VAT_CODES.vat_none, 6);

			const receiptInput = {
				patientId: "00000000-0000-0000-0000-000000000001",
				customerContact: "+79991234567",
				operationType: "income" as const,
				taxationSystem: "usn_income" as const,
				agentSign: "paying_agent" as const, // Tag 1057
				customerName: "ООО 'Дента Страхование'", // Tag 1227
				customerInn: "7701234567", // Tag 1228 (10 digits B2B)
				items: [
					{
						name: "Профессиональная гигиена полости рта",
						priceKopecks: 450000,
						amountKopecks: 450000,
						quantity: 1,
						vatRate: "vat_none" as const, // Tag 1199
						paymentMethod: "full_payment" as const, // Tag 1214
						paymentObject: "service" as const, // Tag 1212
						agentSign: "agent" as const, // Tag 1222
					},
				],
				electronicCardKopecks: 450000,
				totalKopecks: 450000,
			};

			const parsed = createFiscalReceiptPayloadSchema.parse(receiptInput);
			assert.equal(parsed.agentSign, "paying_agent");
			assert.equal(parsed.customerName, "ООО 'Дента Страхование'");
			assert.equal(parsed.customerInn, "7701234567");
			assert.equal(parsed.items[0]!.agentSign, "agent");
		});

		it("rejects invalid customer INN that violates Russian statutory format (must be 10 or 12 digits)", () => {
			const invalidInput = {
				patientId: "00000000-0000-0000-0000-000000000001",
				customerContact: "+79991234567",
				customerName: "Неверный ИНН",
				customerInn: "12345", // INVALID length
				items: [
					{
						name: "Осмотр",
						priceKopecks: 50000,
						amountKopecks: 50000,
						quantity: 1,
						vatRate: "vat_none" as const,
					},
				],
				cashKopecks: 50000,
				totalKopecks: 50000,
			};

			assert.throws(
				() => createFiscalReceiptPayloadSchema.parse(invalidInput),
				/ИНН покупателя должен содержать 10 \(для ЮЛ\) или 12 \(для ИП\/ФЛ\) цифр/,
			);
		});

		it("Fiscal54FzService and FiscalReceiptFactory correctly compile Tag 1057, Tag 1222, Tag 1227, Tag 1228 into FFD 1.2 payload", () => {
			assert.equal(Fiscal54FzService.resolveTag1057("paying_agent"), 3);
			assert.equal(Fiscal54FzService.resolveTag1057("paying_subagent"), 4);
			assert.equal(Fiscal54FzService.resolveTag1057("commission_agent"), 6);
			assert.equal(Fiscal54FzService.resolveTag1222("agent"), 7);

			const compiled = Fiscal54FzService.buildStatutoryFiscalReceipt({
				organizationId: "org-1",
				patientId: "pat-1",
				customerContact: "+79991234567",
				cashierFullName: "Иванов И.И.",
				operationType: "income",
				taxationSystem: "usn_income",
				agentSign: "paying_agent",
				customerName: "АО Страховая Группа",
				customerInn: "7705123456",
				positions: [
					{
						name: "Лечение поверхностного кариеса",
						priceRub: 3500,
						quantity: 1,
						vatRate: "vat_none",
						agentSign: "commission_agent",
					},
				],
				tenderSplits: {
					electronicCardRub: 3500,
				},
			});

			assert.equal(compiled.tag1057_agentSign, 3);
			assert.equal(compiled.tag1227_customerName, "АО Страховая Группа");
			assert.equal(compiled.tag1228_customerInn, "7705123456");
			assert.equal(compiled.items[0]!.tag1222_agentSign, 6);

			const ffd12 = FiscalReceiptFactory.buildFfd12Receipt({
				patientId: "00000000-0000-0000-0000-000000000001",
				customerContact: "+79991234567",
				operationType: "income",
				taxationSystem: "usn_income",
				agentSign: "paying_agent",
				customerName: "АО Страховая Группа",
				customerInn: "7705123456",
				cashierFullName: "Иванов И.И.",
				items: [
					{
						name: "Лечение поверхностного кариеса",
						priceKopecks: 350000,
						amountKopecks: 350000,
						quantity: 1,
						vatRate: "vat_none",
						agentSign: "commission_agent",
					},
				] as any,
				electronicCardKopecks: 350000,
				totalKopecks: 350000,
			});

			assert.equal(ffd12.tag1057_agentSign, 3);
			assert.equal(ffd12.tag1227_customerName, "АО Страховая Группа");
			assert.equal(ffd12.tag1228_customerInn, "7705123456");
			assert.equal(ffd12.items[0]!.tag1222_agentSign, 6);
		});
	});

	// =========================================================================
	// 3. IDENTITY RESOLUTION ENGINE: INGESTION PURGE
	// =========================================================================
	describe("3. Identity Resolution Engine Integrity", () => {
		it("rejects invalid non-digit phone string producing fake '+' false matches", () => {
			assert.equal(IdentityResolutionEngine.normalizePhone("invalid-phone"), null);
			assert.equal(IdentityResolutionEngine.normalizePhone("no-digits-here"), null);
			assert.equal(IdentityResolutionEngine.normalizePhone(""), null);

			const candidate1 = {
				fullName: "Тестовый Пациент 1",
				phone: "invalid-phone",
			};
			const candidate2 = {
				fullName: "Другой Пациент",
				phone: "no-digits-here",
			};

			const result = IdentityResolutionEngine.evaluateMatch(candidate1, candidate2);
			assert.equal(result.breakdown.phoneMatch, null);
			assert.equal(result.confidence < 0.5, true);
			assert.equal(result.action, "CREATE_NEW");
		});

		it("normalizes Russian date formats (DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD) preventing false mismatch penalty", () => {
			assert.equal(IdentityResolutionEngine.normalizeBirthDate("15.04.1988"), "1988-04-15");
			assert.equal(IdentityResolutionEngine.normalizeBirthDate("15/04/1988"), "1988-04-15");
			assert.equal(IdentityResolutionEngine.normalizeBirthDate("1988-04-15"), "1988-04-15");

			// With matching phone + birthDate -> AUTO_MERGE
			const matchWithPhone = IdentityResolutionEngine.evaluateMatch(
				{
					fullName: "Смирнов Алексей Викторович",
					birthDate: "15.04.1988",
					phone: "+7 999 123-45-67",
				},
				{
					fullName: "Смирнов Алексей Викторович",
					birthDate: "1988-04-15",
					phone: "+7 (999) 123-45-67",
				},
			);
			assert.equal(matchWithPhone.breakdown.birthDateMatch, true);
			assert.equal(matchWithPhone.confidence >= 0.85, true);
			assert.equal(matchWithPhone.action, "AUTO_MERGE");

			// Without phone: identical name and birthdate -> MANUAL_REVIEW
			const matchWithoutPhone = IdentityResolutionEngine.evaluateMatch(
				{
					fullName: "Смирнов Алексей Викторович",
					birthDate: "15.04.1988",
				},
				{
					fullName: "Смирнов Алексей Викторович",
					birthDate: "1988-04-15",
				},
			);
			assert.equal(matchWithoutPhone.breakdown.birthDateMatch, true);
			assert.equal(matchWithoutPhone.confidence, 0.8);
			assert.equal(matchWithoutPhone.action, "MANUAL_REVIEW");
		});

		it("executes fast statutory exact match on SNILS, Russian Passport, and OMS policy", () => {
			// SNILS match
			const snilsMatch = IdentityResolutionEngine.evaluateMatch(
				{ fullName: "Иванов И.И.", snils: "123-456-789 01" },
				{ fullName: "Иванов Иван", snils: "12345678901" },
			);
			assert.equal(snilsMatch.breakdown.snilsMatch, true);
			assert.equal(snilsMatch.confidence, 0.99);
			assert.equal(snilsMatch.action, "AUTO_MERGE");

			// Passport match
			const passMatch = IdentityResolutionEngine.evaluateMatch(
				{ fullName: "Петров П.П.", passport: "4509 123456" },
				{ fullName: "Петров Петр", passport: "45 09 № 123456" },
			);
			assert.equal(passMatch.breakdown.passportMatch, true);
			assert.equal(passMatch.confidence, 0.98);
			assert.equal(passMatch.action, "AUTO_MERGE");

			// OMS match
			const omsMatch = IdentityResolutionEngine.evaluateMatch(
				{ fullName: "Сидоров С.С.", omsNumber: "1234 5678 9012 3456" },
				{ fullName: "Сидоров Сергей", omsNumber: "1234567890123456" },
			);
			assert.equal(omsMatch.breakdown.omsMatch, true);
			assert.equal(omsMatch.confidence, 0.96);
			assert.equal(omsMatch.action, "AUTO_MERGE");
		});

		it("validates identity records via patientIdentityRecordSchema", () => {
			const valid = patientIdentityRecordSchema.parse({
				id: "00000000-0000-0000-0000-000000000001",
				fullName: "Кузнецова Анна Павловна",
				phone: "+7 999 123-45-67",
				birthDate: "12.08.1995",
				snils: "112-233-445 95",
			});
			assert.equal(valid.fullName, "Кузнецова Анна Павловна");
		});
	});

	// =========================================================================
	// 4. MANDATE 8i: ZERO INPATIENT/HOSPITAL BLOAT IN AUDITED SERVICES
	// =========================================================================
	describe("4. Mandate 8i: Zero Inpatient Bloat In Audited Services", () => {
		const hospitalBloatKeywords = [
			"лапаротом",
			"полостн",
			"трансфузи",
			"койко-дн",
			"интубаци",
			"паллиатив",
			"стационар",
			"палатн",
		];

		const serviceDirs = [
			path.resolve(__dirname, "../../services/money"),
			path.resolve(__dirname, "../../services/pricelist"),
			path.resolve(__dirname, "../../services/ingestion"),
			path.resolve(__dirname, "../../money"),
			path.resolve(__dirname, "../../pricelist"),
			path.resolve(__dirname, "../../services/billing"),
			path.resolve(__dirname, "../../services/kkt"),
		];

		for (const dir of serviceDirs) {
			it(`ensures ${path.basename(dir)} directory contains zero inpatient bloat terms`, () => {
				if (!fs.existsSync(dir)) {
					assert.fail(`Directory does not exist: ${dir}`);
				}

				const files = fs.readdirSync(dir, { recursive: true }) as string[];
				for (const file of files) {
					const fullPath = path.join(dir, file);
					if (fs.statSync(fullPath).isFile() && (file.endsWith(".ts") || file.endsWith(".js"))) {
						const content = fs.readFileSync(fullPath, "utf-8").toLowerCase();
						for (const keyword of hospitalBloatKeywords) {
							const hasBloat = content.includes(keyword);
							assert.equal(
								hasBloat,
								false,
								`Hospital bloat keyword '${keyword}' found in ${path.relative(dir, fullPath)}`,
							);
						}
					}
				}
			});
		}
	});
});
