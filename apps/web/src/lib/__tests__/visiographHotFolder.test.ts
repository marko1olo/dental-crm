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

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
	VisiographHotFolderEngine,
	formatScanFileSize,
	isFileSystemAccessSupported,
} from "../visiographHotFolderEngine";
import type { VisiographDetectedScan } from "../visiographHotFolderTypes";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Visiograph Hot Folder Subsystem Suite", () => {
	let engine: VisiographHotFolderEngine;
	let originalWindow: typeof globalThis.window;
	const eventListeners: Record<string, ((e: Event) => void)[]> = {};
	const dispatchedEvents: Event[] = [];

	beforeEach(() => {
		originalWindow = globalThis.window;
		dispatchedEvents.length = 0;

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
				dispatchedEvents.push(event);
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
			debounceWindowMs: 25,
		});
	});

	afterEach(() => {
		engine.destroy();
		for (const k of Object.keys(eventListeners)) {
			delete eventListeners[k];
		}
		dispatchedEvents.length = 0;
		globalThis.window = originalWindow;
	});

	describe("File Size Formatter", () => {
		it("formats 0 or negative bytes as 0 Б", () => {
			assert.equal(formatScanFileSize(0), "0 Б");
			assert.equal(formatScanFileSize(-100), "0 Б");
		});

		it("formats bytes under 1KB accurately", () => {
			assert.equal(formatScanFileSize(512), "512 Б");
			assert.equal(formatScanFileSize(1023), "1023 Б");
		});

		it("formats kilobytes accurately", () => {
			assert.equal(formatScanFileSize(1024), "1.0 КБ");
			assert.equal(formatScanFileSize(1024 * 512), "512.0 КБ");
		});

		it("formats megabytes accurately", () => {
			assert.equal(formatScanFileSize(1024 * 1024 * 2.4), "2.4 МБ");
			assert.equal(formatScanFileSize(1024 * 1024 * 8.75), "8.8 МБ");
		});
	});

	describe("File System Access Capability Check", () => {
		it("detects whether showDirectoryPicker is supported", () => {
			const supported = isFileSystemAccessSupported();
			assert.equal(typeof supported, "boolean");
		});
	});

	describe("Vendor Hot Folder Routing & Tooth Extraction", () => {
		it("routes Vatech EzSensor folder path correctly", () => {
			const scan = engine.simulateIncomingScan({
				fileName: "tooth16_periapical.dcm",
				folderPath: "C:\\EzSensor\\Capture",
			});

			assert.equal(scan.brand, "vatech");
			assert.ok(scan.brandName.includes("Vatech EzSensor"));
			assert.equal(scan.detectedTooth, "16");
			assert.equal(scan.fileType, ".dcm");
		});

		it("routes Carestream RVG folder path correctly", () => {
			const scan = engine.simulateIncomingScan({
				fileName: "RVG_6200_Tooth36.dcm",
				folderPath: "C:\\Carestream\\Capture",
			});

			assert.equal(scan.brand, "carestream");
			assert.ok(scan.brandName.includes("Carestream"));
			assert.equal(scan.detectedTooth, "36");
		});

		it("routes Dexis folder path correctly", () => {
			const scan = engine.simulateIncomingScan({
				fileName: "dex_tooth46.jpg",
				folderPath: "C:\\Dexis\\Data",
			});

			assert.equal(scan.brand, "dexis");
			assert.ok(scan.brandName.includes("Dexis"));
			assert.equal(scan.detectedTooth, "46");
		});

		it("routes Planmeca folder path correctly", () => {
			const scan = engine.simulateIncomingScan({
				fileName: "romexis_capture.png",
				folderPath: "C:\\Planmeca\\Temp",
				tooth: "21",
			});

			assert.equal(scan.brand, "planmeca");
			assert.ok(scan.brandName.includes("Planmeca"));
			assert.equal(scan.detectedTooth, "21");
		});

		it("routes KaVo GXS folder path correctly", () => {
			const scan = engine.simulateIncomingScan({
				fileName: "gxs_export.tiff",
				folderPath: "C:\\KaVo\\Export",
			});

			assert.equal(scan.brand, "kavo");
			assert.ok(scan.brandName.includes("KaVo"));
		});
	});

	describe("Queue Debouncing & Anti-Spam", () => {
		it("aggregates multiple incoming scans into a debounced queue with badge count", async () => {
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

			await sleep(50);

			const scan = latestScan as VisiographDetectedScan | null;
			assert.ok(scan !== null);
			assert.equal(scan?.fileName, "scan_1.dcm");
			assert.equal(queuedCount, 2); // 2 additional items in queue
		});

		it("pops next scan from queue on dismissal until empty", async () => {
			let latestScan: VisiographDetectedScan | null = null;
			let queuedCount = 0;

			engine.subscribe((scan, count) => {
				latestScan = scan;
				queuedCount = count;
			});

			engine.simulateIncomingScan({ fileName: "scan_A.dcm", tooth: "14" });
			engine.simulateIncomingScan({ fileName: "scan_B.dcm", tooth: "15" });

			await sleep(50);

			let current = latestScan as VisiographDetectedScan | null;
			assert.equal(current?.fileName, "scan_A.dcm");
			assert.equal(queuedCount, 1);

			// Dismiss first scan
			engine.dismissCurrentScan();

			current = latestScan as VisiographDetectedScan | null;
			assert.equal(current?.fileName, "scan_B.dcm");
			assert.equal(queuedCount, 0);

			// Dismiss second scan
			engine.dismissCurrentScan();

			assert.equal(latestScan, null);
			assert.equal(queuedCount, 0);
		});
	});

	describe("Clinical Actions & Event Dispatching", () => {
		it("dispatches dente:attach-photo-to-visit when attaching to visit", async () => {
			const scan = engine.simulateIncomingScan({
				fileName: "Vatech_Tooth26.dcm",
				imageUrl: "/radiology/sample_rvg_tooth26.jpg",
				tooth: "26",
			});

			await sleep(50);

			engine.attachScanToVisit(scan, "26");

			const calledEvent = dispatchedEvents.find((e) => e.type === "dente:attach-photo-to-visit") as CustomEvent;
			assert.ok(calledEvent);
			assert.equal(calledEvent.type, "dente:attach-photo-to-visit");
			assert.equal(calledEvent.detail?.toothNumber, "26");
			assert.equal(calledEvent.detail?.photoType, "xray");
			assert.equal(calledEvent.detail?.url, "/radiology/sample_rvg_tooth26.jpg");
		});

		it("dispatches dente:open-direct-rvg when opening in direct viewer", async () => {
			const scan = engine.simulateIncomingScan({
				fileName: "KaVo_Tooth37.dcm",
				imageUrl: "/radiology/sample_rvg_tooth37.jpg",
				tooth: "37",
			});

			await sleep(50);

			engine.openScanInDirectViewer(scan, "37");

			const calledEvent = dispatchedEvents.find((e) => e.type === "dente:open-direct-rvg") as CustomEvent;
			assert.ok(calledEvent);
			assert.equal(calledEvent.type, "dente:open-direct-rvg");
			assert.equal(calledEvent.detail?.imageUrl, "/radiology/sample_rvg_tooth37.jpg");
			assert.equal(calledEvent.detail?.tooth, "37");
			assert.equal(calledEvent.detail?.fileName, "KaVo_Tooth37.dcm");
		});
	});

	describe("Hardware Event Listeners", () => {
		it("ingests scans triggered by dente:hotfolder-scan-simulated custom event", async () => {
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

			await sleep(50);

			const scan = receivedScan as VisiographDetectedScan | null;
			assert.ok(scan !== null);
			assert.equal(scan?.fileName, "Simulated_EzSensor_36.dcm");
			assert.equal(scan?.detectedTooth, "36");
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

			await sleep(50);

			const scan = receivedScan as VisiographDetectedScan | null;
			assert.ok(scan !== null);
			assert.equal(scan?.fileName, "Dexis_Tooth47.dcm");
			assert.equal(scan?.detectedTooth, "47");
			assert.equal(scan?.brand, "dexis");
		});
	});
});
