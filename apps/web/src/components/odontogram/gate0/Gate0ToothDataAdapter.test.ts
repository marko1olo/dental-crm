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

	it("supports simultaneous Multi-Defect Layering: Crown + Gutta-percha + Apical Periodontitis", () => {
		const complexTooth: ToothData = {
			toothNumber: 46,
			state: "Crown",
			material: "zirconia",
			canalObturation: "gutta_percha",
			periapicalLesion: true,
		};

		const flags = toothDataToGate0Flags(complexTooth);

		// Layer 1 & 2: Orthopedic Crown
		assert.equal(flags.zirconiaCrown, true, "Zirconia crown layer must be active");
		assert.equal(flags.crown, false, "Natural enamel crown must be replaced by prosthesis");
		assert.equal(flags.cusps, false);
		assert.equal(flags.fissures, false);
		assert.equal(flags.crownMaterial, "zirconia");

		// Layer 3: Endodontics (Gutta-percha filled root canals)
		assert.equal(flags.roots, true, "Root trunk must remain visible");
		assert.equal(flags.canals, true, "Root canals must be active");
		assert.equal(flags.guttaPercha, true, "Gutta-percha obturation must be preserved under crown");
		assert.equal(flags.pulp, true, "Pulp/canal anatomy must be rendered");

		// Layer 4: Periapical Pathology (Apical Periodontitis / Granuloma)
		assert.equal(flags.periapicalHalo, true, "Apical halo must render at root apex");
		assert.equal(flags.periapicalCondition, "granuloma", "Default apical condition is granuloma");

		// Lossless reconstruction preserves both endo obturation and periapical lesion
		const reconstructed = gate0FlagsToToothState(46, flags);
		assert.equal(reconstructed.state, "Crown");
		assert.equal(reconstructed.canalObturation, "gutta_percha");
		assert.equal(reconstructed.periapicalLesion, true);
	});

	it("preserves treated canals (gutta-percha) on composite-filled teeth", () => {
		const filledEndoTooth: ToothData = {
			toothNumber: 46,
			state: "Filled",
			canalObturation: "gutta_percha",
		};

		const flags = toothDataToGate0Flags(filledEndoTooth);
		assert.equal(flags.composite, true, "Composite filling must be active");
		assert.equal(flags.compositeCondition, "adequate");
		assert.equal(flags.canals, true, "Canals must be active");
		assert.equal(flags.guttaPercha, true, "Gutta-percha must be preserved");
	});

	it("handles Residual Root (Root / R): extinguishes coronal portion and accentuates root trunk", () => {
		const rootTooth: ToothData = {
			toothNumber: 46,
			state: "Root",
		};

		const flags = toothDataToGate0Flags(rootTooth);
		assert.equal(flags.crown, false, "Enamel crown must be suppressed");
		assert.equal(flags.cusps, false, "Cusps must be suppressed");
		assert.equal(flags.fissures, false, "Fissures must be suppressed");
		assert.equal(flags.roots, true, "Root anatomy must be preserved");
		assert.equal(flags.zirconiaCrown, false);
		assert.equal(flags.composite, false);

		// With post & core build-up in root
		const postRootTooth: ToothData = {
			toothNumber: 46,
			state: "Root",
			hasPost: true,
			postType: "cast",
		};
		const postFlags = toothDataToGate0Flags(postRootTooth);
		assert.equal(postFlags.roots, true);
		assert.equal(postFlags.crown, false);
		assert.equal(postFlags.postCore, true);
		assert.equal(postFlags.postCoreType, "cast");
	});

	it("handles Bridge Pontics & Abutments cleanly (pontic has no roots, abutment has roots)", () => {
		// Pontic: artificial crown spanning missing gap without biological roots
		const pontic: ToothData = {
			toothNumber: 46,
			state: "Missing",
			bridgeRole: "pontic",
			material: "ceramic_emax",
		};
		const ponticFlags = toothDataToGate0Flags(pontic);
		assert.equal(ponticFlags.zirconiaCrown, true, "Pontic must render artificial crown");
		assert.equal(ponticFlags.crownMaterial, "emax");
		assert.equal(ponticFlags.roots, false, "Pontic must not have natural roots in bone");
		assert.equal(ponticFlags.missing, false, "Pontic fills the missing gap");

		// Direct Bridge state
		const directBridge: ToothData = {
			toothNumber: 46,
			state: "Bridge",
		};
		const bridgeFlags = toothDataToGate0Flags(directBridge);
		assert.equal(bridgeFlags.zirconiaCrown, true);
		assert.equal(bridgeFlags.roots, false);

		// Abutment (pillar) tooth: has natural roots and crown
		const pillar: ToothData = {
			toothNumber: 47,
			state: "Bridge_Abutment",
			material: "pfm_crown",
		};
		const pillarFlags = toothDataToGate0Flags(pillar);
		assert.equal(pillarFlags.zirconiaCrown, true);
		assert.equal(pillarFlags.crownMaterial, "pfm");
		assert.equal(pillarFlags.roots, true, "Abutment pillar must retain biological roots");
	});

	it("handles defective restorations (Дп, Дк, Defective_Restoration, secondary caries)", () => {
		// Defective filling via Russian abbreviation 'Дп'
		const defComposite = toothDataToGate0Flags({ toothNumber: 46, state: "Дп" as any });
		assert.equal(defComposite.composite, true);
		assert.equal(defComposite.compositeCondition, "defective");

		// Defective crown via Russian abbreviation 'Дк'
		const defCrown = toothDataToGate0Flags({ toothNumber: 46, state: "Дк" as any });
		assert.equal(defCrown.zirconiaCrown, true);
		assert.equal(defCrown.crownCondition, "defective");

		// Secondary caries on existing composite
		const secCaries = toothDataToGate0Flags({
			toothNumber: 46,
			state: "Filled",
			clinicalData: { hasSecondaryCaries: true },
		});
		assert.equal(secCaries.composite, true);
		assert.equal(secCaries.compositeCondition, "defective");
		assert.equal(secCaries.caries, true);
	});

	it("handles clinical overlays: calculus, fractures, and clinicalData endo markers", () => {
		const calculusTooth = toothDataToGate0Flags({ toothNumber: 46, state: "Calculus" });
		assert.equal(calculusTooth.calculus, true);

		const fractureTooth = toothDataToGate0Flags({ toothNumber: 46, state: "Healthy", hasFracture: true });
		assert.equal(fractureTooth.crack, true);

		const clinEndoTooth = toothDataToGate0Flags({
			toothNumber: 46,
			state: "Healthy",
			clinicalData: { hasTreatedCanals: true },
		});
		assert.equal(clinEndoTooth.canals, true);
		assert.equal(clinEndoTooth.guttaPercha, true);
	});
});
