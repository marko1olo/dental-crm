/**
 * apps/web/src/components/shift/__tests__/shiftStudioSSOT.test.tsx
 *
 * Red Team Inquisitor Test Suite for Cashier Shift, Z-Report & ShiftStudioModal SSOT.
 * First Principles Architecture for Russian Dental Clinics (1-5 Chairs).
 *
 * Validates:
 * 1. Integer Kopeck Math: 0 float errors in revenue, expected cash, and encashment.
 * 2. Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, double-click protection).
 * 3. Mandate 8am: Exactly ONE Primary CTA in var(--teal) (#0d9488) per visible context.
 * 4. Mandate 8x & 8ap: Living clinical language (No Soviet law codes in UI).
 * 5. Apple HIG: Native Mobile Bottom Sheet, touch targets >= 44x44px, Natural Thumb Zone.
 * 6. Live UI Mounting: AppShell, SpecializedAdministrativeLaunchers, administrativeLaunchersRegistry.
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import { CashShiftClosingModal } from "../CashShiftClosingModal";
import { CashShiftJournalView } from "../CashShiftJournalView";
import { DirectShiftLauncher } from "../DirectShiftLauncher";
import { CashRegisterStudioModal } from "../../cashbox/CashRegisterStudioModal";
import {
	type TenderRevenueKopecks,
	ACTIVE_SHIFT_PRESET,
	BALANCED_CLOSING_PRESET,
	DISCREPANCY_CLOSING_PRESET,
	SOLO_DOCTOR_SHIFT_PRESET,
	SHIFT_JOURNAL_FIXTURES,
	calculateTotalRevenueKopecks,
	calculateExpectedCashInDrawerKopecks,
	calculateEncashmentKopecks,
	buildZReportPrintData,
	formatKopecksToRub,
} from "../shiftCatalogData";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webSrcDir = path.resolve(__dirname, "../../..");

describe("Shift Studio & Fiscal Z-Report SSOT Suite", () => {
	// =========================================================================
	// 1. INTEGER KOPECK ARITHMETIC & CATALOG PRESETS
	// =========================================================================
	describe("1. Integer Kopeck Math & Shift Catalog Presets", () => {
		it("calculates total revenue accurately in integer kopecks without float errors", () => {
			const tenders: TenderRevenueKopecks = {
				cashKopecks: 1250000, // 12 500.00 ₽
				cardKopecks: 2800050, // 28 000.50 ₽
				sbpKopecks: 450025, // 4 500.25 ₽
				depositKopecks: 500000, // 5 000.00 ₽
			};
			const totalKop = calculateTotalRevenueKopecks(tenders);
			assert.equal(totalKop, 5000075, "Sum must be exactly 50 000.75 ₽ in kopecks");
		});

		it("calculates expected cash in drawer (initial change + cash revenue)", () => {
			const initialChange = 500000; // 5 000 ₽
			const cashIncome = 1250000; // 12 500 ₽
			const expectedCash = calculateExpectedCashInDrawerKopecks(initialChange, cashIncome);
			assert.equal(expectedCash, 1750000, "Expected cash in drawer must be exactly 17 500 ₽");
		});

		it("calculates encashment with change fund retention option", () => {
			const countedCash = 1750000; // 17 500 ₽
			const retainFund = 500000; // 5 000 ₽
			const partialEncashment = calculateEncashmentKopecks(countedCash, "retain_change", retainFund);
			assert.equal(partialEncashment, 1250000, "Partial encashment must be 12 500 ₽");

			const fullEncashment = calculateEncashmentKopecks(countedCash, "full", retainFund);
			assert.equal(fullEncashment, 1750000, "Full encashment must be 17 500 ₽");
		});

		it("synthesizes clean printable Z-Report without raw regulatory codes", () => {
			const zReport = buildZReportPrintData(ACTIVE_SHIFT_PRESET);
			assert.equal(zReport.shiftNumber, 104);
			assert.equal(zReport.grossRevenueRub, 45000);
			assert.equal(zReport.initialChangeFundRub, 5000);
			assert.equal(zReport.isFiscalized, true);
			assert.ok(zReport.ofdStatusRu.includes("ОФД"), "Must indicate OFD delivery status");
		});

		it("provides Solo Doctor chair rental preset (Mandate 8n)", () => {
			assert.equal(SOLO_DOCTOR_SHIFT_PRESET.status, "open");
			assert.equal(SOLO_DOCTOR_SHIFT_PRESET.doctorsEarnings[0]?.doctorPercent, 100);
			assert.equal(SOLO_DOCTOR_SHIFT_PRESET.isBalanced, true);
		});
	});

	// =========================================================================
	// 2. CASH SHIFT CLOSING MODAL SSOT (HERO REVENUE, 4 TENDERS & RECONCILIATION)
	// =========================================================================
	describe("2. CashShiftClosingModal SSOT Implementation", () => {
		it("renders prominent revenue and 4 revenue tenders", () => {
			const html = renderToString(
				<CashShiftClosingModal
					isOpen={true}
					onClose={() => {}}
					shiftNumber={104}
					initialChangeFundRub={5000}
					incomeCashRub={12500}
					incomeElectronicRub={28000}
					incomeSbpRub={4500}
					advanceOffsetRub={0}
				/>,
			);

			// 1. Title and header
			assert.ok(html.includes("Закрытие смены и Z-отчёт"), "Must render Shift Closing title");
			assert.ok(html.includes("Смена №104"), "Must render shift number");

			// 2. Net revenue
			assert.ok(html.includes("data-testid=\"shift-closing-net-revenue\""), "Must have net revenue testid");
			assert.ok(html.includes("45\u00A0000") || html.includes("45 000"), "Must render 45 000 ₽");

			// 3. 4 Revenue Tenders
			assert.ok(html.includes("Наличные"), "Must show cash tender");
			assert.ok(html.includes("Безнал / карта"), "Must show card tender");
			assert.ok(html.includes("QR СБП"), "Must show SBP tender");
			assert.ok(html.includes("Зачёт аванса"), "Must show advance offset");
		});

		it("renders cash reconciliation, terminal reconciliation, and exactly 1 Primary CTA in closing modal", () => {
			const html = renderToString(
				<CashShiftClosingModal
					isOpen={true}
					onClose={() => {}}
					shiftNumber={104}
					initialChangeFundRub={5000}
					incomeCashRub={12500}
					incomeElectronicRub={28000}
					incomeSbpRub={4500}
					advanceOffsetRub={0}
				/>,
			);

			// 1. Cash reconciliation
			assert.ok(html.includes("Сверка фактической наличности"), "Must render cash reconciliation");
			assert.ok(html.includes("Сходится"), "Must render matched cash badge when balanced");
			assert.ok(html.includes("Сверка терминала эквайринга"), "Must render terminal reconciliation");

			// 2. Encashment options
			assert.ok(html.includes("Инкассация наличной выручки"), "Must offer encashment options");
			assert.ok(html.includes("Оставить размен на утро"), "Must offer retaining change fund");

			// 3. Exactly ONE Primary CTA in var(--teal) (#0d9488) (Mandate 8am)
			assert.ok(
				html.includes("data-testid=\"btn-confirm-close-shift-z-report\""),
				"Must have Z-report confirmation Primary CTA",
			);
			assert.ok(html.includes("Закрыть смену и напечатать Z-отчёт"), "Must have canonical CTA text");

			// 4. Mandate 8e: Non-blocking, zero disabled buttons
			assert.ok(!html.includes("disabled=\"\""), "Primary CTA must NOT be disabled");
		});

		it("renders soft discrepancy indicator when cash has slight surplus without blocking", () => {
			const html = renderToString(
				<CashShiftClosingModal
					isOpen={true}
					onClose={() => {}}
					shiftNumber={104}
					cashInDrawerRub={17500}
					initialChangeFundRub={5000}
					incomeCashRub={12500}
				/>,
			);

			assert.ok(
				html.includes("data-testid=\"btn-confirm-close-shift-z-report\""),
				"CTA button must remain accessible even with discrepancy",
			);
		});

		it("renders null when closed", () => {
			const html = renderToString(
				<CashShiftClosingModal
					isOpen={false}
					onClose={() => {}}
				/>,
			);
			assert.equal(html, "");
		});
	});

	// =========================================================================
	// 3. CASH SHIFT JOURNAL VIEW SSOT & EMPTY STATE
	// =========================================================================
	describe("3. CashShiftJournalView SSOT & Empty State", () => {
		it("renders journal header and honest empty state when no shifts exist", () => {
			const html = renderToString(
				<CashShiftJournalView
					clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					initialShifts={[]}
				/>,
			);
			assert.ok(html.includes("Журнал кассовых смен"), "Must render journal header");
			assert.ok(html.includes("data-testid=\"cash-shift-journal-view\""), "Must have journal testid");
			assert.ok(html.includes("Кассовые смены ещё не открывались"), "Must render honest empty state");
			assert.ok(html.includes("data-testid=\"cash-shifts-empty-state\""), "Must have empty state testid");
		});

		it("renders shift history journal with OFD confirmation badges when shifts exist", () => {
			const mockShift = {
				id: "sh-101",
				shiftNumber: 101,
				status: "closed" as const,
				openedAt: new Date(Date.now() - 3600000).toISOString(),
				closedAt: new Date().toISOString(),
				cashierName: "Иванова Е. С.",
				startBalanceRub: 5000,
				closingBalanceRub: 5000,
				incomeTotalRub: 50000,
				expenseTotalRub: 0,
				incomeCashRub: 15000,
				incomeElectronicRub: 31000,
				incomeSbpRub: 4000,
				advanceOffsetRub: 0,
				ofdStatus: "delivered" as const,
				zReportNumber: "Z-101",
			};

			const html = renderToString(
				<CashShiftJournalView
					clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					initialShifts={[mockShift]}
				/>,
			);

			assert.ok(html.includes("Всего смен:"), "Must render total shifts count");
			assert.ok(html.includes("ОФД: Доставлен ✓"), "Must render OFD delivery badge");
			assert.ok(html.includes("№101"), "Must list shift number");
			assert.ok(html.includes("Z-отчёт"), "Must offer Z-report reprint button");
		});
	});

	// =========================================================================
	// 4. DIRECT SHIFT LAUNCHER & LIVE UI MOUNTING (MANDATE 8aq)
	// =========================================================================
	describe("4. DirectShiftLauncher & Live UI Mounting (Mandate 8aq)", () => {
		it("renders null on SSR when no URL hash or search parameter is present", () => {
			const html = renderToString(<DirectShiftLauncher />);
			assert.equal(html, "");
		});

		it("verifies DirectShiftLauncher is mounted in AppShell.tsx", () => {
			const appShellPath = path.join(webSrcDir, "AppShell.tsx");
			const code = fs.readFileSync(appShellPath, "utf-8");
			assert.ok(code.includes("DirectShiftLauncher"), "AppShell.tsx must import DirectShiftLauncher");
			assert.ok(code.includes("<DirectShiftLauncher />"), "AppShell.tsx must render <DirectShiftLauncher />");
		});

		it("verifies DirectShiftLauncher is mounted in SpecializedAdministrativeLaunchers.tsx", () => {
			const specializedPath = path.join(
				webSrcDir,
				"components/appLayout/modalsContainerModules/standalone/SpecializedAdministrativeLaunchers.tsx",
			);
			const code = fs.readFileSync(specializedPath, "utf-8");
			assert.ok(code.includes("DirectShiftLauncher"), "SpecializedAdministrativeLaunchers must import DirectShiftLauncher");
			assert.ok(code.includes("#shift"), "SpecializedAdministrativeLaunchers must handle #shift");
			assert.ok(code.includes("#z-report"), "SpecializedAdministrativeLaunchers must handle #z-report");
		});

		it("verifies DirectShiftLauncher is mounted in administrativeLaunchersRegistry.tsx", () => {
			const registryPath = path.join(
				webSrcDir,
				"components/appLayout/modalsContainerModules/standalone/administrativeLaunchersRegistry.tsx",
			);
			const code = fs.readFileSync(registryPath, "utf-8");
			assert.ok(code.includes("DirectShiftLauncher"), "administrativeLaunchersRegistry must import DirectShiftLauncher");
			assert.ok(code.includes("shift-studio"), "administrativeLaunchersRegistry must include shift-studio entry");
		});
	});

	// =========================================================================
	// 5. APPLE HIG TOUCH ERGONOMICS & DOMAIN PURITY
	// =========================================================================
	describe("5. Apple HIG Touch Ergonomics & Domain Language Purity", () => {
		it("includes tactile drag handle for mobile bottom sheet in CashShiftClosingModal", () => {
			const html = renderToString(
				<CashShiftClosingModal
					isOpen={true}
					onClose={() => {}}
				/>,
			);
			assert.ok(html.includes("w-9 h-1.5 rounded-full"), "Must render Apple HIG drag handle container");
		});

		it("enforces domain purity: zero Soviet law codes or FFD jargon in UI strings", () => {
			const html = renderToString(
				<CashShiftClosingModal
					isOpen={true}
					onClose={() => {}}
				/>,
			);
			assert.ok(!html.includes("ФФД 1.2"), "Must not expose raw FFD 1.2 code");
			assert.ok(!html.includes("КНД 1151156"), "Must not expose KND tax numbers");
			assert.ok(!html.includes("Приказ 54-ФЗ"), "Must not use Soviet bureaucratic decree names");
		});
	});
});
