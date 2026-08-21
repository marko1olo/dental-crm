import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
	useDocumentBrandingStore,
	BRAND_COLOR_PALETTES,
} from "../store/documentBrandingStore";

describe("useDocumentBrandingStore", () => {
	beforeEach(() => {
		useDocumentBrandingStore.getState().resetToDefaults();
	});

	it("initializes with default clinical settings", () => {
		const state = useDocumentBrandingStore.getState();
		assert.ok(state.clinicName.includes("DENTE"));
		assert.equal(state.brandAccentColor, "deep_teal");
		assert.equal(state.layoutDensity, "comfortable");
		assert.equal(state.fontFamily, "sans");
		assert.equal(state.showQrVerification, true);
		assert.equal(state.showOdontogramDiagram, true);
		assert.equal(state.showDoctorStampFrame, true);
	});

	it("updates branding palette and switches", () => {
		const store = useDocumentBrandingStore.getState();
		store.updateBranding({
			brandAccentColor: "royal_burgundy",
			clinicName: "VIP Dental Clinic",
			layoutDensity: "compact",
			showQrVerification: false,
		});

		const updated = useDocumentBrandingStore.getState();
		assert.equal(updated.brandAccentColor, "royal_burgundy");
		assert.equal(updated.clinicName, "VIP Dental Clinic");
		assert.equal(updated.layoutDensity, "compact");
		assert.equal(updated.showQrVerification, false);
	});

	it("has valid color definitions for all palette keys", () => {
		const palettes = BRAND_COLOR_PALETTES;
		assert.equal(palettes.medical_navy.primary, "#1e3a8a");
		assert.equal(palettes.deep_teal.primary, "#0f766e");
		assert.equal(palettes.royal_burgundy.primary, "#831843");
		assert.equal(palettes.pure_slate.primary, "#0f172a");
		assert.equal(palettes.gold_luxury.primary, "#b45309");

		for (const key of Object.keys(palettes) as (keyof typeof palettes)[]) {
			const pal = palettes[key];
			assert.match(pal.primary, /^#[0-9a-fA-F]{6}$/);
			assert.match(pal.softBg, /^#[0-9a-fA-F]{6}$/);
			assert.ok(pal.label.length > 0);
		}
	});

	it("resets to defaults cleanly", () => {
		const store = useDocumentBrandingStore.getState();
		store.updateBranding({
			brandAccentColor: "pure_slate",
			clinicName: "Temporary",
		});
		assert.equal(useDocumentBrandingStore.getState().clinicName, "Temporary");

		store.resetToDefaults();
		assert.ok(useDocumentBrandingStore.getState().clinicName.includes("DENTE"));
		assert.equal(useDocumentBrandingStore.getState().brandAccentColor, "deep_teal");
	});
});
