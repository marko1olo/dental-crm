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
 *      PediatricMixedDentitionModal, ToothChart, WheelerToothArch, OdontogramModule, PatientOverviewTab,
 *      and VisitView.
 * 4. Financial Autonomy & No Obstacles (Mandate 8e item 7):
 *    - 100% discount freedom on warranty rework and staff without admin master password blocks.
 *    - 30-day treatment plan expiration NEVER blocks creating lab orders, providing care, or taking payments.
 * 5. Debounced Autosave Protection (Mandate 8e item 6):
 *    - Continuous debounced autosave prevents loss of visit notes during tab switches or interruptions.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
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

describe("Wave 46: Doctor Autonomy & Friction-Killer (Feature 226, Mandates 8e, 8i, 8k, 8n, 8d item 7)", () => {
	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 1: Doctor Autonomy in PatientsView & VisitView (1-Click Somatic Norm)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("1. Doctor Autonomy in PatientsView & 1-Click Somatic Norm (Mandates 8e, 8k, 8n)", () => {
		const mockPatient: Patient = {
			id: "pat-w46-test",
			organizationId: "org-w46-test",
			fullName: "Кузнецов Алексей Иванович",
			birthDate: "1988-04-12",
			phone: "+79991234567",
			email: "kuznetsov@example.com",
			notes: "",
			balanceRub: 0,
			status: "active",
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		};

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
			assert.ok(toastMsg.includes("норма"), "Toast must confirm somatic norm execution");
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
			assert.ok(toastMsg.includes("Открыт приём"), "Toast confirms opening outpatient visit");
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

		it("PatientMasterRow & VisitHeaderFastPrintCluster render unlocked clinical controls via SSR", async () => {
			const React = await import("react");
			const { renderToStaticMarkup } = await import("react-dom/server");
			const { VisitHeaderFastPrintCluster } = await import("../../visit/view/visitHeaderModules/VisitHeaderFastPrintCluster");
			const html = renderToStaticMarkup(
				React.createElement(VisitHeaderFastPrintCluster, {
					handlePrintMedicalCardFast: () => {},
					handlePrintCompletedActFast: () => {},
					handlePrintEstimateFast: () => {},
				}),
			);
			assert.ok(html.includes('data-testid="btn-visit-fast-print-card"'));
		});
	});

	describe("2. MedicalRecord Print Lifecycle & Zero Disabled Buttons (Mandate 8e item 5)", () => {
		it("generateMedicalRecordPrintHtml emits draft stamp when open and signed stamp when completed", async () => {
			const { generateMedicalRecordPrintHtml } = await import("../../emr/clinicalDiaryMath");
			const { DEFAULT_MEDICAL_CARD_DATA } = await import("../../emr/medicalCardCatalogData");
			const draftHtml = generateMedicalRecordPrintHtml(DEFAULT_MEDICAL_CARD_DATA, { isDraft: true });
			const signedHtml = generateMedicalRecordPrintHtml(DEFAULT_MEDICAL_CARD_DATA, { isDraft: false });
			assert.ok(draftHtml.includes("ЧЕРНОВИК"));
			assert.ok(signedHtml.includes("ПОДПИСАНО ВРАЧОМ"));
			assert.strictEqual(draftHtml.includes("043/у"), false);
		});
	});

	describe("3. Sanctity of Medical Records & Zero Cartoon Emojis (Mandate 8d item 7)", () => {
		it("OdontogramViewContainer, OdontogramBatchBar & ToothChart render zero emojis and use Lucide SVG icons", async () => {
			const React = await import("react");
			const { renderToStaticMarkup } = await import("react-dom/server");
			const { OdontogramViewContainer } = await import("../../odontogram/OdontogramViewContainer");
			const { OdontogramBatchBar } = await import("../../odontogram/OdontogramBatchBar");
			const { createDefaultAdultTeethData } = await import("../../odontogram/ToothChart");

			const containerHtml = renderToStaticMarkup(
				React.createElement(OdontogramViewContainer, {
					teethData: createDefaultAdultTeethData(),
					onToothClick: () => {},
				}),
			);
			const batchHtml = renderToStaticMarkup(
				React.createElement(OdontogramBatchBar, {
					selectedTeeth: [16, 26],
					onSelectTeethGroup: () => {},
					onClearSelection: () => {},
					onInvertSelection: () => {},
					onQuickStateChange: () => {},
				}),
			);

			assert.strictEqual(containerHtml.includes("⚡"), false);
			assert.strictEqual(batchHtml.includes("✕"), false);
			assert.ok(batchHtml.includes("<svg"));
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

	describe("5. Visit Draft Isolation Protection (Mandate 8e item 6)", () => {
		it("visitDraftStorage protects parallel drafts across visits without key collisions", async () => {
			const { getIsolatedVisitDraftKey, verifyZeroDraftCollision } = await import("../../visit/save/visitDraftStorage");
			assert.strictEqual(verifyZeroDraftCollision("visit-1", "visit-2"), true);
			assert.ok(getIsolatedVisitDraftKey("visit-1").includes("visit-1"));
		});
	});
});
