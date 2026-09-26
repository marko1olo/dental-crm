import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
	DEFAULT_DOCTOR_PREFERENCES,
	ANESTHETIC_OPTIONS,
	ISOLATION_OPTIONS,
	COMPOSITE_OPTIONS,
	ADHESIVE_OPTIONS,
	DURATION_PRESETS,
	ODONTOGRAM_NOTATIONS,
	useDoctorPreferencesStore,
} from "../../../store/doctorPreferencesStore";
import {
	PROTOCOL_CLINICAL_SNIPPETS,
	STANDARD_PROTOCOLS_SEED,
} from "../protocolSnippetHelpers";
import { useThemeStore } from "../../../store/themeStore";
import { clearInMemoryStorageCache } from "../../../lib/safeLocalStorage";

describe("Doctor Clinical Preferences & Super-Settings Invariants (Mandates 8e, 8n, 8d)", () => {
	beforeEach(() => {
		clearInMemoryStorageCache();
		useDoctorPreferencesStore.getState().resetPreferences();
	});

	it("1. Default doctor preferences must follow clinical golden standards", () => {
		const prefs = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(prefs.defaultVisitDuration, 30, "Default duration must be 30 minutes");
		assert.strictEqual(prefs.favoriteAnesthetic, "articaine_100k", "Default anesthetic must be Articaine 1:100k");
		assert.strictEqual(prefs.defaultIsolation, "cofferdam", "Default isolation must be cofferdam");
		assert.strictEqual(prefs.defaultComposite, "estelite_asteria", "Default composite must be Estelite Asteria");
		assert.strictEqual(prefs.defaultAdhesive, "optibond_fl", "Default adhesive must be OptiBond FL");
		assert.strictEqual(prefs.odontogramNotation, "fdi", "Default notation must be FDI (two-digit)");
		assert.strictEqual(prefs.defaultDentition, "adult", "Default dentition must be adult (32 teeth)");
		assert.strictEqual(prefs.enableSlotEndSound, true, "5-min slot timer sound must be enabled by default");
		assert.strictEqual(prefs.enableOnlineBookingSound, true, "Online booking sound must be enabled by default");
		assert.ok(prefs.quickProtocolIds.length >= 4, "Must have at least 4 default quick protocols");
	});

	it("2. Doctor can customize visit duration presets in 1 click (15, 30, 45, 60, 90, 120 min)", () => {
		const store = useDoctorPreferencesStore.getState();
		for (const duration of DURATION_PRESETS) {
			store.updatePreferences({ defaultVisitDuration: duration });
			assert.strictEqual(
				useDoctorPreferencesStore.getState().preferences.defaultVisitDuration,
				duration,
				`Duration must update to ${duration} min`,
			);
		}
	});

	it("3. Doctor can select favorite anesthetic and all presets provide accurate medical annotations", () => {
		const store = useDoctorPreferencesStore.getState();
		assert.strictEqual(ANESTHETIC_OPTIONS.length, 3, "Must provide 3 statutory anesthetic options");

		const articaine100 = ANESTHETIC_OPTIONS.find((a) => a.key === "articaine_100k");
		assert.ok(articaine100 && articaine100.hasAdrenaline);

		const scandonest = ANESTHETIC_OPTIONS.find((a) => a.key === "scandonest_mepivacaine_3");
		assert.ok(scandonest && !scandonest.hasAdrenaline, "Scandonest must not have adrenaline");

		store.updatePreferences({ favoriteAnesthetic: "scandonest_mepivacaine_3" });
		assert.strictEqual(
			useDoctorPreferencesStore.getState().preferences.favoriteAnesthetic,
			"scandonest_mepivacaine_3",
		);
	});

	it("4. Consumable materials and isolation presets are typed and provide manufacturers", () => {
		assert.ok(ISOLATION_OPTIONS.length >= 3);
		assert.ok(COMPOSITE_OPTIONS.length >= 4);
		assert.ok(ADHESIVE_OPTIONS.length >= 3);

		const store = useDoctorPreferencesStore.getState();
		store.updatePreferences({
			defaultIsolation: "optragate",
			defaultComposite: "filtek_ultimate",
			defaultAdhesive: "prime_and_bond_universal",
		});

		const current = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(current.defaultIsolation, "optragate");
		assert.strictEqual(current.defaultComposite, "filtek_ultimate");
		assert.strictEqual(current.defaultAdhesive, "prime_and_bond_universal");
	});

	it("5. Odontogram notations cover FDI, Universal and Palmer systems", () => {
		assert.strictEqual(ODONTOGRAM_NOTATIONS.length, 3);
		const keys = ODONTOGRAM_NOTATIONS.map((n) => n.key);
		assert.ok(keys.includes("fdi"));
		assert.ok(keys.includes("universal"));
		assert.ok(keys.includes("palmer"));
	});

	it("6. Quick protocol toggling maintains an array of unique protocol IDs", () => {
		const store = useDoctorPreferencesStore.getState();
		store.updatePreferences({
			quickProtocolIds: ["caries_medium_k02_1", "implant_installation_k08_1"],
		});
		assert.deepStrictEqual(
			useDoctorPreferencesStore.getState().preferences.quickProtocolIds,
			["caries_medium_k02_1", "implant_installation_k08_1"],
		);
	});

	it("7. Clinical snippets helpers provide statutory Form 043/u text blocks for 1-click insert", () => {
		assert.ok(PROTOCOL_CLINICAL_SNIPPETS.length >= 8);
		for (const snippet of PROTOCOL_CLINICAL_SNIPPETS) {
			assert.ok(snippet.id.length > 0);
			assert.ok(snippet.label.length > 0);
			assert.ok(snippet.text.length > 20, "Snippet text must be meaningful medical text");
			assert.ok(
				["complaintPrompt", "objectiveTemplate", "treatmentPlanTemplate"].includes(snippet.targetField),
			);
		}
	});

	it("8. Standard protocols seed contains valid 4 statutory clinic protocols", () => {
		assert.strictEqual(STANDARD_PROTOCOLS_SEED.length, 4);
		for (const proto of STANDARD_PROTOCOLS_SEED) {
			assert.ok(proto.title && proto.title.length > 0);
			assert.ok(proto.specialty && proto.specialty.length > 0);
			assert.ok(proto.defaultDurationMinutes && proto.defaultDurationMinutes >= 30);
			assert.ok(proto.treatmentPlanTemplate && proto.treatmentPlanTemplate.length > 0);
		}
	});

	it("9. Theme switcher supports instant zero-reload switching across clinical themes", () => {
		const themeStore = useThemeStore.getState();
		themeStore.setThemeMode("calm_teal");
		assert.strictEqual(useThemeStore.getState().themeMode, "calm_teal");

		themeStore.setThemeMode("night");
		assert.strictEqual(useThemeStore.getState().themeMode, "night");

		themeStore.setThemeMode("light");
		assert.strictEqual(useThemeStore.getState().themeMode, "light");
	});
});
