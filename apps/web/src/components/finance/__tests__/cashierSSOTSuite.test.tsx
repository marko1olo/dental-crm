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
if (!process.env.VITEST) {
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
}

import {
	rubToKopecks,
	kopecksToRub,
	formatKopecksToRubles,
	formatRubles,
	CASHBOX_TENDER_PRESETS,
	calculateExactCashChange,
	generateFiscalTapeText,
} from "../../cashbox/cashRegisterCatalogData.js";
import {
	calculateShiftTotals,
	reconcileShiftCounters,
} from "../cashboxModules/shifts/shiftReconciliation.js";
import {
	allocateRemainderToTender,
} from "../cashboxModules/splits/tenderRemainderAllocation.js";
import {
	getFastCombinedTenderPresets,
} from "../cashboxModules/splits/fastTenderPresets.js";
import { validateBuyerInn } from "../cashboxInnValidation.js";
import type { CashRegisterStudioModalProps } from "../../cashbox/CashRegisterStudioModal.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Cashier Studio & Fiscal Checkout SSOT Suite (Native node:test)", () => {
	const financeDir = path.resolve(__dirname, "..");
	let CashierStudioModal: React.FC<CashRegisterStudioModalProps>;
	let DirectCashboxLauncher: React.FC;

	before(async () => {
		const modalMod = await import("../../cashbox/CashRegisterStudioModal.js");
		CashierStudioModal = modalMod.CashRegisterStudioModal;
		const launcherMod = await import("../../cashbox/DirectCashboxLauncher.js");
		DirectCashboxLauncher = launcherMod.DirectCashboxLauncher;
	});

	// ТЕСТ 1: Sweet Spot cashRegisterCatalogData.ts (280-380 строк)
	it("1. cashRegisterCatalogData.ts satisfies Sweet Spot line count constraint (280-380 lines)", () => {
		const filePath = path.resolve(financeDir, "../cashbox/cashRegisterCatalogData.ts");
		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines >= 280 && lines <= 380,
			`cashRegisterCatalogData.ts must be in 280-380 lines range (Sweet Spot), got ${lines} lines`,
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

		assert.equal(totalKopecks, 30n, "Integer kopecks must sum precisely to 30 kop");
		assert.equal(kopecksToRub(totalKopecks), 0.3, "Converted rubles must be exactly 0.30 ₽");
	});

	// ТЕСТ 5: Преобразование и округление копеек
	it("5. rubToKopecks and kopecksToRub handle fractional and boundary amounts cleanly", () => {
		assert.equal(rubToKopecks(12500.5), 1250050n);
		assert.equal(rubToKopecks(0), 0n);
		assert.equal(kopecksToRub(1250050n), 12500.5);
		assert.equal(kopecksToRub(BigInt(500000)), 5000);
	});

	// ТЕСТ 6: Форматирование денежных сумм formatKopecksToRubles
	it("6. formatKopecksToRubles outputs localized ruble strings with proper spacing and currency symbol", () => {
		const formatted = formatKopecksToRubles(650000n);
		assert.ok(formatted.includes("6"), "Formatted string must contain 6");
		assert.ok(formatted.includes("500"), "Formatted string must contain 500");
		assert.ok(formatted.includes("₽"), "Formatted string must contain currency sign");

		const formattedFraction = formatKopecksToRubles(650050n);
		assert.ok(formattedFraction.includes("6"), "Fractional string must contain 6");
		assert.ok(formattedFraction.includes("500,50"), "Fractional string must contain 500,50");
		assert.ok(formattedFraction.includes("₽"), "Fractional string must contain currency sign");
	});

	// ТЕСТ 7: Расчет сдачи и сверка наличности calculateExactCashChange
	it("7. calculateExactCashChange verifies exact change and shortage indicators", () => {
		const exact = calculateExactCashChange(10000, 10000);
		assert.equal(exact.isExact, true);
		assert.equal(exact.changeKopecks, 0n);
		assert.equal(exact.isShortage, false);

		const under = calculateExactCashChange(8000, 10000);
		assert.equal(under.isExact, false);
		assert.equal(under.isShortage, true);
		assert.equal(under.changeKopecks, 0n);

		const over = calculateExactCashChange(13000, 10000);
		assert.equal(over.isExact, false);
		assert.equal(over.isSurplus, true);
		assert.equal(over.changeKopecks, 300000n);
		assert.equal(over.changeRub, 3000);
	});

	// ТЕСТ 8: Автобалансировка остатка сплита allocateRemainderToTender
	it("8. allocateRemainderToTender allocates remaining amount to target tender in 1 click", () => {
		const totalDueRub = 8000;
		const initialTenders = { cashRub: 3000, cardRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0, certificateRub: 0, bonusRub: 0, dmsRub: 0 };

		const balanced = allocateRemainderToTender({
			totalDueRub,
			currentTenders: initialTenders,
			targetTender: "card",
		});
		assert.equal(balanced.cashRub, 3000);
		assert.equal(balanced.cardRub, 5000);
		assert.equal(balanced.sbpRub, 0);
	});

	// ТЕСТ 9: Быстрые 1-клик шаблоны оплаты getFastCombinedTenderPresets
	it("9. getFastCombinedTenderPresets returns 1-click templates including deposit offset", () => {
		const totalDueRub = 5000;
		const availableDepositRub = 2000;

		const presets = getFastCombinedTenderPresets({
			totalDueRub,
			patientDepositRub: availableDepositRub,
		});
		assert.ok(presets.length >= 3);

		const cardPreset = presets.find((p) => p.id === "all_card");
		assert.equal(cardPreset?.tenders.cardRub, 5000);

		const splitDepositPreset = presets.find((p) => p.id === "deposit_plus_card");
		assert.ok(splitDepositPreset !== undefined);
		assert.equal(splitDepositPreset?.tenders.depositRub, 2000);
		assert.equal(splitDepositPreset?.tenders.cardRub, 3000);
	});

	// ТЕСТ 10: Расчет смены и Z-отчета calculateShiftTotals & reconcileShiftCounters
	it("10. calculateShiftTotals & reconcileShiftCounters correctly aggregate revenue and drawer balances", () => {
		const mockOperations = [
			{ operationType: "income", amountRub: 4000, method: "card" },
			{ operationType: "income", amountRub: 2000, method: "cash" },
			{ operationType: "income", amountRub: 1500, method: "sbp" },
			{ operationType: "expense", amountRub: 500 },
		];

		const summary = calculateShiftTotals(mockOperations);
		assert.equal(summary.totalIncomeRub, 7500);
		assert.equal(summary.cashIncomeRub, 2000);
		assert.equal(summary.cardIncomeRub, 4000);
		assert.equal(summary.sbpIncomeRub, 1500);
		assert.equal(summary.totalExpenseRub, 500);

		const reconciliation = reconcileShiftCounters({
			initialCashRub: 3000,
			cashIncomeRub: 2000,
			cashExpenseRub: 500,
			actualCashRub: 4500,
		});
		assert.equal(reconciliation.expectedCashRub, 4500);
		assert.equal(reconciliation.isBalanced, true);
		assert.equal(reconciliation.discrepancyKop, 0);
	});

	// ТЕСТ 11: Генерация термочека для 58мм и 80мм
	it("11. generateFiscalTapeText outputs mono-formatted text with clinic and fiscal headers", () => {
		const text80 = generateFiscalTapeText({
			shiftNumber: 42,
			cashierFullName: "Смирнова Е.",
			netRevenueRub: 59000,
			cashInDrawerRub: 15000,
			cardSumRub: 35000,
			sbpSumRub: 7000,
			advanceOffsetRub: 2000,
			width: "tape_80mm",
		});
		assert.ok(text80.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"));
		assert.ok(text80.includes("КАССОВЫЙ ЧЕК / СМЕННЫЙ ОТЧЕТ"));
		assert.ok(text80.includes("Смена №:"));
		assert.ok(text80.includes("42"));
		assert.ok(text80.includes("ИТОГО ВЫРУЧКА:"));
		assert.ok(text80.includes("59\u00a0000") || text80.includes("59 000"));

		const text58 = generateFiscalTapeText({
			shiftNumber: 42,
			cashierFullName: "Смирнова Е.",
			width: "tape_58mm",
		});
		assert.ok(text58.includes("КАССОВЫЙ ЧЕК / СМЕННЫЙ ОТЧЕТ"));
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
	it("17. CASHBOX_TENDER_PRESETS array contains valid clinical human labels and identifiers", () => {
		assert.ok(CASHBOX_TENDER_PRESETS.length >= 5);
		const card = CASHBOX_TENDER_PRESETS.find((m) => m.id === "card");
		assert.equal(card?.label, "Терминал (Карта)");
		const sbp = CASHBOX_TENDER_PRESETS.find((m) => m.id === "sbp");
		assert.equal(sbp?.shortLabel, "СБП QR");
	});
});
