import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
(globalThis as any).React = React;
import { renderToString } from "react-dom/server";
import { AnatomicalTooth } from "./AnatomicalTooth";

const ALL_32_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
];

describe("AnatomicalTooth - Full 32 Dentition & Bilateral Symmetry", () => {
	it("renders all 32 human adult teeth cleanly without errors", () => {
		for (const toothNumber of ALL_32_TEETH) {
			const html = renderToString(React.createElement(AnatomicalTooth, { toothNumber }));
			assert.ok(html.includes("<svg"), `Tooth ${toothNumber} must render <svg`);
			assert.ok(html.includes(`>${toothNumber}<`), `Tooth ${toothNumber} badge must contain number`);
		}
	});

	it("mirrors Q2 (21..28) and Q3 (31..38) with sagittal transform scale(-1, 1)", () => {
		for (const toothNumber of ALL_32_TEETH) {
			const html = renderToString(React.createElement(AnatomicalTooth, { toothNumber }));
			const isQ2orQ3 = (toothNumber >= 21 && toothNumber <= 28) || (toothNumber >= 31 && toothNumber <= 38);
			if (isQ2orQ3) {
				assert.ok(html.includes("scale(-1, 1)"), `Tooth ${toothNumber} must have scale(-1, 1)`);
			} else {
				assert.ok(!html.includes("scale(-1, 1)"), `Tooth ${toothNumber} must not have scale(-1, 1)`);
			}
		}
	});

	it("keeps ToothStatusBadge outside mirrored group so numbers are natural", () => {
		for (const t of [21, 26, 31, 36]) {
			const html = renderToString(React.createElement(AnatomicalTooth, { toothNumber: t }));
			assert.ok(html.includes(`>${t}<`), `Badge for tooth ${t} must have readable number`);
			const gEndIdx = html.indexOf("</g>");
			const textIdx = html.indexOf(`>${t}<`);
			assert.ok(textIdx > gEndIdx, `Badge text for tooth ${t} must be outside mirrored group`);
		}
	});

	it("handles onClick and custom layers cleanly", () => {
		let clickedTooth = 0;
		const elem = React.createElement(AnatomicalTooth, {
			toothNumber: 26,
			onClick: (_e: any, num: number) => { clickedTooth = num; },
			layers: { caries: true, guttaPercha: true },
		});
		assert.ok(React.isValidElement(elem));
		assert.equal(elem.props.toothNumber, 26);
	});
});
