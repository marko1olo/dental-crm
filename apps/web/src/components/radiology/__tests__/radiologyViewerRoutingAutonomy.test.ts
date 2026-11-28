/**
 * radiologyViewerRoutingAutonomy.test.ts
 *
 * Wave 22 — CBCT & Visiograph Viewer Integration & Anti-Matryoshka Law Runtime Tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { isCbctStudy, type RadiologyStudy } from "../types";
import {
	DirectRvgCaptureModal,
	getDirectRvgExportFileName,
	validateRadiologyUploadFile,
} from "../DirectRvgCaptureModal";
import { createDicomSecondaryCaptureFile } from "../radiologyDicomExporter.js";
import { DicomViewerModal } from "../../imaging/DicomViewerModal";
import { VisitDiagnosticsTab } from "../../visit/VisitDiagnosticsTab";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";

const testLogicValue: Partial<AppLogicContextType> = {
	activePatient: { id: "pt-1", fullName: "Тест Пациент" } as AppLogicContextType["activePatient"],
	odontogramUseSurfaces: true,
	money: (v: unknown) => `${Number(v) || 0} ₽`,
};

describe("1. Anti-Matryoshka Routing & CBCT 3D Studio Autonomy (Mandates 8c, 8d, 8e)", () => {
	const sampleCbctStudy: RadiologyStudy = {
		id: "study-cbct-test",
		patientName: "Смирнова Екатерина Васильевна",
		studyDate: "2026-09-06 12:00",
		studyType: "cbct_jaw_8x8",
		modality: "cbct_3d",
		modalityLabel: "3D КЛКТ челюстей",
		anatomicalArea: "Верхняя и нижняя челюсти",
		teethFdi: ["16", "26"],
		imageUrl: "/sample.jpg",
		status: "completed",
		effectiveDoseMicrosv: 55.0,
		effectiveDoseMsv: 0.055,
		doctorName: "Д-р Иванов И.И.",
	};

	const sampleRvgStudy: RadiologyStudy = {
		id: "study-rvg-test",
		patientName: "Смирнова Екатерина Васильевна",
		studyDate: "2026-09-06 12:30",
		studyType: "intraoral_radiovisiography",
		modality: "intraoral_rvg",
		modalityLabel: "Прицельная радиовизиография",
		anatomicalArea: "Зуб 16",
		teethFdi: ["16"],
		imageUrl: "/sample.jpg",
		status: "completed",
		effectiveDoseMicrosv: 3.0,
		effectiveDoseMsv: 0.003,
		doctorName: "Д-р Иванов И.И.",
	};

	it("correctly identifies CBCT 3D studies via isCbctStudy helper", () => {
		assert.equal(isCbctStudy(sampleCbctStudy), true);
		assert.equal(isCbctStudy({ modality: "cbct_3d" }), true);
		assert.equal(isCbctStudy({ studyType: "cbct_segment_5x5" }), true);
		assert.equal(isCbctStudy(sampleRvgStudy), false);
		assert.equal(isCbctStudy(null), false);
		assert.equal(isCbctStudy(undefined), false);
		assert.equal(isCbctStudy({}), false);
	});

	it("renders VisitDiagnosticsTab and DicomViewerModal cleanly at depth 1 (Anti-Matryoshka)", () => {
		const diagHtml = renderToStaticMarkup(
			React.createElement(
				AppLogicProvider,
				{ value: testLogicValue as AppLogicContextType },
				React.createElement(VisitDiagnosticsTab),
			),
		);
		assert.ok(diagHtml.length > 0);

		const dicomHtml = renderToStaticMarkup(
			React.createElement(DicomViewerModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Тест Пациент",
			}),
		);
		assert.ok(dicomHtml.includes("btn-dicom-norma-043") || dicomHtml.includes("btn-dicom-norma-emk"));
	});
});

describe("2. Medical DICOM & Genuine Image Export Autonomy (No Extension Spoofing)", () => {
	it("generates honest file names without masquerading JPEG as .dcm", () => {
		const dicomExport = getDirectRvgExportFileName(["16"], "043/у-0012", true, "data:image/jpeg;base64,123");
		assert.equal(dicomExport.isDicom, true);
		assert.equal(dicomExport.filename, "RVG_Tooth_16_043-у-0012.dcm");
		assert.equal(dicomExport.mimeType, "application/dicom");

		const jpegFallback = getDirectRvgExportFileName(["26"], "043/у-99", false, "data:image/jpeg;base64,abcd");
		assert.equal(jpegFallback.isDicom, false);
		assert.equal(jpegFallback.filename, "RVG_Tooth_26_043-у-99.jpg");
		assert.equal(jpegFallback.filename.endsWith(".dcm"), false);

		const pngFallback = getDirectRvgExportFileName(["36"], "043/у-88", false, "data:image/png;base64,abcd");
		assert.equal(pngFallback.filename, "RVG_Tooth_36_043-у-88.png");
	});

	it("creates valid Part 10 DICOM binary file with preamble and DICM magic header", () => {
		const canvas = {
			width: 100,
			height: 100,
			getContext: () => ({
				getImageData: () => ({
					data: new Uint8ClampedArray(100 * 100 * 4),
				}),
			}),
		} as unknown as HTMLCanvasElement;

		const dicomBytes = createDicomSecondaryCaptureFile(canvas, {
			patientId: "PAT-TEST-001",
			patientFullName: "Смирнов Алексей",
			clinicName: 'ООО "Денте Клиник"',
			modality: "IO",
			toothCode: "16",
			scaleMmPerPixel: 0.035,
		});

		assert.equal(dicomBytes instanceof Uint8Array, true);
		assert.ok(dicomBytes.length > 132);
		for (let i = 0; i < 128; i++) assert.equal(dicomBytes[i], 0);
		assert.equal(dicomBytes[128], 0x44);
		assert.equal(dicomBytes[129], 0x49);
		assert.equal(dicomBytes[130], 0x43);
		assert.equal(dicomBytes[131], 0x4d);
	});
});

describe("3. Local File Ingestion & Sensor Autonomy (Mandate 8e: No Hardware Lock-in)", () => {
	it("validates permissible radiology file formats correctly", () => {
		assert.deepEqual(validateRadiologyUploadFile({ name: "tooth16_rvg.dcm" }), { isValid: true, format: "dicom" });
		assert.deepEqual(validateRadiologyUploadFile({ name: "sensor_raw.tiff" }), { isValid: true, format: "tiff" });
		assert.deepEqual(validateRadiologyUploadFile({ name: "xray.png" }), { isValid: true, format: "image" });
		assert.deepEqual(validateRadiologyUploadFile({ name: "driver.exe" }), { isValid: false, format: "unsupported" });
	});

	it("DirectRvgCaptureModal renders disk upload button and hidden accept file input", () => {
		const html = renderToStaticMarkup(
			React.createElement(DirectRvgCaptureModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Тест Пациент",
			}),
		);
		assert.ok(html.includes('data-testid="rvg-upload-file-btn"'));
		assert.ok(html.includes("Загрузить с диска"));
		assert.ok(html.includes('data-testid="rvg-file-input"'));
		assert.ok(html.includes('.dcm,.dicom,.tif,.tiff,.png,.jpg,.jpeg,.webp,image/*'));
	});
});
