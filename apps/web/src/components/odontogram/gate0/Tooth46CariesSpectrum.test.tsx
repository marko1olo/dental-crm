import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Tooth46Container } from "./index";

describe("Gate 0 Caries Spectrum & Bonded Restorations — Tooth 46", () => {
	it("renders full caries spectrum: Class II MO/DO/MOD, Class V, White Spot, Acute/Chronic and Onlay/Inlay", () => {
		const wsHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { caries: true, cariesType: "white_spot" },
			}),
		);
		assert.ok(wsHtml.includes("tooth46-caries-white-spot"));

		const c2MoHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { caries: true, cariesType: "class2_mo" },
			}),
		);
		assert.ok(c2MoHtml.includes("tooth46-caries-class2-mo"));

		const c2DoHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { caries: true, cariesType: "class2_do" },
			}),
		);
		assert.ok(c2DoHtml.includes("tooth46-caries-class2-do"));

		const c2ModHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { caries: true, cariesType: "class2_mod" },
			}),
		);
		assert.ok(c2ModHtml.includes("tooth46-caries-class2-mo"));
		assert.ok(c2ModHtml.includes("tooth46-caries-class2-do"));
		assert.ok(c2ModHtml.includes("tooth46-caries-class2-mod-isthmus"));

		const c5Html = renderToString(
			React.createElement(Tooth46Container, {
				layers: { caries: true, cariesType: "class5" },
			}),
		);
		assert.ok(c5Html.includes("tooth46-caries-class5"));

		const chronicHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { caries: true, cariesChronicity: "chronic" },
			}),
		);
		assert.ok(chronicHtml.includes("dente-caries-chronic"));

		const inlayHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { inlayOnlay: "inlay" },
			}),
		);
		assert.ok(inlayHtml.includes("tooth46-ceramic-inlay"));

		const onlayHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { inlayOnlay: "onlay" },
			}),
		);
		assert.ok(onlayHtml.includes("tooth46-ceramic-onlay"));
	});
});
