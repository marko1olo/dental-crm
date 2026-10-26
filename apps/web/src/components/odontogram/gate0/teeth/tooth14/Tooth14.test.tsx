import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TOOTH14_GEOMETRY, Tooth14Container } from "./index";

describe("Tooth 14 Wheeler Ch. 10 Maxillary First Premolar Anatomical Invariants", () => {
	it("enforces Wheeler 2 separate roots (Buccal & Palatal) with bifurcation at mid-root", () => {
		expect(TOOTH14_GEOMETRY.apices.length).toBe(2);
		const [buccalApex, palatalApex] = TOOTH14_GEOMETRY.apices;
		expect(buccalApex?.x).toBe(34.0);
		expect(buccalApex?.y).toBe(14.0);
		expect(palatalApex?.x).toBe(66.0);
		expect(palatalApex?.y).toBe(16.0);
		// Root trunk bifurcation
		expect(TOOTH14_GEOMETRY.bifurcationFornix.y).toBe(55);
		expect(TOOTH14_GEOMETRY.bifurcationShadow).toBeDefined();
	});

	it("defines 2 separate root canals (Buccal & Palatal) inside dual roots", () => {
		const pulp = TOOTH14_GEOMETRY.pulp;
		expect(pulp.buccalCanal.id).toBe("Buccal");
		expect(pulp.palatalCanal.id).toBe("Palatal");
		expect(pulp.buccalCanal.apex.x).toBe(34.0);
		expect(pulp.palatalCanal.apex.x).toBe(66.0);
		expect(pulp.buccalHorn.y).toBe(140);
		expect(pulp.palatalHorn.y).toBe(136);
	});

	it("models Wheeler Ch. 10 mesial marginal groove and sharp buccal cusp", () => {
		expect(TOOTH14_GEOMETRY.mesialMarginalGroove).toBeDefined();
		expect(TOOTH14_GEOMETRY.sulcusCentralis).toBeDefined();
		const buccalCusp = TOOTH14_GEOMETRY.cusps.find((c) => c.id === "B");
		const palatalCusp = TOOTH14_GEOMETRY.cusps.find((c) => c.id === "P");
		expect(buccalCusp).toBeDefined();
		expect(palatalCusp).toBeDefined();
		// In upper premolar, crown points downward, so buccal cusp tip is at larger Y (151.5 vs 146.0)
		expect(buccalCusp!.apex.y).toBeGreaterThan(palatalCusp!.apex.y);
	});

	it("renders Tooth14Container with unified viewBox 0 0 100 218", () => {
		const html = renderToStaticMarkup(
			React.createElement(Tooth14Container, { presetId: "intact" }),
		);
		expect(html).toContain("<svg");
		expect(html).toContain('viewBox="0 0 100 218"');
		expect(html).toContain('id="tooth14-roots"');
		expect(html).toContain('id="tooth14-root-monolith"');
		expect(html).toContain('id="tooth14-natural-crown-group"');
		expect(html).toContain('cy="194.5"');
	});

	it("renders dual-canal endodontic obturation, overfill puffs, and broken file", () => {
		const htmlOverfill = renderToStaticMarkup(
			React.createElement(Tooth14Container, {
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
		expect(htmlOverfill).toContain('id="tooth14-endodontics"');
		expect(htmlOverfill).toContain('id="canal-Buccal"');
		expect(htmlOverfill).toContain('id="canal-Palatal"');
		expect(htmlOverfill).toContain('id="tooth14-overfill-puffs"');

		const htmlBroken = renderToStaticMarkup(
			React.createElement(Tooth14Container, {
				layers: {
					roots: true,
					canals: true,
					canalCondition: "broken_file",
				},
			}),
		);
		expect(htmlBroken).toContain('id="tooth14-broken-file"');
	});

	it("renders caries overlay and orthopedic crown restorations", () => {
		const htmlCaries = renderToStaticMarkup(
			React.createElement(Tooth14Container, {
				layers: {
					crown: true,
					caries: true,
					cariesType: "class2_mod",
					cariesDepth: "profunda",
				},
			}),
		);
		expect(htmlCaries).toContain('id="tooth14-caries-overlay"');
		expect(htmlCaries).toContain('id="tooth14-caries-c2-mesial"');
		expect(htmlCaries).toContain('id="tooth14-caries-c2-distal"');

		const htmlCrown = renderToStaticMarkup(
			React.createElement(Tooth14Container, {
				layers: {
					crown: false,
					zirconiaCrown: true,
					crownMaterial: "zirconia",
				},
			}),
		);
		expect(htmlCrown).toContain('id="tooth14-restorations"');
		expect(htmlCrown).toContain('id="tooth14-crown-overlay"');
	});
});
