/**
 * workspaceRoleSpecialization.test.ts
 *
 * Red Team Inquisitor Verification:
 * 1. 5 Clinical Specialties Invariant (Терапевт, Ортопед, Ортодонт, Хирург, Детский врач).
 * 2. Frontline Clinical Modules Invariant (FDI/043/u for therapist, ZTL for orthopedist,
 *    Aligners/brackets for orthodontist, Implants/reclamations for surgeon, Primary teeth 51-85 for pediatric).
 * 3. Visual Clutter Elimination (<= 7 primary controls, 5 role tabs + 1 CTA, collapsible 22-module drawer).
 * 4. Ultra-Fast 1-Click Patient Restore & Touch Target Law (>= 44x44px touch targets).
 * 5. Ironclad User Mandate: STRICTLY ZERO TOUCHES of CBCT / CT / DICOM / Radiology.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
	CLINICAL_ROLE_PRESETS,
	FEATURE_TOGGLES,
} from "../WorkspaceFeaturesSelector";

import {
	DENTE_LAST_ACTIVE_PATIENT_KEY,
	getLastActivePatient,
	saveLastActivePatient,
} from "../RecentPatientHistoryWidget";

import {
	DEFAULT_DOCTOR_PREFERENCES,
	useDoctorPreferencesStore,
} from "../../../store/doctorPreferencesStore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Workspace Role Specialization & Clinical Ergonomics Verification", async (t) => {
	await t.test("1. Clinical role presets define exactly the 5 doctor specialties", () => {
		assert.strictEqual(
			CLINICAL_ROLE_PRESETS.length,
			5,
			"Must define exactly 5 clinical role presets",
		);

		const roleKeys = CLINICAL_ROLE_PRESETS.map((p) => p.key);
		assert.deepStrictEqual(
			roleKeys,
			["therapist", "orthopedist", "orthodontist", "surgeon", "pediatric"],
			"Role keys must match the 5 dental disciplines",
		);

		for (const preset of CLINICAL_ROLE_PRESETS) {
			assert.ok(preset.title.length > 0, "Role must have a title");
			assert.ok(preset.shortTitle.length > 0, "Role must have a short title");
			assert.ok(preset.badge.length > 0, "Role must have a clinical badge");
			assert.ok(preset.description.length > 0, "Role must have a description");
			assert.ok(preset.clinicalFocus.length > 0, "Role must define clinical focus");
			assert.ok(preset.color.length > 0, "Role must have an accent color");
			assert.ok(
				preset.priorityToggleKeys.length >= 3 && preset.priorityToggleKeys.length <= 5,
				"Role must define 3 to 5 priority frontline toggle keys",
			);
		}
	});

	await t.test("2. Therapist preset focuses on FDI formula, 043/u diary, and clinical protocols", () => {
		const therapist = CLINICAL_ROLE_PRESETS.find((p) => p.key === "therapist")!;
		assert.ok(therapist, "Therapist preset must exist");
		assert.ok(therapist.badge.includes("FDI") || therapist.badge.includes("043/у"));
		assert.ok(therapist.clinicalFocus.includes("дневник") || therapist.clinicalFocus.includes("043/у"));
		assert.ok(therapist.priorityToggleKeys.includes("hasClinicalRules"));
		assert.ok(therapist.priorityToggleKeys.includes("aiEnableTreatmentPlan"));
		assert.strictEqual(therapist.presetFlags.hasClinicalRules, true);
		assert.strictEqual(therapist.presetFlags.aiEnableTreatmentPlan, true);
		assert.strictEqual(therapist.presetFlags.hasPediatricMode, false);
		assert.strictEqual(therapist.presetFlags.hasOrthodontics, false);
	});

	await t.test("3. Orthopedist preset focuses on Dental Lab (ZTL), crowns, and VITA shades", () => {
		const orthopedist = CLINICAL_ROLE_PRESETS.find((p) => p.key === "orthopedist")!;
		assert.ok(orthopedist, "Orthopedist preset must exist");
		assert.ok(orthopedist.badge.includes("ЗТЛ") || orthopedist.badge.includes("лаборатори"));
		assert.ok(orthopedist.clinicalFocus.includes("ЗТЛ"));
		assert.ok(orthopedist.priorityToggleKeys.includes("hasDentalLab"));
		assert.strictEqual(orthopedist.presetFlags.hasDentalLab, true);
		assert.strictEqual(orthopedist.presetFlags.hasPediatricMode, false);
		assert.strictEqual(orthopedist.presetFlags.hasOrthodontics, false);
	});

	await t.test("4. Orthodontist preset focuses on Aligners, Brackets, and TMJ gnathology", () => {
		const orthodontist = CLINICAL_ROLE_PRESETS.find((p) => p.key === "orthodontist")!;
		assert.ok(orthodontist, "Orthodontist preset must exist");
		assert.ok(
			orthodontist.badge.includes("Брекеты") || orthodontist.badge.includes("Элайнеры"),
		);
		assert.ok(orthodontist.priorityToggleKeys.includes("hasOrthodontics"));
		assert.ok(orthodontist.priorityToggleKeys.includes("hasGnathology"));
		assert.strictEqual(orthodontist.presetFlags.hasOrthodontics, true);
		assert.strictEqual(orthodontist.presetFlags.hasGnathology, true);
		assert.strictEqual(orthodontist.presetFlags.hasPediatricMode, false);
	});

	await t.test("5. Surgeon preset focuses on Implantology, bone materials, and reclamations", () => {
		const surgeon = CLINICAL_ROLE_PRESETS.find((p) => p.key === "surgeon")!;
		assert.ok(surgeon, "Surgeon preset must exist");
		assert.ok(
			surgeon.badge.includes("Имплантация") || surgeon.badge.includes("Протоколы"),
		);
		assert.ok(surgeon.clinicalFocus.includes("Имплантологическ"));
		assert.ok(surgeon.priorityToggleKeys.includes("hasReclamations"));
		assert.strictEqual(surgeon.presetFlags.hasReclamations, true);
		assert.strictEqual(surgeon.presetFlags.hasClinicalRules, true);
		assert.strictEqual(surgeon.presetFlags.hasPediatricMode, false);
	});

	await t.test("6. Pediatric preset focuses on primary dentition (51-85) and representative consent", () => {
		const pediatric = CLINICAL_ROLE_PRESETS.find((p) => p.key === "pediatric")!;
		assert.ok(pediatric, "Pediatric preset must exist");
		assert.ok(
			pediatric.badge.includes("Молочные") || pediatric.badge.includes("51–85"),
		);
		assert.ok(pediatric.clinicalFocus.includes("51–85"));
		assert.ok(pediatric.priorityToggleKeys.includes("hasPediatricMode"));
		assert.strictEqual(pediatric.presetFlags.hasPediatricMode, true);
		assert.strictEqual(pediatric.presetFlags.hasDentalLab, false);
	});

	await t.test("7. Visual Clutter Elimination: <= 7 primary controls and collapsible drawer", () => {
		// Segmented role selector bar has exactly 5 buttons (<= 7 ceiling)
		assert.ok(
			CLINICAL_ROLE_PRESETS.length <= 7,
			"Role tab buttons must not exceed 7 controls to prevent choice overload",
		);

		// Source inspection for UI layout compliance
		const selectorSource = fs.readFileSync(
			path.resolve(__dirname, "../WorkspaceFeaturesSelector.tsx"),
			"utf8",
		);

		assert.ok(
			selectorSource.includes('data-testid="clinical-role-selector-bar"'),
			"Must render role selector bar with test id",
		);
		assert.ok(
			selectorSource.includes('data-testid="clinical-role-spotlight-card"'),
			"Must render clinical role spotlight card",
		);
		assert.ok(
			selectorSource.includes('data-testid="apply-clinical-role-preset-btn"'),
			"Must provide 1 primary CTA to apply preset",
		);
		assert.ok(
			selectorSource.includes('data-testid="all-system-features-details"'),
			"Must wrap general system modules in collapsible details element",
		);

		// Ensure all 22 technical toggles exist in the full catalogue
		assert.strictEqual(
			FEATURE_TOGGLES.length,
			22,
			"Full catalogue must retain all 22 feature toggles",
		);
	});

	await t.test("8. Ironclad User Mandate: STRICTLY ZERO TOUCHES of CBCT / CT / DICOM / Radiology", () => {
		const selectorSource = fs.readFileSync(
			path.resolve(__dirname, "../WorkspaceFeaturesSelector.tsx"),
			"utf8",
		);
		const historySource = fs.readFileSync(
			path.resolve(__dirname, "../RecentPatientHistoryWidget.tsx"),
			"utf8",
		);

		const forbiddenPatterns = [
			/\bCBCT\b/i,
			/\bDICOM\b/i,
			/\bКЛКТ\b/i,
			/\bТомографи/i,
			/\bКТ-снимок/i,
		];

		for (const pattern of forbiddenPatterns) {
			assert.ok(
				!pattern.test(selectorSource),
				`WorkspaceFeaturesSelector must NOT mention or touch CBCT/DICOM/Radiology (${pattern})`,
			);
			assert.ok(
				!pattern.test(historySource),
				`RecentPatientHistoryWidget must NOT mention or touch CBCT/DICOM/Radiology (${pattern})`,
			);
		}
	});

	await t.test("9. Recent Patients: 1-click restore logic and touch targets >= 44x44px", () => {
		assert.strictEqual(
			DENTE_LAST_ACTIVE_PATIENT_KEY,
			"dente_last_active_patient",
			"Must use dente_last_active_patient localStorage key",
		);

		// Test mock storage operations
		const mockStorage: Record<string, string> = {};
		const originalLocalStorage = globalThis.localStorage;

		try {
			// @ts-expect-error Mock minimal localStorage
			globalThis.localStorage = {
				getItem: (key: string) => mockStorage[key] ?? null,
				setItem: (key: string, value: string) => {
					mockStorage[key] = value;
				},
				removeItem: (key: string) => {
					delete mockStorage[key];
				},
			};

			saveLastActivePatient({
				patientId: "pat-test-123",
				patientName: "Смирнова Анна Ивановна",
				phone: "+7 (999) 111-22-33",
			});

			const retrieved = getLastActivePatient();
			assert.ok(retrieved, "Retrieved patient should exist");
			assert.strictEqual(retrieved?.patientId, "pat-test-123");
			assert.strictEqual(retrieved?.patientName, "Смирнова Анна Ивановна");
			assert.strictEqual(retrieved?.phone, "+7 (999) 111-22-33");
			assert.ok(typeof retrieved?.timestamp === "number");
		} finally {
			(globalThis as any).localStorage = originalLocalStorage;
		}

		// Source inspection for touch target compliance (>= 44x44px)
		const historySource = fs.readFileSync(
			path.resolve(__dirname, "../RecentPatientHistoryWidget.tsx"),
			"utf8",
		);

		assert.ok(
			historySource.includes('data-testid="recent-patient-1click-restore"'),
			"Must provide 1-click quick restore button in dropdown",
		);
		assert.ok(
			historySource.includes('data-testid="recent-patient-1click-restore-btn"'),
			"Must provide 1-click quick restore button in panel",
		);
		assert.ok(
			!historySource.includes('minHeight: "28px"'),
			"Must NOT contain small 28px touch targets",
		);
		assert.ok(
			historySource.includes('minHeight: "44px"'),
			"Must enforce 44px minimum height touch targets",
		);
	});

	await t.test("10. DoctorPreferencesStore integration for specialty presets", () => {
		const store = useDoctorPreferencesStore.getState();

		// Test pediatric needle & dentition configuration
		store.applySpecialtyPreset("pediatric");
		const pediatricPrefs = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(pediatricPrefs.specialty, "pediatric");
		assert.strictEqual(pediatricPrefs.defaultDentition, "pediatric");
		assert.strictEqual(
			pediatricPrefs.favoriteNeedleType,
			"septoject_30g_extra_short",
			"Pediatric preset must select extra-short needle for minimal trauma",
		);

		// Test surgeon needle configuration
		store.applySpecialtyPreset("surgeon");
		const surgeonPrefs = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(surgeonPrefs.specialty, "surgeon");
		assert.strictEqual(
			surgeonPrefs.favoriteNeedleType,
			"septoject_27g_long",
			"Surgeon preset must select long 27G needle for mandibular block anesthesia",
		);

		// Test orthopedist isolation
		store.applySpecialtyPreset("orthopedist");
		const orthopedistPrefs = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(orthopedistPrefs.specialty, "orthopedist");
		assert.strictEqual(
			orthopedistPrefs.defaultIsolation,
			"optragate",
			"Orthopedist preset must default to optragate for wide impression field",
		);

		// Revert to default therapist
		store.applySpecialtyPreset("therapist");
		const therapistPrefs = useDoctorPreferencesStore.getState().preferences;
		assert.strictEqual(therapistPrefs.specialty, "therapist");
	});
});
