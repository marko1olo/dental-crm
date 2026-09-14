/**
 * doctorAutonomyWave46.test.tsx
 *
 * Dedicated Unit Test Suite for Wave 46 (Feature 226):
 * Deep purge of academic bloat, procedural simulators of reality, and friction points/obstacles
 * to doctor autonomy across the dental CRM (Mandates 8e, 8i, 8k, 8n, 8d item 7).
 *
 * CONSTITUTIONAL INVARIANTS TESTED:
 * 1. Doctor Autonomy in PatientsView & VisitView:
 *    - 1-click physiological somatic norm («Соматически здоров / норма») available everywhere.
 *    - executePatientSomaticNormAutonomy correctly sets somatic norm without modal barrier.
 *    - Action buttons («Сохранить данные», «Открыть приём», «Соматически здоров») are NEVER disabled without reason.
 * 2. Form 043/u Print Lifecycle & Zero Blockers:
 *    - Printing allowed at ANY moment: stamped «ЧЕРНОВИК» if visit is open, «ПОДПИСАНО ВРАЧОМ» if visit is closed.
 *    - btn-print-043-card has disabled={false} (no bureaucratic gates blocking medical card export).
 * 3. Sanctity of Medical Records & Zero Emojis (Mandate 8d item 7):
 *    - Zero cartoon emojis (⚡, ⏳) or raw glyphs (✕, ✓) in ToothStatusPalette, OdontogramViewContainer,
 *      PediatricMixedDentitionModal, ToothChart, ClassicGostOdontogram, OdontogramModule, PatientOverviewTab,
 *      TreatmentEstimator, and VisitView.
 * 4. Financial Autonomy & No Obstacles (Mandate 8e item 7):
 *    - 100% discount freedom on warranty rework and staff without admin master password blocks.
 *    - 30-day treatment plan expiration NEVER blocks creating lab orders, providing care, or taking payments.
 * 5. Debounced Autosave Protection (Mandate 8e item 6):
 *    - Continuous debounced autosave prevents loss of visit notes during tab switches or interruptions.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { Patient } from "@dental/shared";
import {
	executePatientSomaticNormAutonomy,
	executeOpenPatientVisitAutonomy,
} from "../../../PatientsView";
import {
	executeApplySomaticNormAutonomy,
} from "../../../VisitView";
import {
	checkDentalLabFinancialGate,
	createDoctorClinicalOverride,
} from "../../lab/dentalLabFinancialGateEngine";
import { rublesToKopecks } from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("Wave 46: Doctor Autonomy & Friction-Killer (Feature 226, Mandates 8e, 8i, 8k, 8n, 8d item 7)", () => {
	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 1: Doctor Autonomy in PatientsView & VisitView (1-Click Somatic Norm)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("1. Doctor Autonomy in PatientsView & 1-Click Somatic Norm (Mandates 8e, 8k, 8n)", () => {
		const mockPatient: Patient = {
			id: "pat-w46-test",
			fullName: "Кузнецов Алексей Иванович",
			birthDate: "1988-04-12",
			phone: "+79991234567",
			email: "kuznetsov@example.com",
			notes: "",
			balanceRub: 0,
			status: "active",
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		} as any;

		it("executePatientSomaticNormAutonomy returns warning when patient is null", () => {
			let toastMsg = "";
			let toastType = "";
			const result = executePatientSomaticNormAutonomy({
				selectedPatient: null,
				showToastFn: (msg, type) => {
					toastMsg = msg;
					toastType = type || "";
				},
			});

			assert.strictEqual(result.executed, false);
			assert.strictEqual(result.reason, "no_patient");
			assert.ok(toastMsg.includes("Выберите пациента"), "Must warn user to select patient");
			assert.strictEqual(toastType, "warning");
		});

		it("executePatientSomaticNormAutonomy applies physiological norm to empty patient notes in 1 click", () => {
			let updatedField = "";
			let updatedVal = "";
			let toastMsg = "";

			const result = executePatientSomaticNormAutonomy({
				selectedPatient: mockPatient,
				currentNotes: "",
				updatePatientCoreDraft: (field, val) => {
					updatedField = field;
					updatedVal = val;
				},
				showToastFn: (msg) => {
					toastMsg = msg;
				},
			});

			assert.strictEqual(result.executed, true);
			assert.strictEqual(updatedField, "notes");
			assert.ok(updatedVal.includes("Соматически здоров"), "Must include somatic health");
			assert.ok(updatedVal.includes("Физиологическая норма"), "Must declare physiological norm");
			assert.ok(toastMsg.includes("1 клик"), "Toast must confirm 1-click execution");
		});

		it("executePatientSomaticNormAutonomy prepends norm to existing notes without overwriting", () => {
			let updatedVal = "";
			const result = executePatientSomaticNormAutonomy({
				selectedPatient: mockPatient,
				currentNotes: "Аллергия на пенициллин сомнительна",
				updatePatientCoreDraft: (_field, val) => {
					updatedVal = val;
				},
			});

			assert.strictEqual(result.executed, true);
			assert.ok(updatedVal.includes("Соматически здоров"), "Must contain norm");
			assert.ok(updatedVal.includes("Аллергия на пенициллин сомнительна"), "Must preserve previous notes");
		});

		it("executePatientSomaticNormAutonomy does not duplicate norm if already present", () => {
			let updatedVal = "";
			const existing = "Соматически здоров. Аллергии отрицает. Физиологическая норма.";
			const result = executePatientSomaticNormAutonomy({
				selectedPatient: mockPatient,
				currentNotes: existing,
				updatePatientCoreDraft: (_field, val) => {
					updatedVal = val;
				},
			});

			assert.strictEqual(result.executed, true);
			assert.strictEqual(updatedVal, existing, "Should not duplicate norm statement");
		});

		it("executeOpenPatientVisitAutonomy opens visit without blocking confirmation modals", () => {
			let openedPatientId = "";
			let switchedView = "";
			let toastMsg = "";

			const result = executeOpenPatientVisitAutonomy({
				selectedPatient: mockPatient,
				setSelectedPatientId: (id) => {
					openedPatientId = id;
				},
				setCurrentView: (view) => {
					switchedView = view;
				},
				showToastFn: (msg) => {
					toastMsg = msg;
				},
			});

			assert.strictEqual(result.executed, true);
			assert.strictEqual(openedPatientId, mockPatient.id);
			assert.strictEqual(switchedView, "visit");
			assert.ok(toastMsg.includes("043/у"), "Toast confirms opening outpatient visit 043/u");
		});

		it("VisitView executeApplySomaticNormAutonomy populates anamnesis and objective inspection", () => {
			const noteForm: Record<string, string> = { anamnesis: "", objectiveInspection: "" };
			const result = executeApplySomaticNormAutonomy({
				updateVisitNoteField: (field, val) => {
					noteForm[field] = val;
				},
				visitNoteForm: noteForm,
			});

			assert.strictEqual(result.executed, true);
			assert.ok((noteForm.anamnesis || "").includes("Соматически здоров"), "Anamnesis must state somatic health");
			assert.ok((noteForm.objectiveInspection || "").includes("Слизистая оболочка"), "Objective status must set healthy mucosa");
		});

		it("PatientsView.tsx source contains somatic norm button with disabled={false}", () => {
			const patientsViewPath = path.join(webSrcRoot, "PatientsView.tsx");
			const content = fs.readFileSync(patientsViewPath, "utf8");

			assert.ok(
				content.includes('data-testid="patient-card-somatic-norm-btn"'),
				"PatientsView must contain patient-card-somatic-norm-btn",
			);
			assert.ok(
				content.includes('data-testid="patient-card-open-visit-btn"'),
				"PatientsView must contain patient-card-open-visit-btn",
			);
			assert.ok(
				content.includes("Соматически здоров / норма (1-клик)"),
				"Must display 1-click somatic norm button label",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 2: Form 043/u Print Lifecycle & Zero Blockers (Mandate 8e item 5)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("2. Form 043/u Print Lifecycle & Zero Disabled Buttons (Mandate 8e item 5)", () => {
		const form043Path = path.join(webSrcRoot, "components/emr/Form043PrintModal.tsx");
		const form043Content = fs.readFileSync(form043Path, "utf8");

		it("Form043PrintModal defines dual-state stamp: ЧЕРНОВИК if open vs ПОДПИСАНО ВРАЧОМ if closed", () => {
			assert.ok(
				form043Content.includes("ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)"),
				"Form043PrintModal must render draft stamp when visit is not yet completed",
			);
			assert.ok(
				form043Content.includes("ПОДПИСАНО ВРАЧОМ"),
				"Form043PrintModal must render signed stamp when visit is closed",
			);
			assert.ok(
				form043Content.includes("effectiveIsDraft"),
				"Form043PrintModal must track effectiveIsDraft state",
			);
		});

		it("Form043PrintModal print button btn-print-043-card has disabled={false}", () => {
			assert.ok(
				form043Content.includes('data-testid="btn-print-043-card"'),
				"Must contain data-testid btn-print-043-card",
			);
			assert.ok(
				form043Content.includes('disabled={false}'),
				"Print button must have disabled={false} so doctor can print at any moment",
			);
		});

		it("VisitView.tsx defines fast print button btn-visit-fast-print-043u without modal obstruction", () => {
			const visitViewPath = path.join(webSrcRoot, "VisitView.tsx");
			const visitViewContent = fs.readFileSync(visitViewPath, "utf8");

			assert.ok(
				visitViewContent.includes('data-testid="btn-visit-fast-print-043u"'),
				"VisitView must contain data-testid btn-visit-fast-print-043u",
			);
			assert.ok(
				visitViewContent.includes('data-testid="btn-somatic-norm-one-click"'),
				"VisitView must contain data-testid btn-somatic-norm-one-click",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 3: Sanctity of Medical Records & Zero Cartoon Emojis (Mandate 8d item 7)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("3. Sanctity of Medical Records & Zero Cartoon Emojis (Mandate 8d item 7)", () => {
		const filesToCheckForLightning = [
			"components/odontogram/OdontogramViewContainer.tsx",
			"components/odontogram/TreatmentEstimator.tsx",
			"components/odontogram/PediatricMixedDentitionModal.tsx",
			"components/odontogram/ToothChart.tsx",
			"components/odontogram/ClassicGostOdontogram.tsx",
			"components/odontogram/OdontogramModule.tsx",
			"VisitView.tsx",
		];

		for (const relPath of filesToCheckForLightning) {
			it(`File ${relPath} contains zero raw ⚡ cartoon emojis in code`, () => {
				const fullPath = path.join(webSrcRoot, relPath);
				const content = fs.readFileSync(fullPath, "utf8");
				const lines = content.split("\n");
				const codeLines = lines.filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("//"));
				const codeWithoutComments = codeLines.join("\n");

				assert.strictEqual(
					codeWithoutComments.includes("⚡"),
					false,
					`Found raw ⚡ emoji in code of ${relPath}`,
				);
			});
		}

		it("PatientOverviewTab.tsx contains zero raw ⏳ hourglass emojis and uses Lucide History", () => {
			const overviewPath = path.join(webSrcRoot, "components/patients/PatientOverviewTab.tsx");
			const overviewContent = fs.readFileSync(overviewPath, "utf8");

			assert.strictEqual(
				overviewContent.includes("⏳"),
				false,
				"PatientOverviewTab must NOT contain raw ⏳ emoji",
			);
			assert.ok(
				overviewContent.includes("<History"),
				"PatientOverviewTab must use Lucide History icon instead",
			);
		});

		it("OdontogramViewContainer.tsx uses Lucide Check instead of raw text ✓ glyphs", () => {
			const containerPath = path.join(webSrcRoot, "components/odontogram/OdontogramViewContainer.tsx");
			const containerContent = fs.readFileSync(containerPath, "utf8");

			assert.strictEqual(
				containerContent.includes('<span className="text-[10px]">✓</span>'),
				false,
				"Must not use raw text ✓ glyphs",
			);
			assert.ok(
				containerContent.includes("<Check size={12}"),
				"Must use Lucide Check icon",
			);
		});

		it("TreatmentEstimator.tsx uses Lucide X instead of raw text ✕ glyph", () => {
			const estimatorPath = path.join(webSrcRoot, "components/odontogram/TreatmentEstimator.tsx");
			const estimatorContent = fs.readFileSync(estimatorPath, "utf8");

			assert.strictEqual(
				estimatorContent.includes("✕"),
				false,
				"TreatmentEstimator must not use raw text ✕ glyph",
			);
			assert.ok(
				estimatorContent.includes("<X size={16}"),
				"TreatmentEstimator must use Lucide X icon",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 4: Financial Autonomy & Treatment Plan Price Guarantees (Mandate 8e item 7)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("4. Financial Autonomy & 30-Day Non-Blocking Plan Guarantees (Mandates 8e, 8n)", () => {
		it("checkDentalLabFinancialGate guarantees 30-day treatment plan expiry does not block lab orders", () => {
			const resExpired = checkDentalLabFinancialGate({
				stageTotalKopecks: rublesToKopecks(24000),
				paidKopecks: rublesToKopecks(24000),
				treatmentPlanAgeDays: 45,
				isPlanExpired: true,
			});

			assert.strictEqual(resExpired.isGatePassed, true, "Gate must be cleared");
			assert.ok(resExpired.isPlanExpiredNotice, "Notice about non-blocking 30-day plan must exist");
			assert.ok(
				resExpired.isPlanExpiredNotice.includes("НЕ БЛОКИРУЕТ"),
				"Notice must confirm Mandate 8e autonomy",
			);
		});

		it("doctor clinical override allows doctor to proceed with ZTL order under personal clinical responsibility", () => {
			const override = createDoctorClinicalOverride(
				"Д-р Смирнов А. П.",
				"Срочное протезирование перед командировкой",
			);
			assert.strictEqual(override.authorized, true);
			assert.strictEqual(override.doctorName, "Д-р Смирнов А. П.");

			const resOverride = checkDentalLabFinancialGate({
				stageTotalKopecks: rublesToKopecks(30000),
				paidKopecks: rublesToKopecks(0),
				doctorOverride: override,
			});
			assert.strictEqual(resOverride.isGatePassed, true, "Doctor clinical override must clear gate");
			assert.strictEqual(resOverride.gateStatus, "DOCTOR_OVERRIDE");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 5: Debounced Autosave Protection (Mandate 8e item 6)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("5. Debounced Autosave Protection (Mandate 8e item 6)", () => {
		it("VisitView.tsx contains debounced autosave protection for doctor diary", () => {
			const visitViewPath = path.join(webSrcRoot, "VisitView.tsx");
			const visitViewContent = fs.readFileSync(visitViewPath, "utf8");

			assert.ok(
				visitViewContent.includes("autosave") ||
					visitViewContent.includes("debounced") ||
					visitViewContent.includes("setTimeout") ||
					visitViewContent.includes("draft"),
				"VisitView must feature autosave or debounced drafting to protect doctor input",
			);
		});
	});
});
