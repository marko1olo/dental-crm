import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Tooth46Container } from "./index";

describe("Gate 0 Red Team Inquisition — Tooth 46 Pathologies & Surgery", () => {
	it("renders authentic abfraction wedge defect at CEJ with enamel bevel", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, { layers: { abfraction: true } }),
		);
		assert.ok(html.includes('data-testid="tooth46-abfraction"'));
		assert.ok(html.includes("dente-abfraction-dentin"));
		assert.ok(html.includes("tooth46-abfraction-notch"));
	});

	it("renders nodular supragingival calculus and tenacious subgingival ledges", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, { layers: { calculus: true } }),
		);
		assert.ok(html.includes('data-testid="tooth46-calculus"'));
		assert.ok(html.includes("dente-calculus-supra"));
		assert.ok(html.includes("dente-calculus-sub"));
		assert.ok(html.includes('data-component="calculus-nodule"'));
	});

	it("renders enamel infraction crack starting at central pit with refraction shimmer", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, { layers: { crack: true } }),
		);
		assert.ok(html.includes('data-testid="tooth46-crack"'));
		assert.ok(html.includes("tooth46-enamel-crack"));
	});

	it("renders fractured NiTi rotary file with helical flutes and torsional fracture", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, {
				layers: { canals: true, canalCondition: "broken_file" },
			}),
		);
		assert.ok(html.includes('data-testid="tooth46-broken-file"'));
		assert.ok(html.includes("dente-niti-metal"));
		assert.ok(html.includes('data-component="broken-file-flute"'));
	});

	it("renders radicular cyst with sclerotic cortical rim and radiating trabeculae", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, {
				layers: { periapicalCondition: "cyst" },
			}),
		);
		assert.ok(html.includes('data-testid="tooth46-radicular-cyst"'));
		assert.ok(html.includes("dente-cyst-fluid"));
		assert.ok(html.includes('data-component="cyst-spicule"'));
	});

	it("renders bi-radicular apical root resorption for both mesial and distal roots", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, {
				layers: { periapicalCondition: "resorption" },
			}),
		);
		assert.ok(html.includes('data-testid="tooth46-resorption"'));
		assert.ok(html.includes("tooth46-resorption-mesial"));
		assert.ok(html.includes("tooth46-resorption-distal"));
		assert.ok(html.includes('data-component="resorption-lacuna"'));
	});

	it("renders CAD/CAM Grade-5 titanium implant with macro-threads, micro-threads and abutment", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, { layers: { implant: true } }),
		);
		assert.ok(html.includes('data-testid="tooth46-implant"'));
		assert.ok(html.includes('data-component="implant-macro-thread"'));
		assert.ok(html.includes('data-component="implant-micro-thread"'));
		assert.ok(html.includes("dente-titanium-body"));
		assert.ok(html.includes("dente-titanium-abutment"));
	});

	it("renders surgical extraction cross with post-extraction alveolar socket ghost", () => {
		const html = renderToString(
			React.createElement(Tooth46Container, { layers: { missing: true } }),
		);
		assert.ok(html.includes('data-testid="tooth46-missing"'));
		assert.ok(html.includes("stroke-dasharray"));
	});
});
