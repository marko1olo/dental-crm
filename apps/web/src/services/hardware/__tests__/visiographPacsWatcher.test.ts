import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DesktopNativeApi } from "../../../native/desktopBridge.js";
import type { RadiographyScanEvent } from "../hardwareTypes.js";
import { VisiographPacsWatcherService } from "../visiographPacsWatcher.js";

describe("VisiographPacsWatcherService — Local Radiography Watch Folder & Instant Patient Preview", () => {
	const originalWindow = globalThis.window;

	beforeEach(() => {
		VisiographPacsWatcherService.clearRecentScans();
		VisiographPacsWatcherService.bindToActivePatient(undefined, undefined);
		VisiographPacsWatcherService.setConfig({
			folderPath: "C:\\DentalImages\\Incoming",
			allowedExtensions: [".dcm", ".dicom", ".ima", ".tif", ".tiff", ".jpg", ".png"],
			autoAttachToPatient: true,
		});
	});

	afterEach(async () => {
		await VisiographPacsWatcherService.stopWatching();
		VisiographPacsWatcherService.clearRecentScans();
		if (originalWindow) {
			globalThis.window = originalWindow;
		} else {
			// @ts-expect-error cleanup
			delete globalThis.window;
		}
	});

	it("should correctly parse tooth codes from various visiograph file naming schemes", () => {
		const meta1 = VisiographPacsWatcherService.parseScanMetadata("IVANOV_16_20260823.dcm");
		assert.equal(meta1.toothCode, "16");
		assert.equal(meta1.modality, "IO");

		const meta2 = VisiographPacsWatcherService.parseScanMetadata("tooth_46_postop.tif");
		assert.equal(meta2.toothCode, "46");
		assert.equal(meta2.modality, "DX");

		const meta3 = VisiographPacsWatcherService.parseScanMetadata("PETROV_optg_panoramic.dcm");
		assert.equal(meta3.modality, "PX");

		const meta4 = VisiographPacsWatcherService.parseScanMetadata("SMITH_cbct_3d_scan.dcm");
		assert.equal(meta4.modality, "CT");

		const metaPrimaryTooth = VisiographPacsWatcherService.parseScanMetadata("child_patient_55_endo.dcm");
		assert.equal(metaPrimaryTooth.toothCode, "55");
	});

	it("should automatically bind incoming scans to currently active patient in clinic chart", () => {
		VisiographPacsWatcherService.bindToActivePatient("patient-uuid-12345", "visit-uuid-99887");

		const event = VisiographPacsWatcherService.dispatchScanEvent({
			filePath: "C:\\DentalImages\\Incoming\\sensor_capture_16.dcm",
			fileName: "sensor_capture_16.dcm",
			fileSize: 1024 * 768,
		});

		assert.equal(event.patientId, "patient-uuid-12345");
		assert.equal(event.toothCode, "16");
		assert.equal(event.modality, "IO");
		assert.equal(event.previewReady, true);
		assert.ok(event.thumbnailDataUri?.startsWith("data:image/png;base64,"));
	});

	it("should broadcast scan capture events to all registered UI subscribers", () => {
		const receivedEvents: RadiographyScanEvent[] = [];
		const unsubscribe = VisiographPacsWatcherService.onNewScanDetected((event) => {
			receivedEvents.push(event);
		});

		VisiographPacsWatcherService.dispatchScanEvent({
			filePath: "C:\\DentalImages\\Incoming\\test_21.dcm",
			fileName: "test_21.dcm",
			patientName: "Смирнов В. А.",
		});

		assert.equal(receivedEvents.length, 1);
		assert.equal(receivedEvents[0]?.fileName, "test_21.dcm");
		assert.equal(receivedEvents[0]?.toothCode, "21");
		assert.equal(receivedEvents[0]?.patientName, "Смирнов В. А.");

		unsubscribe();

		VisiographPacsWatcherService.dispatchScanEvent({
			filePath: "C:\\DentalImages\\Incoming\\test_22.dcm",
			fileName: "test_22.dcm",
		});

		assert.equal(receivedEvents.length, 1); // Not incremented after unsubscribe
	});

	it("should start and stop watch folder in Electron desktop environment", async () => {
		let watchCalled = false;
		let unwatchCalled = false;

		const mockNativeApi: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [],
			listTwainDevices: async () => [],
			acquireTwainImage: async () => ({ success: true }),
			printFiscalReceiptTcp: async () => ({ success: true }),
			watchLocalDicomFolder: async (folderPath, callbackId) => {
				watchCalled = true;
				assert.equal(folderPath, "C:\\DentalImages\\Incoming");
				assert.ok(callbackId);
				return { success: true };
			},
			unwatchLocalDicomFolder: async (folderPath) => {
				unwatchCalled = true;
				assert.equal(folderPath, "C:\\DentalImages\\Incoming");
				return { success: true };
			},
		};

		// @ts-expect-error mock window
		globalThis.window = { denteDesktopNative: mockNativeApi };

		const startRes = await VisiographPacsWatcherService.startWatching();
		assert.equal(startRes.success, true);
		assert.equal(watchCalled, true);
		assert.equal(VisiographPacsWatcherService.isCurrentlyWatching(), true);

		const stopRes = await VisiographPacsWatcherService.stopWatching();
		assert.equal(stopRes.success, true);
		assert.equal(unwatchCalled, true);
		assert.equal(VisiographPacsWatcherService.isCurrentlyWatching(), false);
	});

	it("should parse DICOM Part 10 preamble and detect 'DICM' magic signature", () => {
		// Valid DICOM buffer: 128 bytes preamble + "DICM"
		const validDicomBuffer = new Uint8Array(132);
		validDicomBuffer[128] = "D".charCodeAt(0);
		validDicomBuffer[129] = "I".charCodeAt(0);
		validDicomBuffer[130] = "C".charCodeAt(0);
		validDicomBuffer[131] = "M".charCodeAt(0);

		const parsedValid = VisiographPacsWatcherService.parseDicomHeaderPreamble(validDicomBuffer);
		assert.equal(parsedValid.isStandardDicom, true);
		assert.equal(parsedValid.hasMagicPrefix, true);
		assert.equal(parsedValid.detectedPreambleLength, 132);

		// Non-DICOM buffer
		const invalidBuffer = new Uint8Array(132);
		const parsedInvalid = VisiographPacsWatcherService.parseDicomHeaderPreamble(invalidBuffer);
		assert.equal(parsedInvalid.isStandardDicom, false);
		assert.equal(parsedInvalid.hasMagicPrefix, false);

		// Short buffer
		const shortBuffer = new Uint8Array(64);
		const parsedShort = VisiographPacsWatcherService.parseDicomHeaderPreamble(shortBuffer);
		assert.equal(parsedShort.isStandardDicom, false);
	});

	it("should return correct diagnostic window presets for dental radiography", () => {
		const boneWindow = VisiographPacsWatcherService.getDiagnosticWindowPresets("bone");
		assert.equal(boneWindow.windowCenter, 300);
		assert.equal(boneWindow.windowWidth, 1500);

		const endoWindow = VisiographPacsWatcherService.getDiagnosticWindowPresets("endodontics");
		assert.equal(endoWindow.windowCenter, 500);
		assert.equal(endoWindow.windowWidth, 2000);

		const softTissueWindow = VisiographPacsWatcherService.getDiagnosticWindowPresets("soft_tissue");
		assert.equal(softTissueWindow.windowCenter, 40);
		assert.equal(softTissueWindow.windowWidth, 400);
	});
});

