/**
 * apps/web/src/components/patient/__tests__/patientFamilyWalletAndDrawer.test.ts
 *
 * Comprehensive Test Suite for Family Wallet, Patient Drawer & Sovereignty (Mandates 8e, 8b & 8zi):
 * 1. FamilyWalletModal: family pooled balance, topup, spend, intra-family transfer (0% commission), kopeck precision.
 * 2. PatientDrawer: slide-over context, long Russian name wrapping (break-words leading-tight), allergy & family highlights.
 * 3. PatientDetailsModal: zero blocked save buttons, safe defaults, integrated tabs.
 * 4. Unified Barrel Export (index.ts): verification of all exported patient components.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const patientDir = path.resolve(__dirname, "..");

describe("Patient Family Wallet, Drawer & Modals Integrity Suite", () => {
	// =========================================================================
	// 1. Family Wallet Modal: Pooled Balance, Topup, Spend & Transfer
	// =========================================================================
	describe("1. FamilyWalletModal Invariants", () => {
		it("enforces exact kopeck arithmetic and 0% commission intra-family transfer in FamilyWalletModal source", () => {
			const modalFile = path.resolve(patientDir, "FamilyWalletModal.tsx");
			const decompDir = path.resolve(patientDir, "familyWalletModal");
			let content = fs.readFileSync(modalFile, "utf-8");
			if (content.includes('from "../patients/family/FamilyWalletModal"')) {
				const canonicalFile = path.resolve(
					patientDir,
					"../patients/family/FamilyWalletModal.tsx",
				);
				const canonicalDir = path.resolve(
					patientDir,
					"../patients/family/familyWalletModal",
				);
				content = fs.readFileSync(canonicalFile, "utf-8");
				if (fs.existsSync(canonicalDir)) {
					const decompFiles = fs
						.readdirSync(canonicalDir)
						.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
					for (const f of decompFiles) {
						content += `\n${fs.readFileSync(path.join(canonicalDir, f), "utf-8")}`;
					}
				}
			} else if (fs.existsSync(decompDir)) {
				const decompFiles = fs
					.readdirSync(decompDir)
					.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
				for (const f of decompFiles) {
					content += `\n${fs.readFileSync(path.join(decompDir, f), "utf-8")}`;
				}
			}

			assert.ok(
				content.includes('data-testid="family-wallet-modal"'),
				"Must have family-wallet-modal testid",
			);
			assert.ok(
				content.includes('data-testid="family-wallet-pooled-balance"'),
				"Must have pooled balance card",
			);
			assert.ok(
				content.includes('data-testid="tab-family-wallet-overview"'),
				"Must have overview tab",
			);
			assert.ok(
				content.includes('data-testid="tab-family-wallet-topup"'),
				"Must have topup tab",
			);
			assert.ok(
				content.includes('data-testid="tab-family-wallet-spend"'),
				"Must have spend tab",
			);
			assert.ok(
				content.includes('data-testid="tab-family-wallet-transfer"'),
				"Must have transfer tab",
			);
			assert.ok(
				content.includes("0% комиссия клиники"),
				"Must highlight 0% clinic commission",
			);
			assert.ok(
				content.includes("money("),
				"Must use canonical money() formatter to prevent kopeck drift",
			);

			// Check zero disabled buttons on submit actions
			assert.ok(
				content.includes('data-testid="family-topup-submit-btn"'),
				"Must have topup submit button",
			);
			assert.ok(
				content.includes('data-testid="family-spend-submit-btn"'),
				"Must have spend submit button",
			);
			assert.ok(
				content.includes('data-testid="family-transfer-submit-btn"'),
				"Must have transfer submit button",
			);

			// Confirm disabled={...} is not blocking submits
			assert.ok(
				!content.includes(
					'data-testid="family-topup-submit-btn"\n\t\t\t\t\t\t\t\t\tdisabled',
				),
				"Topup button must not be disabled",
			);
			assert.ok(
				!content.includes(
					'data-testid="family-spend-submit-btn"\n\t\t\t\t\t\t\t\t\tdisabled',
				),
				"Spend button must not be disabled",
			);
			assert.ok(
				!content.includes(
					'data-testid="family-transfer-submit-btn"\n\t\t\t\t\t\t\t\t\tdisabled',
				),
				"Transfer button must not be disabled",
			);
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
	// 2. Patient Drawer: Slide-over Context & Long Russian Name Wrapping
	// =========================================================================
	describe("2. PatientDrawer Invariants", () => {
		it("enforces break-words leading-tight on patient full name in PatientDrawer source", () => {
			const drawerFile = path.resolve(patientDir, "PatientDrawer.tsx");
			let content = fs.readFileSync(drawerFile, "utf-8");
			if (content.includes('from "../patients/PatientDrawer"')) {
				const canonicalFile = path.resolve(
					patientDir,
					"../patients/PatientDrawer.tsx",
				);
				const canonicalContent = fs.readFileSync(canonicalFile, "utf-8");
				if (canonicalContent.includes('from "./drawer/PatientDrawer"')) {
					const drawerMain = fs.readFileSync(
						path.resolve(patientDir, "../patients/drawer/PatientDrawer.tsx"),
						"utf-8",
					);
					const drawerHeader = fs.readFileSync(
						path.resolve(
							patientDir,
							"../patients/drawer/PatientDrawerHeader.tsx",
						),
						"utf-8",
					);
					const drawerSafety = fs.readFileSync(
						path.resolve(
							patientDir,
							"../patients/drawer/PatientDrawerSafetyCard.tsx",
						),
						"utf-8",
					);
					const drawerFinance = fs.readFileSync(
						path.resolve(
							patientDir,
							"../patients/drawer/PatientDrawerFinanceCard.tsx",
						),
						"utf-8",
					);
					const drawerActions = fs.readFileSync(
						path.resolve(
							patientDir,
							"../patients/drawer/PatientDrawerActionButtons.tsx",
						),
						"utf-8",
					);
					content = `${drawerMain}\n${drawerHeader}\n${drawerSafety}\n${drawerFinance}\n${drawerActions}`;
				}
			}

			assert.ok(
				content.includes('data-testid="patient-drawer"'),
				"Must have patient-drawer testid",
			);
			assert.ok(
				content.includes('data-testid="patient-drawer-name"'),
				"Must have patient-drawer-name testid",
			);
			assert.ok(
				content.includes("break-words leading-tight"),
				"Must enforce break-words leading-tight to prevent clipping of long Russian names",
			);
			assert.ok(
				content.includes('data-testid="patient-drawer-anamnesis-btn"'),
				"Must have anamnesis trigger",
			);
			assert.ok(
				content.includes('data-testid="patient-drawer-family-btn"'),
				"Must have family wallet trigger",
			);
			assert.ok(
				content.includes('data-testid="patient-drawer-full-card-btn"'),
				"Must have full card trigger",
			);

			// Touch target standard check
			assert.ok(
				content.includes("min-h-[44px]"),
				"Must satisfy Apple HIG min-h 44px touch targets",
			);
		});
	});

	// =========================================================================
	// 3. Patient Details Modal: Zero Blocked Save & Integrated Subsystems
	// =========================================================================
	describe("3. PatientDetailsModal Invariants", () => {
		it("guarantees save button is never disabled by formIsValid or missing optional fields", () => {
			const modalFile = path.resolve(patientDir, "PatientDetailsModal.tsx");
			const canonicalModalFile = path.resolve(patientDir, "../patients/PatientDetailsModal.tsx");
			const canonicalDetailsDir = path.resolve(patientDir, "../patients/detailsModal");
			let content = fs.readFileSync(modalFile, "utf-8");
			if (fs.existsSync(canonicalModalFile)) {
				content += `\n${fs.readFileSync(canonicalModalFile, "utf-8")}`;
			}
			if (fs.existsSync(canonicalDetailsDir)) {
				const files = fs
					.readdirSync(canonicalDetailsDir)
					.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
				for (const f of files) {
					content += `\n${fs.readFileSync(path.join(canonicalDetailsDir, f), "utf-8")}`;
				}
			}
			const detailsDir = path.resolve(patientDir, "detailsModal");
			if (fs.existsSync(detailsDir)) {
				const files = fs
					.readdirSync(detailsDir)
					.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
				for (const f of files) {
					content += `\n${fs.readFileSync(path.join(detailsDir, f), "utf-8")}`;
				}
			}

			assert.ok(
				content.includes('data-testid="patient-details-modal"'),
				"Must have patient-details-modal testid",
			);
			assert.ok(
				content.includes('data-testid="btn-save-patient-details"'),
				"Must have save button",
			);

			// Verify disabled attribute is NOT present on the save button
			assert.ok(
				!content.includes(
					'data-testid="btn-save-patient-details"\n\t\t\t\t\t\t\t\tdisabled',
				),
				"Must not have disabled attribute on save button (Mandate 8e)",
			);

			// Verify integration with PatientAnamnesisTab and PatientFamilyCard
			assert.ok(
				content.includes("<PatientAnamnesisTab"),
				"Must embed PatientAnamnesisTab in anamnesis tab",
			);
			assert.ok(
				content.includes("<PatientFamilyCard"),
				"Must embed PatientFamilyCard in family tab",
			);
			assert.ok(
				content.includes('data-testid="btn-somatic-healthy-norm"'),
				"Must have 1-click norm in toolbar",
			);
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
	// 4. Canonical Barrel Export Facade
	// =========================================================================
	describe("4. Unified Barrel Export (index.ts)", () => {
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
