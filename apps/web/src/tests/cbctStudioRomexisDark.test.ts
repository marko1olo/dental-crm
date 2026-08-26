import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	getTissueNameFromHU,
	type StudioMode,
	type ViewLayoutMode,
} from "../components/radiology/CbctMprImplantStudioModal";
import { ROMEXIS_COLORS } from "../components/radiology/cbctMprMath";

describe("CBCT Romexis Industrial Dark & Diagnostic Mode Architecture", () => {
	describe("1. HU Density & Tissue Structure Categorization (getTissueNameFromHU)", () => {
		it("correctly identifies enamel / filling materials for HU >= 2000", () => {
			assert.equal(getTissueNameFromHU(2000), "Эмаль / Пломбировочный материал");
			assert.equal(getTissueNameFromHU(2800), "Эмаль / Пломбировочный материал");
			assert.equal(getTissueNameFromHU(3500), "Эмаль / Пломбировочный материал");
		});

		it("correctly identifies cortical bone / dentin for 1000 <= HU < 2000", () => {
			assert.equal(getTissueNameFromHU(1000), "Кортикальная кость / Дентин");
			assert.equal(getTissueNameFromHU(1450), "Кортикальная кость / Дентин");
			assert.equal(getTissueNameFromHU(1999), "Кортикальная кость / Дентин");
		});

		it("correctly identifies trabecular / cancellous bone for 300 <= HU < 1000", () => {
			assert.equal(getTissueNameFromHU(300), "Трабекулярная губчатая кость");
			assert.equal(getTissueNameFromHU(650), "Трабекулярная губчатая кость");
			assert.equal(getTissueNameFromHU(999), "Трабекулярная губчатая кость");
		});

		it("correctly identifies soft tissue / gingiva / pulp for 0 <= HU < 300", () => {
			assert.equal(getTissueNameFromHU(0), "Мягкие ткани / Пульпа / Десна");
			assert.equal(getTissueNameFromHU(80), "Мягкие ткани / Пульпа / Десна");
			assert.equal(getTissueNameFromHU(299), "Мягкие ткани / Пульпа / Десна");
		});

		it("correctly identifies adipose tissue / fluid / exudate for -400 <= HU < 0", () => {
			assert.equal(getTissueNameFromHU(-400), "Жировая клетчатка / Экссудат");
			assert.equal(getTissueNameFromHU(-100), "Жировая клетчатка / Экссудат");
			assert.equal(getTissueNameFromHU(-1), "Жировая клетчатка / Экссудат");
		});

		it("correctly identifies air / sinus cavity / airways for HU < -400", () => {
			assert.equal(getTissueNameFromHU(-401), "Воздух / Синус / Дыхательные пути");
			assert.equal(getTissueNameFromHU(-800), "Воздух / Синус / Дыхательные пути");
			assert.equal(getTissueNameFromHU(-1000), "Воздух / Синус / Дыхательные пути");
		});
	});

	describe("2. Studio Modes & Viewport Layout Type Safety", () => {
		it("validates StudioMode contract values", () => {
			const diagnosticMode: StudioMode = "diagnostic";
			const implantMode: StudioMode = "implant";
			const endoMode: StudioMode = "endo";
			const tmjMode: StudioMode = "tmj";
			assert.equal(diagnosticMode, "diagnostic");
			assert.equal(implantMode, "implant");
			assert.equal(endoMode, "endo");
			assert.equal(tmjMode, "tmj");
		});

		it("validates ViewLayoutMode contract values", () => {
			const quadMode: ViewLayoutMode = "quad_view";
			const layout1Plus3: ViewLayoutMode = "layout_1_plus_3";
			assert.equal(quadMode, "quad_view");
			assert.equal(layout1Plus3, "layout_1_plus_3");
		});
	});

	describe("3. Romexis Color Palette Invariants", () => {
		it("provides standard Romexis orthogonal color codes", () => {
			assert.equal(ROMEXIS_COLORS.axial, "#06b6d4");
			assert.equal(ROMEXIS_COLORS.coronal, "#f59e0b");
			assert.equal(ROMEXIS_COLORS.sagittal, "#10b981");
			assert.equal(ROMEXIS_COLORS.panoramic, "#a855f7");
			assert.equal(ROMEXIS_COLORS.crossSection, "#eab308");
		});

		it("generates correct RGBA strings for overlays and corridors", () => {
			assert.equal(ROMEXIS_COLORS.axialRgba(0.5), "rgba(6, 182, 212, 0.5)");
			assert.equal(ROMEXIS_COLORS.coronalRgba(0.8), "rgba(245, 158, 11, 0.8)");
			assert.equal(ROMEXIS_COLORS.sagittalRgba(0.2), "rgba(16, 185, 129, 0.2)");
		});
	});
});
