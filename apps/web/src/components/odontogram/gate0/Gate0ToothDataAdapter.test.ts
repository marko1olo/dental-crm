import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyUpdatedStatesToTeeth } from "../syncModules/odontogramIndexedDbSync";
import type { ToothData } from "../ToothChart";
import {
	gate0FlagsToToothState,
	toothDataToGate0Flags,
} from "./gate0ToothAdapter";
import { resolveToothStatusBadge } from "./ToothStatusBadgeResolver";

describe("Gate 0 — Real CRM ToothData & Domain Adapter Integration", () => {
	it("converts all canonical CRM states to Gate 0 layer flags", () => {
		const crmStates: Array<[ToothData["state"], string]> = [
			["Healthy", "✓"],
			["Caries", "C1m"],
			["Filled", "П"],
			["Crown", "К"],
			["Implant", "Ик"],
			["Missing", "О"],
			["Pulpitis", "P"],
			["Periodontitis", "Pt"],
		];

		for (const [state, expectedBadge] of crmStates) {
			const tooth: ToothData = { toothNumber: 46, state };
			const flags = toothDataToGate0Flags(tooth);
			const badge = resolveToothStatusBadge(undefined, flags, 46);
			assert.equal(badge.code, expectedBadge, `Mismatch for state ${state}`);
		}
	});

	it("correctly parses caries surfaces, depth, and anterior/posterior defaults", () => {
		const molar = toothDataToGate0Flags({ toothNumber: 46, state: "Caries" });
		assert.equal(molar.cariesType, "class1");
		assert.equal(molar.cariesDepth, "media");
		assert.equal(resolveToothStatusBadge(undefined, molar, 46).code, "C1m");

		const incisor = toothDataToGate0Flags({ toothNumber: 41, state: "Caries" });
		assert.equal(incisor.cariesType, "class3");
		assert.equal(incisor.cariesDepth, "media");
		assert.equal(resolveToothStatusBadge(undefined, incisor, 41).code, "C3m");

		const mo = toothDataToGate0Flags({ toothNumber: 46, state: "Caries", surfaces: ["M", "O"] });
		assert.equal(mo.cariesType, "class2_mo");

		const mod = toothDataToGate0Flags({
			toothNumber: 46,
			state: "Caries",
			surfaces: ["MOD"],
			clinicalData: { isDestruct: true },
		});
		assert.equal(mod.cariesType, "class2_mod");
		assert.equal(mod.cariesDepth, "destructive");
		assert.equal(resolveToothStatusBadge(undefined, mod, 46).code, "MODds");
	});

	it("guarantees lossless round-trip: ToothData -> Gate0Flags -> ToothData", () => {
		const testCases: ToothData[] = [
			{ toothNumber: 46, state: "Healthy" },
			{ toothNumber: 46, state: "Caries", surfaces: ["M", "O"] },
			{ toothNumber: 46, state: "Filled" },
			{ toothNumber: 46, state: "Crown", material: "zirconia" },
			{ toothNumber: 46, state: "Implant" },
			{ toothNumber: 46, state: "Missing" },
			{ toothNumber: 46, state: "Pulpitis" },
			{ toothNumber: 46, state: "Periodontitis" },
		];

		for (const orig of testCases) {
			const flags = toothDataToGate0Flags(orig);
			const reconstructed = gate0FlagsToToothState(orig.toothNumber, flags);
			assert.equal(reconstructed.toothNumber, orig.toothNumber);
			assert.equal(reconstructed.state, orig.state);
			if (orig.surfaces) {
				assert.deepEqual(reconstructed.surfaces, orig.surfaces);
			}
		}
	});

	it("connects seamlessly with updateToothState / applyUpdatedStatesToTeeth dispatcher", () => {
		const initialTeeth: ToothData[] = [
			{ toothNumber: 46, state: "Healthy" },
			{ toothNumber: 47, state: "Healthy" },
		];

		const flags = toothDataToGate0Flags({ toothNumber: 46, state: "Healthy" });
		flags.caries = true;
		flags.cariesType = "class2_mo";
		flags.cariesDepth = "profunda";

		const patch = gate0FlagsToToothState(46, flags);
		assert.equal(patch.state, "Caries");
		assert.deepEqual(patch.surfaces, ["M", "O"]);

		const updated = applyUpdatedStatesToTeeth(initialTeeth, [patch.toothNumber!], patch.state!, patch.surfaces);
		const tooth46 = updated.find((t) => t.toothNumber === 46);
		assert.ok(tooth46);
		assert.equal(tooth46?.state, "Caries");
		assert.deepEqual(tooth46?.surfaces, ["M", "O"]);

		const tooth47 = updated.find((t) => t.toothNumber === 47);
		assert.equal(tooth47?.state, "Healthy");
	});
});
