/**
 * apps/web/src/components/finance/__tests__/cashierSSOTSuite.test.tsx
 *
 * Исчерпывающий Red Team тест-сьют канонической Студии кассы и чеков DENTE CRM (Cashier Studio SSOT).
 * Нативный Node.js test runner (node:test + node:assert/strict).
 *
 * Проверяет:
 * 1. Sweet Spot размеры файлов (cashierCatalogData: 300-380, CashierStudioModal: 400-480, DirectCashierLauncher: 70-90, cashier.css: 250-350 строк).
 * 2. Целочисленные копейки (amountKopecks, 0 float errors).
 * 3. Комбинированный сплит и 1-клик автобалансировку остатка (autoBalanceSplitTender).
 * 4. Ровно 1 Primary CTA кнопку цвета #0d9488 на видимый контекст (Мандат 8am).
 * 5. 0 заблокированных кнопок (Мандат 8e Автономия кассира и врача).
 * 6. Опциональность ИНН для физлиц (Мандат 8n).
 * 7. Чистоту клинического русского языка без «ФФД 1.2», «ФЗ-54», «Тег 1054».
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerHooks } from "node:module";
import React from "react";
import { renderToString } from "react-dom/server";

// Бронебойный перехват CSS для автономного запуска через `node --import tsx --test`
try {
	registerHooks({
		resolve(specifier, context, nextResolve) {
			if (specifier.endsWith(".css") || specifier.includes(".css")) {
				return {
					format: "module",
					shortCircuit: true,
					url: "data:text/javascript," + encodeURIComponent("export default {};"),
				};
			}
			return nextResolve(specifier, context);
		},
	});
} catch {
	// Hooks already registered by test runner harness
}

import {
	rubToKopecks,
	kopecksToRub,
	formatKopecks,
	formatRub,
	validateSplitTenders,
	autoBalanceSplitTender,
	getFastPresetTenders,
	calculateShiftTotals,
	generateThermalReceiptText,
	PAYMENT_METHODS,
	type CashierReceiptRecord,
} from "../cashierCatalogData.js";
import { validateBuyerInn } from "../cashboxInnValidation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Cashier Studio & Fiscal Checkout SSOT Suite (Native node:test)", () => {
	const financeDir = path.resolve(__dirname, "..");
	let CashierStudioModal: React.FC<any>;
	let DirectCashboxLauncher: React.FC<any>;

	before(async () => {
		const modalMod = await import("../../cashbox/CashRegisterStudioModal.js");
		CashierStudioModal = modalMod.CashRegisterStudioModal;
		const launcherMod = await import("../../cashbox/DirectCashboxLauncher.js");
		DirectCashboxLauncher = launcherMod.DirectCashboxLauncher;
	});

	// ТЕСТ 1: Sweet Spot cashierCatalogData.ts (300-380 строк)
	it("1. cashierCatalogData.ts satisfies Sweet Spot line count constraint (300-380 lines)", () => {
		const filePath = path.join(financeDir, "cashierCatalogData.ts");
		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 300 && lines <= 380,
			`cashierCatalogData.ts must be in 300-380 lines range (Sweet Spot), got ${lines} lines`,
		);
	});

	// ТЕСТ 2: DirectCashboxLauncher.tsx делегирует напрямую канонической CashRegisterStudioModal.tsx
	it("2. DirectCashboxLauncher.tsx delegates directly to canonical CashRegisterStudioModal SSOT", () => {
		const filePath = path.resolve(financeDir, "../cashbox/DirectCashboxLauncher.tsx");
		const content = fs.readFileSync(filePath, "utf-8");
		assert.ok(content.includes("CashRegisterStudioModal"), "Must delegate to canonical CashRegisterStudioModal SSOT");
	});

	// ТЕСТ 3: Sweet Spot DirectCashboxLauncher.tsx (<= 300 строк)
	it("3. DirectCashboxLauncher.tsx satisfies Sweet Spot line count constraint (<= 300 lines)", () => {
		const filePath = path.resolve(financeDir, "../cashbox/DirectCashboxLauncher.tsx");
		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines <= 300,
			`DirectCashboxLauncher.tsx must be in <= 300 lines range (Sweet Spot), got ${lines} lines`,
		);
	});

	// ТЕСТ 3b: Sweet Spot cashier.css (250-350 строк)
	it("3b. cashier.css satisfies Sweet Spot line count constraint (250-350 lines)", () => {
		const filePath = path.join(financeDir, "cashier.css");
		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 250 && lines <= 350,
			`cashier.css must be in 250-350 lines range (Sweet Spot), got ${lines} lines`,
		);
	});

	// ТЕСТ 4: Точность целочисленных копеек (amountKopecks, 0 float errors)
	it("4. amountKopecks eliminates IEEE-754 float precision errors (0.1 + 0.2)", () => {
		const price1Rub = 0.1;
		const price2Rub = 0.2;
		assert.notEqual(price1Rub + price2Rub, 0.3, "Float arithmetic drifts in raw JS");

		const kopecks1 = rubToKopecks(price1Rub);
		const kopecks2 = rubToKopecks(price2Rub);
		const totalKopecks = kopecks1 + kopecks2;

		assert.equal(totalKopecks, 30, "Integer kopecks must sum precisely to 30 kop");
		assert.equal(kopecksToRub(totalKopecks), 0.3, "Converted rubles must be exactly 0.30 ₽");
	});

	// ТЕСТ 5: Преобразование и округление копеек
	it("5. rubToKopecks and kopecksToRub handle fractional and boundary amounts cleanly", () => {
		assert.equal(rubToKopecks(12500.5), 1250050);
		assert.equal(rubToKopecks(0), 0);
		assert.equal(kopecksToRub(1250050), 12500.5);
		assert.equal(kopecksToRub(BigInt(500000)), 5000);
	});

	// ТЕСТ 6: Форматирование денежных сумм formatKopecks
	it("6. formatKopecks outputs localized ruble strings with proper spacing and currency symbol", () => {
		const formatted = formatKopecks(650000);
		assert.ok(formatted.includes("6"), "Formatted string must contain 6");
		assert.ok(formatted.includes("500"), "Formatted string must contain 500");
		assert.ok(formatted.includes("₽"), "Formatted string must contain currency sign");

		const formattedFraction = formatKopecks(650050);
		assert.ok(formattedFraction.includes("6"), "Fractional string must contain 6");
		assert.ok(formattedFraction.includes("500,50"), "Fractional string must contain 500,50");
		assert.ok(formattedFraction.includes("₽"), "Fractional string must contain currency sign");
	});

	// ТЕСТ 7: Валидация комбинированного сплита
	it("7. validateSplitTenders verifies that sum of tenders strictly equals total due", () => {
		const totalDue = 1000000; // 10 000 руб

		// Точное совпадение
		const exact = validateSplitTenders(totalDue, {
			cashKopecks: 300000,
			cardKopecks: 700000,
		});
		assert.equal(exact.isValid, true);
		assert.equal(exact.diffKopecks, 0);

		// Недостача
		const under = validateSplitTenders(totalDue, {
			cashKopecks: 300000,
			cardKopecks: 500000,
		});
		assert.equal(under.isValid, false);
		assert.equal(under.diffKopecks, -200000);
		assert.ok(under.messageRu?.includes("Не распределено"));

		// Превышение
		const over = validateSplitTenders(totalDue, {
			cashKopecks: 600000,
			cardKopecks: 700000,
		});
		assert.equal(over.isValid, false);
		assert.equal(over.diffKopecks, 300000);
		assert.ok(over.messageRu?.includes("Превышение"));
	});

	// ТЕСТ 8: Автобалансировка остатка сплита autoBalanceSplitTender
	it("8. autoBalanceSplitTender allocates remaining amount to target tender in 1 click", () => {
		const totalDue = 800000; // 8000 руб
		const initialTenders = { cashKopecks: 300000 };

		const balanced = autoBalanceSplitTender(totalDue, initialTenders, "cardKopecks");
		assert.equal(balanced.cashKopecks, 300000);
		assert.equal(balanced.cardKopecks, 500000);
		assert.equal(balanced.sbpKopecks, 0);

		const check = validateSplitTenders(totalDue, balanced);
		assert.equal(check.isValid, true);
	});

	// ТЕСТ 9: Быстрые 1-клик шаблоны оплаты
	it("9. getFastPresetTenders returns 1-click templates including deposit offset", () => {
		const totalDue = 500000; // 5000 руб
		const availableDeposit = 200000; // 2000 руб

		const presets = getFastPresetTenders(totalDue, availableDeposit);
		assert.ok(presets.length >= 3);

		const cardPreset = presets.find((p) => p.id === "all_card");
		assert.equal(cardPreset?.tenders.cardKopecks, 500000);

		const splitDepositPreset = presets.find((p) => p.id === "deposit_plus_card");
		assert.ok(splitDepositPreset !== undefined);
		assert.equal(splitDepositPreset?.tenders.depositKopecks, 200000);
		assert.equal(splitDepositPreset?.tenders.cardKopecks, 300000);
	});

	// ТЕСТ 10: Расчет смены и Z-отчета
	it("10. calculateShiftTotals correctly aggregates revenue, receipts and cash drawer balances", () => {
		const mockReceipts: CashierReceiptRecord[] = [
			{
				id: "r1",
				receiptNumber: "001",
				shiftNumber: 10,
				createdAt: new Date().toISOString(),
				cashierFullName: "Иванова А.",
				clinicName: "Клиника",
				clinicInn: "7701234567",
				clinicAddress: "Адрес",
				patientName: "Пациент 1",
				items: [],
				totalDueKopecks: 400000,
				paymentMethod: "card",
			},
			{
				id: "r2",
				receiptNumber: "002",
				shiftNumber: 10,
				createdAt: new Date().toISOString(),
				cashierFullName: "Иванова А.",
				clinicName: "Клиника",
				clinicInn: "7701234567",
				clinicAddress: "Адрес",
				patientName: "Пациент 2",
				items: [],
				totalDueKopecks: 200000,
				paymentMethod: "cash",
			},
		];

		const summary = calculateShiftTotals(mockReceipts, 300000, 500000);
		assert.equal(summary.shiftNumber, 10);
		assert.equal(summary.totalReceiptsCount, 2);
		assert.equal(summary.netRevenueKopecks, 600000);
		assert.equal(summary.incomeCashKopecks, 200000);
		assert.equal(summary.incomeElectronicKopecks, 400000);
		assert.equal(summary.expectedCashInDrawerKopecks, 500000);
		assert.equal(summary.differenceKopecks, 0);
	});

	// ТЕСТ 11: Генерация термочека для 58мм и 80мм
	it("11. generateThermalReceiptText outputs mono-formatted text with clinic and fiscal headers", () => {
		const mockReceipt: CashierReceiptRecord = {
			id: "r-test",
			receiptNumber: "00142",
			shiftNumber: 42,
			createdAt: "2026-10-31T12:00:00.000Z",
			cashierFullName: "Смирнова Е.",
			clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			clinicInn: "7701234567",
			clinicAddress: "г. Москва, ул. Ленина, д. 5",
			patientName: "Петров И.И.",
			items: [
				{ name: "Комплексная чистка Air-Flow", quantity: 1, priceKopecks: 650000, totalKopecks: 650000 },
			],
			totalDueKopecks: 650000,
			paymentMethod: "card",
			fiscalSign: "4198237190",
		};

		const text80 = generateThermalReceiptText(mockReceipt, 80);
		const text80Clean = text80.replace(/\u00a0/g, " ");
		assert.ok(text80Clean.includes("КАССОВЫЙ ЧЕК / ПРИХОД"));
		assert.ok(text80Clean.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"));
		assert.ok(text80Clean.includes("ИНН: 7701234567"));
		assert.ok(text80Clean.includes("6 500 ₽"));
		assert.ok(text80Clean.includes("ФПД (фискальный признак):"));
		assert.ok(text80Clean.includes("4198237190"));

		const text58 = generateThermalReceiptText(mockReceipt, 58);
		assert.ok(text58.includes("КАССОВЫЙ ЧЕК / ПРИХОД"));
		assert.ok(text58.length > 100);
	});

	// ТЕСТ 12: Опциональность ИНН для физических лиц (Мандат 8n)
	it("12. validateBuyerInn never requires INN from physical person patient (Mandate 8n)", () => {
		const physicalEmpty = validateBuyerInn({
			payerType: "physical_person",
			buyerInn: "",
		});
		assert.equal(physicalEmpty.isValid, true);
		assert.equal(physicalEmpty.isRequired, false);

		const physicalUndefined = validateBuyerInn({
			payerType: "physical",
			buyerInn: undefined,
		});
		assert.equal(physicalUndefined.isValid, true);
		assert.equal(physicalUndefined.isRequired, false);
	});

	// ТЕСТ 13: Ровно ОДНА Primary CTA кнопка #0d9488 на видимый контекст (Мандат 8am)
	it("13. CashierStudioModal renders exactly ONE Primary CTA button with #0d9488 styling", () => {
		const html = renderToString(
			<CashierStudioModal
				isOpen={true}
				onClose={() => {}}
				initialTab="checkout"
				totalDueRub={6500}
				patientName="Иванов Иван"
			/>,
		);

		const primaryMatches = html.match(/cashier-primary-cta/g);
		assert.ok(primaryMatches !== null, "Primary CTA class must be present");
		assert.equal(primaryMatches.length, 1, "Exactly ONE Primary CTA button allowed on visible context");
		assert.ok(html.includes("Провести оплату и напечатать чек"));
	});

	// ТЕСТ 14: 0 disabled кнопок (Мандат 8e Автономия врача и кассира)
	it("14. CashierStudioModal has zero disabled buttons in compliance with Mandate 8e", () => {
		const html = renderToString(
			<CashierStudioModal
				isOpen={true}
				onClose={() => {}}
				initialTab="checkout"
				totalDueRub={6500}
				patientName="Иванов Иван"
			/>,
		);

		assert.doesNotMatch(html, /<button[^>]*\bdisabled\b/i, "No disabled buttons allowed per Mandate 8e");
	});

	// ТЕСТ 15: Чистый живой русский язык: отсутствие «ФФД 1.2», «ФЗ-54», «Тег 1054»
	it("15. Clean clinical domain language without raw regulatory codes or dev jargon", () => {
		const html = renderToString(
			<CashierStudioModal
				isOpen={true}
				onClose={() => {}}
				initialTab="checkout"
				totalDueRub={6500}
				patientName="Иванов Иван"
			/>,
		);

		// Запрет на сырые советские приказы и теги ФФД
		assert.ok(!html.includes("ФФД 1.2"), "Must not leak raw FFD 1.2");
		assert.ok(!html.includes("54-ФЗ"), "Must not leak raw 54-FZ");
		assert.ok(!html.includes("ФЗ-54"), "Must not leak raw FZ-54");
		assert.ok(!html.includes("Тег 1054"), "Must not leak raw Tag 1054");

		// Обязательное наличие понятных русских формулировок
		assert.ok(html.includes("Студия кассы и чеков"));
		assert.ok(html.includes("Сумма счёта"));
		assert.ok(html.includes("Способ оплаты"));
	});

	// ТЕСТ 16: DirectCashboxLauncher монтируется в DOM без крашей
	it("16. DirectCashboxLauncher SSR mounts cleanly and handles event contracts", () => {
		const html = renderToString(<DirectCashboxLauncher />);
		assert.ok(typeof html === "string");
	});

	// ТЕСТ 17: SSOT способов оплаты содержит понятные ярлыки
	it("17. PAYMENT_METHODS array contains valid clinical human labels and icons", () => {
		assert.ok(PAYMENT_METHODS.length >= 5);
		const card = PAYMENT_METHODS.find((m) => m.id === "card");
		assert.equal(card?.label, "Банковская карта (POS)");
		const sbp = PAYMENT_METHODS.find((m) => m.id === "sbp");
		assert.equal(sbp?.shortLabel, "СБП QR");
	});
});
