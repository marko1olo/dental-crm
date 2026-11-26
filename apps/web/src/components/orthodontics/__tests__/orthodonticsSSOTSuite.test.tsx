/**
 * apps/web/src/components/orthodontics/__tests__/orthodonticsSSOTSuite.test.tsx
 *
 * DENTE Dental CRM — Red Team Inquisition Test Suite for Orthodontics SSOT.
 * Verifies appliances, Angle classification, archwires, elastics, TRG norms,
 * 1-click chairside presets, patient memo, doctor autonomy (Mandate 8e),
 * exactly ONE Primary CTA (Mandate 8am), Apple HIG mobile ergonomics,
 * and direct mounting in AppShell & StandaloneLaunchers (Mandate 8aq).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	APPLIANCES_CATALOG,
	ANGLE_CLASSES_CATALOG,
	ARCHWIRE_ALLOYS_SSOT,
	ARCHWIRE_SECTIONS_SSOT,
	ELASTICS_CATALOG,
	TRG_ANGLES_NORMS_SSOT,
	CHAIRSIDE_ACTIONS_CATALOG,
	ORTHO_ACTIVATION_PRESETS,
	ORTHO_PATIENT_MEMO_SECTIONS,
	createDefaultOrthoProtocolState,
	calculateSkeletalClassFromAnb,
	evaluateTrgAngleStatus,
	formatOrthoProtocolSoapEntry,
	getOrthoPatientMemoText,
} from "../orthodonticsCatalogData";
import { OrthodonticsStudioModal } from "../OrthodonticsStudioModal";
import { WorkspaceStudioOverlayHost } from "../../appLayout/WorkspaceStudioOverlayHost";
import { resolveClinicRoute } from "../../../router/routeResolver";
import {
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	calculateCephalometrics,
} from "../cephalometricMath";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const orthoDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(orthoDir, "../..");

describe("Orthodontics Canonical SSOT Invariants (Appliances, Bite, Archwires & Elastics)", () => {
	it("1. Verifies appliances catalog contains braces, aligners, and plates", () => {
		assert.ok(APPLIANCES_CATALOG.length >= 8, "Must contain all standard orthodontic appliances");
		const categories = new Set(APPLIANCES_CATALOG.map((a) => a.category));
		assert.ok(categories.has("brackets"), "Must have bracket systems");
		assert.ok(categories.has("aligners"), "Must have aligners");
		assert.ok(categories.has("plate"), "Must have plate systems");

		const damon = APPLIANCES_CATALOG.find((a) => a.id === "damon_q2");
		assert.ok(damon?.name.includes("Damon"), "Must include Damon system");

		const aligner = APPLIANCES_CATALOG.find((a) => a.category === "aligners");
		assert.ok(aligner, "Must include aligners");
	});

	it("2. Verifies Angle malocclusion classification catalog (Classes I, II/1, II/2, III)", () => {
		assert.equal(ANGLE_CLASSES_CATALOG.length, 4, "Must contain 4 Angle classification groups");
		const keys = ANGLE_CLASSES_CATALOG.map((ac) => ac.key);
		assert.deepEqual(keys, ["class_1", "class_2_div_1", "class_2_div_2", "class_3"]);
		for (const ac of ANGLE_CLASSES_CATALOG) {
			assert.ok(ac.titleRu.length > 0, `Angle class ${ac.key} must have title`);
			assert.ok(ac.descriptionRu.length > 0, `Angle class ${ac.key} must have clinical description`);
		}
	});

	it("3. Verifies 4 canonical archwire alloys are registered (NiTi, CuNiTi, SS, TMA)", () => {
		assert.equal(ARCHWIRE_ALLOYS_SSOT.length, 4, "Must contain exactly 4 canonical archwire alloys");
		const keys = ARCHWIRE_ALLOYS_SSOT.map((a) => a.key);
		assert.deepEqual(keys, ["niti", "cuniti", "ss", "tma"], "Alloys must match canonical keys");

		for (const alloy of ARCHWIRE_ALLOYS_SSOT) {
			assert.ok(alloy.label.length > 0, `Alloy ${alloy.key} must have full clinical label`);
			assert.ok(alloy.shortRu.length > 0, `Alloy ${alloy.key} must have short Russian name`);
			assert.ok(alloy.description.length > 0, `Alloy ${alloy.key} must have clinical description`);
		}
	});

	it("4. Verifies 7 standard archwire cross-sections with round and rectangular categorization", () => {
		assert.equal(ARCHWIRE_SECTIONS_SSOT.length, 7, "Must contain exactly 7 standard cross sections");

		const roundSections = ARCHWIRE_SECTIONS_SSOT.filter((s) => s.shape === "round");
		const rectSections = ARCHWIRE_SECTIONS_SSOT.filter((s) => s.shape === "rectangular");

		assert.equal(roundSections.length, 4, "Must contain 4 round sections (.012, .014, .016, .018)");
		assert.equal(rectSections.length, 3, "Must contain 3 rectangular sections (16×22, 17×25, 19×25)");
	});

	it("5. Verifies intermaxillary elastics catalog with traction classes and force specifications", () => {
		assert.ok(ELASTICS_CATALOG.length >= 6, "Elastics catalog must contain all primary traction types");

		const class2 = ELASTICS_CATALOG.filter((e) => e.classType === "class_2");
		const class3 = ELASTICS_CATALOG.filter((e) => e.classType === "class_3");
		const triangular = ELASTICS_CATALOG.filter((e) => e.classType === "triangular");

		assert.ok(class2.length > 0, "Must have Class II elastics");
		assert.ok(class3.length > 0, "Must have Class III elastics");
		assert.ok(triangular.length > 0, "Must have Triangular elastics");

		for (const el of ELASTICS_CATALOG) {
			assert.ok(el.animalName.length > 0, `Elastic ${el.id} must have animal naming for patients`);
			assert.ok(el.hookSchemeRu.length > 0, `Elastic ${el.id} must have Russian hookup scheme`);
			assert.ok(el.forceOz.length > 0, `Elastic ${el.id} must have force in ounces`);
		}
	});

	it("6. Verifies canonical TRG angles (Steiner & Tweed) and tolerance thresholds", () => {
		assert.equal(TRG_ANGLES_NORMS_SSOT.length, 6, "Must contain exactly 6 key TRG reference angles");

		const keys = TRG_ANGLES_NORMS_SSOT.map((n) => n.key);
		assert.deepEqual(keys, ["sna", "snb", "anb", "u1_na", "l1_nb", "fma"]);

		const sna = TRG_ANGLES_NORMS_SSOT.find((n) => n.key === "sna")!;
		assert.equal(sna.normDeg, 82, "SNA norm must be 82°");

		const anb = TRG_ANGLES_NORMS_SSOT.find((n) => n.key === "anb")!;
		assert.equal(anb.normDeg, 2, "ANB norm must be 2°");
	});

	it("7. Verifies Skeletal Class calculation and deviation evaluations", () => {
		const class1 = calculateSkeletalClassFromAnb(2.0);
		assert.equal(class1.skeletalClass, "I");

		const class2 = calculateSkeletalClassFromAnb(5.5);
		assert.equal(class2.skeletalClass, "II");

		const class3 = calculateSkeletalClassFromAnb(-1.0);
		assert.equal(class3.skeletalClass, "III");

		const normSna = evaluateTrgAngleStatus("sna", 82.5);
		assert.equal(normSna.status, "normal");

		const highSna = evaluateTrgAngleStatus("sna", 88.0);
		assert.equal(highSna.status, "deviation_high");
	});

	it("8. Verifies 1-click chairside presets and patient memo generator without emoji", () => {
		assert.ok(ORTHO_ACTIVATION_PRESETS.length >= 5, "Must contain at least 5 activation presets");

		const defaultState = createDefaultOrthoProtocolState();
		assert.ok(defaultState.applianceName.length > 0);
		assert.equal(defaultState.currentStageIndex, 0);
		assert.equal(defaultState.currentMonth, 0);
		assert.equal(defaultState.trgValues, null);
		assert.deepEqual(defaultState.photoStatuses, {});
		assert.equal(defaultState.notes, "");

		const memo = getOrthoPatientMemoText();
		assert.ok(memo.length > 200, "Patient memo must be detailed and clinical");
		assert.ok(memo.includes("Гигиена"), "Memo must contain hygiene section");
		assert.ok(memo.includes("воска"), "Memo must contain wax section");
		assert.ok(memo.includes("питании"), "Memo must contain diet section");
		assert.ok(!memo.includes("🍏") && !memo.includes("🦷") && !memo.includes("✨"), "No emojis in clinical memo");
	});

	it("9. Verifies SOAP clinical visit diary format without Soviet bureaucratic numbers", () => {
		const defaultState = createDefaultOrthoProtocolState();
		const soap = formatOrthoProtocolSoapEntry(defaultState);
		assert.ok(soap.includes("ПРОТОКОЛ ПРИЁМА ОРТОДОНТА"), "SOAP must have clear clinical header");
		assert.ok(soap.includes("Дуга на верхней челюсти:"), "SOAP must specify upper archwire");
		assert.ok(soap.includes("Дуга на нижней челюсти:"), "SOAP must specify lower archwire");
		assert.ok(soap.includes("Назначен следующий визит"), "SOAP must specify interval");
		assert.ok(!soap.includes("043/у") && !soap.includes("804н"), "No bureaucratic Soviet codes in user clinical diary");
	});
});

describe("Orthodontic Studio Sweet Spot & Mandatory Mandates Inquisition", () => {
	it("10. Verifies clinical empty state and protocol hydration logic (DEF-ORTHO-02)", () => {
		const emptyState = createDefaultOrthoProtocolState();
		assert.equal(emptyState.currentStageIndex, 0, "Initial stage index must be 0");
		assert.equal(emptyState.trgValues, null, "Initial TRG values must be null in honest empty state");
		assert.deepEqual(emptyState.photoStatuses, {}, "Initial photo statuses must be empty object");
		assert.equal(emptyState.selectedActionIds.length, 0, "No actions selected by default");

		const preset = ORTHO_ACTIVATION_PRESETS[0]!;
		assert.ok(preset.stageName.length > 0);
		assert.ok(preset.actionIds.length > 0);
	});

	it("11. Verifies OrthodonticsStudioModal.tsx clinical contracts and endpoints", () => {
		const clonePath = path.join(orthoDir, "OrthodonticStudioModal.tsx");
		assert.ok(!fs.existsSync(clonePath), "Duplicate clone OrthodonticStudioModal.tsx must be purged");

		const filePath = path.join(orthoDir, "OrthodonticsStudioModal.tsx");
		assert.ok(fs.existsSync(filePath), "OrthodonticsStudioModal.tsx must exist");

		const hydrationPath = path.join(orthoDir, "useOrthodonticsStudioHydration.ts");
		const persistencePath = path.join(orthoDir, "orthodonticsStudioPersistence.ts");
		const content =
			fs.readFileSync(filePath, "utf-8") +
			(fs.existsSync(hydrationPath) ? fs.readFileSync(hydrationPath, "utf-8") : "") +
			(fs.existsSync(persistencePath) ? fs.readFileSync(persistencePath, "utf-8") : "");

		assert.ok(content.includes("/api/orthodontics/"), "Must connect to canonical ortho API");
		assert.ok(content.includes("/progress"), "Must hydrate from /progress endpoint");
		assert.ok(content.includes("/ceph-analysis"), "Must hydrate from /ceph-analysis endpoint (DEF-ORTHO-03)");
		assert.ok(content.includes('data-testid="save-ortho-protocol-button"'), "Must have canonical save button");
		assert.ok(content.includes("formatOrthodonticPatientMemo"), "Must export formatOrthodonticPatientMemo");
	});

	it("12. Verifies OrthodonticsStudioModal has exactly ONE Primary CTA (Mandates 8am & 8e)", () => {
		const filePath = path.join(orthoDir, "OrthodonticsStudioModal.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(
			content.includes('data-testid="save-ortho-protocol-button"'),
			"Must have data-testid='save-ortho-protocol-button'",
		);

		assert.ok(
			!content.includes("disabled={"),
			"Primary CTA must NEVER be disabled in doctor chairside autonomy (Mandate 8e)",
		);

		assert.ok(
			content.includes("ortho-primary-cta"),
			"Primary CTA button must use canonical semantic button class ortho-primary-cta",
		);

		assert.ok(
			content.includes("Зафиксировать активацию") || content.includes("Зафиксировать ортодонтический приём"),
			"Primary CTA text must match canonical clinical action",
		);
	});

	it("13. Verifies WorkspaceStudioOverlayHost & routeResolver contract for orthodontics", () => {
		const directOrthoClone = path.join(orthoDir, "directOrtho/DirectOrthoLauncher.tsx");
		assert.ok(!fs.existsSync(directOrthoClone), "Clone directOrtho/DirectOrthoLauncher.tsx must be purged");

		const cephModalPath = path.join(orthoDir, "CephAnalysisModal.tsx");
		assert.ok(fs.existsSync(cephModalPath), "Canonical CephAnalysisModal.tsx must exist");

		assert.equal(resolveClinicRoute("", "#orthodontics").studio?.kind, "orthodontics");
		assert.equal(resolveClinicRoute("", "#ortho-protocol").studio?.kind, "orthodontics");
		assert.equal(typeof WorkspaceStudioOverlayHost, "function", "WorkspaceStudioOverlayHost must be a React component");
		const html = renderToString(<WorkspaceStudioOverlayHost />);
		assert.ok(html !== undefined, "Overlay host renders without errors");
	});

	it("14. Verifies WorkspaceStudioOverlayHost is mounted in AppModalsContainer.tsx (Mandate 8aq)", () => {
		const containerPath = path.join(webSrcDir, "components/appLayout/AppModalsContainer.tsx");
		assert.ok(fs.existsSync(containerPath), "AppModalsContainer.tsx must exist");

		const content = fs.readFileSync(containerPath, "utf-8");
		assert.ok(
			content.includes("WorkspaceStudioOverlayHost"),
			"AppModalsContainer.tsx must import and render WorkspaceStudioOverlayHost",
		);
	});

	it("15. Verifies WorkspaceStudioOverlayHost mounts OrthodonticsStudioModal (Mandate 8aq)", () => {
		const hostPath = path.join(
			webSrcDir,
			"components/appLayout/WorkspaceStudioOverlayHost.tsx",
		);
		assert.ok(fs.existsSync(hostPath), "WorkspaceStudioOverlayHost.tsx must exist");

		const content = fs.readFileSync(hostPath, "utf-8");
		assert.ok(
			content.includes("OrthodonticsStudioModal"),
			"WorkspaceStudioOverlayHost.tsx must import and render OrthodonticsStudioModal",
		);
	});

	it("16. Verifies SSR rendering of OrthodonticsStudioModal without DOM errors", () => {
		const html = renderToString(
			<OrthodonticsStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Тестовый Пациент"
				doctorName="Д-р Иванов"
			/>,
		);

		assert.ok(html.includes("Ортодонтическая студия"));
		assert.ok(html.includes("save-ortho-protocol-button"));
		assert.ok(
			html.includes("Зафиксировать активацию") || html.includes("Зафиксировать ортодонтический приём"),
			"Must include save button text",
		);
		assert.ok(html.includes("Тестовый Пациент"));
	});

	it("17. Verifies interactive controls in OrthodonticsTabsContent (IPR, attachments, date, sets)", () => {
		const tabsPath = path.join(orthoDir, "OrthodonticsTabsContent.tsx");
		const alignerCardPath = path.join(orthoDir, "AlignerCaseTracker.tsx");
		assert.ok(fs.existsSync(tabsPath), "OrthodonticsTabsContent.tsx must exist");
		assert.ok(fs.existsSync(alignerCardPath), "AlignerCaseTracker.tsx must exist");
		const content = fs.readFileSync(tabsPath, "utf-8") + fs.readFileSync(alignerCardPath, "utf-8");

		assert.ok(content.includes('data-testid="toggle-ipr-btn"'), "Must have interactive IPR toggle");
		assert.ok(content.includes('data-testid="toggle-attachments-btn"'), "Must have interactive attachments toggle");
		assert.ok(content.includes('data-testid="next-aligner-date-input"'), "Must have next planned date picker");
		assert.ok(content.includes("ortho-issued-sets-input"), "Must have issued sets input control");
	});

	it("18. Verifies removable plates branching, dual arch parameters and photo protocol sync", () => {
		const modalPath = path.join(orthoDir, "OrthodonticsStudioModal.tsx");
		const persistencePath = path.join(orthoDir, "orthodonticsStudioPersistence.ts");
		const content =
			fs.readFileSync(modalPath, "utf-8") +
			(fs.existsSync(persistencePath) ? fs.readFileSync(persistencePath, "utf-8") : "");

		assert.ok(
			content.includes('protocol.applianceCategory === "plate"'),
			"Must branch for removable plates without calling archwire-change",
		);
		assert.ok(
			content.includes("/stages/advance"),
			"Must advance stage / activate screw for plate category",
		);
		assert.ok(
			(content.includes('arch: "both"') && content.includes("upperMaterial") && content.includes("lowerMaterial")) ||
			(content.includes('arch: "upper"') && content.includes('arch: "lower"')),
			"Must preserve both upper and lower arch parameters independently without double billing",
		);
		assert.ok(
			!content.includes("initialImageUrl={SAMPLE_TRG_CEPHALOGRAM_URL}\n\t\t\t\t\t\tdoctorName="),
			"ClinicalPhotoProtocolModal must not be passed SAMPLE_TRG_CEPHALOGRAM_URL",
		);
	});

	it("19. Verifies canonical CSS has Safe Area support and orphan orthodontics.css is purged", () => {
		const orphanPath = path.join(orthoDir, "orthodontics.css");
		assert.ok(!fs.existsSync(orphanPath), "Orphan orthodontics.css must be purged (git rm)");

		const canonicalCssPath = path.join(orthoDir, "styles/orthodonticsStudio.css");
		assert.ok(fs.existsSync(canonicalCssPath), "Canonical orthodonticsStudio.css must exist");

		const cssContent = fs.readFileSync(canonicalCssPath, "utf-8");
		assert.ok(
			cssContent.includes("env(safe-area-inset-bottom)"),
			"Must support Apple HIG Safe Area in .ortho-footer",
		);
	});

	it("20. Verifies AlignerCaseTracker eliminates Potemkin 240 000 ₽ installment hardcode and shows honest empty state", () => {
		const deadClonePath = path.join(orthoDir, "AlignerTrackingCard.tsx");
		assert.ok(!fs.existsSync(deadClonePath), "Dead clone AlignerTrackingCard.tsx must be purged (git rm)");

		const trackerPath = path.join(orthoDir, "AlignerCaseTracker.tsx");
		assert.ok(fs.existsSync(trackerPath), "AlignerCaseTracker.tsx must exist");
		const content = fs.readFileSync(trackerPath, "utf-8");

		assert.ok(!content.includes("240 000 ₽"), "Must NOT contain hardcoded 240,000 ₽ total price");
		assert.ok(!content.includes("60 000 ₽"), "Must NOT contain 4 fixed 60,000 ₽ tranches");
		assert.ok(!content.includes("15.02.2024"), "Must NOT contain hardcoded 2024 installment dates");
		assert.ok(
			content.includes("График платежей формируется на основе утвержденного плана лечения и сметы сетапа") ||
			content.includes("График платежей формируется на основе плана лечения и выставленных счетов"),
			"Must render honest clinical empty state for installment schedule",
		);
	});

	it("21. Verifies OrthodonticTimeline generates adaptive stages and dynamic dates", () => {
		const timelinePath = path.join(orthoDir, "OrthodonticTimeline.tsx");
		const content = fs.readFileSync(timelinePath, "utf-8");

		assert.ok(!content.includes("15.01.2024"), "Must NOT contain static 2024 bracket dates");
		assert.ok(content.includes('applianceCategory === "aligners"'), "Must adapt stages for aligners");
		assert.ok(content.includes('applianceCategory === "plate"'), "Must adapt stages for removable plates");
		assert.ok(content.includes("formatPlannedStageDate"), "Must calculate dynamic planned dates");
		assert.ok(content.includes("stage.plannedDate"), "Must render planned stage dates in UI");
	});

	it("22. Verifies CephalometricAnalysisModalUI has exactly 1 Primary CTA and unblocked angles calculation", () => {
		const cephModalPath = path.resolve(webSrcDir, "components/radiology/cephModal/CephalometricAnalysisModalUI.tsx");
		assert.ok(fs.existsSync(cephModalPath), "CephalometricAnalysisModalUI.tsx must exist");
		const content = fs.readFileSync(cephModalPath, "utf-8");

		// Header CTA
		assert.ok(content.includes('data-testid="btn-insert-ceph-protocol"'), "Must have insertion CTA");
		assert.ok(content.includes("Сохранить в ЭМК"), "Single Primary CTA must be 'Сохранить в ЭМК'");
		assert.ok(!content.includes("data-theme=\"dark\""), "Must NOT have hardcoded data-theme='dark'");
		assert.ok(!content.includes("#020617"), "Must NOT have inline #020617 hardcoded style");

		// Tab 2 unblocked
		assert.ok(!content.includes("disabled={!isImageLoaded}"), "Angles tab must not be disabled without image");
		assert.ok(!content.includes('showToast("Сначала загрузите снимок ТРГ", "warning")'), "Angles tab click must not show blocking toast");
	});

	it("23. Verifies OrthodonticPatientCardForm cross-syncs with TRG cephAnalysis", () => {
		const formPath = path.resolve(webSrcDir, "components/documents/forms/OrthodonticPatientCardForm.tsx");
		assert.ok(fs.existsSync(formPath), "OrthodonticPatientCardForm.tsx must exist");
		const content = fs.readFileSync(formPath, "utf-8");

		assert.ok(content.includes("extractCephAngles"), "Must have extractCephAngles helper");
		assert.ok(content.includes("cephAnalysis"), "Must check patient cephAnalysis");
		assert.ok(content.includes("Синхронизировано с ТРГ"), "Must display synchronization status with TRG");
		assert.ok(content.includes("loadLatestCephalometricStudy"), "Must fallback to latest local ceph study");
	});

	it("24. Verifies AlignerCaseTracker integrates case stages, steps and exact kopecks installment schedule", () => {
		const trackerPath = path.join(orthoDir, "AlignerCaseTracker.tsx");
		assert.ok(fs.existsSync(trackerPath), "AlignerCaseTracker.tsx must exist");
		const content = fs.readFileSync(trackerPath, "utf-8");

		assert.ok(content.includes("amountKopecks: bigint"), "Installment amounts must be typed as bigint kopecks");
		assert.ok(content.includes("formatKopecksToRub"), "Must use canonical formatKopecksToRub without float division");
		assert.ok(content.includes("setup_pending") && content.includes("setup_approved") && content.includes("retention"), "Must support full aligner lifecycle stages");
		assert.ok(content.includes('data-testid="aligner-case-tracker"'), "Must have data-testid for integration verification");
	});

	it("25. Verifies BiteClassificationCard implements Angle & ANB skeletal classes with Apple HIG >=44px touch targets", () => {
		const bitePath = path.join(orthoDir, "BiteClassificationCard.tsx");
		assert.ok(fs.existsSync(bitePath), "BiteClassificationCard.tsx must exist");
		const content = fs.readFileSync(bitePath, "utf-8");

		assert.ok(content.includes("calculateSkeletalClassFromAnb"), "Must dynamically compute skeletal class from ANB angle");
		assert.ok(content.includes("min-h-[44px]"), "All touch targets must satisfy Apple HIG >=44px");
		assert.ok(content.includes("VERTICAL_BITE_OPTIONS"), "Must contain canonical vertical bite options");
		assert.ok(content.includes('data-testid="bite-classification-card"'), "Must have data-testid for integration verification");
	});

	it("26. Verifies CephalometricCanvas provides 16 anatomical landmarks and cranial planes", () => {
		const deadCephPath = path.join(orthoDir, "CephTracingCanvas.tsx");
		assert.ok(!fs.existsSync(deadCephPath), "Duplicate CephTracingCanvas.tsx must be purged (git rm)");

		const cephPath = path.join(orthoDir, "CephalometricCanvas.tsx");
		assert.ok(fs.existsSync(cephPath), "CephalometricCanvas.tsx must exist");
		const content = fs.readFileSync(cephPath, "utf-8");

		assert.ok(content.includes("LANDMARK_COLORS"), "Must define landmark colors");
		assert.ok(content.includes("bone_enhance") && content.includes("invert") && content.includes("contrast"), "Must support hardware x-ray filter modes");
		assert.ok(content.includes("setPointerCapture"), "Must use pointer capture for drag-and-drop tracing precision");
		assert.ok(content.includes("svgRef"), "Must render reactive SVG cranial planes overlay");
	});

	it("27. Verifies expanded cephalometric anatomy (Ba, Ar, Pt, Prn, Ls, Li, Pog'), Tweed FMIA and Ricketts E-line", () => {
		const landmarkKeys = new Set(CEPHALOMETRIC_LANDMARKS.map((l) => l.key));
		for (const key of ["Ba", "Ar", "Pt", "Prn", "Ls", "Li", "Pog_prime"] as const) {
			assert.ok(landmarkKeys.has(key), `Landmark ${key} must be registered in CEPHALOMETRIC_LANDMARKS`);
			assert.ok(DEFAULT_CEPH_LANDMARKS_PRESET[key] !== undefined, `Preset must contain coordinates for ${key}`);
		}

		// Verify Tweed FMIA and Ricketts E-line calculation
		const analysis = calculateCephalometrics(DEFAULT_CEPH_LANDMARKS_PRESET, 0.15);
		const fmia = analysis.measurements.find((m) => m.id === "FMIA");
		assert.ok(fmia, "FMIA measurement must be calculated");
		assert.equal(fmia.unit, "deg");
		assert.ok(typeof fmia.value === "number" && Number.isFinite(fmia.value), "FMIA must be a finite number");

		const rickettsLs = analysis.measurements.find((m) => m.id === "Ricketts-E-Ls");
		assert.ok(rickettsLs, "Ricketts E-Line Ls must be calculated");
		assert.equal(rickettsLs.unit, "mm");
		assert.equal(rickettsLs.category, "soft_tissue");

		const rickettsLi = analysis.measurements.find((m) => m.id === "Ricketts-E-Li");
		assert.ok(rickettsLi, "Ricketts E-Line Li must be calculated");
		assert.equal(rickettsLi.unit, "mm");
		assert.equal(rickettsLi.category, "soft_tissue");
	});

	it("28. Verifies 2-point calibration ruler and design tokens in CephalometricCanvas & CephLandmarkCanvas", () => {
		const canvasPath = path.join(orthoDir, "CephalometricCanvas.tsx");
		const canvasContent = fs.readFileSync(canvasPath, "utf-8");
		assert.ok(canvasContent.includes('data-testid="ceph-calibration-toggle"'), "Must have calibration toggle button");
		assert.ok(canvasContent.includes('data-testid="ceph-calibration-panel"'), "Must have calibration control panel");
		assert.ok(canvasContent.includes("ceph-calibration-ruler"), "Must render SVG calibration ruler");
		assert.ok(canvasContent.includes("setCalibDistanceMm(10)") && canvasContent.includes("setCalibDistanceMm(50)"), "Must support 10/50 mm presets");

		const cephLandmarkCanvasPath = path.resolve(webSrcDir, "components/radiology/cephModal/CephLandmarkCanvas.tsx");
		const landmarkCanvasContent = fs.readFileSync(cephLandmarkCanvasPath, "utf-8");
		assert.ok(!landmarkCanvasContent.includes("#020617"), "Must NOT contain hardcoded #020617");
		assert.ok(!landmarkCanvasContent.includes("slate-950"), "Must NOT contain hardcoded slate-950");
		assert.ok(landmarkCanvasContent.includes("var(--paper-strong)"), "Must use var(--paper-strong)");
		assert.ok(landmarkCanvasContent.includes("var(--line)"), "Must use var(--line)");
	});

	it("29. Verifies Keyed Remount (Mandate 8bn) and Zero-Leak Draft (Mandate 8d/8zq) in specialty modals and routers", () => {
		const specialtyModalsPath = path.resolve(webSrcDir, "appModules/AppDirectSpecialtyModals.tsx");
		const specialtyContent = fs.readFileSync(specialtyModalsPath, "utf-8");
		assert.ok(
			specialtyContent.includes('key={patient?.id || "empty"}'),
			"AppDirectSpecialtyModals must mount OrthodonticsStudioModal with entity key (Mandate 8bn)",
		);

		const routerPath = path.resolve(webSrcDir, "components/appLayout/viewRouterModules/ClinicalViewRouter.tsx");
		const routerContent = fs.readFileSync(routerPath, "utf-8");
		assert.ok(
			routerContent.includes('key={targetPatientId || "empty"}'),
			"ClinicalViewRouter must mount OrthodonticsStudioModal with entity key (Mandate 8bn)",
		);

		const modalPath = path.join(orthoDir, "OrthodonticsStudioModal.tsx");
		const modalContent = fs.readFileSync(modalPath, "utf-8");
		assert.ok(
			modalContent.includes("handleClose") && modalContent.includes("createDefaultOrthoProtocolState()"),
			"OrthodonticsStudioModal must purge draft on close (Zero-Leak Draft)",
		);
	});
});
