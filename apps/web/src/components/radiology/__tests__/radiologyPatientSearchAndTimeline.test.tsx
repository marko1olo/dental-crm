import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	RadiologyPatientSearchModal,
	matchesTactileModality,
	matchesDatePreset,
	DEFAULT_TACTILE_FILTERS,
	TACTILE_MODES,
	TACTILE_DATES,
} from "../RadiologyPatientSearchModal";
import {
	PatientTimeline,
	formatStudyDateKey,
	getModalityColor,
} from "../../patients/PatientTimeline";
import { PatientRadiologyTab } from "../../patients/tabs/PatientRadiologyTab";
import { RadiologyStudiesArchive } from "../archive/RadiologyStudiesArchive";
import { RadiologyModule } from "../RadiologyModule";
import { PatientsView } from "../../../PatientsView";
import {
	AppLogicProvider,
	type AppLogicContextType,
} from "../../../contexts/AppLogicContext";
import type { ImagingStudy } from "@dental/shared";

describe("Window #2 Red Team Inquisition: Tactical Search Matrix & Patient Timeline (EzDent-i)", () => {
	const sampleCbctStudy: ImagingStudy = {
		id: "study-cbct-001",
		organizationId: "org-001",
		patientId: "pat-001",
		patientFullName: "Константинов Константин Константинович",
		dicomPatientName: "Konstantinov K.",
		dicomPatientId: "DICOM-CT-1001",
		dicomBirthDate: "1980-05-15",
		kind: "cbct",
		title: "3D КЛКТ верхней челюсти 10x10",
		modality: "CT",
		seriesDescription: "Vatech Green 16 FOV 10x10",
		studyDate: "2026-10-02",
		capturedAt: "2026-10-02T10:00:00.000Z",
		sliceCount: 450,
		dimensions: "512x512x450",
		voxelSpacing: "0.2mm",
		fileSizeBytes: 200000000,
		bindingStatus: "auto_bound",
		bindingConfidence: 100,
		sourceKind: "folder_watch",
		sourceName: "Vatech EzDent-i",
		status: "available",
		visitId: null,
		toothCode: "16",
		region: "maxilla",
		aiSummary: null,
		previewUrl: "/radiology/sample_cbct.jpg",
		viewerUrl: null,
	};

	const sampleOpgStudy: ImagingStudy = {
		id: "study-opg-002",
		organizationId: "org-001",
		patientId: "pat-001",
		patientFullName: "Константинов Константин Константинович",
		dicomPatientName: "Konstantinov K.",
		dicomPatientId: "DICOM-PAN-2002",
		dicomBirthDate: "1980-05-15",
		kind: "opg",
		title: "Ортопантомограмма (ОПТГ)",
		modality: "PAN",
		seriesDescription: "PaX-i 2D HD Panoramic",
		studyDate: "2026-09-25",
		capturedAt: "2026-09-25T14:30:00.000Z",
		sliceCount: 1,
		dimensions: "2400x1200",
		voxelSpacing: "0.1mm",
		fileSizeBytes: 12000000,
		bindingStatus: "auto_bound",
		bindingConfidence: 100,
		sourceKind: "dicomweb",
		sourceName: "EzDent-i PACS",
		status: "available",
		visitId: null,
		toothCode: null,
		region: "full_arch",
		aiSummary: null,
		previewUrl: "/radiology/sample_opg.jpg",
		viewerUrl: null,
	};

	const sampleRvgStudy: ImagingStudy = {
		id: "study-rvg-003",
		organizationId: "org-001",
		patientId: "pat-001",
		patientFullName: "Константинов Константин Константинович",
		dicomPatientName: "Konstantinov K.",
		dicomPatientId: "DICOM-RVG-3003",
		dicomBirthDate: "1980-05-15",
		kind: "periapical",
		title: "Прицельный снимок зуба 16 (RVG)",
		modality: "IO",
		seriesDescription: "EzSensor HD Intraoral",
		studyDate: "2026-09-25",
		capturedAt: "2026-09-25T14:35:00.000Z",
		sliceCount: 1,
		dimensions: "1600x1200",
		voxelSpacing: "0.05mm",
		fileSizeBytes: 3500000,
		bindingStatus: "auto_bound",
		bindingConfidence: 100,
		sourceKind: "twain_wia",
		sourceName: "EzSensor USB",
		status: "available",
		visitId: null,
		toothCode: "16",
		region: "molar",
		aiSummary: null,
		previewUrl: "/radiology/sample_rvg.jpg",
		viewerUrl: null,
	};

	/* ──────────────────────────────────────────────────────────────────────────
	   TEST GROUP 1: Visiography Date & Visit Filter (Rebuild Rotten Seeds Law)
	   ────────────────────────────────────────────────────────────────────────── */
	it("1. RadiologyPatientSearchModal renders clean visiography date filters, tabs, and visits list without 7x7 matrix", () => {
		const html = renderToStaticMarkup(
			<RadiologyPatientSearchModal
				isOpen={true}
				onClose={() => {}}
				onApply={() => {}}
				initialFilters={{ mode: "periapical", datePreset: "all" }}
				totalStudiesCount={12}
				matchedCount={3}
			/>,
		);

		// Modal container and header
		assert.ok(html.includes("tactile-search-modal-backdrop"), "Backdrop exists");
		assert.ok(html.includes("data-testid=\"tactile-search-modal-dialog\""), "Dialog container exists");
		assert.ok(html.includes("СНИМКИ ВИЗИОГРАФА ПО ДАТАМ И ВИЗИТАМ"), "Header title correct");
		assert.ok(html.includes("Визиограф RVG"), "Visiography RVG badge present");

		// Quick date filter tabs
		assert.ok(html.includes("data-testid=\"tactile-date-all\""), "Tab 'Все снимки' rendered");
		assert.ok(html.includes("data-testid=\"tactile-date-today\""), "Tab 'Сегодня / Приём' rendered");
		assert.ok(html.includes("data-testid=\"tactile-date-last_month\""), "Tab '30 дней' rendered");
		assert.ok(html.includes("data-testid=\"tactile-date-custom\""), "Tab 'Период' rendered");

		// Quick sub-presets for fast click
		assert.ok(html.includes("data-testid=\"tactile-date-yesterday\""), "Chip 'Вчера' rendered");
		assert.ok(html.includes("data-testid=\"tactile-date-3days\""), "Chip '3 дня' rendered");
		assert.ok(html.includes("data-testid=\"tactile-date-last_week\""), "Chip '7 дней' rendered");

		// Chronological visits list with teeth and RVG shot counts
		assert.ok(html.includes("data-testid=\"radiology-visits-list\""), "Visits list container rendered");
		assert.ok(html.includes("03.10.2026"), "Current visit date rendered");
		assert.ok(html.includes("25.09.2026"), "Previous visit date rendered");
		assert.ok(html.includes("RVG"), "RVG shot badge rendered");

		// Action buttons: Apply & Reset
		assert.ok(html.includes("data-testid=\"btn-apply-tactile-search\""), "Apply button rendered");
		assert.ok(html.includes("data-testid=\"btn-reset-tactile-filters\""), "Reset button rendered");
		assert.ok(html.includes("data-testid=\"tactile-search-query-input\""), "Query input rendered");
		assert.ok(html.includes("data-testid=\"btn-search-trigger\""), "Search trigger button rendered");
	});

	it("2. matchesTactileModality strictly filters apparatus types without bleed", () => {
		// All modes pass 'all'
		assert.strictEqual(matchesTactileModality("cbct", "all"), true);
		assert.strictEqual(matchesTactileModality("opg", "all"), true);
		assert.strictEqual(matchesTactileModality("periapical", "all"), true);

		// CBCT
		assert.strictEqual(matchesTactileModality("cbct", "cbct"), true);
		assert.strictEqual(matchesTactileModality("CT", "cbct"), true);
		assert.strictEqual(matchesTactileModality("3D", "cbct"), true);
		assert.strictEqual(matchesTactileModality("opg", "cbct"), false);
		assert.strictEqual(matchesTactileModality("periapical", "cbct"), false);

		// OPG / Panorama
		assert.strictEqual(matchesTactileModality("opg", "opg"), true);
		assert.strictEqual(matchesTactileModality("PAN", "opg"), true);
		assert.strictEqual(matchesTactileModality("panoramic", "opg"), true);
		assert.strictEqual(matchesTactileModality("cbct", "opg"), false);

		// IO-sensor / RVG
		assert.strictEqual(matchesTactileModality("periapical", "periapical"), true);
		assert.strictEqual(matchesTactileModality("rvg", "periapical"), true);
		assert.strictEqual(matchesTactileModality("IO", "periapical"), true);
		assert.strictEqual(matchesTactileModality("sensor", "periapical"), true);
		assert.strictEqual(matchesTactileModality("bitewing", "periapical"), true);
		assert.strictEqual(matchesTactileModality("opg", "periapical"), false);

		// Ceph / TRG
		assert.strictEqual(matchesTactileModality("ceph", "ceph"), true);
		assert.strictEqual(matchesTactileModality("trg", "ceph"), true);
		assert.strictEqual(matchesTactileModality("cbct", "ceph"), false);

		// Camera
		assert.strictEqual(matchesTactileModality("camera", "camera"), true);
		assert.strictEqual(matchesTactileModality("intraoral_photo", "camera"), true);
		assert.strictEqual(matchesTactileModality("opg", "camera"), false);
	});

	it("3. matchesDatePreset strictly filters chronological ranges", () => {
		const refDate = new Date(2026, 9, 3, 12, 0, 0); // 03.10.2026

		// All dates
		assert.strictEqual(matchesDatePreset("2026-10-03", "all", undefined, undefined, refDate), true);
		assert.strictEqual(matchesDatePreset("2020-01-01", "all", undefined, undefined, refDate), true);

		// Today (03.10.2026)
		assert.strictEqual(matchesDatePreset("2026-10-03", "today", undefined, undefined, refDate), true);
		assert.strictEqual(matchesDatePreset("03.10.2026", "today", undefined, undefined, refDate), true);
		assert.strictEqual(matchesDatePreset("2026-10-02", "today", undefined, undefined, refDate), false);

		// Yesterday (02.10.2026)
		assert.strictEqual(matchesDatePreset("2026-10-02", "yesterday", undefined, undefined, refDate), true);
		assert.strictEqual(matchesDatePreset("02.10.2026", "yesterday", undefined, undefined, refDate), true);
		assert.strictEqual(matchesDatePreset("2026-10-03", "yesterday", undefined, undefined, refDate), false);

		// 3 days (01.10.2026 to 03.10.2026)
		assert.strictEqual(matchesDatePreset("2026-10-02", "3days", undefined, undefined, refDate), true);
		assert.strictEqual(matchesDatePreset("2026-10-01", "3days", undefined, undefined, refDate), true);
		assert.strictEqual(matchesDatePreset("2026-09-29", "3days", undefined, undefined, refDate), false);

		// Custom range
		assert.strictEqual(
			matchesDatePreset("2026-09-25", "custom", "2026-09-20", "2026-09-28", refDate),
			true,
		);
		assert.strictEqual(
			matchesDatePreset("2026-08-15", "custom", "2026-09-20", "2026-09-28", refDate),
			false,
		);
	});

	/* ──────────────────────────────────────────────────────────────────────────
	   TEST GROUP 2: Chronological Timeline (EzDent-i Screenshots 15, 16)
	   ────────────────────────────────────────────────────────────────────────── */
	it("4. PatientTimeline groups studies by date with green separator lines (#00C853)", () => {
		const studies = [sampleCbctStudy, sampleOpgStudy, sampleRvgStudy];
		const html = renderToStaticMarkup(
			<PatientTimeline
				studies={studies}
				activeStudyId="study-cbct-001"
				defaultZoomPx={150}
			/>,
		);

		// Timeline container
		assert.ok(html.includes("data-testid=\"patient-timeline-container\""), "Timeline container rendered");

		// Header and filters
		assert.ok(html.includes("data-testid=\"timeline-date-filter\""), "Date dropdown filter rendered");
		assert.ok(html.includes("data-testid=\"timeline-modality-filter\""), "Modality dropdown filter rendered");
		assert.ok(html.includes("data-testid=\"timeline-date-presets-bar\""), "1-click date preset chips bar rendered");
		assert.ok(html.includes("data-testid=\"timeline-tooth-filter\""), "1-click tooth FDI filter dropdown rendered");

		// Green divider line (#00C853)
		assert.ok(
			html.includes("data-testid=\"timeline-green-divider-line\""),
			"Horizontal green separator line rendered under date header",
		);
		assert.ok(
			html.includes("#00C853"),
			"Green divider line uses brand EzDent-i color #00C853",
		);

		// Date grouping: 02.10.2026 and 25.09.2026
		assert.ok(html.includes("02.10.2026"), "Header for 02.10.2026 present");
		assert.ok(html.includes("25.09.2026"), "Header for 25.09.2026 present");

		// 2 studies on 25.09.2026
		assert.ok(html.includes("2 снимка"), "Date count badge for 25.09.2026 present");
	});

	it("5. PatientTimeline highlights active study with 3px green border (#00C853) and renders zoom slider", () => {
		const studies = [sampleCbctStudy, sampleOpgStudy];
		const html = renderToStaticMarkup(
			<PatientTimeline
				studies={studies}
				activeStudyId="study-cbct-001"
				defaultZoomPx={160}
			/>,
		);

		// Active card has 3px solid #00C853 border
		assert.ok(
			html.includes("border:3px solid #00C853"),
			"Active study card has prominent 3px solid #00C853 border",
		);
		assert.ok(
			html.includes("data-testid=\"timeline-study-card-study-cbct-001\""),
			"Active card element rendered",
		);
		assert.ok(
			html.includes("data-active=\"true\""),
			"Active card marked with data-active='true'",
		);

		// Launch buttons
		assert.ok(
			html.includes("data-testid=\"btn-timeline-launch-3d-study-cbct-001\""),
			"3D MPR studio launcher button rendered for CBCT",
		);
		assert.ok(
			html.includes("data-testid=\"btn-timeline-launch-viewer-study-opg-002\""),
			"2D viewer launcher button rendered for OPG",
		);

		// Thumbnail preview zoom slider (EzDent-i Screenshots 15, 16)
		assert.ok(
			html.includes("data-testid=\"timeline-preview-zoom-slider\""),
			"Zoom slider rendered in bottom status bar",
		);
		assert.ok(html.includes("min=\"90\""), "Zoom slider min width is 90px");
		assert.ok(html.includes("max=\"260\""), "Zoom slider max width is 260px");
		assert.ok(html.includes("160px"), "Current zoom width displayed in status bar");
	});

	/* ──────────────────────────────────────────────────────────────────────────
	   TEST GROUP 3: Toolbar Triggers Integration (2 Clicks to Matrix)
	   ────────────────────────────────────────────────────────────────────────── */
	it("6. PatientRadiologyTab integrates PatientTimeline and Matrix Search button", () => {
		const html = renderToStaticMarkup(
			<PatientRadiologyTab
				patientId="01a00000-0000-0000-0000-000000000001"
				patientName="Иванов Алексей Сергеевич"
			/>,
		);

		// Trigger button in PatientRadiologyTab
		assert.ok(
			html.includes("data-testid=\"btn-patient-tactile-search\""),
			"PatientRadiologyTab contains 'Матрица поиска (Снимок 19)' button",
		);
	});

	it("7. RadiologyStudiesArchive integrates Matrix Search trigger button and filter reset", () => {
		const html = renderToStaticMarkup(<RadiologyStudiesArchive />);

		// Trigger button in Archive
		assert.ok(
			html.includes("data-testid=\"btn-open-tactile-matrix\""),
			"RadiologyStudiesArchive contains 'Матрица поиска (Снимок 19)' button",
		);

		// 1-click segmented date presets bar and tooth FDI filter
		assert.ok(
			html.includes("data-testid=\"archive-date-presets-bar\""),
			"RadiologyStudiesArchive contains 1-click segmented date presets bar",
		);
		assert.ok(
			html.includes("data-testid=\"archive-tooth-filter\""),
			"RadiologyStudiesArchive contains 1-click tooth FDI filter dropdown",
		);
	});

	it("8. RadiologyModule integrates Matrix Search trigger button", () => {
		const html = renderToStaticMarkup(
			<RadiologyModule
				patient={{ id: "pat-01", fullName: "Тестовый Пациент" }}
			/>,
		);

		// Trigger button in RadiologyModule
		assert.ok(
			html.includes("data-testid=\"btn-open-tactile-matrix-modal\""),
			"RadiologyModule contains 'Матрица поиска (Снимок 19)' button",
		);
	});

	it("9. PatientsView integrates Matrix Search trigger button in header actions", () => {
		const html = renderToStaticMarkup(
			<AppLogicProvider value={{} as AppLogicContextType}>
				<PatientsView
					createPatient={() => {}}
					filteredPatients={[]}
					money={(amt) => `${amt} ₽`}
					normalizeOptionalWorkingDaysDraft={(d) => d}
					patientAdministrativeProfileValidationMessage={null}
					patientInsightById={new Map()}
					patientInsightRiskLabels={{ low: "Низкий", high: "Высокий", watch: "Внимание" }}
					query=""
					savePatientAdministrativeProfile={() => undefined}
					savePatientCore={() => undefined}
					selectedPatient={null}
					setQuery={() => {}}
					updatePatientAdministrativeProfileDraft={() => {}}
					updatePatientCoreDraft={() => {}}
					weekdayOptions={[]}
				/>
			</AppLogicProvider>,
		);

		assert.ok(
			html.includes("data-testid=\"btn-patients-tactile-search\""),
			"PatientsView contains 'Матрица поиска (Снимок 19)' button",
		);
	});

	it("10. PatientTimeline accurately assigns clinical modality badges for camera and other", () => {
		const cameraBadge = getModalityColor("camera");
		assert.strictEqual(cameraBadge.label, "IO-КАМЕРА");

		const photoBadge = getModalityColor("photo");
		assert.strictEqual(photoBadge.label, "ДРУГОЕ");

		const twainBadge = getModalityColor("twain");
		assert.strictEqual(twainBadge.label, "ДРУГОЕ");
	});

	it("11. PatientTimeline includes all 7 apparatus options in dropdown filter matching EzDent-i", () => {
		const html = renderToStaticMarkup(
			<PatientTimeline studies={[]} />
		);

		assert.ok(html.includes("Все режимы"));
		assert.ok(html.includes("IO-сенсор (RVG)"));
		assert.ok(html.includes("Панорама (ОПТГ)"));
		assert.ok(html.includes("КТ 3D (КЛКТ)"));
		assert.ok(html.includes("Цефалостат (ТРГ)"));
		assert.ok(html.includes("IO-камера (Видео)"));
		assert.ok(html.includes("Другое (TWAIN/Фото)"));
	});
});

