import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TOOTH15_GEOMETRY, Tooth15Container } from "./index";

describe("Tooth 15 Wheeler Ch. 10 Maxillary Second Premolar Anatomical Invariants", () => {
	it("enforces Wheeler 1 single tapered conical root with single apical center", () => {
		expect(TOOTH15_GEOMETRY.apices.length).toBe(1);
		const [apex] = TOOTH15_GEOMETRY.apices;
		expect(apex?.x).toBe(48.0);
		expect(apex?.y).toBe(18.0);
		expect(TOOTH15_GEOMETRY.rootSulcus).toBeDefined();
		expect(TOOTH15_GEOMETRY.rootSulcusHighlight).toBeDefined();
	});

	it("defines 1 single wide central root canal inside conical root", () => {
		const canals = TOOTH15_GEOMETRY.pulp.canals;
		expect(canals.length).toBe(1);
		expect(canals[0]?.id).toBe("Main");
		expect(canals[0]?.orifice.x).toBe(50.0);
		expect(canals[0]?.apex.x).toBe(48.0);
		// Equal height coronal horns
		expect(TOOTH15_GEOMETRY.pulp.buccalHorn.y).toBe(138);
		expect(TOOTH15_GEOMETRY.pulp.palatalHorn.y).toBe(138);
	});

	it("models Wheeler Ch. 10 equal-height cusps and supplemental occlusal wrinkles", () => {
		expect(TOOTH15_GEOMETRY.supplementalGrooves.length).toBeGreaterThanOrEqual(3);
		expect(TOOTH15_GEOMETRY.sulcusCentralis).toBeDefined();
		const buccalCusp = TOOTH15_GEOMETRY.cusps.find((c) => c.id === "B");
		const palatalCusp = TOOTH15_GEOMETRY.cusps.find((c) => c.id === "P");
		expect(buccalCusp).toBeDefined();
		expect(palatalCusp).toBeDefined();
		// In second premolar, buccal & palatal cusps are virtually equal in height (difference <= 0.5px)
		expect(Math.abs(buccalCusp!.apex.y - palatalCusp!.apex.y)).toBeLessThanOrEqual(0.5);
	});

	it("renders Tooth15Container with unified viewBox 0 0 100 218", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth15Container, { presetId: "intact" }),
		);
		expect(html).toContain("<svg");
		expect(html).toContain('viewBox="0 0 100 218"');
		expect(html).toContain('id="tooth15-roots"');
		expect(html).toContain('id="tooth15-root-monolith"');
		expect(html).toContain('id="tooth15-natural-crown-group"');
		expect(html).toContain('cy="194.5"');
	});

	it("renders single-canal endodontic obturation, overfill puff, and broken file", () => {
		const htmlOverfill = renderToStaticMarkup(
			React.createElement(Tooth15Container, {
				layers: {
					roots: true,
					crown: true,
					canals: true,
					pulp: false,
					guttaPercha: true,
					canalCondition: "overfill",
				},
			}),
		);
		expect(htmlOverfill).toContain('id="tooth15-endodontics"');
		expect(htmlOverfill).toContain('id="canal-Main"');
		expect(htmlOverfill).toContain('id="tooth15-overfill-puffs"');

		const htmlBroken = renderToStaticMarkup(
			React.createElement(Tooth15Container, {
				layers: {
					roots: true,
					canals: true,
					canalCondition: "broken_file",
				},
			}),
		);
		expect(htmlBroken).toContain('id="tooth15-broken-file"');
	});

	it("renders caries overlay and orthopedic crown restorations", () => {
		const htmlCaries = renderToStaticMarkup(
			React.createElement(Tooth15Container, {
				layers: {
					crown: true,
					caries: true,
					cariesType: "class2_mo",
					cariesDepth: "media",
				},
			}),
		);
		expect(htmlCaries).toContain('id="tooth15-caries-overlay"');
		expect(htmlCaries).toContain('id="tooth15-caries-c2-mesial"');

		const htmlCrown = renderToStaticMarkup(
			React.createElement(Tooth15Container, {
				layers: {
					crown: false,
					zirconiaCrown: true,
					crownMaterial: "zirconia",
				},
			}),
		);
		expect(htmlCrown).toContain('id="tooth15-restorations"');
		expect(htmlCrown).toContain('id="tooth15-crown-overlay"');
	});
});
