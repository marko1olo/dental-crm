import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	AbfractionWedgeOverlay,
	ApicalHaloOverlay,
	CalculusBandOverlay,
	ImplantSlaOverlay,
	MissingToothCrossOverlay,
} from "../index";

describe("Shared Odontogram Surgical and Periodontal Overlays", () => {
	it("renders CalculusBandOverlay and AbfractionWedgeOverlay", () => {
		const calcHtml = renderToString(
			React.createElement(CalculusBandOverlay, {
				supraPath: "M 15,75 Q 50,85 85,75",
				subPath: "M 18,80 Q 50,90 82,80",
				severity: "severe",
			}),
		);
		assert.ok(calcHtml.includes('data-calculus-severity="severe"'));
		assert.ok(calcHtml.includes("dente-shader-calculus-supra"));

		const abfHtml = renderToString(
			React.createElement(AbfractionWedgeOverlay, {
				notchPath: "M 10,70 L 20,75 L 10,80 Z",
				dentinFloorPath: "M 12,72 L 18,75 L 12,78 Z",
				stressApexLine: "M 20,75 L 25,75",
			}),
		);
		assert.ok(abfHtml.includes("dente-shader-abfraction-dentin"));
		assert.ok(abfHtml.includes('fill="#b08968"'));
	});

	it("renders ImplantSlaOverlay with SLA titanium threads and collar", () => {
		const html = renderToString(
			React.createElement(ImplantSlaOverlay, {
				geometry: {
					fixtureBodyPath: "M 30,75 L 70,75 L 60,140 L 40,140 Z",
					collarPath: "M 32,70 L 68,70 L 70,75 L 30,75 Z",
					abutmentPath: "M 35,45 L 65,45 L 68,70 L 32,70 Z",
					threads: ["M 32,90 L 68,90"],
				},
			}),
		);
		assert.ok(html.includes("dente-shader-titanium-body"));
		assert.ok(html.includes("dente-shader-titanium-collar"));
	});

	it("renders ApicalHaloOverlay and MissingToothCrossOverlay", () => {
		const halo = renderToString(
			React.createElement(ApicalHaloOverlay, {
				apices: [
					{ id: "m", x: 25, y: 145, lesionType: "granuloma" },
					{ id: "d", x: 75, y: 145, lesionType: "periodontitis_flame" },
				],
			}),
		);
		assert.ok(halo.includes("dente-shader-periapical-halo"));
		assert.ok(halo.includes("dente-shader-periapical-flame"));

		const missing = renderToString(
			React.createElement(MissingToothCrossOverlay, {
				bounds: { x: 10, y: 10, width: 80, height: 140 },
			}),
		);
		assert.ok(missing.includes('stroke="#ef4444"'));
	});
});
