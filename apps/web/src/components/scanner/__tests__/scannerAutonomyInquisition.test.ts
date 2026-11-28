import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentCameraScannerModal } from "../DocumentCameraScannerModal";
import { ScannerDocumentPresets } from "../cameraModal/ScannerDocumentPresets";
import { ScannerCameraViewport } from "../cameraModal/ScannerCameraViewport";
import { ScannerAttachmentActions } from "../cameraModal/ScannerAttachmentActions";
import { DOCUMENT_PRESETS } from "../documentScannerEngine";
import { ClinicalPhotoProtocolModal } from "../../photography/ClinicalPhotoProtocolModal";
import { BeforeAfterComparisonView } from "../../photography/BeforeAfterComparisonView";
import { LabPhotoExportDrawer } from "../../photography/LabPhotoExportDrawer";
import { PHOTO_PROTOCOL_PRESETS } from "../../photography/photoGridPresets";

const EMOJI_REGEX =
	/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}]/u;

describe("Red Team Inquisitor: Clinical Imaging, Scanner & Visiograph Autonomy (6G Live SUT)", () => {
	it("1. Doctor Autonomy (Mandate 8e): ZERO disabled button attributes across rendered scanner & photography components", () => {
		const scannerOpenHtml = renderToStaticMarkup(
			React.createElement(DocumentCameraScannerModal, {
				isOpen: true,
				patientId: "pat-scan-1",
				patientName: "Смирнова А.С.",
				onClose: () => {},
			}),
		);
		assert.ok(scannerOpenHtml.includes('data-testid="document-camera-scanner-modal"'));
		assert.strictEqual(scannerOpenHtml.includes('disabled=""'), false);
		assert.strictEqual(EMOJI_REGEX.test(scannerOpenHtml), false);

		const preset = PHOTO_PROTOCOL_PRESETS[0];
		assert.ok(preset);
		const photoHtml = renderToStaticMarkup(
			React.createElement(ClinicalPhotoProtocolModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-photo-1",
			}),
		);
		assert.strictEqual(photoHtml.includes('disabled=""'), false);
		assert.strictEqual(EMOJI_REGEX.test(photoHtml), false);

		const compHtml = renderToStaticMarkup(
			React.createElement(BeforeAfterComparisonView, {
				preset,
				slotsData: {},
				beforeSlotId: preset.slots[0]?.id ?? "slot_1",
				afterSlotId: preset.slots[1]?.id ?? "slot_2",
			}),
		);
		assert.strictEqual(compHtml.includes('disabled=""'), false);
		assert.strictEqual(EMOJI_REGEX.test(compHtml), false);
	});

	it("2. ScannerDocumentPresets supports preset selection and multi-device USB camera dropdown", () => {
		const fakeCameras = [
			{ deviceId: "cam-usb-1", groupId: "g1", kind: "videoinput", label: "USB Document Camera", toJSON: () => ({}) },
			{ deviceId: "cam-usb-2", groupId: "g2", kind: "videoinput", label: "Webcam HD", toJSON: () => ({}) },
		] as MediaDeviceInfo[];

		const html = renderToStaticMarkup(
			React.createElement(ScannerDocumentPresets, {
				selectedDocType: "passport",
				onSelectDocType: () => {},
				availableCameras: fakeCameras,
				selectedCameraId: "cam-usb-1",
				onSelectCameraId: () => {},
			}),
		);
		assert.ok(html.includes("USB Document Camera"));
		assert.ok(html.includes("Webcam HD"));
		assert.ok(html.includes(DOCUMENT_PRESETS.passport.shortTitle));
		assert.strictEqual(html.includes('disabled=""'), false);
	});

	it("3. ScannerCameraViewport renders hardware stream, error fallback upload button, and PDF preview cleanly", () => {
		const emptyRef = { current: null };
		const errorHtml = renderToStaticMarkup(
			React.createElement(ScannerCameraViewport, {
				videoRef: emptyRef,
				canvasRef: emptyRef,
				fileInputRef: emptyRef,
				isCapturing: true,
				cameraError: "Камера не найдена",
				preset: DOCUMENT_PRESETS.passport,
				capturedDataUrl: null,
				capturedBlob: null,
				isDragOver: false,
				onDragOver: () => {},
				onDragLeave: () => {},
				onDrop: () => {},
				onFileChange: () => {},
			}),
		);
		assert.ok(errorHtml.includes('data-testid="scanner-fallback-file-button"'));
		assert.ok(errorHtml.includes("Выбрать файл с диска"));
		assert.strictEqual(errorHtml.includes('disabled=""'), false);

		const pdfBlob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
		const pdfHtml = renderToStaticMarkup(
			React.createElement(ScannerCameraViewport, {
				videoRef: emptyRef,
				canvasRef: emptyRef,
				fileInputRef: emptyRef,
				isCapturing: false,
				cameraError: null,
				preset: DOCUMENT_PRESETS.oms,
				capturedDataUrl: null,
				capturedBlob: pdfBlob,
				isDragOver: false,
				onDragOver: () => {},
				onDragLeave: () => {},
				onDrop: () => {},
				onFileChange: () => {},
			}),
		);
		assert.ok(pdfHtml.includes("PDF-документ готов к отправке"));
		assert.strictEqual(EMOJI_REGEX.test(pdfHtml), false);
	});

	it("4. ScannerAttachmentActions renders shutter/file fallback in capture mode and rotate/save CTA after capture", () => {
		const capturingHtml = renderToStaticMarkup(
			React.createElement(ScannerAttachmentActions, {
				isCapturing: true,
				cameraError: null,
				rotationDeg: 0,
				isUploading: false,
				onCapture: () => {},
				onRetake: () => {},
				onRotate: () => {},
				onOpenFile: () => {},
				onSaveAttachment: () => {},
			}),
		);
		assert.ok(capturingHtml.includes('data-testid="scanner-capture-button"'));
		assert.ok(capturingHtml.includes("Сфотографировать"));

		const readyHtml = renderToStaticMarkup(
			React.createElement(ScannerAttachmentActions, {
				isCapturing: false,
				cameraError: null,
				rotationDeg: 90,
				isUploading: false,
				onCapture: () => {},
				onRetake: () => {},
				onRotate: () => {},
				onOpenFile: () => {},
				onSaveAttachment: () => {},
			}),
		);
		assert.ok(readyHtml.includes('data-testid="scanner-save-attachment-button"'));
		assert.ok(readyHtml.includes("Прикрепить к медкарте"));
		assert.ok(readyHtml.includes("90°"));
		assert.strictEqual(readyHtml.includes('disabled=""'), false);
	});

	it("5. Closed DocumentCameraScannerModal returns empty markup & LabPhotoExportDrawer has zero disabled buttons", () => {
		const closedHtml = renderToStaticMarkup(
			React.createElement(DocumentCameraScannerModal, {
				isOpen: false,
				patientId: "pat-scan-1",
				onClose: () => {},
			}),
		);
		assert.strictEqual(closedHtml, "");

		const preset = PHOTO_PROTOCOL_PRESETS[0];
		assert.ok(preset);
		const drawerHtml = renderToStaticMarkup(
			React.createElement(LabPhotoExportDrawer, {
				preset,
				slotsData: {},
			}),
		);
		assert.ok(drawerHtml.includes('data-testid="btn-export-lab-png"'));
		assert.strictEqual(drawerHtml.includes('disabled=""'), false);
		assert.strictEqual(EMOJI_REGEX.test(drawerHtml), false);
	});
});
