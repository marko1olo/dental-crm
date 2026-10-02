import assert from "node:assert";
import { describe, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	validateRussianInn,
	validateInnIndividual,
	validateInnLegalEntity,
	resolveTaxDeductionCategory,
	classifyTaxDeduction804n,
	aggregatePatientPaymentsForTaxYear,
	generateTaxCertificateKnd1151156Html,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxPaymentRecord,
} from "../taxCertificateEngine";

import {
	validatePrescriptionItemStrict,
	validateForm107PrescriptionInput,
	generatePrescriptionForm107Html,
	type PrescriptionPrescribedDrug,
	type PrescriptionForm107Input,
} from "../prescriptionPrintEngine";

describe("Tax Certificates (FNS KND 1151156) & Form 107-1/у Prescriptions Zero-Mock Inquisition", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const docsDir = path.resolve(__dirname, "..");

	// --- 1. ТАКОВАЯ ПРОВЕРКА ИНН ПО ГОСТ / ФНС ВЕСОВЫМ КОЭФФИЦИЕНТАМ ---
	describe("1. Russian INN Statutory Checksum Algorithm (FNS / GOST Weights)", () => {
		test("Validates authentic 10-digit legal entity INN with correct check digit", () => {
			// 7707083893 (ПАО Сбербанк)
			const res = validateRussianInn("7707083893");
			assert.strictEqual(res.isValid, true);
			assert.strictEqual(res.errorMessageRu, undefined);

			const legalRes = validateInnLegalEntity("7707083893");
			assert.strictEqual(legalRes.isValid, true);
		});

		test("Rejects 10-digit legal entity INN with incorrect check digit", () => {
			// Tampered last digit: 7707083894 instead of 7707083893
			const res = validateRussianInn("7707083894");
			assert.strictEqual(res.isValid, false);
			assert.ok(res.errorMessageRu?.includes("Неверная контрольная сумма"));
		});

		test("Validates authentic 12-digit individual INN with two valid check digits", () => {
			// 500100732259
			const res = validateRussianInn("500100732259");
			assert.strictEqual(res.isValid, true);
			assert.strictEqual(res.errorMessageRu, undefined);

			const indRes = validateInnIndividual("500100732259");
			assert.strictEqual(indRes.isValid, true);
		});

		test("Rejects 12-digit individual INN when check digit is tampered", () => {
			// 500100732258 (tampered last digit)
			const res = validateRussianInn("500100732258");
			assert.strictEqual(res.isValid, false);
			assert.ok(res.errorMessageRu?.includes("контрольная сумма"));
		});

		test("Rejects all-zeroes INN (0000000000 and 000000000000)", () => {
			const zero10 = validateRussianInn("0000000000");
			assert.strictEqual(zero10.isValid, false);
			assert.ok(zero10.errorMessageRu?.includes("нулей"));

			const zero12 = validateRussianInn("000000000000");
			assert.strictEqual(zero12.isValid, false);
			assert.ok(zero12.errorMessageRu?.includes("нулей"));
		});

		test("Rejects invalid length and alphanumeric strings", () => {
			assert.strictEqual(validateRussianInn("123456789").isValid, false);
			assert.strictEqual(validateRussianInn("12345678901").isValid, false);
			assert.strictEqual(validateRussianInn("770708389A").isValid, false);
			assert.strictEqual(validateRussianInn("").isValid, false);
			assert.strictEqual(validateRussianInn(null).isValid, false);
		});
	});

	// --- 2. РАЗДЕЛЕНИЕ КОДОВ УСЛУГ (КОД 1 VS КОД 2 ПО ПП РФ № 458) ---
	describe("2. Statutory Service Code Classification (Code 1 vs Code 2 - Decree No. 458)", () => {
		test("Correctly classifies standard therapeutic and hygiene procedures as Code 1", () => {
			// Caries therapy
			assert.strictEqual(resolveTaxDeductionCategory("A16.07.002.001", "Восстановление зуба пломбой"), "1");
			// Pulpitis / endo
			assert.strictEqual(resolveTaxDeductionCategory("A16.07.030", "Инструментальная обработка корневого канала"), "1");
			// Professional hygiene
			assert.strictEqual(resolveTaxDeductionCategory("A16.07.051", "Профессиональная гигиена полости рта"), "1");
			// Simple extraction
			assert.strictEqual(resolveTaxDeductionCategory("A16.07.001.001", "Удаление постоянного зуба простое"), "1");
		});

		test("Correctly classifies expensive dental treatment per Decree No. 458 as Code 2", () => {
			// Dental implantation
			assert.strictEqual(resolveTaxDeductionCategory("A16.07.054", "Внутрикостная дентальная имплантация"), "2");
			assert.strictEqual(resolveTaxDeductionCategory("A16.07.054.001", "Установка имплантата системы Nobel"), "2");
			assert.strictEqual(resolveTaxDeductionCategory("A16.07.054.004", "Скуловая имплантация Zygoma"), "2");

			// Bone grafting & sinus lift
			assert.strictEqual(resolveTaxDeductionCategory("A16.07.041.002", "Субантральная аугментация (синус-лифтинг закрытый)"), "2");
			assert.strictEqual(resolveTaxDeductionCategory("A16.07.041.003", "Синус-лифтинг открытый с аугментацией костным блоком"), "2");
			assert.strictEqual(resolveTaxDeductionCategory("A16.07.040.001", "Аугментация альвеолярного гребня"), "2");
			assert.strictEqual(resolveTaxDeductionCategory("A16.07.096", "Расщепление альвеолярного гребня split-crest"), "2");

			// Complex implant prosthetics
			assert.strictEqual(resolveTaxDeductionCategory("A16.07.006.002", "Протезирование зубного ряда на имплантатах All-on-4"), "2");
			assert.strictEqual(resolveTaxDeductionCategory("A16.07.006.004", "Балочный протез с опорой на 4 имплантата"), "2");
		});

		test("Classifies by textual keywords when 804n code is absent", () => {
			assert.strictEqual(resolveTaxDeductionCategory(undefined, "Операция установки имплантата Straumann"), "2");
			assert.strictEqual(resolveTaxDeductionCategory(undefined, "Открытый синуслифтинг с мембраной Bio-Gide"), "2");
			assert.strictEqual(resolveTaxDeductionCategory(undefined, "Протезирование All-on-6 на мультиюнитах"), "2");
			assert.strictEqual(resolveTaxDeductionCategory(undefined, "Лечение кариеса эмали депульпированного зуба"), "1");
		});

		test("classifyTaxDeduction804n returns statutory metadata and limits", () => {
			const code1Meta = classifyTaxDeduction804n("A16.07.002", "Терапия");
			assert.strictEqual(code1Meta.categoryCode, "1");
			assert.strictEqual(code1Meta.isExpensiveTreatment, false);
			assert.strictEqual(code1Meta.hasAnnualLimit, true);
			assert.strictEqual(code1Meta.statutoryLimitRub, 150000);

			const code2Meta = classifyTaxDeduction804n("A16.07.054", "Имплантация");
			assert.strictEqual(code2Meta.categoryCode, "2");
			assert.strictEqual(code2Meta.isExpensiveTreatment, true);
			assert.strictEqual(code2Meta.hasAnnualLimit, false);
			assert.strictEqual(code2Meta.statutoryLimitRub, Number.POSITIVE_INFINITY);
		});
	});

	// --- 3. ЧЕСТНАЯ АГРЕГАЦИЯ ОПЛАТ ЗА КАЛЕНДАРНЫЙ ГОД С КОПЕЕЧНОЙ ТОЧНОСТЬЮ ---
	describe("3. Honest Calendar Year Payment Aggregation (Exact Kopecks & Net Refunds)", () => {
		const samplePayments: TaxPaymentRecord[] = [
			// 2025 payments
			{
				id: "p1",
				dateIso: "2025-02-10T10:00:00.000Z",
				serviceName: "Лечение кариеса и пломба Estelite",
				code804n: "A16.07.002.001",
				amountRub: 12500,
				fiscalDocumentNumber: "101",
				fiscalSign: "9876543210",
			},
			{
				id: "p2",
				dateIso: "2025-04-15T14:30:00.000Z",
				serviceName: "Профессиональная гигиена Air Flow",
				code804n: "A16.07.051",
				amountRub: 7500.5,
				fiscalDocumentNumber: "102",
				fiscalSign: "9876543211",
			},
			{
				id: "p3",
				dateIso: "2025-06-20T11:00:00.000Z",
				serviceName: "Дентальная имплантация Straumann BLX",
				code804n: "A16.07.054.001",
				amountRub: 85000,
				fiscalDocumentNumber: "103",
				fiscalSign: "9876543212",
			},
			{
				id: "p4",
				dateIso: "2025-07-05T16:00:00.000Z",
				serviceName: "Синус-лифтинг открытый и костная пластика",
				code804n: "A16.07.041.003",
				amountRub: 45000,
				fiscalDocumentNumber: "104",
				fiscalSign: "9876543213",
			},
			// Refund in 2025
			{
				id: "p5-refund",
				dateIso: "2025-08-01T12:00:00.000Z",
				serviceName: "Возврат средств за гигиену (частичный)",
				code804n: "A16.07.051",
				amountRub: -2500.5,
				isRefund: true,
			},
			// Payment in different year (2024) — MUST be excluded from 2025!
			{
				id: "p6-2024",
				dateIso: "2024-11-10T10:00:00.000Z",
				serviceName: "Удаление зуба мудрости",
				code804n: "A16.07.001.001",
				amountRub: 15000,
				fiscalDocumentNumber: "99",
				fiscalSign: "1111111111",
			},
		];

		test("Filters payments strictly to 2025 and separates Code 1 and Code 2", () => {
			const agg2025 = aggregatePatientPaymentsForTaxYear(samplePayments, 2025);

			assert.strictEqual(agg2025.taxYear, 2025);
			// 2024 payment must not be included
			assert.strictEqual(agg2025.receiptsCount, 4);

			// Code 1 calculations: 12500.00 + 7500.50 - 2500.50 = 17500.00
			assert.strictEqual(agg2025.code01Kopecks, 1750000);
			assert.strictEqual(agg2025.code01Rub, 17500);

			// Code 2 calculations: 85000.00 + 45000.00 = 130000.00
			assert.strictEqual(agg2025.code02Kopecks, 13000000);
			assert.strictEqual(agg2025.code02Rub, 130000);

			// Total net: 17500 + 130000 = 147500.00
			assert.strictEqual(agg2025.totalNetKopecks, 14750000);
			assert.strictEqual(agg2025.totalNetRub, 147500);

			// Refunds tracked: 2500.50
			assert.strictEqual(agg2025.refundedKopecks, 250050);

			// 13% refund estimation:
			// Code 1: 17500 * 13% = 2275.00
			// Code 2: 130000 * 13% = 16900.00
			// Total: 19175.00
			assert.strictEqual(agg2025.estimatedRefund13Rub, 19175);
		});

		test("Respects statutory limit of 150 000 ₽ for Code 1 in 2024+", () => {
			const heavyCode01Payments: TaxPaymentRecord[] = [
				{
					id: "heavy1",
					dateIso: "2025-01-15T10:00:00.000Z",
					serviceName: "Ортодонтическое лечение на элайнерах",
					code804n: "A16.07.048",
					amountRub: 280000,
				},
			];
			const agg = aggregatePatientPaymentsForTaxYear(heavyCode01Payments, 2025);
			assert.strictEqual(agg.code01Rub, 280000);
			// Eligible sum is capped at 150 000 ₽
			assert.strictEqual(agg.eligibleCode01Rub, 150000);
			// 13% refund is capped at 150 000 * 0.13 = 19 500 ₽
			assert.strictEqual(agg.estimatedRefund13Rub, 19500);
		});

		test("Code 2 expensive treatment is NOT capped by any statutory limit", () => {
			const heavyCode02Payments: TaxPaymentRecord[] = [
				{
					id: "implant-heavy",
					dateIso: "2025-05-10T10:00:00.000Z",
					serviceName: "Тотальная реабилитация All-on-6 обеих челюстей",
					code804n: "A16.07.006.002",
					amountRub: 1200000,
				},
			];
			const agg = aggregatePatientPaymentsForTaxYear(heavyCode02Payments, 2025);
			assert.strictEqual(agg.code02Rub, 1200000);
			// Full 13% refund is eligible: 1 200 000 * 0.13 = 156 000 ₽
			assert.strictEqual(agg.estimatedRefund13Rub, 156000);
		});
	});

	// --- 4. ПОДДЕРЖКА РОДСТВА И НАЛОГОПЛАТЕЛЬЩИКА ---
	describe("4. Relative Payer & Patient Kinship Support (Spouse, Parent, Child)", () => {
		test("Relationship map contains statutory FNS codes per Order EA-7-11/824@", () => {
			assert.strictEqual(TAX_DEDUCTION_RELATIONSHIP_MAP.patient.code, "1");
			assert.strictEqual(TAX_DEDUCTION_RELATIONSHIP_MAP.spouse.code, "2");
			assert.strictEqual(TAX_DEDUCTION_RELATIONSHIP_MAP.parent.code, "3");
			assert.strictEqual(TAX_DEDUCTION_RELATIONSHIP_MAP.child.code, "4");
		});

		test("Generates KND 1151156 HTML reflecting payer passport when payer is spouse", () => {
			const agg = aggregatePatientPaymentsForTaxYear(
				[
					{
						id: "p1",
						dateIso: "2025-03-01T10:00:00.000Z",
						serviceName: "Имплантация",
						code804n: "A16.07.054",
						amountRub: 60000,
					},
				],
				2025,
			);

			const html = generateTaxCertificateKnd1151156Html({
				certificateNumber: "СПР-2025-42",
				issueDateIso: "2025-04-01T10:00:00.000Z",
				taxYear: 2025,
				clinic: {
					legalName: "ООО Стоматология ДЕНТЕ",
					inn: "7707083893",
					kpp: "770101001",
					ogrn: "1027700132195",
					address: "г. Москва, ул. Арбат, 15",
					licenseNumber: "ЛО41-01137-77/00584930",
					chiefDoctorOrDirector: "Петров П.П.",
				},
				taxpayer: {
					fullName: "Смирнов Алексей Владимирович",
					inn: "500100732259",
					relationship: "spouse",
					passportSeries: "4512",
					passportNumber: "789123",
					passportIssuedBy: "ГУ МВД по г. Москве",
				},
				patient: {
					fullName: "Смирнова Елена Сергеевна",
					birthDate: "1990-05-14",
				},
				aggregation: agg,
			});

			assert.ok(html.includes("Форма по КНД 1151156"), "Must contain KND 1151156 header");
			assert.ok(html.includes("Смирнов Алексей Владимирович"), "Must include taxpayer name");
			assert.ok(html.includes("500100732259"), "Must include taxpayer INN");
			assert.ok(html.includes("4512"), "Must include taxpayer passport series");
			assert.ok(html.includes("789123"), "Must include taxpayer passport number");
			assert.ok(html.includes("Смирнова Елена Сергеевна"), "Must include patient name");
			assert.ok(html.includes("Код 2"), "Must include kinship code 2 (spouse)");
			assert.ok(
				html.replace(/\u00a0/g, " ").includes("60 000,00 ₽"),
				"Must include exact formatted sum",
			);
		});
	});

	// --- 5. ЧЕСТНЫЕ РЕЦЕПТУРНЫЕ БЛАНКИ 107-1/у (ПРИКАЗ 1094н) ---
	describe("5. Statutory Form 107-1/у Prescriptions (Order 1094n Compliance)", () => {
		test("Rejects empty dosage per Order 1094n", () => {
			const itemWithEmptyDosage: PrescriptionPrescribedDrug = {
				mnnLatin: "Amoxicillini",
				dosage: "", // EMPTY!
				formAndDispenseLatin: "D.t.d. N 20 in tab.",
				signaRu: "Внутрь по 1 таб. 2 раза в день, 7 дней.",
			};
			const res = validatePrescriptionItemStrict(itemWithEmptyDosage, 0);
			assert.strictEqual(res.isValid, false);
			assert.ok(res.errors.some((e) => e.includes("дозировка не может быть пустой")));
		});

		test("Rejects empty Signa per Order 1094n", () => {
			const itemWithEmptySigna: PrescriptionPrescribedDrug = {
				mnnLatin: "Ibuprofeni",
				dosage: "400 мг",
				formAndDispenseLatin: "D.t.d. N 10 in tab.",
				signaRu: "", // EMPTY!
			};
			const res = validatePrescriptionItemStrict(itemWithEmptySigna, 0);
			assert.strictEqual(res.isValid, false);
			assert.ok(res.errors.some((e) => e.includes("способ применения (Signa) не может быть пустым")));
		});

		test("Rejects vague / indefinite Signa ('по схеме', 'по назначению врача', 'как обычно')", () => {
			const vagueSignas = [
				"по схеме",
				"по назначению",
				"по назначению врача",
				"как обычно",
				"известно",
				"внутреннее",
			];

			for (const vague of vagueSignas) {
				const item: PrescriptionPrescribedDrug = {
					mnnLatin: "Nimesulidi",
					dosage: "100 мг",
					formAndDispenseLatin: "D.t.d. N 10 in granul.",
					signaRu: vague,
				};
				const res = validatePrescriptionItemStrict(item, 0);
				assert.strictEqual(res.isValid, false, `Signa '${vague}' must be rejected`);
				assert.ok(res.errors.some((e) => e.includes("запрещена неопределенная формулировка")));
			}
		});

		test("Accepts complete and valid Latin prescription per Order 1094n", () => {
			const validItem: PrescriptionPrescribedDrug = {
				mnnLatin: "Amoxicillini",
				dosage: "500 мг",
				formAndDispenseLatin: "D.t.d. N 20 in tab.",
				signaRu: "Внутрь по 1 таблетке (500 мг) 3 раза в день через 8 ч, курс 7 дней.",
				tradeNameRu: "Флемоксин Солютаб",
			};
			const res = validatePrescriptionItemStrict(validItem, 0);
			assert.strictEqual(res.isValid, true);
			assert.strictEqual(res.errors.length, 0);
		});

		test("Generates A5 Form 107-1/у HTML with clinic stamp, doctor stamp circle, and receipt stamp", () => {
			const rxInput: PrescriptionForm107Input = {
				seriesNumber: "77-АБ № 004128",
				dateIso: "2026-03-15",
				validityDays: 60,
				clinic: {
					legalName: "ООО Стоматологическая клиника ДЕНТЕ",
					address: "г. Москва, ул. Профсоюзная, д. 42",
					phone: "+7 (495) 123-45-67",
					inn: "7707083893",
					ogrn: "1027700132195",
					licenseNumber: "ЛО41-01137-77/00584930",
				},
				patient: {
					fullName: "Волков Дмитрий Николаевич",
					birthDate: "1985-11-20",
					cardNumber: "043/у-1284",
				},
				doctor: {
					fullName: "Ковалев Игорь Семенович",
					specialty: "Врач-стоматолог-хирург",
				},
				medications: [
					{
						mnnLatin: "Amoxicillini",
						dosage: "500 мг",
						formAndDispenseLatin: "D.t.d. N 20 in tab.",
						signaRu: "Внутрь по 1 таблетке 3 раза в день во время еды, 7 дней.",
					},
					{
						mnnLatin: "Ibuprofeni",
						dosage: "400 мг",
						formAndDispenseLatin: "D.t.d. N 10 in tab.",
						signaRu: "Внутрь по 1 таблетке при выраженных болях, не более 3 раз в день.",
					},
				],
			};

			const validation = validateForm107PrescriptionInput(rxInput);
			assert.strictEqual(validation.isValid, true);

			const html = generatePrescriptionForm107Html(rxInput);

			assert.ok(html.includes("Форма бланка № 107-1/у"), "Must contain Form 107-1/u title");
			assert.ok(html.includes("Приказ Минздрава России от 24.11.2021 № 1094н"), "Must reference Order 1094n");
			assert.ok(html.includes("77-АБ № 004128"), "Must render series and number");
			assert.ok(html.includes("Волков Дмитрий Николаевич"), "Must render patient name");
			assert.ok(html.includes("Ковалев Игорь Семенович"), "Must render doctor name");
			assert.ok(html.includes("Rp.: Amoxicillini 500 мг"), "Must render Latin Recipe prefix with dosage");
			assert.ok(html.includes("D.t.d. N 20 in tab."), "Must render Da tales doses");
			assert.ok(html.includes("М.П.<br>ВРАЧ"), "Must include doctor personal stamp zone");
			assert.ok(html.includes("«ДЛЯ РЕЦЕПТОВ»"), "Must include organization recipe stamp zone");
		});
	});

	// --- 6. ПРОВЕРКА ЧИСТОТЫ ОТ МОКОВ И ЭМОДЗИ (MANDATES 8b, 8e, 8y) ---
	describe("6. Zero Mocks & Zero Emojis Purity Inspection", () => {
		const SCOPED_ENGINE_FILES = [
			"taxCertificateEngine.ts",
			"TaxCertificateModal.tsx",
			"prescriptionPrintEngine.ts",
		];

		const FORBIDDEN_MOCK_NAMES = [
			"Иванов Иван Иванович",
			"Петров Петр Петрович",
			"Сидоров Сидор",
			"Test Testov",
			"John Doe",
		];

		for (const fileName of SCOPED_ENGINE_FILES) {
			test(`Absence of synthetic mock names in ${fileName}`, () => {
				const fullPath = path.join(docsDir, fileName);
				assert.ok(fs.existsSync(fullPath), `File must exist: ${fileName}`);
				const content = fs.readFileSync(fullPath, "utf-8");

				for (const mockName of FORBIDDEN_MOCK_NAMES) {
					assert.ok(
						!content.includes(mockName),
						`File ${fileName} must NOT contain synthetic mock name '${mockName}'`,
					);
				}
			});

			test(`Absence of raw cartoon emojis in ${fileName} (Mandate 8d pt 7)`, () => {
				const fullPath = path.join(docsDir, fileName);
				const content = fs.readFileSync(fullPath, "utf-8");

				// Check for common cartoon emojis
				const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
				assert.ok(
					!emojiRegex.test(content),
					`File ${fileName} must NOT contain cartoon emojis`,
				);
			});
		}
	});
});
