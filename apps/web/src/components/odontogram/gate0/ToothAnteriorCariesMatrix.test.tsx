import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Tooth41Container } from "./teeth/tooth41";
import { Tooth42Container } from "./teeth/tooth42";
import { Tooth43Container } from "./teeth/tooth43";

describe("Gate 0 Anterior Caries Matrix «Black Class x Depth» — Teeth 41, 42, 43", () => {
	const depths = ["superficial", "media", "profunda", "destructive"] as const;

	it("renders complete Class III spectrum (superficial spot, media crater, profunda, destructive) across 41, 42, 43", () => {
		for (const depth of depths) {
			const h41 = renderToString(React.createElement(Tooth41Container, { layers: { caries: true, cariesType: "class3", cariesDepth: depth } }));
			assert.ok(h41.includes(`tooth41-c3-${depth}`));

			const h42 = renderToString(React.createElement(Tooth42Container, { layers: { caries: true, cariesType: "class3", cariesDepth: depth } }));
			assert.ok(h42.includes(`tooth42-c3-${depth}`));

			const h43 = renderToString(React.createElement(Tooth43Container, { layers: { caries: true, cariesType: "class3", cariesDepth: depth } }));
			assert.ok(h43.includes(`tooth43-c3-${depth}`));
		}
	});

	it("renders complete Class IV spectrum with incisal angle fracture and destructive transparency mask", () => {
		for (const depth of depths) {
			const h41 = renderToString(React.createElement(Tooth41Container, { layers: { caries: true, cariesType: "class4", cariesDepth: depth } }));
			assert.ok(h41.includes(`tooth41-c4-${depth}`));

			const h42 = renderToString(React.createElement(Tooth42Container, { layers: { caries: true, cariesType: "class4", cariesDepth: depth } }));
			assert.ok(h42.includes(`tooth42-c4-${depth}`));

			const h43 = renderToString(React.createElement(Tooth43Container, { layers: { caries: true, cariesType: "class4", cariesDepth: depth } }));
			assert.ok(h43.includes(`tooth43-c4-${depth}`));
		}
		// Destructive cut masks in enamel crowns
		const d41 = renderToString(React.createElement(Tooth41Container, { layers: { caries: true, cariesType: "class4", cariesDepth: "destructive" } }));
		assert.ok(d41.includes("id=\"tooth41-crown-destruct-mask\""));

		const d42 = renderToString(React.createElement(Tooth42Container, { layers: { caries: true, cariesType: "class4", cariesDepth: "destructive" } }));
		assert.ok(d42.includes("id=\"tooth42-crown-destruct-mask\""));

		const d43 = renderToString(React.createElement(Tooth43Container, { layers: { caries: true, cariesType: "class4", cariesDepth: "destructive" } }));
		assert.ok(d43.includes("id=\"tooth43-crown-destruct-mask\""));
	});

	it("renders complete Class V cervical spectrum at CEJ with destructive transparency mask", () => {
		for (const depth of depths) {
			const h41 = renderToString(React.createElement(Tooth41Container, { layers: { caries: true, cariesType: "class5", cariesDepth: depth } }));
			assert.ok(h41.includes(`tooth41-c5-${depth}`));

			const h42 = renderToString(React.createElement(Tooth42Container, { layers: { caries: true, cariesType: "class5", cariesDepth: depth } }));
			assert.ok(h42.includes(`tooth42-c5-${depth}`));

			const h43 = renderToString(React.createElement(Tooth43Container, { layers: { caries: true, cariesType: "class5", cariesDepth: depth } }));
			assert.ok(h43.includes(`tooth43-c5-${depth}`));
		}
		// Destructive cervical cut masks
		const d41 = renderToString(React.createElement(Tooth41Container, { layers: { caries: true, cariesType: "class5", cariesDepth: "destructive" } }));
		assert.ok(d41.includes("id=\"tooth41-crown-destruct-mask\""));

		const d42 = renderToString(React.createElement(Tooth42Container, { layers: { caries: true, cariesType: "class5", cariesDepth: "destructive" } }));
		assert.ok(d42.includes("id=\"tooth42-crown-destruct-mask\""));

		const d43 = renderToString(React.createElement(Tooth43Container, { layers: { caries: true, cariesType: "class5", cariesDepth: "destructive" } }));
		assert.ok(d43.includes("id=\"tooth43-crown-destruct-mask\""));
	});

	it("supports acute and chronic chronicity across anterior teeth", () => {
		const chronic41 = renderToString(React.createElement(Tooth41Container, { layers: { caries: true, cariesType: "class3", cariesDepth: "media", cariesChronicity: "chronic" } }));
		assert.ok(chronic41.includes("dente-caries-chronic"));

		const acute42 = renderToString(React.createElement(Tooth42Container, { layers: { caries: true, cariesType: "class4", cariesDepth: "media", cariesChronicity: "acute" } }));
		assert.ok(acute42.includes("dente-caries-lesion"));
	});

	it("applies default Class III Media brown approximal cavity when caries: true is set without parameters", () => {
		const def41 = renderToString(React.createElement(Tooth41Container, { layers: { caries: true } }));
		assert.ok(def41.includes("tooth41-c3-media"), "Tooth 41 must default to Class III media");
		assert.ok(def41.includes("data-caries-type=\"class3\""));
		assert.ok(def41.includes("data-caries-depth=\"media\""));
		assert.ok(def41.includes(">C3m<"), "Tooth 41 badge must default to C3m");

		const def42 = renderToString(React.createElement(Tooth42Container, { layers: { caries: true } }));
		assert.ok(def42.includes("tooth42-c3-media"), "Tooth 42 must default to Class III media");
		assert.ok(def42.includes(">C3m<"), "Tooth 42 badge must default to C3m");

		const def43 = renderToString(React.createElement(Tooth43Container, { layers: { caries: true } }));
		assert.ok(def43.includes("tooth43-c3-media"), "Tooth 43 must default to Class III media");
		assert.ok(def43.includes(">C3m<"), "Tooth 43 badge must default to C3m");
	});
});
