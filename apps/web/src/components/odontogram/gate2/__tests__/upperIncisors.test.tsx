import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import {
	Tooth11Container, Tooth12Container, Tooth21Container, Tooth22Container,
	TOOTH11_GEOMETRY, TOOTH12_GEOMETRY, UpperIncisorTraumaOverlay,
	UpperIncisorVeneerOverlay, UpperIncisorWearOverlay,
} from "../upper";

describe("Gate 2: Maxillary Incisors (FDI 11, 21, 12, 22) Sculpture", () => {
	it("renders Tooth 11 wide shovel crown, cingulum, fossa lingualis and lobes", () => {
		const html = renderToString(React.createElement(Tooth11Container, { toothNumber: 11 }));
		assert.ok(html.includes('viewBox="0 0 100 160"'));
		assert.ok(html.includes('id="tooth11-crown-monolith"'));
		assert.ok(html.includes('id="tooth11-cingulum"'));
		assert.ok(html.includes('id="tooth11-foramen-caecum"'));
		assert.ok(html.includes('id="tooth11-lingual-fossa"'));
		assert.ok(html.includes('id="tooth11-developmental-lobes"'));
		assert.equal(TOOTH11_GEOMETRY.mesioIncisalAngle.isSharp, true);
	});

	it("renders Tooth 21 with bilateral horizontal mirror transform", () => {
		const html = renderToString(React.createElement(Tooth21Container));
		assert.ok(html.includes('transform="translate(100, 0) scale(-1, 1)"'));
		assert.ok(html.includes("верхний центральный резец 21"));
	});

	it("renders Tooth 12 slender shovel crown, deep fossa, and palatoradicular groove", () => {
		const html = renderToString(React.createElement(Tooth12Container, { toothNumber: 12 }));
		assert.ok(html.includes('id="tooth12-crown-monolith"'));
		assert.ok(html.includes('id="tooth12-palatoradicular-groove"'));
		assert.ok(html.includes('id="tooth12-lingual-fossa"'));
		assert.equal(TOOTH12_GEOMETRY.distoIncisalAngle.isSharp, false);
	});

	it("renders Tooth 22 with bilateral horizontal mirror transform", () => {
		const html = renderToString(React.createElement(Tooth22Container));
		assert.ok(html.includes('transform="translate(100, 0) scale(-1, 1)"'));
		assert.ok(html.includes("верхний латеральный резец 22"));
	});

	it("renders single wide conical canal with 1.5px pulp floor overlap for Tooth 11", () => {
		const html = renderToString(
			React.createElement(Tooth11Container, {
				toothNumber: 11, layers: { canal: true, pulp: true, guttaPercha: true },
			}),
		);
		assert.ok(html.includes('id="tooth11-guttapercha-cone"'));
		assert.ok(html.includes('id="tooth11-pulp-chamber"'));
		assert.equal(TOOTH11_GEOMETRY.canal.orifice.y, 97.5, "1.5px overlap into y=96 pulpal floor");
		assert.equal(TOOTH11_GEOMETRY.canal.horns.length, 3, "3 pulp horns for 3 lobes");
	});

	it("renders Tooth 12 canal with distal apical curve", () => {
		const html = renderToString(
			React.createElement(Tooth12Container, {
				toothNumber: 12, layers: { canal: true, guttaPercha: true },
			}),
		);
		assert.ok(html.includes('id="tooth12-guttapercha-cone"'));
		assert.equal(TOOTH12_GEOMETRY.canal.apexPoint.x, 56.5, "Distally curved apex in Tooth 12");
	});

	it("renders E-Max porcelain veneer overlay with translucent incisal edge and chamfer", () => {
		const html = renderToString(
			React.createElement(UpperIncisorVeneerOverlay, {
				facingPath: TOOTH11_GEOMETRY.overlays.veneerFacingPath,
				chamferMargin: TOOTH11_GEOMETRY.overlays.veneerChamferMargin,
				incisalHalo: TOOTH11_GEOMETRY.overlays.veneerIncisalHalo,
				shade: "BL1", prepType: "chamfer",
			}),
		);
		assert.ok(html.includes('data-veneer-shade="BL1"'));
		assert.ok(html.includes('id="veneer-chamfer-margin"'));
		assert.ok(html.includes('id="veneer-translucent-incisal-halo"'));
		assert.ok(html.includes('id="veneer-glass-specular"'));
	});

	it("renders Ellis Class II and Class IV trauma fractures and wear facets", () => {
		const o = TOOTH11_GEOMETRY.overlays;
		const ellis2Html = renderToString(
			React.createElement(UpperIncisorTraumaOverlay, {
				traumaType: "ellis_class_2_mesial",
				ellis2MesialPath: o.traumaEllis2Mesial,
				ellis2DistalPath: o.traumaEllis2Distal,
				ellis4LinePath: o.traumaEllis4Line,
				crownMonolithPath: TOOTH11_GEOMETRY.crownMonolithPath,
			}),
		);
		assert.ok(ellis2Html.includes('id="trauma-ellis-2-mesial-fracture"'));

		const ellis4Html = renderToString(
			React.createElement(UpperIncisorTraumaOverlay, {
				traumaType: "ellis_class_4",
				ellis2MesialPath: o.traumaEllis2Mesial,
				ellis2DistalPath: o.traumaEllis2Distal,
				ellis4LinePath: o.traumaEllis4Line,
				crownMonolithPath: TOOTH11_GEOMETRY.crownMonolithPath,
			}),
		);
		assert.ok(ellis4Html.includes('id="trauma-ellis-4-discoloration"'));
		assert.ok(ellis4Html.includes('id="trauma-ellis-4-fracture-line"'));

		const wearHtml = renderToString(
			React.createElement(UpperIncisorWearOverlay, {
				degree: 2, degree1Path: o.wearDegree1Path, degree2Path: o.wearDegree2Path, degree3Path: o.wearDegree3Path,
			}),
		);
		assert.ok(wearHtml.includes('id="wear-facet-degree-2"'));
	});
});
