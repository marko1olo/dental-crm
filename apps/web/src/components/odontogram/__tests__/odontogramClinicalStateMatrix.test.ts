import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	TOOTH_STATE_ACTIONS,
	getClinicalBundleForToothState,
} from "../odontogramModuleConstants";
import {
	TOOTH_STATUS_MATRIX,
	getStatusBadge,
} from "../gate0/ToothStatusBadgeMatrix";
import { resolveToothStatusBadge } from "../gate0/ToothStatusBadgeResolver";

describe("Odontogram Clinical State Matrix & Badge Alignment", () => {
	it("TOOTH_STATE_ACTIONS contains all 17 clinical states with compliant labels and classes", () => {
		const expectedStates = [
			{ state: "Healthy", label: "Здоров (0)" },
			{ state: "Caries", label: "Кариес (C)" },
			{ state: "Defective_Restoration", label: "Дефект пломбы (Дп)" },
			{ state: "Filled", label: "Пломба (П)" },
			{ state: "Calculus", label: "Зубной камень (Зк)" },
			{ state: "Pulpitis", label: "Пульпит (P)" },
			{ state: "Periodontitis", label: "Периодонтит (Pt)" },
			{ state: "Root_Canal_Treated", label: "Лечены каналы (Кл)" },
			{ state: "Root", label: "Корень (R)" },
			{ state: "Missing", label: "Отсутствует (0)" },
			{ state: "Implant", label: "Имплантат (Им)" },
			{ state: "Planned_Implant", label: "Имплант в плане" },
			{ state: "Crown", label: "Коронка (К)" },
			{ state: "Bridge", label: "Искусственный (мост) (И)" },
			{ state: "Veneer", label: "Винир (В)" },
			{ state: "Inlay", label: "Вкладка (ВК)" },
			{ state: "Retained", label: "Ретинированный (Р)" },
		];

		assert.equal(TOOTH_STATE_ACTIONS.length, 17);
		for (const exp of expectedStates) {
			const action = TOOTH_STATE_ACTIONS.find((a) => a.state === exp.state);
			assert.ok(action, `Action for state ${exp.state} must exist`);
			assert.equal(action.label, exp.label, `Label for state ${exp.state} must match`);
			assert.ok(action.className.includes("text-"), `Action for ${exp.state} must have text class`);
			assert.ok(action.className.includes("dark:text-"), `Action for ${exp.state} must have dark text class`);
		}
	});

	it("getClinicalBundleForToothState returns correct bundles according to 804n clinical packages", () => {
		// Caries and Defective_Restoration -> caries bundle
		assert.equal(getClinicalBundleForToothState("Caries")?.id, "caries");
		assert.equal(getClinicalBundleForToothState("Defective_Restoration")?.id, "caries");

		// Calculus -> hygiene bundle (or fallback to caries)
		assert.equal(getClinicalBundleForToothState("Calculus")?.id, "hygiene");

		// Pulpitis and Periodontitis -> endo_1 bundle
		assert.equal(getClinicalBundleForToothState("Pulpitis")?.id, "endo_1");
		assert.equal(getClinicalBundleForToothState("Periodontitis")?.id, "endo_1");

		// Missing and Root -> surgery_extraction bundle
		assert.equal(getClinicalBundleForToothState("Missing")?.id, "surgery_extraction");
		assert.equal(getClinicalBundleForToothState("Root")?.id, "surgery_extraction");

		// Prosthetics: Crown, Bridge, Veneer, Inlay -> crown bundle
		assert.equal(getClinicalBundleForToothState("Crown")?.id, "crown");
		assert.equal(getClinicalBundleForToothState("Bridge")?.id, "crown");
		assert.equal(getClinicalBundleForToothState("Veneer")?.id, "crown");
		assert.equal(getClinicalBundleForToothState("Inlay")?.id, "crown");

		// Healthy and Retained -> null
		assert.equal(getClinicalBundleForToothState("Healthy"), null);
		assert.equal(getClinicalBundleForToothState("Retained"), null);
	});

	it("TOOTH_STATUS_MATRIX contains all clinical badges with compliant codes and titles", () => {
		assert.equal(TOOTH_STATUS_MATRIX.abfraction?.code, "Кд");
		assert.ok(TOOTH_STATUS_MATRIX.abfraction?.title.includes("K03.1"));

		assert.equal(TOOTH_STATUS_MATRIX.treated_canals?.code, "Кл");
		assert.equal(TOOTH_STATUS_MATRIX.bridge_pontic?.code, "И");
		assert.equal(TOOTH_STATUS_MATRIX.defective_filling?.code, "Дп");
		assert.equal(TOOTH_STATUS_MATRIX.calculus?.code, "Зк");
		assert.equal(TOOTH_STATUS_MATRIX.veneer?.code, "В");
		assert.equal(TOOTH_STATUS_MATRIX.inlay?.code, "ВК");
	});

	it("resolveToothStatusBadge maps both direct codes and layer flags", () => {
		assert.equal(resolveToothStatusBadge("Кл").code, "Кл");
		assert.equal(resolveToothStatusBadge("Дп").code, "Дп");
		assert.equal(resolveToothStatusBadge("И").code, "И");
		assert.equal(resolveToothStatusBadge("Зк").code, "Зк");
		assert.equal(resolveToothStatusBadge("В").code, "В");
		assert.equal(resolveToothStatusBadge("ВК").code, "ВК");
		assert.equal(resolveToothStatusBadge("Кд").code, "Кд");

		// guttaPercha returns treated_canals (Кл)
		const guttaBadge = resolveToothStatusBadge(undefined, { guttaPercha: true });
		assert.equal(guttaBadge.code, "Кл");
		assert.equal(guttaBadge.title, "Каналы лечены (ранее обтурированы)");
	});
});
