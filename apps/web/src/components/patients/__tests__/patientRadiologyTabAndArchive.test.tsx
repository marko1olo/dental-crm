import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientRadiologyTab } from "../tabs/PatientRadiologyTab";
import { RadiologyStudiesArchive, DEMO_ARCHIVE_STUDIES } from "../../radiology/archive/RadiologyStudiesArchive";
import { StudyPatientBindControlModal } from "../../radiology/archive/StudyPatientBindControlModal";
import { PatientCardModal } from "../PatientCardModal";
import { RadiologyModule } from "../../radiology/RadiologyModule";
import type { ImagingStudy } from "@dental/shared";
import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";

describe("Red Team Inquisition: Patient Radiology Tab & Global Studies Archive", () => {
	const sampleStudy: ImagingStudy = {
		id: "02b00000-0000-0000-0000-000000000001",
		organizationId: DEMO_SHOWCASE_ORG_ID,
		patientId: "01a00000-0000-0000-0000-000000000001",
		patientFullName: "Захаров Иван Дмитриевич",
		dicomPatientName: "Zakharov Ivan",
		dicomPatientId: "DICOM-CT-89412",
		dicomBirthDate: "1985-04-12",
		kind: "cbct",
		title: "3D КЛКТ верхней и нижней челюсти 8x8",
		modality: "CT",
		seriesDescription: "KaVo OP 3D Pro / 80x80mm Standard Res",
		studyDate: "2026-08-25",
		capturedAt: "2026-08-25T10:30:00.000Z",
		sliceCount: 420,
		dimensions: "512x512x420",
		voxelSpacing: "0.2mm",
		fileSizeBytes: 185400000,
		bindingStatus: "auto_bound",
		bindingConfidence: 98,
		sourceKind: "folder_watch",
		sourceName: "KaVo eXam Vision PACS",
		status: "available",
		visitId: null,
		toothCode: null,
		region: null,
		aiSummary: null,
		previewUrl: "/radiology/sample_rvg_tooth16.jpg",
		viewerUrl: null,
	};

	const unassignedStudy: ImagingStudy = {
		id: "02b00000-0000-0000-0000-000000000004",
		organizationId: DEMO_SHOWCASE_ORG_ID,
		patientId: null,
		patientFullName: null,
		dicomPatientName: "Kuznetsov D.",
		dicomPatientId: "DICOM-CT-99102",
		dicomBirthDate: "1979-02-17",
		kind: "cbct",
		title: "3D КЛКТ сегмента нижней челюсти 5x5",
		modality: "CT",
		seriesDescription: "Morita Veraviewepocs 3D F40",
		studyDate: "2026-08-28",
		capturedAt: "2026-08-28T16:50:00.000Z",
		sliceCount: 380,
		dimensions: "512x512x380",
		voxelSpacing: "0.125mm",
		fileSizeBytes: 145000000,
		bindingStatus: "pending_review",
		bindingConfidence: 78,
		sourceKind: "folder_watch",
		sourceName: "i-Dixel Morita Network",
		status: "available",
		visitId: null,
		toothCode: null,
		region: null,
		aiSummary: null,
		previewUrl: "/radiology/sample_rvg_tooth16.jpg",
		viewerUrl: null,
	};

	it("1. PatientRadiologyTab renders clinical radiology hub with action buttons", () => {
		const html = renderToStaticMarkup(
			React.createElement(PatientRadiologyTab, {
				patientId: "01a00000-0000-0000-0000-000000000001",
				patientName: "Захаров Иван Дмитриевич",
				patientBirthDate: "1985-04-12",
			}),
		);

		// Must render the tab container
		assert.ok(html.includes('data-testid="patient-radiology-tab"'), "Tab container must be rendered");
		// Must render button to upload/intake CT for this patient
		assert.ok(html.includes('data-testid="btn-patient-upload-ct"'), "Must have button to upload CT for this patient");
		assert.ok(html.includes("+ Загрузить КТ для этого пациента"), "Upload button must have clear label");
		// Must render refresh button
		assert.ok(html.includes('data-testid="btn-refresh-patient-radiology"'), "Must have refresh button");
	});

	it("2. PatientRadiologyTab displays empty state gracefully when no studies exist", () => {
		const html = renderToStaticMarkup(
			React.createElement(PatientRadiologyTab, {
				patientId: "non-existent-patient-uuid",
				patientName: "Новый Пациент",
			}),
		);

		assert.ok(html.includes('data-testid="patient-radiology-tab"'), "Tab container rendered");
	});

	it("3. RadiologyStudiesArchive renders global registry of all clinic CT and X-rays", () => {
		const html = renderToStaticMarkup(
			React.createElement(RadiologyStudiesArchive, {
				onOpenStudio: () => {},
				onOpenViewer: () => {},
				onUploadNew: () => {},
			}),
		);

		// Container
		assert.ok(html.includes('data-testid="radiology-archive-container"'), "Must render archive container");
		// Search input
		assert.ok(html.includes('data-testid="archive-search-input"'), "Must render archive search input");
		// Modality filters: All, CBCT, OPG, RVG
		assert.ok(html.includes('data-testid="filter-modality-all"'), "Must have All modalities filter");
		assert.ok(html.includes('data-testid="filter-modality-cbct"'), "Must have 3D CBCT filter");
		assert.ok(html.includes('data-testid="filter-modality-opg"'), "Must have OPG filter");
		assert.ok(html.includes('data-testid="filter-modality-rvg"'), "Must have RVG filter");
		// Binding filter: pending review
		assert.ok(html.includes('data-testid="filter-binding-pending"'), "Must have pending review filter");
		// Auto-bind button
		assert.ok(html.includes('data-testid="btn-auto-bind-scan"'), "Must have auto-bind scan button");
		assert.ok(html.includes("Автопривязка по ФИО"), "Must have Russian label for auto-binding");
		// Upload button
		assert.ok(html.includes('data-testid="btn-archive-upload-new"'), "Must have upload button");
	});

	it("4. StudyPatientBindControlModal displays DICOM vs CRM patient matching data", () => {
		const html = renderToStaticMarkup(
			React.createElement(StudyPatientBindControlModal, {
				isOpen: true,
				onClose: () => {},
				study: sampleStudy,
			}),
		);

		// Modal container
		assert.ok(html.includes('data-testid="study-bind-control-modal"'), "Must render bind control modal");
		// DICOM header data
		assert.ok(html.includes('data-testid="dicom-patient-name"'), "Must display DICOM patient name");
		assert.ok(html.includes("Zakharov Ivan"), "Must include Zakharov Ivan from DICOM");
		assert.ok(html.includes("1985-04-12"), "Must include birth date from DICOM");
		// CRM matching data
		assert.ok(html.includes('data-testid="crm-matched-patient-name"'), "Must display CRM matched patient");
		assert.ok(html.includes("Захаров Иван Дмитриевич"), "Must include matched Russian CRM name");
		assert.ok(html.includes("98%"), "Must show 98% confidence score");
		// Actions: Confirm, Change patient search, Unbind
		assert.ok(html.includes('data-testid="btn-confirm-binding"'), "Must have confirm binding button");
		assert.ok(html.includes('data-testid="btn-open-patient-search"'), "Must have change patient button");
		assert.ok(html.includes('data-testid="btn-unbind-patient"'), "Must have unbind button");
	});

	it("5. StudyPatientBindControlModal handles unassigned / pending review studies", () => {
		const html = renderToStaticMarkup(
			React.createElement(StudyPatientBindControlModal, {
				isOpen: true,
				onClose: () => {},
				study: unassignedStudy,
			}),
		);

		assert.ok(html.includes('data-testid="study-bind-control-modal"'), "Modal rendered for unassigned study");
		assert.ok(html.includes("Kuznetsov D."), "Displays DICOM name Kuznetsov D.");
		assert.ok(html.includes("78%"), "Displays confidence 78%");
		assert.ok(html.includes("Пациент еще не привязан к исследованию"), "Notifies about unassigned state");
	});

	it("6. PatientCardModal integrates «Снимки и КТ» tab in navigation", () => {
		const html = renderToStaticMarkup(
			React.createElement(PatientCardModal, {
				isOpen: true,
				onClose: () => {},
				patient: {
					id: "01a00000-0000-0000-0000-000000000001",
					fullName: "Захаров Иван Дмитриевич",
					birthDate: "1985-04-12",
					phone: "+7 (916) 123-45-67",
				},
			}),
		);

		// Check navigation tab for radiology
		assert.ok(html.includes('data-testid="tab-patient-radiology"'), "Must render 'Снимки и КТ' tab in PatientCardModal");
		assert.ok(html.includes("Снимки и КТ"), "Tab button has Russian label 'Снимки и КТ'");
		assert.ok(html.includes('data-testid="tab-patient-general"'), "General tab exists");
		assert.ok(html.includes('data-testid="tab-patient-anamnesis"'), "Anamnesis tab exists");
		assert.ok(html.includes('data-testid="tab-patient-visits"'), "Visits tab exists");
		assert.ok(html.includes('data-testid="tab-patient-family"'), "Family tab exists");
	});

	it("7. RadiologyModule includes Global Archive tab and Study Studio integration", () => {
		const html = renderToStaticMarkup(
			React.createElement(RadiologyModule, {
				patient: {
					id: "01a00000-0000-0000-0000-000000000001",
					fullName: "Захаров Иван Дмитриевич",
				},
				doctorName: "Д-р Смирнов",
			}),
		);

		// Container
		assert.ok(html.includes('data-testid="radiology-module-container"'), "RadiologyModule renders");
		// Tab switchers: Archive vs Hub
		assert.ok(html.includes('data-testid="tab-radiology-archive"'), "Must have Archive tab button");
		assert.ok(html.includes('data-testid="tab-radiology-hub"'), "Must have Hub tab button");
		assert.ok(html.includes("Архив всех КТ и снимков"), "Archive tab has proper label");
		// Launchers
		assert.ok(html.includes('data-testid="btn-open-3d-cbct-studio"'), "Has 3D CBCT studio launcher");
		assert.ok(html.includes('data-testid="btn-open-dicom-viewer"'), "Has DICOM viewer launcher");
		assert.ok(html.includes('data-testid="btn-open-referral-modal"'), "Has referral launcher");
	});
});
