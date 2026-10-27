import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RadiologyStudiesArchive } from "../../radiology/archive/RadiologyStudiesArchive";
import { StudyPatientBindControlModal } from "../../radiology/archive/StudyPatientBindControlModal";
import { RadiologyModule } from "../../radiology/RadiologyModule";
import type { ImagingStudy } from "@dental/shared";
import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";

describe("Global Studies Archive & Binding Control", () => {
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
		...sampleStudy,
		id: "02b00000-0000-0000-0000-000000000004",
		patientId: null,
		patientFullName: null,
		dicomPatientName: "Kuznetsov D.",
		bindingStatus: "pending_review",
		bindingConfidence: 78,
	};

	it("1. RadiologyStudiesArchive renders global registry of all clinic CT and X-rays", () => {
		const html = renderToStaticMarkup(
			React.createElement(RadiologyStudiesArchive, { onOpenStudio: () => {}, onOpenViewer: () => {}, onUploadNew: () => {} }),
		);
		assert.ok(html.includes('data-testid="radiology-archive-container"'));
		assert.ok(html.includes('data-testid="archive-search-input"'));
		assert.ok(html.includes('data-testid="filter-modality-all"'));
		assert.ok(html.includes('data-testid="filter-modality-cbct"'));
		assert.ok(html.includes('data-testid="filter-modality-opg"'));
		assert.ok(html.includes('data-testid="filter-modality-rvg"'));
		assert.ok(html.includes('data-testid="filter-binding-pending"'));
		assert.ok(html.includes('data-testid="btn-auto-bind-scan"'));
		assert.ok(html.includes('data-testid="btn-archive-upload-new"'));
	});

	it("2. StudyPatientBindControlModal displays DICOM vs CRM patient matching data", () => {
		const html = renderToStaticMarkup(
			React.createElement(StudyPatientBindControlModal, { isOpen: true, onClose: () => {}, study: sampleStudy }),
		);
		assert.ok(html.includes('data-testid="study-bind-control-modal"'));
		assert.ok(html.includes('data-testid="dicom-patient-name"'));
		assert.ok(html.includes("Zakharov Ivan"));
		assert.ok(html.includes('data-testid="crm-matched-patient-name"'));
		assert.ok(html.includes("Захаров Иван Дмитриевич"));
		assert.ok(html.includes("98%"));
		assert.ok(html.includes('data-testid="btn-confirm-binding"'));
		assert.ok(html.includes('data-testid="btn-open-patient-search"'));
		assert.ok(html.includes('data-testid="btn-unbind-patient"'));
	});

	it("3. StudyPatientBindControlModal handles unassigned / pending review studies", () => {
		const html = renderToStaticMarkup(
			React.createElement(StudyPatientBindControlModal, { isOpen: true, onClose: () => {}, study: unassignedStudy }),
		);
		assert.ok(html.includes('data-testid="study-bind-control-modal"'));
		assert.ok(html.includes("Kuznetsov D."));
		assert.ok(html.includes("78%"));
		assert.ok(html.includes("Пациент еще не привязан к исследованию"));
	});

	it("4. RadiologyModule includes Global Archive tab and Study Studio integration", () => {
		const html = renderToStaticMarkup(
			React.createElement(RadiologyModule, { patient: { id: "01a", fullName: "Захаров Иван Дмитриевич" }, doctorName: "Д-р Смирнов" }),
		);
		assert.ok(html.includes('data-testid="radiology-module-container"'));
		assert.ok(html.includes('data-testid="tab-radiology-archive"'));
		assert.ok(html.includes('data-testid="tab-radiology-hub"'));
		assert.ok(html.includes('data-testid="btn-open-3d-cbct-studio"'));
		assert.ok(html.includes('data-testid="btn-open-dicom-viewer"'));
	});
});
