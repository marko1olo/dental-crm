/**
 * ctImplantTiersAndMischDensity.test.ts — клинические тарифы, Misch плотность (D1-D4) и HU.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import {
	buildImplantSurgicalPackageItems,
	generateCbctAutoPlanScenarios,
	type CbctAutoPlanFindingsInput,
	type CbctImplantFinding,
} from "../ctImplantIntegrationBridge";

describe("ctImplantIntegrationBridge — Тарифы, ортопедия и плотность Misch", () => {
	test("scenarios map to correct clinical tiers (Premium: Straumann, Optimum: Dentium, Economy: Osstem)", () => {
		const input: CbctAutoPlanFindingsInput = {
			patientId: "pat-5brand-01",
			patientName: "Василий Петров",
			implants: [{ toothFdi: 46, diameterMm: 4.5, lengthMm: 10.0 }],
		};

		const [econ, opt, prem] = generateCbctAutoPlanScenarios(input);

		assert.equal(econ.tierId, "economy");
		assert.equal(opt.tierId, "standard");
		assert.equal(prem.tierId, "optimum");

		const econSurg = econ.stages[2]!.items.find((i) => i.code804n === "A16.07.054.001")!;
		const optSurg = opt.stages[2]!.items.find((i) => i.code804n === "A16.07.054.001")!;
		const premSurg = prem.stages[2]!.items.find((i) => i.code804n === "A16.07.054.001")!;

		assert.ok(econSurg.name.toLowerCase().includes("osstem"));
		assert.ok(optSurg.name.toLowerCase().includes("dentium"));
		assert.ok(premSurg.name.toLowerCase().includes("straumann"));

		const econOrtho = econ.stages[3]!.items.find((i) => i.code804n.startsWith("A16.07.004"))!;
		const optOrtho = opt.stages[3]!.items.find((i) => i.code804n.startsWith("A16.07.004"))!;
		const premOrtho = prem.stages[3]!.items.find((i) => i.code804n.startsWith("A16.07.004"))!;

		assert.ok(econOrtho.name.toLowerCase().includes("металлокерамическ"));
		assert.ok(optOrtho.name.toLowerCase().includes("zro2") || optOrtho.name.toLowerCase().includes("циркони"));
		assert.ok(premOrtho.name.toLowerCase().includes("e.max") || premOrtho.name.toLowerCase().includes("цельнокерамическ"));
	});

	test("supports doctor autonomy tierBrands override (Nobel in Premium, MIS in Economy)", () => {
		const input: CbctAutoPlanFindingsInput = {
			patientId: "pat-custom-brand-02",
			patientName: "Ольга Семенова",
			implants: [{ toothFdi: 25, diameterMm: 4.0, lengthMm: 11.5 }],
			tierBrands: {
				optimum: "nobel_biocare",
				standard: "osstem",
				economy: "mis",
			},
		};

		const [econ, opt, prem] = generateCbctAutoPlanScenarios(input);

		const econSurg = econ.stages[2]!.items.find((i) => i.code804n === "A16.07.054.001")!;
		const optSurg = opt.stages[2]!.items.find((i) => i.code804n === "A16.07.054.001")!;
		const premSurg = prem.stages[2]!.items.find((i) => i.code804n === "A16.07.054.001")!;

		assert.ok(econSurg.name.toLowerCase().includes("mis"));
		assert.ok(optSurg.name.toLowerCase().includes("osstem"));
		assert.ok(premSurg.name.toLowerCase().includes("nobel"));
	});

	test("embeds Misch density class and Hounsfield Units into surgical clinicalRationale", () => {
		const testCases = [
			{ class: "D1", hu: 1350, torque: ">= 45 Н·см" },
			{ class: "D2", hu: 920, torque: "35-45 Н·см" },
			{ class: "D3", hu: 550, torque: "30-35 Н·см" },
			{ class: "D4", hu: 220, torque: "20-30 Н·см" },
		];

		for (const tc of testCases) {
			const finding: CbctImplantFinding = {
				toothFdi: 47,
				brand: "osstem",
				mischClass: tc.class,
				meanHU: tc.hu,
				recommendedTorqueNcm: tc.torque,
				ridgeHeightMm: 11.0,
				ridgeWidthMm: 6.5,
			};

			const items = buildImplantSurgicalPackageItems(finding, "standard");
			const implantItem = items.find((i) => i.code804n === "A16.07.054.001")!;

			assert.ok(implantItem.clinicalRationale?.includes(tc.class));
			assert.ok(implantItem.clinicalRationale?.includes(`${tc.hu} HU`));
			assert.ok(implantItem.clinicalRationale?.includes(tc.torque));
		}
	});
});
