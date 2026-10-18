import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	TOOTH46_PRESETS,
	Tooth46Container,
	Tooth46InspectionStand,
} from "./index";

describe("Gate 0 Advanced Clinical States — Tooth 46", () => {
	it("renders adequate vs defective restoration states (secondary caries & ceramic chip)", () => {
		const compDefHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { composite: true, compositeCondition: "defective" },
			}),
		);
		assert.ok(
			compDefHtml.includes("tooth46-defective-composite-manifestations"),
		);

		const crownDefHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { zirconiaCrown: true, crownCondition: "defective" },
			}),
		);
		assert.ok(crownDefHtml.includes("tooth46-crown-defective-manifestations"));
	});

	it("renders advanced clinical pathologies: abfraction, post & core, calculus, crack, implant, missing", () => {
		const pathHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: {
					abfraction: true,
					postCore: true,
					calculus: true,
					crack: true,
				},
			}),
		);
		assert.ok(pathHtml.includes("tooth46-abfraction-notch"));
		assert.ok(pathHtml.includes("tooth46-post-core"));
		assert.ok(pathHtml.includes("tooth46-calculus-deposits"));
		assert.ok(pathHtml.includes("tooth46-enamel-crack"));

		const implantHtml = renderToString(
			React.createElement(Tooth46Container, { layers: { implant: true } }),
		);
		assert.ok(implantHtml.includes("tooth46-titanium-implant"));

		const missingHtml = renderToString(
			React.createElement(Tooth46Container, { layers: { missing: true } }),
		);
		assert.ok(missingHtml.includes("tooth46-missing-cross"));
	});

	it("renders Tooth46InspectionStand with 20 clinical presets and HUD", () => {
		assert.equal(
			TOOTH46_PRESETS.length,
			20,
			"Must have exactly 20 clinical presets",
		);
		const standHtml = renderToString(
			React.createElement(Tooth46InspectionStand),
		);
		assert.ok(standHtml.includes('data-testid="tooth-46-gate0-stand"'));
		assert.ok(standHtml.includes("DENTE Gate 0 First Article"));
		assert.ok(standHtml.includes("Зуб 46"));
		assert.ok(standHtml.includes("Цирконий"));
		assert.ok(standHtml.includes("PFM"));
		assert.ok(standHtml.includes("Имплант"));
	});
});
