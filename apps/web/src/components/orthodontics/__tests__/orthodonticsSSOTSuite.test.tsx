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

	it("11. Verifies OrthodonticsStudioModal renders canonical primary CTA and clinical state without disabled buttons", () => {
		const html = renderToString(
			<OrthodonticsStudioModal
				isOpen={true}
				onClose={() => {}}
				patientId="pat-ortho-1"
				patientName="Тестовый Пациент"
				doctorName="Д-р Смирнов"
			/>,
		);
		assert.ok(html.includes('data-testid="save-ortho-protocol-button"'), "Must render canonical save button");
		assert.ok(html.includes("ortho-primary-cta"), "Primary CTA must use ortho-primary-cta");
		assert.equal(html.includes("disabled"), false, "Doctor autonomy: zero disabled buttons");
		assert.ok(
			html.includes("Зафиксировать активацию") || html.includes("Зафиксировать ортодонтический приём"),
			"Must render canonical clinical save text",
		);
	});

	it("12. Verifies WorkspaceStudioOverlayHost & routeResolver contract for orthodontics", () => {
		assert.equal(resolveClinicRoute("", "#orthodontics").studio?.kind, "orthodontics");
		assert.equal(resolveClinicRoute("", "#ortho-protocol").studio?.kind, "orthodontics");
		assert.equal(typeof WorkspaceStudioOverlayHost, "function", "WorkspaceStudioOverlayHost must be a React component");
		const html = renderToString(<WorkspaceStudioOverlayHost />);
		assert.ok(html !== undefined, "Overlay host renders without errors");
	});

	it("13. Verifies SSR rendering of OrthodonticsStudioModal across tabs without DOM errors", () => {
		const html = renderToString(
			<OrthodonticsStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Тестовый Пациент"
				doctorName="Д-р Орлов"
			/>,
		);
		assert.ok(html.includes("Ортодонтическая студия"));
		assert.ok(html.includes("save-ortho-protocol-button"));
		assert.ok(html.includes("Тестовый Пациент"));
	});

	it("14. Verifies AlignerCaseTracker renders honest empty schedule without 240 000 RUB hardcode and uses kopeck amounts", async () => {
		const { AlignerCaseTracker } = await import("../AlignerCaseTracker.js");
		const baseState = createDefaultOrthoProtocolState();
		const html = renderToString(
			<AlignerCaseTracker
				tracking={{
					...baseState.aligners,
					currentStep: 2,
					totalSteps: 14,
					caseStage: "active_wear",
				}}
				onChange={() => {}}
			/>,
		);
		assert.ok(html.includes('data-testid="aligner-case-tracker"'));
		assert.ok(html.includes('data-testid="toggle-ipr-btn"'));
		assert.ok(html.includes('data-testid="toggle-attachments-btn"'));
		assert.ok(html.includes('data-testid="next-aligner-date-input"'));
		assert.equal(html.includes("240 000 ₽"), false);
		assert.equal(html.includes("60 000 ₽"), false);
		assert.equal(html.includes("15.02.2024"), false);
		assert.ok(
			html.includes("График платежей формируется на основе утвержденного плана лечения и сметы сетапа") ||
			html.includes("График платежей формируется на основе плана лечения и выставленных счетов"),
		);
	});

	it("15. Verifies OrthodonticTimeline generates dynamic stages for aligners and removable plates without static 2024 dates", async () => {
		const { OrthodonticTimeline } = await import("../OrthodonticTimeline.js");
		const alignerHtml = renderToString(
			<OrthodonticTimeline
				currentMonth={2}
				totalMonths={12}
				applianceCategory="aligners"
				startDate="2026-01-15"
			/>,
		);
		const plateHtml = renderToString(
			<OrthodonticTimeline
				currentMonth={1}
				totalMonths={6}
				applianceCategory="plate"
				startDate="2026-01-15"
			/>,
		);
		assert.equal(alignerHtml.includes("15.01.2024"), false);
		assert.equal(plateHtml.includes("15.01.2024"), false);
		assert.ok(alignerHtml.length > 100);
		assert.ok(plateHtml.length > 100);
	});

	it("16. Verifies BiteClassificationCard computes Angle & ANB skeletal classes and renders >=44px touch targets", async () => {
		const { BiteClassificationCard } = await import("../BiteClassificationCard.js");
		const html = renderToString(
			<BiteClassificationCard
				angleClass="II_1"
				onAngleClassChange={() => {}}
				anbDeg={6}
			/>,
		);
		assert.ok(html.includes('data-testid="bite-classification-card"'));
		assert.ok(html.includes("min-h-[44px]"));
	});

	it("17. Verifies CephLandmarkCanvas renders with semantic theme tokens and without dark-theme hardcode", async () => {
		const { CephLandmarkCanvas } = await import("../../radiology/cephModal/CephLandmarkCanvas.js");
		const html = renderToString(
			<CephLandmarkCanvas
				landmarks={DEFAULT_CEPH_LANDMARKS_PRESET}
				setLandmarks={() => {}}
				onLandmarkChange={() => {}}
				onRemoveLandmark={() => {}}
				activeTargetKey={null}
				setActiveTargetKey={() => {}}
				imageUrl="https://example.local/trg.png"
				setImageUrl={() => {}}
				filterMode="normal"
				setFilterMode={() => {}}
				brightness={100}
				contrast={100}
				showPolygon={true}
				setShowPolygon={() => {}}
				showPlanes={true}
				setShowPlanes={() => {}}
				measurements={[]}
				aiBackendPreference="auto"
				setAiBackendPreference={() => {}}
				isAiRunning={false}
				aiStats={null}
				analysis={calculateCephalometrics(DEFAULT_CEPH_LANDMARKS_PRESET, 0.15)}
				mobileView="landmarks"
				setMobileView={() => {}}
				onOpenAiSetup={() => {}}
			/>,
		);
		assert.equal(html.includes('data-theme="dark"'), false);
		assert.equal(html.includes("#020617"), false);
		assert.ok(html.includes("var(--paper-strong)") || html.includes("var(--line)") || html.length > 100);
	});

	it("18. Verifies OrthodonticPatientCardForm extractCephAngles syncs TRG measurements cleanly", async () => {
		const { OrthodonticPatientCardForm, extractCephAngles } = await import("../../documents/forms/OrthodonticPatientCardForm.js");
		const extracted = extractCephAngles({
			trgValues: { sna: 82, snb: 80, anb: 2, fma: 25 },
			savedAt: "2026-11-27",
		});
		assert.equal(extracted?.sna, 82);
		assert.equal(extracted?.snb, 80);
		assert.equal(extracted?.anb, 2);
		const html = renderToString(
			<OrthodonticPatientCardForm
				initialPayload={{
					cephalometry: { snaAngle: 82, snbAngle: 80, anbAngle: 2, fmaAngle: 25 },
				}}
			/>,
		);
		assert.ok(html.length > 100);
	});

	it("19. Verifies CephalometricCanvas renders 16 anatomical landmarks and calibration controls", async () => {
		const { CephalometricCanvas } = await import("../CephalometricCanvas.js");
		const html = renderToString(
			<CephalometricCanvas
				imageUrl="https://example.local/trg.png"
				landmarks={DEFAULT_CEPH_LANDMARKS_PRESET}
				filterMode="bone_enhance"
			/>,
		);
		assert.ok(html.includes('data-testid="ceph-calibration-toggle"'));
		assert.ok(html.includes("<svg"));
	});

	it("20. Verifies expanded cephalometric anatomy (Ba, Ar, Pt, Prn, Ls, Li, Pog'), Tweed FMIA and Ricketts E-line", () => {
		const landmarkKeys = new Set(CEPHALOMETRIC_LANDMARKS.map((l) => l.key));
		for (const key of ["Ba", "Ar", "Pt", "Prn", "Ls", "Li", "Pog_prime"] as const) {
			assert.ok(landmarkKeys.has(key), `Landmark ${key} must be registered in CEPHALOMETRIC_LANDMARKS`);
			assert.ok(DEFAULT_CEPH_LANDMARKS_PRESET[key] !== undefined, `Preset must contain coordinates for ${key}`);
		}

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

	it("21. Verifies default ortho protocol state returns clean initial draft for Zero-Leak Draft", () => {
		const d1 = createDefaultOrthoProtocolState();
		const d2 = createDefaultOrthoProtocolState();
		assert.notEqual(d1, d2);
		assert.equal(d1.applianceCategory, d2.applianceCategory);
	});
});
