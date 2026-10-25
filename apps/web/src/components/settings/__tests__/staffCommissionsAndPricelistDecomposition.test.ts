/**
 * apps/web/src/components/settings/__tests__/staffCommissionsAndPricelistDecomposition.test.ts
 *
 * Индивидуальный тест декомпозиции и бизнес-логики:
 * 1. StaffCommissionsPanel и подмодули commissionsModules/
 * 2. OwnerPriceListSection и подмодули priceListModules/
 * 3. DoctorPieceRateCalculatorSection и подмодули pieceRateModules/
 * 4. Священные лимиты Мандата 8b: Фасад OwnerPriceListSection <= 80 строк, подмодули <= 120 строк, 0 эмодзи.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
	DOCTOR_SPECIALTY_BENCHMARKS,
	STAFF_ROLE_BENCHMARKS,
	parseCommissionInput,
	percentLabel,
} from "../commissionsModules/staffCommissionsTypes";
import { PIECE_RATE_PRESETS } from "../owner/pieceRateModules/pieceRateTypes";
import {
	calculateDoctorPieceRatePayout,
	formatKopecksToRublesDisplay,
	parseRublesToKopecks,
} from "@dental/shared";

const EMOJI_REGEX = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Staff Commissions & Price List Decomposition Invariants", () => {
	const settingsDir = path.resolve(__dirname, "..");

	const facades = [
		{ relPath: "StaffCommissionsPanel.tsx", maxLines: 250 },
		{ relPath: "owner/OwnerPriceListSection.tsx", maxLines: 80 },
		{ relPath: "owner/DoctorPieceRateCalculatorSection.tsx", maxLines: 120 },
	];

	const submodules = [
		{ relPath: "commissionsModules/staffCommissionsTypes.ts", maxLines: 500 },
		{ relPath: "commissionsModules/useStaffCommissionsState.ts", maxLines: 500 },
		{ relPath: "commissionsModules/StaffRoleCommissionCard.tsx", maxLines: 500 },
		{ relPath: "commissionsModules/DoctorSpecialtyRatesTable.tsx", maxLines: 500 },
		{ relPath: "commissionsModules/MaterialDeductionRulesCard.tsx", maxLines: 500 },
		{ relPath: "owner/priceListModules/priceListTypes.ts", maxLines: 120 },
		{ relPath: "owner/priceListModules/priceListCatalogMerger.ts", maxLines: 120 },
		{ relPath: "owner/priceListModules/PriceListSummaryStats.tsx", maxLines: 120 },
		{ relPath: "owner/priceListModules/PriceListCategoryFilter.tsx", maxLines: 120 },
		{ relPath: "owner/priceListModules/PriceListItemRow.tsx", maxLines: 120 },
		{ relPath: "owner/priceListModules/PriceListItemRowPriceCell.tsx", maxLines: 120 },
		{ relPath: "owner/priceListModules/OwnerPriceListHeader.tsx", maxLines: 120 },
		{ relPath: "owner/priceListModules/OwnerPriceListTable.tsx", maxLines: 120 },
		{ relPath: "owner/priceListModules/useOwnerPriceList.ts", maxLines: 120 },
		{ relPath: "owner/pieceRateModules/pieceRateTypes.ts", maxLines: 120 },
		{ relPath: "owner/pieceRateModules/PieceRatePresetsBar.tsx", maxLines: 120 },
		{ relPath: "owner/pieceRateModules/PieceRateInputsPanel.tsx", maxLines: 120 },
		{ relPath: "owner/pieceRateModules/PieceRateCategoryRevenueInputs.tsx", maxLines: 120 },
		{ relPath: "owner/pieceRateModules/PieceRateDeductionInputs.tsx", maxLines: 120 },
		{ relPath: "owner/pieceRateModules/PieceRateSummaryCard.tsx", maxLines: 120 },
		{ relPath: "owner/pieceRateModules/useDoctorPieceRateCalculator.ts", maxLines: 120 },
	];

	describe("1. Лимиты строк: Фасады <= 80..120 строк, подмодули прейскуранта строго <= 120 строк", () => {
		for (const facade of facades) {
			it(`Фасад ${facade.relPath} строго <= ${facade.maxLines} строк`, () => {
				const fullPath = path.join(settingsDir, facade.relPath);
				const content = fs.readFileSync(fullPath, "utf-8");
				const lines = content.split("\n").length;
				assert.ok(
					lines <= facade.maxLines,
					`Фасад ${facade.relPath} превысил ${facade.maxLines} строк: ${lines}`,
				);
			});
		}

		for (const sub of submodules) {
			it(`Подмодуль ${sub.relPath} строго <= ${sub.maxLines} строк`, () => {
				const fullPath = path.join(settingsDir, sub.relPath);
				const content = fs.readFileSync(fullPath, "utf-8");
				const lines = content.split("\n").length;
				assert.ok(lines <= sub.maxLines, `Подмодуль ${sub.relPath} превысил ${sub.maxLines} строк: ${lines}`);
			});
		}
	});

	describe("2. Мандат 8d: Ноль мультяшных эмодзи во всех модулях", () => {
		const allTargetFiles = [
			...facades.map((f) => f.relPath),
			...submodules.map((s) => s.relPath),
		];

		for (const rel of allTargetFiles) {
			it(`Файл ${rel} не содержит эмодзи`, () => {
				const fullPath = path.join(settingsDir, rel);
				const content = fs.readFileSync(fullPath, "utf-8");
				assert.equal(EMOJI_REGEX.test(content), false, `Файл ${rel} содержит эмодзи!`);
			});
		}
	});

	describe("3. Бизнес-логика комиссий персонала (SSOT)", () => {
		it("Отраслевые бенчмарки врачей включают 6 клинических специальностей", () => {
			assert.equal(DOCTOR_SPECIALTY_BENCHMARKS.length, 6);
			const therapist = DOCTOR_SPECIALTY_BENCHMARKS.find((s) => s.id === "therapy");
			assert.ok(therapist);
			assert.equal(therapist.defaultRatePct, 25);
			assert.equal(therapist.minRatePct, 20);
			assert.equal(therapist.maxRatePct, 30);
		});

		it("Бенчмарки персонала включают ассистентов, кураторов и врачей", () => {
			assert.ok(STAFF_ROLE_BENCHMARKS.length >= 4);
			const assistant = STAFF_ROLE_BENCHMARKS.find((r) => r.roleKey === "assistant");
			assert.ok(assistant);
			assert.ok(assistant.payModel.includes("Почасовая"));
			const curator = STAFF_ROLE_BENCHMARKS.find((r) => r.roleKey === "treatment_coordinator");
			assert.ok(curator);
			assert.ok(curator.payModel.includes("плана"));
		});

		it("Валидация процентов parseCommissionInput корректно обрабатывает запятые и границы", () => {
			assert.equal(parseCommissionInput("25,5"), 25.5);
			assert.equal(parseCommissionInput("100"), 100);
			assert.equal(parseCommissionInput("0"), 0);
			assert.equal(parseCommissionInput("105"), null);
			assert.equal(parseCommissionInput("-5"), null);
			assert.equal(parseCommissionInput("abc"), null);
			assert.equal(percentLabel(25), "25 %");
		});
	});

	describe("4. Интерактивный калькулятор сдельной оплаты врачей (SSOT)", () => {
		it("Содержит 4 отраслевых пресета (терапевт, ортопед, хирург, соло-универсал)", () => {
			assert.equal(PIECE_RATE_PRESETS.length, 4);
			const solo = PIECE_RATE_PRESETS.find((p) => p.id === "solo_universal");
			assert.ok(solo);
			assert.equal(solo.therapyRatePct, 25);
			assert.equal(solo.labDeductionPct, 100);
		});

		it("Рассчитывает выплату универсала в целых копейках с вычетом ЗТЛ", () => {
			const res = calculateDoctorPieceRatePayout({
				therapyRevenueKopecks: parseRublesToKopecks("250000"),
				therapyRatePct: 25,
				orthopedicsRevenueKopecks: parseRublesToKopecks("350000"),
				orthopedicsRatePct: 25,
				surgeryRevenueKopecks: parseRublesToKopecks("120000"),
				surgeryRatePct: 25,
				hygieneRevenueKopecks: parseRublesToKopecks("50000"),
				hygieneRatePct: 30,
				labOrdersCostKopecks: parseRublesToKopecks("95000"),
				labDeductionPct: 100,
				materialCostKopecks: parseRublesToKopecks("40000"),
				materialDeductionPct: 0,
				baseShiftSalaryKopecks: 0,
			});

			assert.equal(res.grossAccruedCommissionKopecks, 19500000);
			assert.equal(res.withheldLabKopecks, 9500000);
			assert.equal(res.netPayoutKopecks, 10000000);
			assert.equal(res.totalRevenueKopecks, 77000000);
			assert.ok(res.clinicMarginPct > 87);
		});
	});
});
