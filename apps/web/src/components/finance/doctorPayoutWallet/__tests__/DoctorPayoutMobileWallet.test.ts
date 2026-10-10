import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	DoctorPayoutMobileWallet,
	DoctorWalletBalanceHeader,
	DoctorEarningsBreakdownCard,
	DoctorPayoutHistoryList,
	computeCategoryCards,
	computeDoctorShifts,
	formatMonthLabel,
	formatShiftDate,
	DEMO_SHOWCASE_DOCTOR,
} from "../index.js";

describe("DoctorPayoutMobileWallet Modular Architecture (Wave 25)", () => {
	const currentDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
	const walletDir = path.resolve(currentDir, "..");
	const facadePath = path.resolve(walletDir, "../DoctorPayoutMobileWallet.tsx");

	describe("1. Architectural Budget & File Limit Invariants", () => {
		it("ensures canonical thin facade exists and is strictly <= 150 lines", () => {
			assert.ok(fs.existsSync(facadePath), `Facade file must exist at ${facadePath}`);
			const content = fs.readFileSync(facadePath, "utf-8");
			const lines = content.split("\n").length;
			assert.ok(lines <= 150, `Facade must be <= 150 lines, got ${lines}`);
		});

		it("ensures all decomposed files in doctorPayoutWallet/ are strictly <= 800 lines", () => {
			const files = fs.readdirSync(walletDir).filter((f) => /\.(ts|tsx)$/.test(f));
			assert.ok(files.length >= 5, "Must have at least 5 decomposed files in module");

			for (const f of files) {
				const filePath = path.join(walletDir, f);
				const content = fs.readFileSync(filePath, "utf-8");
				const lines = content.split("\n").length;
				assert.ok(
					lines <= 800,
					`File ${f} must be <= 800 lines, but has ${lines} lines`,
				);
			}
		});
	});

	describe("2. Public Export Parity", () => {
		it("exports all canonical components and pure calculation helpers", () => {
			assert.equal(typeof DoctorPayoutMobileWallet, "function");
			assert.equal(typeof DoctorWalletBalanceHeader, "function");
			assert.equal(typeof DoctorEarningsBreakdownCard, "function");
			assert.equal(typeof DoctorPayoutHistoryList, "function");
			assert.equal(typeof computeCategoryCards, "function");
			assert.equal(typeof computeDoctorShifts, "function");
			assert.equal(typeof formatMonthLabel, "function");
			assert.equal(typeof formatShiftDate, "function");
			assert.ok(DEMO_SHOWCASE_DOCTOR);
		});
	});

	describe("3. Financial Calculations & Category Breakdown Logic", () => {
		it("accurately computes category breakdown for demo doctor", () => {
			const categories = computeCategoryCards(DEMO_SHOWCASE_DOCTOR);
			assert.ok(categories.length > 0, "Must have categories");

			// Check therapy, ortho, surgery, hygiene items
			const therapy = categories.find((c) => c.id === "cat-therapy");
			assert.ok(therapy, "Must have therapy category");
			assert.equal(therapy.ratePct, 40);

			const ortho = categories.find((c) => c.id === "cat-orthopedics");
			assert.ok(ortho, "Must have orthopedics category");
			assert.equal(ortho.ratePct, 40);

			// Check lab deduction item
			const lab = categories.find((c) => c.id === "cat-lab-deduction");
			assert.ok(lab, "Must have lab deduction category");
			assert.equal(lab.isDeduction, true);
			assert.equal(lab.amountRub, 14000);
			assert.equal(lab.ratePct, 100);

			// Check material deduction item
			const mat = categories.find((c) => c.id === "cat-material-deduction");
			assert.ok(mat, "Must have material deduction category");
			assert.equal(mat.isDeduction, true);
			assert.equal(mat.amountRub, 700);
			assert.equal(mat.ratePct, 25);
		});

		it("returns empty array when doctor is null", () => {
			assert.deepEqual(computeCategoryCards(null), []);
		});

		it("groups visits into descending shifts with exact earnings", () => {
			const shifts = computeDoctorShifts(DEMO_SHOWCASE_DOCTOR);
			assert.ok(shifts.length >= 4, "Must group into shifts");

			// Dates must be descending
			for (let i = 0; i < shifts.length - 1; i++) {
				assert.ok(
					shifts[i].date >= shifts[i + 1].date,
					`Dates must be in descending order: ${shifts[i].date} >= ${shifts[i + 1].date}`,
				);
			}

			// First shift is 2026-10-22
			const s1 = shifts[0];
			assert.equal(s1.date, "2026-10-22");
			assert.equal(s1.patientCount, 1);
			assert.equal(s1.shiftRevenueRub, 68000);
			assert.equal(s1.shiftEarnedRub, Math.round(68000 * 0.4)); // 27200
		});

		it("formats month and shift date correctly", () => {
			const monthLabel = formatMonthLabel("2026-10");
			assert.ok(monthLabel.includes("2026"));
			assert.ok(/октябр/i.test(monthLabel));

			const shiftDate = formatShiftDate("2026-10-12");
			assert.ok(shiftDate.formatted.length > 0);
			assert.ok(shiftDate.dayOfWeek.length > 0);
		});
	});

	describe("4. React Component Rendering & Test Anchor Parity", () => {
		it("renders DoctorPayoutMobileWallet with all 7 test anchors", () => {
			const report = {
				month: "2026-10",
				currency: "RUB",
				totals: {
					doctorCount: 2,
					activeDoctorCount: 2,
					totalRevenueRub: 500000,
					totalAccruedRub: 200000,
					totalWithheldMaterialRub: 1400,
					totalWithheldLabRub: 28000,
					totalPayoutRub: 170600,
					totalPayments: 20,
					totalMaterialMovements: 20,
					unpricedMaterialMovements: 0,
					totalLabOrders: 4,
				},
				rows: [
					DEMO_SHOWCASE_DOCTOR,
					{
						...DEMO_SHOWCASE_DOCTOR,
						doctorUserId: "demo_doc_ivanov",
						doctorName: "Д-р Иванов И. И.",
					},
				],
			};

			const html = renderToString(
				React.createElement(DoctorPayoutMobileWallet, {
					report,
					month: "2026-10",
					onMonthChange: () => {},
					onRefresh: () => {},
					onOpenPayrollModal: () => {},
					canEditRates: false,
					isLoading: false,
				}),
			);

			// Check test anchors:
			assert.ok(html.includes('id="wallet-categories-heading"'), "Anchor 1: wallet-categories-heading");
			assert.ok(html.includes('id="wallet-shifts-heading"'), "Anchor 2: wallet-shifts-heading");
			assert.ok(html.includes('aria-label="Выбор врача"'), "Anchor 3: Выбор врача");
			assert.ok(html.includes('aria-label="Карточка начислений врача"'), "Anchor 4: Карточка начислений врача");
			assert.ok(html.includes('aria-label="Открыть расчётную ведомость Т-51"'), "Anchor 6: Ведомость Т-51");
			assert.ok(html.includes('aria-label="Обновить расчёт выплат"'), "Anchor 7: Обновить расчёт выплат");
		});

		it("renders DoctorPayoutHistoryList with bottom sheet close anchor", () => {
			const shifts = computeDoctorShifts(DEMO_SHOWCASE_DOCTOR);
			const activeShift = shifts[0];

			const html = renderToString(
				React.createElement(DoctorPayoutHistoryList, {
					shifts,
					activeShift,
					onSelectShiftDate: () => {},
					currentDoctor: DEMO_SHOWCASE_DOCTOR,
				}),
			);

			assert.ok(html.includes('id="wallet-shifts-heading"'));
			assert.ok(html.includes('aria-label="Закрыть детализацию смены"'), "Anchor 5: Закрыть детализацию смены");
			assert.ok(html.includes("Смена"));
			assert.ok(html.includes("Пациенты"));
		});

		it("renders empty state when report has no doctors and not in demo", () => {
			const html = renderToString(
				React.createElement(DoctorPayoutMobileWallet, {
					report: {
						month: "2026-10",
						currency: "RUB",
						totals: {
							doctorCount: 0,
							activeDoctorCount: 0,
							totalRevenueRub: 0,
							totalAccruedRub: 0,
							totalWithheldMaterialRub: 0,
							totalWithheldLabRub: 0,
							totalPayoutRub: 0,
							totalPayments: 0,
							totalMaterialMovements: 0,
							unpricedMaterialMovements: 0,
							totalLabOrders: 0,
						},
						rows: [],
					},
					month: "2026-10",
					onMonthChange: () => {},
					onRefresh: () => {},
					onOpenPayrollModal: () => {},
					canEditRates: false,
					isLoading: false,
				}),
			);

			assert.ok(html.includes("doctor-wallet-empty"));
		});
	});
});
