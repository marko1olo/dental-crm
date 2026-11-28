/**
 * apps/web/src/components/odontogram/__tests__/odontogramSSOTSuite.test.tsx
 *
 * DENTE Dental CRM — Runtime Behavioral Suite for Odontogram SSOT & Studio.
 * Verifies FDI 11-48 & 51-85, 5 surfaces, 10 clinical statuses, 1-click intact teeth (Mandate 8e),
 * 1-click visit estimate linkage, SVG idPrefix isolation (P2-5.3), and 0 disabled buttons.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { OdontogramModule } from "../OdontogramModule";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import { resolveClinicRoute } from "../../../router/routeResolver";
import { getToothColors } from "../chart/ToothColors";
import {
	ADULT_TEETH_SSOT,
	PEDIATRIC_TEETH_SSOT,
	CLINICAL_STATUSES_SSOT,
	CANONICAL_5_SURFACES,
	createIntactDentition,
	getRecommendedEstimateForStatus,
	isPediatricTooth,
	isUpperJawTooth,
	getToothQuadrant,
	getToothStandardNameRu,
} from "../odontogramCatalogData";

const mockTestAppLogic: Partial<AppLogicContextType> = {
	odontogramUseSurfaces: true,
	activePatient: null,
	activeDoctor: null,
	auth: null,
	money: (v: unknown) => `${Number(v) || 0} ₽`,
};

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

describe("Odontogram & Dental Formula SSOT Invariants (FDI 11-48 & 51-85)", () => {
	it("1. Verifies Permanent Dentition contains exactly 32 FDI teeth across 4 quadrants", () => {
		assert.equal(ADULT_TEETH_SSOT.length, 32, "Permanent dentition must contain exactly 32 teeth");

		const q1 = ADULT_TEETH_SSOT.filter((t) => t >= 11 && t <= 18);
		const q2 = ADULT_TEETH_SSOT.filter((t) => t >= 21 && t <= 28);
		const q3 = ADULT_TEETH_SSOT.filter((t) => t >= 31 && t <= 38);
		const q4 = ADULT_TEETH_SSOT.filter((t) => t >= 41 && t <= 48);

		assert.equal(q1.length, 8);
		assert.equal(q2.length, 8);
		assert.equal(q3.length, 8);
		assert.equal(q4.length, 8);
		assert.equal(new Set(ADULT_TEETH_SSOT).size, 32);
	});

	it("2. Verifies Pediatric Dentition contains exactly 20 FDI teeth across 4 deciduous quadrants", () => {
		assert.equal(PEDIATRIC_TEETH_SSOT.length, 20, "Pediatric dentition must contain exactly 20 teeth");

		assert.equal(PEDIATRIC_TEETH_SSOT.filter((t) => t >= 51 && t <= 55).length, 5);
		assert.equal(PEDIATRIC_TEETH_SSOT.filter((t) => t >= 61 && t <= 65).length, 5);
		assert.equal(PEDIATRIC_TEETH_SSOT.filter((t) => t >= 71 && t <= 75).length, 5);
		assert.equal(PEDIATRIC_TEETH_SSOT.filter((t) => t >= 81 && t <= 85).length, 5);

		for (const t of PEDIATRIC_TEETH_SSOT) {
			assert.ok(isPediatricTooth(t), `Tooth ${t} must be identified as pediatric`);
		}
	});

	it("3. Verifies exactly 5 canonical tooth surfaces are registered (Occ, V, L, M, D)", () => {
		assert.equal(CANONICAL_5_SURFACES.length, 5);
		assert.deepEqual(CANONICAL_5_SURFACES.map((s) => s.id), ["Occ", "V", "L", "M", "D"]);

		for (const surf of CANONICAL_5_SURFACES) {
			assert.ok(surf.nameRu.length > 0);
			assert.ok(surf.shortRu.length > 0);
			assert.ok(surf.description.length > 0);
		}
	});

	it("4. Verifies 10 chairside clinical statuses with color tokens and clinical codes", () => {
		assert.equal(CLINICAL_STATUSES_SSOT.length, 10);
		assert.deepEqual(
			CLINICAL_STATUSES_SSOT.map((s) => s.key),
			["Healthy", "Caries", "Pulpitis", "Periodontitis", "Filled", "Crown", "Implant", "Missing", "Retained", "Root"],
		);
		assert.deepEqual(
			CLINICAL_STATUSES_SSOT.map((s) => s.codeRu),
			["З", "К", "П", "Пт", "Пл", "Кр", "Имп", "О", "Р", "Рз"],
		);

		for (const st of CLINICAL_STATUSES_SSOT) {
			assert.ok(st.bgToken.startsWith("var("));
			assert.ok(st.colorHex.startsWith("#"));
		}
	});

	it("5. Verifies Mandate 8e: 1-click physiological normal dentition factory", () => {
		const intactAdult = createIntactDentition("adult");
		assert.equal(Object.keys(intactAdult).length, 32);

		for (const entry of Object.values(intactAdult)) {
			assert.equal(entry.state, "Healthy");
			assert.deepEqual(entry.surfaces, []);
			assert.equal(entry.mobility, 0);
		}

		const intactPediatric = createIntactDentition("pediatric");
		assert.equal(Object.keys(intactPediatric).length, 20);
		for (const entry of Object.values(intactPediatric)) {
			assert.equal(entry.state, "Healthy");
		}
	});

	it("6. Verifies 1-click visit estimate price linkage for chairside pathologies", () => {
		const cariesEstimate = getRecommendedEstimateForStatus("Caries");
		assert.ok(cariesEstimate);
		assert.equal(cariesEstimate.code804n, "A16.07.002.001");
		assert.ok(cariesEstimate.amountKopecks > 0);

		const pulpitisEstimate = getRecommendedEstimateForStatus("Pulpitis");
		assert.ok(pulpitisEstimate);
		assert.equal(pulpitisEstimate.code804n, "A16.07.030.001");

		const implantEstimate = getRecommendedEstimateForStatus("Implant");
		assert.ok(implantEstimate);
		assert.equal(implantEstimate.code804n, "A16.07.006.001");
	});

	it("7. Verifies anatomical helpers: jaw classification and human tooth nomenclature", () => {
		assert.equal(isUpperJawTooth(16), true);
		assert.equal(isUpperJawTooth(21), true);
		assert.equal(isUpperJawTooth(36), false);
		assert.equal(isUpperJawTooth(47), false);

		assert.equal(getToothQuadrant(16), 1);
		assert.equal(getToothQuadrant(26), 2);
		assert.equal(getToothQuadrant(36), 3);
		assert.equal(getToothQuadrant(46), 4);
		assert.equal(getToothQuadrant(55), 5);

		const name16 = getToothStandardNameRu(16);
		assert.ok(name16.includes("первый моляр"));
		assert.ok(name16.includes("верхний"));

		const name51 = getToothStandardNameRu(51);
		assert.ok(name51.includes("молочный"));
	});
});

describe("Odontogram Studio, SVG idPrefix Isolation & Routing", () => {
	it("8. Isolates SVG gradient url(#...) references across arches via idPrefix (P2-5.3 / Mandate 8ar)", () => {
		const arch1Colors = getToothColors("Crown", "zirconia", "archA");
		const arch2Colors = getToothColors("Crown", "zirconia", "archB");
		assert.ok(arch1Colors.crownFill.includes("url(#archA-"));
		assert.ok(arch2Colors.crownFill.includes("url(#archB-"));
		assert.notEqual(arch1Colors.crownFill, arch2Colors.crownFill);

		const filled1 = getToothColors("Filled", "composite", "tab1");
		const filled2 = getToothColors("Filled", "composite", "tab2");
		assert.ok(filled1.fill.includes("url(#tab1-"));
		assert.ok(filled2.fill.includes("url(#tab2-"));
		assert.notEqual(filled1.fill, filled2.fill);
	});

	it("9. Renders OdontogramModule cleanly with 0 disabled buttons and 0 cartoon emojis (Mandates 8e, 8d)", () => {
		const html = renderToString(
			<AppLogicProvider value={mockTestAppLogic as AppLogicContextType}>
				<OdontogramModule patientId="demo-patient-1" />
			</AppLogicProvider>,
		);

		assert.ok(html.length > 0);
		assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false, "OdontogramModule must have 0 disabled buttons");
		const emojiRegex = /\p{Extended_Pictographic}/u;
		assert.equal(emojiRegex.test(html.replace(/[✓✕⚠★]/g, "")), false, "Rendered OdontogramModule must have 0 cartoon emojis");
	});

	it("10. resolveClinicRoute routes #odontogram and ?odontogram=1 to odontogram_fullscreen studio (Mandate 8aq)", () => {
		assert.equal(resolveClinicRoute("", "#odontogram").studio?.kind, "odontogram_fullscreen");
		assert.equal(resolveClinicRoute("?odontogram=1", "").studio?.kind, "odontogram_fullscreen");
	});
});
