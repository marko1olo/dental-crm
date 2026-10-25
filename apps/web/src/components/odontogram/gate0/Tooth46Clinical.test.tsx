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

	it("renders endodontic spectrum: broken file, cast post КШВ, radicular cyst, and apical resorption", () => {
		const bfHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { canals: true, canalCondition: "broken_file" },
			}),
		);
		assert.ok(bfHtml.includes("tooth46-broken-file"));

		const castPostHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { postCore: true, postCoreType: "cast" },
			}),
		);
		assert.ok(castPostHtml.includes("tooth46-post-core-cast"));

		const cystHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { periapicalCondition: "cyst" },
			}),
		);
		assert.ok(cystHtml.includes("tooth46-radicular-cyst"));

		const resorbHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { periapicalCondition: "resorption" },
			}),
		);
		assert.ok(resorbHtml.includes("tooth46-resorption"));
	});

	it("renders Tooth46InspectionStand with 56 clinical presets and HUD", () => {
		assert.equal(
			TOOTH46_PRESETS.length,
			56,
			"Must have 56 clinical presets (6 crown mats x 2, endo spectrum, base, 5 implant states, pathology, caries spectrum, inlays, 6 advanced pathologies, and 6 caries depth presets)",
		);
		const standHtml = renderToString(
			React.createElement(Tooth46InspectionStand),
		);
		assert.ok(standHtml.includes('data-testid="tooth-46-gate0-stand"'));
		assert.ok(standHtml.includes("DENTE Gate 0 First Article"));
		assert.ok(standHtml.includes("Зуб 46"));
		assert.ok(standHtml.includes("Цирконий"));
		assert.ok(standHtml.includes("PFM"));
		assert.ok(standHtml.includes("Имплант (винт)"));
		assert.ok(standHtml.includes("Формирователь"));
		assert.ok(standHtml.includes("Коронка/Импл (винт)"));
	});
});
