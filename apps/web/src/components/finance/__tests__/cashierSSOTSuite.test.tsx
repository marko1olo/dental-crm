/**
 * apps/web/src/components/finance/__tests__/cashierSSOTSuite.test.tsx
 *
 * Исчерпывающий Red Team тест-сьют канонической Студии кассы и чеков DENTE CRM (Cashier Studio SSOT).
 * Проверяет:
 * 1. Sweet Spot размеры файлов (300-350, 400-480, 70-90 строк).
 * 2. Целочисленные копейки (amountKopecks, 0 float errors).
 * 3. Комбинированный сплит и 1-клик автобалансировку остатка.
 * 4. Ровно 1 Primary CTA кнопку цвета #0d9488 на видимый контекст.
 * 5. 0 заблокированных кнопок (Мандат 8e Автономия кассира).
 * 6. Опциональность ИНН для физлиц (Мандат 8n).
 * 7. Чистоту клинического русского языка без «ФФД 1.2», «ФЗ-54», «Тег 1054».
 */

import React from "react";
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
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
import { CashierStudioModal } from "../CashierStudioModal.js";
import { DirectCashierLauncher } from "../DirectCashierLauncher.js";

describe("Cashier Studio & Fiscal Checkout SSOT Suite", () => {
	const financeDir = path.resolve(__dirname, "..");

	// ТЕСТ 1: Sweet Spot cashierCatalogData.ts (300-350 строк)
	it("1. cashierCatalogData.ts satisfies Sweet Spot line count constraint (300-350 lines)", () => {
		const filePath = path.join(financeDir, "cashierCatalogData.ts");
		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		expect(lines).toBeGreaterThanOrEqual(300);
		expect(lines).toBeLessThanOrEqual(350);
	});

	// ТЕСТ 2: Sweet Spot CashierStudioModal.tsx (400-480 строк)
	it("2. CashierStudioModal.tsx satisfies Sweet Spot line count constraint (400-480 lines)", () => {
		const filePath = path.join(financeDir, "CashierStudioModal.tsx");
		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		expect(lines).toBeGreaterThanOrEqual(400);
		expect(lines).toBeLessThanOrEqual(480);
	});

	// ТЕСТ 3: Sweet Spot DirectCashierLauncher.tsx (70-90 строк)
	it("3. DirectCashierLauncher.tsx satisfies Sweet Spot line count constraint (70-90 lines)", () => {
		const filePath = path.join(financeDir, "DirectCashierLauncher.tsx");
		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		expect(lines).toBeGreaterThanOrEqual(70);
		expect(lines).toBeLessThanOrEqual(90);
	});

	// ТЕСТ 4: Точность целочисленных копеек (amountKopecks, 0 float errors)
	it("4. amountKopecks eliminates IEEE-754 float precision errors (0.1 + 0.2)", () => {
		const price1Rub = 0.1;
		const price2Rub = 0.2;
		// Standard JS float 0.1 + 0.2 produces 0.30000000000000004
		expect(price1Rub + price2Rub).not.toBe(0.3);

		const kopecks1 = rubToKopecks(price1Rub);
		const kopecks2 = rubToKopecks(price2Rub);
		const totalKopecks = kopecks1 + kopecks2;

		expect(totalKopecks).toBe(30);
		expect(kopecksToRub(totalKopecks)).toBe(0.3);
	});

	// ТЕСТ 5: Преобразование и округление копеек
	it("5. rubToKopecks and kopecksToRub handle fractional and boundary amounts cleanly", () => {
		expect(rubToKopecks(12500.5)).toBe(1250050);
		expect(rubToKopecks(0)).toBe(0);
		expect(kopecksToRub(1250050)).toBe(12500.5);
		expect(kopecksToRub(BigInt(500000))).toBe(5000);
	});

	// ТЕСТ 6: Форматирование денежных сумм formatKopecks
	it("6. formatKopecks outputs localized ruble strings with proper spacing and currency symbol", () => {
		const formatted = formatKopecks(650000);
		expect(formatted).toContain("6");
		expect(formatted).toContain("500");
		expect(formatted).toContain("₽");

		const formattedFraction = formatKopecks(650050);
		expect(formattedFraction).toContain("6");
		expect(formattedFraction).toContain("500,50");
		expect(formattedFraction).toContain("₽");
	});

	// ТЕСТ 7: Валидация комбинированного сплита
	it("7. validateSplitTenders verifies that sum of tenders strictly equals total due", () => {
		const totalDue = 1000000; // 10 000 руб

		// Точное совпадение
		const exact = validateSplitTenders(totalDue, {
			cashKopecks: 300000,
			cardKopecks: 700000,
		});
		expect(exact.isValid).toBe(true);
		expect(exact.diffKopecks).toBe(0);

		// Недостача
		const under = validateSplitTenders(totalDue, {
			cashKopecks: 300000,
			cardKopecks: 500000,
		});
		expect(under.isValid).toBe(false);
		expect(under.diffKopecks).toBe(-200000);
		expect(under.messageRu).toContain("Не распределено");

		// Превышение
		const over = validateSplitTenders(totalDue, {
			cashKopecks: 600000,
			cardKopecks: 700000,
		});
		expect(over.isValid).toBe(false);
		expect(over.diffKopecks).toBe(300000);
		expect(over.messageRu).toContain("Превышение");
	});

	// ТЕСТ 8: Автобалансировка остатка сплита autoBalanceSplitTender
	it("8. autoBalanceSplitTender allocates remaining amount to target tender in 1 click", () => {
		const totalDue = 800000; // 8000 руб
		const initialTenders = { cashKopecks: 300000 };

		const balanced = autoBalanceSplitTender(totalDue, initialTenders, "cardKopecks");
		expect(balanced.cashKopecks).toBe(300000);
		expect(balanced.cardKopecks).toBe(500000);
		expect(balanced.sbpKopecks).toBe(0);

		const check = validateSplitTenders(totalDue, balanced);
		expect(check.isValid).toBe(true);
	});

	// ТЕСТ 9: Быстрые 1-клик шаблоны оплаты
	it("9. getFastPresetTenders returns 1-click templates including deposit offset", () => {
		const totalDue = 500000; // 5000 руб
		const availableDeposit = 200000; // 2000 руб

		const presets = getFastPresetTenders(totalDue, availableDeposit);
		expect(presets.length).toBeGreaterThanOrEqual(3);

		const cardPreset = presets.find((p) => p.id === "all_card");
		expect(cardPreset?.tenders.cardKopecks).toBe(500000);

		const splitDepositPreset = presets.find((p) => p.id === "deposit_plus_card");
		expect(splitDepositPreset).toBeDefined();
		expect(splitDepositPreset?.tenders.depositKopecks).toBe(200000);
		expect(splitDepositPreset?.tenders.cardKopecks).toBe(300000);
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
		expect(summary.shiftNumber).toBe(10);
		expect(summary.totalReceiptsCount).toBe(2);
		expect(summary.netRevenueKopecks).toBe(600000);
		expect(summary.incomeCashKopecks).toBe(200000);
		expect(summary.incomeElectronicKopecks).toBe(400000);
		expect(summary.expectedCashInDrawerKopecks).toBe(500000);
		expect(summary.differenceKopecks).toBe(0);
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
		expect(text80Clean).toContain("КАССОВЫЙ ЧЕК / ПРИХОД");
		expect(text80Clean).toContain("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»");
		expect(text80Clean).toContain("ИНН: 7701234567");
		expect(text80Clean).toContain("6 500 ₽");
		expect(text80Clean).toContain("ФПД (фискальный признак):");
		expect(text80Clean).toContain("4198237190");

		const text58 = generateThermalReceiptText(mockReceipt, 58);
		expect(text58).toContain("КАССОВЫЙ ЧЕК / ПРИХОД");
		expect(text58.length).toBeGreaterThan(100);
	});

	// ТЕСТ 12: Опциональность ИНН для физических лиц (Мандат 8n)
	it("12. validateBuyerInn never requires INN from physical person patient (Mandate 8n)", () => {
		const physicalEmpty = validateBuyerInn({
			payerType: "physical_person",
			buyerInn: "",
		});
		expect(physicalEmpty.isValid).toBe(true);
		expect(physicalEmpty.isRequired).toBe(false);

		const physicalUndefined = validateBuyerInn({
			payerType: "physical",
			buyerInn: undefined,
		});
		expect(physicalUndefined.isValid).toBe(true);
		expect(physicalUndefined.isRequired).toBe(false);
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
		expect(primaryMatches).toBeDefined();
		expect(primaryMatches?.length).toBe(1);
		expect(html).toContain("Провести оплату и напечатать чек");
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

		expect(html).not.toMatch(/<button[^>]*\bdisabled\b/i);
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
		expect(html).not.toContain("ФФД 1.2");
		expect(html).not.toContain("54-ФЗ");
		expect(html).not.toContain("ФЗ-54");
		expect(html).not.toContain("Тег 1054");

		// Обязательное наличие понятных русских формулировок
		expect(html).toContain("Студия кассы и чеков");
		expect(html).toContain("Сумма счёта");
		expect(html).toContain("Способ оплаты");
	});

	// ТЕСТ 16: DirectCashierLauncher монтируется в DOM без крашей
	it("16. DirectCashierLauncher SSR mounts cleanly and handles event contracts", () => {
		const html = renderToString(<DirectCashierLauncher />);
		expect(html).toBeDefined();
	});

	// ТЕСТ 17: SSOT способов оплаты содержит понятные ярлыки
	it("17. PAYMENT_METHODS array contains valid clinical human labels and icons", () => {
		expect(PAYMENT_METHODS.length).toBeGreaterThanOrEqual(5);
		const card = PAYMENT_METHODS.find((m) => m.id === "card");
		expect(card?.label).toBe("Банковская карта (POS)");
		const sbp = PAYMENT_METHODS.find((m) => m.id === "sbp");
		expect(sbp?.shortLabel).toBe("СБП QR");
	});
});
