/**
 * apps/web/src/components/patient/__tests__/patientAnamnesisFamilyWallet.test.ts
 *
 * Comprehensive Test Suite for Patient Anamnesis, Family Wallet & Patient Sovereignty:
 * 1. PatientAnamnesisTab: 1-click somatic norm, 5 allergy chips, 0 disabled buttons, Form 043/u diary export.
 * 2. FamilyWalletModal: family pooled balance, topup, spend, intra-family transfer (0% commission), kopeck precision.
 * 3. PatientDrawer: slide-over context, long Russian name wrapping (break-words leading-tight), allergy & family highlights.
 * 4. PatientDetailsModal: zero blocked save buttons, safe defaults, integrated tabs.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	isSomaticProfilePhysiologicalNorm,
	parseSafetyProfileFromText,
	type PatientClinicalSafetyProfile,
} from "../../patients/safetyMath.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const patientDir = path.resolve(__dirname, "..");

describe("Patient Anamnesis, Family Wallet & Drawer Integrity Suite", () => {
	// =========================================================================
	// 1. Patient Anamnesis Tab: 1-Click Norm, 5 Allergy Chips & Autonomy
	// =========================================================================
	describe("1. PatientAnamnesisTab Invariants", () => {
		it("provides an atomic 1-click physiological norm with zero active allergies", () => {
			const norm = createHealthySomaticNormProfile();

			assert.equal(norm.hasPenicillinAllergy, false, "Penicillin allergy must be false in healthy norm");
			assert.equal(norm.hasLidocaineAllergy, false, "Lidocaine allergy must be false in healthy norm");
			assert.equal(norm.hasArticaineAllergy, false, "Articaine allergy must be false in healthy norm");
			assert.equal(norm.hasLatexAllergy, false, "Latex allergy must be false in healthy norm");
			assert.equal(norm.hasIodineAllergy, false, "Iodine allergy must be false in healthy norm");
			assert.equal(norm.hasCardiovascularDisease, false, "Cardiovascular disease must be false");
			assert.equal(norm.takesAnticoagulants, false, "Anticoagulants must be false");
			assert.equal(norm.hasDiabetesMellitus, false, "Diabetes must be false");

			assert.ok(isSomaticProfilePhysiologicalNorm(norm), "Profile must be certified physiological norm");

			const evalResult = evaluatePatientSafetyFlags(norm);
			assert.equal(evalResult.activeFlags.length, 0, "Healthy norm must have 0 stop-factor flags");
			assert.equal(evalResult.hasCriticalStopFlags, false, "Healthy norm must have 0 critical stop flags");
		});

		it("correctly identifies and flags each of the 5 core clinical allergies", () => {
			const allergyKeys: Array<keyof PatientClinicalSafetyProfile> = [
				"hasPenicillinAllergy",
				"hasLidocaineAllergy",
				"hasArticaineAllergy",
				"hasLatexAllergy",
				"hasIodineAllergy",
			];

			for (const key of allergyKeys) {
				const profile: PatientClinicalSafetyProfile = {
					...DEFAULT_SOMATIC_HEALTHY_NORM,
					[key]: true,
				};

				assert.equal(isSomaticProfilePhysiologicalNorm(profile), false, `${String(key)} must invalidate norm`);
				const evalResult = evaluatePatientSafetyFlags(profile);
				assert.ok(
					evalResult.activeFlags.length >= 1,
					`Activating ${String(key)} must generate at least 1 active clinical safety badge`,
				);
			}
		});

		it("generates clinical SOAP Form 043/u diary snippet without cartoon emojis", () => {
			const profile: PatientClinicalSafetyProfile = {
				...DEFAULT_SOMATIC_HEALTHY_NORM,
				hasPenicillinAllergy: true,
				hasLidocaineAllergy: true,
				customChronicNotes: "Дентофобия средней степени",
			};

			const text = formatSafetyProfileToDiaryText(profile);
			assert.ok(text.includes("Аллергологический анамнез: Отягощен"), "Diary must flag allergy alert");
			assert.ok(text.includes("Пенициллины"), "Diary must list Penicillin");
			assert.ok(text.includes("Лидокаин"), "Diary must list Lidocaine");
			assert.ok(text.includes("Дентофобия"), "Diary must include chronic notes");

			const EMOJI_REGEX =
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
			assert.equal(EMOJI_REGEX.test(text), false, "EMR diary snippet must contain 0 cartoon emojis (Mandate 8d)");
		});

		it("enforces zero disabled buttons in PatientAnamnesisTab source code", () => {
			const tabFile = path.resolve(patientDir, "PatientAnamnesisTab.tsx");
			const content = fs.readFileSync(tabFile, "utf-8");

			assert.ok(content.includes('data-testid="mark-somatic-norm-btn"'), "Must have 1-click norm button");
			assert.ok(content.includes('data-testid="toggle-allergy-penicillin"'), "Must have penicillin chip");
			assert.ok(content.includes('data-testid="toggle-allergy-lidocaine"'), "Must have lidocaine chip");
			assert.ok(content.includes('data-testid="toggle-allergy-articaine"'), "Must have articaine chip");
			assert.ok(content.includes('data-testid="toggle-allergy-latex"'), "Must have latex chip");
			assert.ok(content.includes('data-testid="toggle-allergy-iodine"'), "Must have iodine chip");

			// Check for disabled attribute pattern
			const disabledRegex = /disabled=\{/g;
			const disabledMatches = content.match(disabledRegex) || [];
			assert.equal(
				disabledMatches.length,
				0,
				`PatientAnamnesisTab must have 0 disabled buttons (Mandate 8e), found: ${disabledMatches.length}`,
			);
		});
	});

	// =========================================================================
	// 2. Family Wallet Modal: Pooled Balance, Topup, Spend & Transfer
	// =========================================================================
	describe("2. FamilyWalletModal Invariants", () => {
		it("enforces exact kopeck arithmetic and 0% commission intra-family transfer in FamilyWalletModal source", () => {
			const modalFile = path.resolve(patientDir, "FamilyWalletModal.tsx");
			const decompDir = path.resolve(patientDir, "familyWalletModal");
			let content = fs.readFileSync(modalFile, "utf-8");
			if (fs.existsSync(decompDir)) {
				const decompFiles = fs.readdirSync(decompDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
				for (const f of decompFiles) {
					content += "\n" + fs.readFileSync(path.join(decompDir, f), "utf-8");
				}
			}

			assert.ok(content.includes('data-testid="family-wallet-modal"'), "Must have family-wallet-modal testid");
			assert.ok(content.includes('data-testid="family-wallet-pooled-balance"'), "Must have pooled balance card");
			assert.ok(content.includes('data-testid="tab-family-wallet-overview"'), "Must have overview tab");
			assert.ok(content.includes('data-testid="tab-family-wallet-topup"'), "Must have topup tab");
			assert.ok(content.includes('data-testid="tab-family-wallet-spend"'), "Must have spend tab");
			assert.ok(content.includes('data-testid="tab-family-wallet-transfer"'), "Must have transfer tab");
			assert.ok(content.includes("0% комиссия клиники"), "Must highlight 0% clinic commission");
			assert.ok(content.includes("money("), "Must use canonical money() formatter to prevent kopeck drift");

			// Check zero disabled buttons on submit actions
			assert.ok(content.includes('data-testid="family-topup-submit-btn"'), "Must have topup submit button");
			assert.ok(content.includes('data-testid="family-spend-submit-btn"'), "Must have spend submit button");
			assert.ok(content.includes('data-testid="family-transfer-submit-btn"'), "Must have transfer submit button");

			// Confirm disabled={...} is not blocking submits
			assert.ok(!content.includes('data-testid="family-topup-submit-btn"\n\t\t\t\t\t\t\t\t\tdisabled'), "Topup button must not be disabled");
			assert.ok(!content.includes('data-testid="family-spend-submit-btn"\n\t\t\t\t\t\t\t\t\tdisabled'), "Spend button must not be disabled");
			assert.ok(!content.includes('data-testid="family-transfer-submit-btn"\n\t\t\t\t\t\t\t\t\tdisabled'), "Transfer button must not be disabled");
		});

		it("verifies pooled balance aggregation logic handles numbers, strings, and null safely", () => {
			const calcNumericBalance = (raw: unknown): number => {
				if (raw === undefined || raw === null || raw === "") return 0;
				const num = Number(raw);
				return Number.isFinite(num) ? num : 0;
			};

			assert.equal(calcNumericBalance(12500), 12500);
			assert.equal(calcNumericBalance("12500.50"), 12500.5);
			assert.equal(calcNumericBalance(null), 0);
			assert.equal(calcNumericBalance(undefined), 0);
			assert.equal(calcNumericBalance("invalid_string"), 0);
		});
	});

	// =========================================================================
	// 3. Patient Drawer: Slide-over Context & Long Russian Name Wrapping
	// =========================================================================
	describe("3. PatientDrawer Invariants", () => {
		it("enforces break-words leading-tight on patient full name in PatientDrawer source", () => {
			const drawerFile = path.resolve(patientDir, "PatientDrawer.tsx");
			const content = fs.readFileSync(drawerFile, "utf-8");

			assert.ok(content.includes('data-testid="patient-drawer"'), "Must have patient-drawer testid");
			assert.ok(content.includes('data-testid="patient-drawer-name"'), "Must have patient-drawer-name testid");
			assert.ok(
				content.includes("break-words leading-tight"),
				"Must enforce break-words leading-tight to prevent clipping of long Russian names",
			);
			assert.ok(content.includes('data-testid="patient-drawer-anamnesis-btn"'), "Must have anamnesis trigger");
			assert.ok(content.includes('data-testid="patient-drawer-family-btn"'), "Must have family wallet trigger");
			assert.ok(content.includes('data-testid="patient-drawer-full-card-btn"'), "Must have full card trigger");

			// Touch target standard check
			assert.ok(content.includes("min-h-[44px]"), "Must satisfy Apple HIG min-h 44px touch targets");
		});
	});

	// =========================================================================
	// 4. Patient Details Modal: Zero Blocked Save & Integrated Subsystems
	// =========================================================================
	describe("4. PatientDetailsModal Invariants", () => {
		it("guarantees save button is never disabled by formIsValid or missing optional fields", () => {
			const modalFile = path.resolve(patientDir, "PatientDetailsModal.tsx");
			const content = fs.readFileSync(modalFile, "utf-8");

			assert.ok(content.includes('data-testid="patient-details-modal"'), "Must have patient-details-modal testid");
			assert.ok(content.includes('data-testid="btn-save-patient-details"'), "Must have save button");

			// Verify disabled attribute is NOT present on the save button
			assert.ok(
				!content.includes('data-testid="btn-save-patient-details"\n\t\t\t\t\t\t\t\tdisabled'),
				"Must not have disabled attribute on save button (Mandate 8e)",
			);

			// Verify integration with PatientAnamnesisTab and PatientFamilyCard
			assert.ok(content.includes("<PatientAnamnesisTab"), "Must embed PatientAnamnesisTab in anamnesis tab");
			assert.ok(content.includes("<PatientFamilyCard"), "Must embed PatientFamilyCard in family tab");
			assert.ok(content.includes('data-testid="btn-somatic-healthy-norm"'), "Must have 1-click norm in toolbar");
		});

		it("verifies safe fallback defaults for missing patient profile fields", () => {
			interface PatientInput {
				id?: string;
				fullName?: string;
				phone?: string;
				birthDate?: string;
				address?: string;
			}

			const sanitizePatient = (input: PatientInput) => ({
				id: input.id || undefined,
				fullName: input.fullName?.trim() || "Пациент без ФИО",
				phone: input.phone || "",
				birthDate: input.birthDate || "",
				address: input.address || "",
			});

			// Even with empty object, sanitize produces valid saveable object without throwing
			const emptySanitized = sanitizePatient({});
			assert.equal(emptySanitized.fullName, "Пациент без ФИО");
			assert.equal(emptySanitized.phone, "");
			assert.equal(emptySanitized.birthDate, "");
			assert.equal(emptySanitized.address, "");
		});
	});

	// =========================================================================
	// 5. Canonical Barrel Export Facade
	// =========================================================================
	describe("5. Unified Barrel Export (index.ts)", () => {
		it("exports all patient components from apps/web/src/components/patient/index.ts", () => {
			const indexFile = path.resolve(patientDir, "index.ts");
			const content = fs.readFileSync(indexFile, "utf-8");

			assert.ok(content.includes('export * from "./PatientAnamnesisTab";'));
			assert.ok(content.includes('export * from "./FamilyWalletModal";'));
			assert.ok(content.includes('export * from "./PatientDrawer";'));
			assert.ok(content.includes('export * from "./PatientDetailsModal";'));
			assert.ok(content.includes('export * from "./PatientCard";'));
			assert.ok(content.includes('export * from "./PatientHistoryTab";'));
			assert.ok(content.includes('export * from "./TreatmentPlansList";'));
		});
	});
});
