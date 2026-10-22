import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	VITA_CLASSICAL_SHADES,
	VITA_CLASSICAL_GROUPS,
	VITA_3D_MASTER_SHADES,
	VITA_3D_MASTER_GROUPS,
	VITA_BLEACH_SHADES_CLASSIFIED,
	SHADE_SWATCH_MAP,
	STUMP_NATURAL_DIE_SHADES,
	getStratificationPreset,
} from "../labMath";

describe("Dental Lab 3D Shade — Palette & Stratification", () => {
	it("1. VITA Classical palette has all 16 shades grouped into 4 distinct tones (A, B, C, D)", () => {
		assert.equal(VITA_CLASSICAL_SHADES.length, 16);
		assert.equal(VITA_CLASSICAL_GROUPS.length, 4);

		const [grpA, grpB, grpC, grpD] = VITA_CLASSICAL_GROUPS;
		assert.ok(grpA && grpB && grpC && grpD);

		assert.equal(grpA.id, "A");
		assert.ok(grpA.toneRu.includes("Красновато-коричневый"));
		assert.deepEqual(grpA.shades, ["A1", "A2", "A3", "A3.5", "A4"]);

		assert.equal(grpB.id, "B");
		assert.ok(grpB.toneRu.includes("Красновато-желтый"));
		assert.deepEqual(grpB.shades, ["B1", "B2", "B3", "B4"]);

		assert.equal(grpC.id, "C");
		assert.ok(grpC.toneRu.includes("Серый"));
		assert.deepEqual(grpC.shades, ["C1", "C2", "C3", "C4"]);

		assert.equal(grpD.id, "D");
		assert.ok(grpD.toneRu.includes("Красновато-серый"));
		assert.deepEqual(grpD.shades, ["D2", "D3", "D4"]);

		for (const shade of VITA_CLASSICAL_SHADES) {
			const swatch = SHADE_SWATCH_MAP[shade];
			assert.ok(swatch, `Оттенок ${shade} обязан иметь запись в SHADE_SWATCH_MAP`);
			assert.ok(swatch.bg.startsWith("#"));
			assert.ok(swatch.border.startsWith("#"));
		}
	});

	it("2. VITA 3D-Master has 26 shades across levels 1-5, and Bleach shades include 0M1-0M3", () => {
		assert.equal(VITA_3D_MASTER_SHADES.length, 26);
		assert.equal(VITA_3D_MASTER_GROUPS.length, 5);

		const grp0 = VITA_3D_MASTER_GROUPS[0];
		const grp4 = VITA_3D_MASTER_GROUPS[4];
		assert.ok(grp0 && grp4);
		assert.deepEqual(grp0.shades, ["1M1", "1M2"]);
		assert.deepEqual(grp4.shades, ["5M1", "5M2", "5M3"]);

		const bleachIds = VITA_BLEACH_SHADES_CLASSIFIED.map((b) => b.id);
		assert.ok(bleachIds.includes("0M1"));
		assert.ok(bleachIds.includes("0M2"));
		assert.ok(bleachIds.includes("0M3"));
		assert.ok(bleachIds.includes("BL1"));
		assert.ok(bleachIds.includes("BL2"));

		for (const b of ["0M1", "0M2", "0M3", "BL1", "BL2", "BL3", "BL4"]) {
			assert.ok(SHADE_SWATCH_MAP[b]);
		}
	});

	it("3. 3-Zone gradient stratification (Cervical, Body, Incisal) and presets operate correctly", () => {
		const naturalA2 = getStratificationPreset("A2", "natural");
		assert.equal(naturalA2.cervical, "A3");
		assert.equal(naturalA2.body, "A2");
		assert.equal(naturalA2.incisal, "A1");

		const monoA3 = getStratificationPreset("A3", "monochrome");
		assert.equal(monoA3.cervical, "A3");
		assert.equal(monoA3.body, "A3");
		assert.equal(monoA3.incisal, "A3");

		const youthA2 = getStratificationPreset("A2", "youth_translucent");
		assert.equal(youthA2.cervical, "A2");
		assert.equal(youthA2.body, "A2");
		assert.equal(youthA2.incisal, "A1");
	});

	it("4. Natural Die stump shades (ND1–ND9) are defined for all types of tooth preparations", () => {
		assert.equal(STUMP_NATURAL_DIE_SHADES.length, 9);
		const ids = STUMP_NATURAL_DIE_SHADES.map((s) => s.id);
		for (let i = 1; i <= 9; i++) {
			const ndKey = `ND${i}` as (typeof ids)[number];
			assert.ok(ids.includes(ndKey));
			assert.ok(SHADE_SWATCH_MAP[ndKey]);
		}

		const s0 = STUMP_NATURAL_DIE_SHADES[0];
		const s8 = STUMP_NATURAL_DIE_SHADES[8];
		assert.ok(s0 && s8);
		assert.ok(s0.desc.includes("винир"));
		assert.ok(s8.name.includes("Металлическая"));
	});
});
