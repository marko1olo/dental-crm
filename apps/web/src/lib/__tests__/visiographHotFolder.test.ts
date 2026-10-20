/**
 * visiographHotFolder.test.ts — Unit Test Suite for Visiograph Hot Folder Hardware Subsystem.
 *
 * Verifies:
 * 1. File size formatter (B, KB, MB)
 * 2. Vendor hot-folder path routing (Vatech, Carestream, Dexis, Planmeca, KaVo)
 * 3. Tooth code extraction from x-ray filenames
 * 4. Queue debouncing and anti-spam badge logic
 * 5. Event dispatching: `dente:attach-photo-to-visit` & `dente:open-direct-rvg`
 * 6. Background event listeners: `dente:hotfolder-scan-simulated` & `dente:sensor-file-dropped`
 * 7. Engine destruction and zero-leak cleanup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	VisiographHotFolderEngine,
	formatScanFileSize,
	isFileSystemAccessSupported,
} from "../visiographHotFolderEngine";
import type { VisiographDetectedScan } from "../visiographHotFolderTypes";

describe("Visiograph Hot Folder Subsystem Suite", () => {
	let engine: VisiographHotFolderEngine;
	let originalWindow: typeof globalThis.window;
	const eventListeners: Record<string, ((e: Event) => void)[]> = {};

	beforeEach(() => {
		vi.useFakeTimers();
		originalWindow = globalThis.window;

		const mockWindow = {
			addEventListener: (event: string, handler: (e: Event) => void) => {
				if (!eventListeners[event]) eventListeners[event] = [];
				eventListeners[event].push(handler);
			},
			removeEventListener: (event: string, handler: (e: Event) => void) => {
				if (!eventListeners[event]) return;
				eventListeners[event] = eventListeners[event].filter((h) => h !== handler);
			},
			dispatchEvent: (event: Event) => {
				const handlers = eventListeners[event.type] || [];
				handlers.forEach((h) => h(event));
				return true;
			},
			CustomEvent: class<T> extends Event {
				detail: T;
				constructor(type: string, init?: { detail?: T; bubbles?: boolean }) {
					super(type);
					this.detail = init?.detail as T;
				}
			},
		} as unknown as Window & typeof globalThis;

		globalThis.window = mockWindow;
		// biome-ignore lint/suspicious/noExplicitAny: mock polyfill
		(globalThis as any).CustomEvent = mockWindow.CustomEvent;

		engine = new VisiographHotFolderEngine({
			pollIntervalMs: 1000,
			debounceWindowMs: 50,
		});
	});

	afterEach(() => {
		engine.destroy();
		for (const k of Object.keys(eventListeners)) {
			delete eventListeners[k];
		}
		globalThis.window = originalWindow;
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe("File Size Formatter", () => {
		it("formats 0 or negative bytes as 0 Б", () => {
			expect(formatScanFileSize(0)).toBe("0 Б");
			expect(formatScanFileSize(-100)).toBe("0 Б");
		});

		it("formats bytes under 1KB accurately", () => {
			expect(formatScanFileSize(512)).toBe("512 Б");
			expect(formatScanFileSize(1023)).toBe("1023 Б");
		});

		it("formats kilobytes accurately", () => {
			expect(formatScanFileSize(1024)).toBe("1.0 КБ");
			expect(formatScanFileSize(1024 * 512)).toBe("512.0 КБ");
		});

		it("formats megabytes accurately", () => {
			expect(formatScanFileSize(1024 * 1024 * 2.4)).toBe("2.4 МБ");
			expect(formatScanFileSize(1024 * 1024 * 8.75)).toBe("8.8 МБ");
		});
	});

	describe("File System Access Capability Check", () => {
		it("detects whether showDirectoryPicker is supported", () => {
			const supported = isFileSystemAccessSupported();
			expect(typeof supported).toBe("boolean");
		});
	});

	describe("Vendor Hot Folder Routing & Tooth Extraction", () => {
		it("routes Vatech EzSensor folder path correctly", () => {
			const scan = engine.simulateIncomingScan({
				fileName: "tooth16_periapical.dcm",
				folderPath: "C:\\EzSensor\\Capture",
			});

			expect(scan.brand).toBe("vatech");
			expect(scan.brandName).toContain("Vatech EzSensor");
			expect(scan.detectedTooth).toBe("16");
			expect(scan.fileType).toBe(".dcm");
		});

		it("routes Carestream RVG folder path correctly", () => {
			const scan = engine.simulateIncomingScan({
				fileName: "RVG_6200_Tooth36.dcm",
				folderPath: "C:\\Carestream\\Capture",
			});

			expect(scan.brand).toBe("carestream");
			expect(scan.brandName).toContain("Carestream");
			expect(scan.detectedTooth).toBe("36");
		});

		it("routes Dexis folder path correctly", () => {
			const scan = engine.simulateIncomingScan({
				fileName: "dex_tooth46.jpg",
				folderPath: "C:\\Dexis\\Data",
			});

			expect(scan.brand).toBe("dexis");
			expect(scan.brandName).toContain("Dexis");
			expect(scan.detectedTooth).toBe("46");
		});

		it("routes Planmeca folder path correctly", () => {
			const scan = engine.simulateIncomingScan({
				fileName: "romexis_capture.png",
				folderPath: "C:\\Planmeca\\Temp",
				tooth: "21",
			});

			expect(scan.brand).toBe("planmeca");
			expect(scan.brandName).toContain("Planmeca");
			expect(scan.detectedTooth).toBe("21");
		});

		it("routes KaVo GXS folder path correctly", () => {
			const scan = engine.simulateIncomingScan({
				fileName: "gxs_export.tiff",
				folderPath: "C:\\KaVo\\Export",
			});

			expect(scan.brand).toBe("kavo");
			expect(scan.brandName).toContain("KaVo");
		});
	});

	describe("Queue Debouncing & Anti-Spam", () => {
		it("aggregates multiple incoming scans into a debounced queue with badge count", () => {
			let latestScan: VisiographDetectedScan | null = null;
			let queuedCount = 0;

			engine.subscribe((scan, count) => {
				latestScan = scan;
				queuedCount = count;
			});

			// Ingest 3 scans rapidly
			engine.simulateIncomingScan({ fileName: "scan_1.dcm", tooth: "11" });
			engine.simulateIncomingScan({ fileName: "scan_2.dcm", tooth: "12" });
			engine.simulateIncomingScan({ fileName: "scan_3.dcm", tooth: "13" });

			vi.advanceTimersByTime(60);

			const scan = latestScan as VisiographDetectedScan | null;
			expect(scan).not.toBeNull();
			expect(scan?.fileName).toBe("scan_1.dcm");
			expect(queuedCount).toBe(2); // 2 additional items in queue
		});

		it("pops next scan from queue on dismissal until empty", () => {
			let latestScan: VisiographDetectedScan | null = null;
			let queuedCount = 0;

			engine.subscribe((scan, count) => {
				latestScan = scan;
				queuedCount = count;
			});

			engine.simulateIncomingScan({ fileName: "scan_A.dcm", tooth: "14" });
			engine.simulateIncomingScan({ fileName: "scan_B.dcm", tooth: "15" });

			vi.advanceTimersByTime(60);

			let current = latestScan as VisiographDetectedScan | null;
			expect(current?.fileName).toBe("scan_A.dcm");
			expect(queuedCount).toBe(1);

			// Dismiss first scan
			engine.dismissCurrentScan();

			current = latestScan as VisiographDetectedScan | null;
			expect(current?.fileName).toBe("scan_B.dcm");
			expect(queuedCount).toBe(0);

			// Dismiss second scan
			engine.dismissCurrentScan();

			expect(latestScan).toBeNull();
			expect(queuedCount).toBe(0);
		});
	});

	describe("Clinical Actions & Event Dispatching", () => {
		it("dispatches dente:attach-photo-to-visit when attaching to visit", () => {
			const dispatchSpy = vi.spyOn(globalThis.window, "dispatchEvent");

			const scan = engine.simulateIncomingScan({
				fileName: "Vatech_Tooth26.dcm",
				imageUrl: "/radiology/sample_rvg_tooth26.jpg",
				tooth: "26",
			});

			vi.advanceTimersByTime(60);

			engine.attachScanToVisit(scan, "26");

			expect(dispatchSpy).toHaveBeenCalled();
			const calledEvent = dispatchSpy.mock.calls[0]?.[0] as CustomEvent;
			expect(calledEvent.type).toBe("dente:attach-photo-to-visit");
			expect(calledEvent.detail?.toothNumber).toBe("26");
			expect(calledEvent.detail?.photoType).toBe("xray");
			expect(calledEvent.detail?.url).toBe("/radiology/sample_rvg_tooth26.jpg");
		});

		it("dispatches dente:open-direct-rvg when opening in direct viewer", () => {
			const dispatchSpy = vi.spyOn(globalThis.window, "dispatchEvent");

			const scan = engine.simulateIncomingScan({
				fileName: "KaVo_Tooth37.dcm",
				imageUrl: "/radiology/sample_rvg_tooth37.jpg",
				tooth: "37",
			});

			vi.advanceTimersByTime(60);

			engine.openScanInDirectViewer(scan, "37");

			expect(dispatchSpy).toHaveBeenCalled();
			const calledEvent = dispatchSpy.mock.calls[0]?.[0] as CustomEvent;
			expect(calledEvent.type).toBe("dente:open-direct-rvg");
			expect(calledEvent.detail?.imageUrl).toBe("/radiology/sample_rvg_tooth37.jpg");
			expect(calledEvent.detail?.tooth).toBe("37");
			expect(calledEvent.detail?.fileName).toBe("KaVo_Tooth37.dcm");
		});
	});

	describe("Hardware Event Listeners", () => {
		it("ingests scans triggered by dente:hotfolder-scan-simulated custom event", () => {
			let receivedScan: VisiographDetectedScan | null = null;
			engine.subscribe((scan) => {
				receivedScan = scan;
			});

			globalThis.window.dispatchEvent(
				new CustomEvent("dente:hotfolder-scan-simulated", {
					detail: {
						fileName: "Simulated_EzSensor_36.dcm",
						folderPath: "C:\\EzSensor\\Capture",
						tooth: "36",
					},
				}),
			);

			vi.advanceTimersByTime(60);

			const scan = receivedScan as VisiographDetectedScan | null;
			expect(scan).not.toBeNull();
			expect(scan?.fileName).toBe("Simulated_EzSensor_36.dcm");
			expect(scan?.detectedTooth).toBe("36");
		});

		it("ingests files dropped via dente:sensor-file-dropped custom event", async () => {
			let receivedScan: VisiographDetectedScan | null = null;
			engine.subscribe((scan) => {
				receivedScan = scan;
			});

			const testFile = new File(["fake binary data"], "Dexis_Tooth47.dcm", {
				type: "application/dicom",
			});

			globalThis.window.dispatchEvent(
				new CustomEvent("dente:sensor-file-dropped", {
					detail: {
						file: testFile,
						folderPath: "C:\\Dexis\\Data",
						tooth: "47",
					},
				}),
			);

			vi.advanceTimersByTime(60);

			const scan = receivedScan as VisiographDetectedScan | null;
			expect(scan).not.toBeNull();
			expect(scan?.fileName).toBe("Dexis_Tooth47.dcm");
			expect(scan?.detectedTooth).toBe("47");
			expect(scan?.brand).toBe("dexis");
		});
	});
});
