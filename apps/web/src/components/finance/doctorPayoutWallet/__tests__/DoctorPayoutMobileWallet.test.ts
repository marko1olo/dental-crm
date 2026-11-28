import { describe, it } from "node:test";
import assert from "node:assert/strict";
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
	DEMO_SHOWCASE_SOLO_DOCTOR,
} from "../index.js";

describe("DoctorPayoutMobileWallet Modular Architecture (Wave 25)", () => {
	describe("1. Live Wallet Header, Breakdown & History Components", () => {
		it("renders DoctorWalletBalanceHeader and DoctorEarningsBreakdownCard with zero and demo values", () => {
			const headerHtml = renderToString(
				React.createElement(DoctorWalletBalanceHeader, {
					availableDoctors: [DEMO_SHOWCASE_DOCTOR, DEMO_SHOWCASE_SOLO_DOCTOR],
					currentDoctor: DEMO_SHOWCASE_DOCTOR,
					onSelectDoctor: () => {},
					monthLabel: formatMonthLabel("2026-10"),
					month: "2026-10",
					monthInputId: "wallet-month-test",
					onMonthChange: () => {},
					totalWithheld: 0,
				}),
			);
			assert.ok(headerHtml.includes("Выплаты врачам"));

			const categoryCards = computeCategoryCards(DEMO_SHOWCASE_DOCTOR);
			const breakdownHtml = renderToString(
				React.createElement(DoctorEarningsBreakdownCard, {
					categoryCards,
				}),
			);
			assert.ok(breakdownHtml.includes('id="wallet-categories-heading"'));
		});

		it("renders DoctorPayoutHistoryList and formats shift dates cleanly", () => {
			assert.deepEqual(computeDoctorShifts(null), []);
			const formatted = formatShiftDate("2026-10-12");
			assert.ok(formatted.formatted.length > 0);
			assert.ok(formatted.dayOfWeek.length > 0);

			const emptyHistoryHtml = renderToString(
				React.createElement(DoctorPayoutHistoryList, {
					shifts: [],
					activeShift: null,
					onSelectShiftDate: () => {},
					currentDoctor: DEMO_SHOWCASE_DOCTOR,
				}),
			);
			assert.ok(emptyHistoryHtml.includes('id="wallet-shifts-heading"'));
		});
	});

	describe("2. Solo Doctor Profile & Boundary Rendering", () => {
		it("renders solo doctor breakdown with lab deduction category and positive payout", () => {
			const soloCategories = computeCategoryCards(DEMO_SHOWCASE_SOLO_DOCTOR);
			const lab = soloCategories.find((c) => c.id === "cat-lab-deduction");
			assert.ok(lab);
			assert.equal(lab.isDeduction, true);
			assert.equal(lab.amountRub, 45000);
		});
	});

	describe("3. Financial Calculations & Category Breakdown Logic", () => {
		it("accurately computes category breakdown for demo doctor", () => {
			const categories = computeCategoryCards(DEMO_SHOWCASE_DOCTOR);
			assert.ok(categories.length > 0, "Must have categories");

			const therapy = categories.find((c) => c.id === "cat-therapy");
			assert.ok(therapy, "Must have therapy category");
			assert.equal(therapy.ratePct, 30);

			const ortho = categories.find((c) => c.id === "cat-orthopedics");
			assert.ok(ortho, "Must have orthopedics category");
			assert.equal(ortho.ratePct, 30);

			const categoriesKovalev = computeCategoryCards(DEMO_SHOWCASE_SOLO_DOCTOR);
			const lab = categoriesKovalev.find((c) => c.id === "cat-lab-deduction");
			assert.ok(lab, "Must have lab deduction category");
			assert.equal(lab.isDeduction, true);
			assert.equal(lab.amountRub, 45000);
			assert.equal(lab.ratePct, 100);

			const docWithMat = {
				...DEMO_SHOWCASE_DOCTOR,
				withheldMaterialRub: 700,
				materialCostRub: 700,
				materialDeductionPct: 25,
			};
			const mat = computeCategoryCards(docWithMat).find((c) => c.id === "cat-material-deduction");
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

			for (let i = 0; i < shifts.length - 1; i++) {
				const cur = shifts[i];
				const nxt = shifts[i + 1];
				if (cur && nxt) {
					assert.ok(cur.date >= nxt.date, `Dates must be in descending order: ${cur.date} >= ${nxt.date}`);
				}
			}

			const s1 = shifts[0];
			assert.ok(s1);
			assert.equal(s1.date, "2026-10-27");
			assert.equal(s1.patientCount, 1);
			assert.equal(s1.shiftRevenueRub, 32000);
			assert.equal(s1.shiftEarnedRub, Math.round(32000 * 0.3));

			for (const shift of shifts) {
				const sumVisitsEarnedRub = shift.visits.reduce((acc, v) => acc + (v.earnedRub ?? 0), 0);
				assert.equal(
					Math.round(sumVisitsEarnedRub * 100),
					Math.round(shift.shiftEarnedRub * 100),
					`Shift ${shift.date} sum of visits (${sumVisitsEarnedRub}) must equal shiftEarnedRub (${shift.shiftEarnedRub})`,
				);
			}
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
				scope: "all" as const,
				period: { from: "2026-10-01", to: "2026-10-31" },
				totals: {
					revenueRub: 500000,
					paymentCount: 20,
					attributableRevenueRub: 500000,
					unattributedRevenueRub: 0,
					materialCostRub: 1400,
					accruedRub: 200000,
					withheldMaterialRub: 1400,
					withheldLabRub: 28000,
					payoutRub: 170600,
					doctorsCounted: 2,
					doctorsWithoutRate: 0,
				},
				methodNote: "Тестовый отчет",
				limitations: [],
				isEmpty: false,
				rows: [
					DEMO_SHOWCASE_DOCTOR,
					DEMO_SHOWCASE_SOLO_DOCTOR,
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

			assert.ok(html.includes('id="wallet-categories-heading"'), "Anchor 1: wallet-categories-heading");
			assert.ok(html.includes('id="wallet-shifts-heading"'), "Anchor 2: wallet-shifts-heading");
			assert.ok(html.includes('aria-label="Выбор врача"'), "Anchor 3: Выбор врача");
			assert.ok(html.includes('aria-label="Карточка начислений врача"'), "Anchor 4: Карточка начислений врача");
			assert.ok(html.includes('aria-label="Открыть расчётную ведомость"'), "Anchor 6: Ведомость");
			assert.ok(html.includes('aria-label="Обновить расчёт выплат"'), "Anchor 7: Обновить расчёт выплат");
		});

		it("renders DoctorPayoutHistoryList with bottom sheet close anchor", () => {
			const shifts = computeDoctorShifts(DEMO_SHOWCASE_DOCTOR);
			const activeShift = shifts[0] ?? null;

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
						scope: "all",
						period: { from: "2026-10-01", to: "2026-10-31" },
						totals: {
							revenueRub: 0,
							paymentCount: 0,
							attributableRevenueRub: 0,
							unattributedRevenueRub: 0,
							materialCostRub: 0,
							accruedRub: 0,
							withheldMaterialRub: 0,
							payoutRub: 0,
							doctorsCounted: 0,
							doctorsWithoutRate: 0,
						},
						rows: [],
						methodNote: "Тестовый пустой расчет",
						limitations: [],
						isEmpty: true,
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
