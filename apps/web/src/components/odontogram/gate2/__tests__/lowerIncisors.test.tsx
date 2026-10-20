import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import { Tooth31Container } from "../lower/Tooth31Container";
import { TOOTH31_GEOMETRY } from "../lower/tooth31GeometryConstants";
import { Tooth32Container } from "../lower/Tooth32Container";
import { TOOTH32_GEOMETRY } from "../lower/tooth32GeometryConstants";
import { Tooth41Container } from "../lower/Tooth41Container";
import { Tooth42Container } from "../lower/Tooth42Container";

describe("Gate 2: Lower Incisors (31, 41, 32, 42) & Mandibular Clinical Overlays", () => {
	it("renders central incisors 31 & 41 with chisel crown, mamelons, and bilateral mirror", () => {
		const html31 = renderToString(React.createElement(Tooth31Container));
		assert.ok(html31.includes('id="tooth31-crown-base"'));
		assert.ok(html31.includes('id="tooth31-mamelons"'));
		assert.ok(html31.includes('id="tooth31-root-monolith"'));
		assert.ok(html31.includes('id="tooth31-sulcus-longitudinalis"'));
		assert.equal(TOOTH31_GEOMETRY.apex.x, 50);

		const html41 = renderToString(React.createElement(Tooth41Container));
		assert.ok(html41.includes('transform="translate(100, 0) scale(-1, 1)"'));
		assert.ok(html41.includes('aria-label="Анатомический нижний центральный резец 41"'));
		assert.ok(html41.includes('id="tooth31-crown-base"'));
	});

	it("renders lateral incisors 32 & 42 with distal slope, twist, and distal apical bow", () => {
		const html32 = renderToString(React.createElement(Tooth32Container));
		assert.ok(html32.includes('id="tooth32-crown-base"'));
		assert.ok(html32.includes('id="tooth32-mamelons"'));
		assert.ok(html32.includes('id="tooth32-root-monolith"'));
		assert.equal(TOOTH32_GEOMETRY.apex.x, 51.5); // Distal apical bow

		const html42 = renderToString(React.createElement(Tooth42Container));
		assert.ok(html42.includes('transform="translate(100, 0) scale(-1, 1)"'));
		assert.ok(html42.includes('aria-label="Анатомический нижний латеральный резец 42"'));
		assert.ok(html42.includes('id="tooth32-crown-base"'));
	});

	it("verifies Vertucci canal trajectories: Type II/III dual uniting vs Type I ribbon", () => {
		const htmlDual = renderToString(
			React.createElement(Tooth31Container, {
				layers: { pulp: true, canals: true, vertucciType: "II" },
			}),
		);
		assert.ok(htmlDual.includes('id="tooth31-pulp-chamber"'));
		assert.ok(htmlDual.includes('id="tooth31-canal-buccal"'));
		assert.ok(htmlDual.includes('id="tooth31-canal-lingual"'));
		assert.ok(htmlDual.includes('id="tooth31-canal-common-apex"'));

		const htmlRibbon = renderToString(
			React.createElement(Tooth32Container, {
				layers: { canals: true, guttaPercha: true, vertucciType: "I" },
			}),
		);
		assert.ok(htmlRibbon.includes('id="tooth32-canal-ribbon"'));
		assert.ok(htmlRibbon.includes('id="tooth32-apical-foramen"'));
	});

	it("verifies pathological wear degrees I, II, III", () => {
		const d1 = renderToString(React.createElement(Tooth31Container, { layers: { wearDegree: 1 } }));
		assert.ok(d1.includes('id="wear-facet-enamel"'));
		assert.ok(!d1.includes('id="wear-dentin-islands"'));

		const d2 = renderToString(React.createElement(Tooth31Container, { layers: { wearDegree: 2 } }));
		assert.ok(d2.includes('id="wear-facet-enamel"'));
		assert.ok(d2.includes('id="wear-dentin-islands"'));

		const d3 = renderToString(React.createElement(Tooth31Container, { layers: { wearDegree: 3 } }));
		assert.ok(d3.includes('id="wear-secondary-dentin-crater"'));
		assert.ok(d3.includes('id="pulp-proximity-glow"'));
	});

	it("verifies abfraction wedge, frontal splinting ribbon, and bone recession mobility", () => {
		const htmlAbfraction = renderToString(
			React.createElement(Tooth31Container, { layers: { abfraction: true } }),
		);
		assert.ok(htmlAbfraction.includes('id="abfraction-notch"'));
		assert.ok(htmlAbfraction.includes('id="abfraction-stress-line"'));

		const htmlSplint = renderToString(
			React.createElement(Tooth31Container, {
				layers: { splinting: true, splintType: "fiberglass" },
			}),
		);
		assert.ok(htmlSplint.includes('id="splint-ribbon-body"'));
		assert.ok(htmlSplint.includes('id="splint-composite-spot-mesial"'));

		const htmlPerio = renderToString(
			React.createElement(Tooth32Container, {
				layers: { boneRecession: true, mobilityGrade: 2 },
			}),
		);
		assert.ok(htmlPerio.includes('id="alveolar-bone-crest"'));
		assert.ok(htmlPerio.includes('id="mobility-grade-badge"'));
		assert.ok(htmlPerio.includes("M:II ↔"));
	});
});
