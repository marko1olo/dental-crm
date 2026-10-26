import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Tooth44Container } from "./teeth/tooth44";
import { Tooth45Container } from "./teeth/tooth45";
import { Tooth46Container } from "./Tooth46Container";
import { Tooth47Container } from "./teeth/tooth47";
import { Tooth48Container } from "./teeth/tooth48";
import type { CariesDepth, CariesType } from "./tooth46PresetTypes";

const TEETH = [
	{ id: "44", C: Tooth44Container, c1: "tooth44-caries-class1", c2: "tooth44-caries-class2-", c5: "tooth44-caries-cervical", mask: "tooth44-crown-destruct-mask" },
	{ id: "45", C: Tooth45Container, c1: "tooth45-caries-class1", c2: "tooth45-caries-class2-", c5: "tooth45-caries-cervical", mask: "tooth45-crown-destruct-mask" },
	{ id: "46", C: Tooth46Container, c1: "tooth46-caries-class1", c2: "tooth46-caries-class2-", c5: "tooth46-caries-class5", mask: "tooth46-crown-destruct-mask" },
	{ id: "47", C: Tooth47Container, c1: "tooth47-caries-cruciform", c2: "tooth47-caries-class2-", c5: "tooth47-caries-cervical", mask: "tooth47-crown-destruct-mask" },
	{ id: "48", C: Tooth48Container, c1: "tooth48-caries-crenulated", c2: "tooth48-caries-class2-", c5: "tooth48-caries-cervical", mask: "tooth48-crown-destruct-mask" },
];

describe("Gate 0 Posterior Caries Matrix «Black Class x Depth» — Teeth 48, 47, 46, 45, 44", () => {
	it("renders Class I occlusal spectrum: superficialis, media, profunda, destructiva across all 5 teeth", () => {
		for (const { C, c1, mask } of TEETH) {
			const sup = renderToString(React.createElement(C, { layers: { caries: true, cariesType: "class1", cariesDepth: "superficial" } }));
			assert.ok(sup.includes(c1) && sup.includes("dente-caries-demin"), `Tooth Class 1 superficialis failed: ${c1}`);

			const med = renderToString(React.createElement(C, { layers: { caries: true, cariesType: "class1", cariesDepth: "media" } }));
			assert.ok(med.includes(c1) && med.includes("dente-caries-lesion"), `Tooth Class 1 media failed: ${c1}`);

			const pro = renderToString(React.createElement(C, { layers: { caries: true, cariesType: "class1", cariesDepth: "profunda" } }));
			assert.ok(pro.includes(c1) && pro.includes("dente-caries-necrotic"), `Tooth Class 1 profunda failed: ${c1}`);

			const des = renderToString(React.createElement(C, { layers: { caries: true, cariesType: "class1", cariesDepth: "destructive" } }));
			assert.ok(des.includes(c1) && des.includes(mask), `Tooth Class 1 destructiva failed: ${c1}`);
		}
	});

	it("renders Class II approximal spectrum: all 5 localizations (M, D, MO, DO, MOD) x 4 depths", () => {
		const types: CariesType[] = ["class2_m", "class2_d", "class2_mo", "class2_do", "class2_mod"];
		const depths: CariesDepth[] = ["superficial", "media", "profunda", "destructive"];
		const badgeSfx: Record<string, string> = { superficial: "s", media: "m", profunda: "p", destructive: "ds" };

		for (const { C, c2, mask } of TEETH) {
			for (const t of types) {
				const sub = t.replace("class2_", "");
				const codePrefix = sub.toUpperCase();
				for (const d of depths) {
					const html = renderToString(React.createElement(C, { layers: { caries: true, cariesType: t, cariesDepth: d } }));
					const key = sub === "mod" ? `${c2}mo` : `${c2}${sub}`;
					const hasExpected = d === "destructive" ? (html.includes("caries-destructive") || html.includes(key)) : html.includes(key);
					assert.ok(hasExpected, `Tooth Class II ${t} ${d} missing key: ${key}`);
					assert.ok(html.includes(`>${codePrefix}${badgeSfx[d]}<`), `Tooth Class II ${t} ${d} missing badge`);
					if (d === "destructive") {
						assert.ok(html.includes(mask), `Tooth Class II ${t} destructive missing mask: ${mask}`);
					}
				}
			}
		}
	});

	it("renders Class V cervical spectrum at CEJ: superficial, media, profunda, destructive across all 5 teeth", () => {
		for (const { C, c5, mask } of TEETH) {
			const sup = renderToString(React.createElement(C, { layers: { caries: true, cariesType: "class5", cariesDepth: "superficial" } }));
			assert.ok(sup.includes(c5) && sup.includes("dente-caries-demin"), `Tooth Class 5 superficialis failed: ${c5}`);

			const med = renderToString(React.createElement(C, { layers: { caries: true, cariesType: "class5", cariesDepth: "media" } }));
			assert.ok(med.includes(c5) && med.includes("dente-caries-lesion"), `Tooth Class 5 media failed: ${c5}`);

			const pro = renderToString(React.createElement(C, { layers: { caries: true, cariesType: "class5", cariesDepth: "profunda" } }));
			assert.ok(pro.includes(c5) && pro.includes("dente-caries-necrotic"), `Tooth Class 5 profunda failed: ${c5}`);

			const des = renderToString(React.createElement(C, { layers: { caries: true, cariesType: "class5", cariesDepth: "destructive" } }));
			assert.ok(des.includes(c5) && des.includes(mask), `Tooth Class 5 destructiva failed: ${c5}`);
		}
	});
});
