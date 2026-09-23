import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import {
	getWindowsSerialPorts,
	getTwainDevices,
	getSystemPrinters,
	printThermalLabel,
	printEscPosReceipt,
	printFiscalReceiptTcpSocket,
	setupDicomFolderWatch,
	unwatchDicomFolder,
	parseDicomFilenameMetadata,
	getLocalServerStatus,
	switchLocalDatabaseMode,
	printAtol10FiscalReceipt,
	printShtrihMFiscalReceipt,
	printDocumentSilent,
	getWindowState,
	toggleFullScreen,
	DENTAL_HARDWARE_PRESETS,
	detectHardwareVendorFromPath,
	detectInstalledDentalHardware,
	setupAutoHardwareWatchers,
	launchSlidaExport,
	getAnatomicalDentalPreviewDataUri,
} from "../main.cjs";

test("Desktop Standalone Windows Runtime Harness", async (t) => {
	await t.test("Enumerates Windows COM serial ports with hardware identifiers", async () => {
		const ports = await getWindowsSerialPorts();
		assert.ok(Array.isArray(ports));
		assert.ok(ports.length >= 4);

		const first = ports[0];
		assert.ok(first.path.startsWith("COM"));
		assert.ok(first.manufacturer);
		assert.ok(first.vendorId);
	});

	await t.test("Lists installed TWAIN dental sensors & intraoral cameras", async () => {
		const devices = await getTwainDevices();
		assert.ok(Array.isArray(devices));
		assert.ok(devices.length >= 3);

		const vatech = devices.find((d) => d.id.includes("vatech"));
		assert.ok(vatech);
		assert.equal(vatech.type, "sensor");
		assert.equal(vatech.connected, true);
	});

	await t.test("Queries local offline SQLite/Postgres server engine health", async () => {
		const serverStatus = await getLocalServerStatus();
		assert.equal(serverStatus.isRunning, true);
		assert.equal(serverStatus.engine, "postgres_native");
		assert.equal(serverStatus.canAcceptWrites, true);
		assert.equal(serverStatus.port, 5432);

		const switchRes = await switchLocalDatabaseMode("sqlite_standalone");
		assert.equal(switchRes.success, true);
		assert.equal(switchRes.activeMode, "sqlite_standalone");
	});

	await t.test("Direct ATOL Driver 10 and Shtrikh-M fiscal print execution", async () => {
		const atolRes = await printAtol10FiscalReceipt({
			host: "127.0.0.1",
			port: 16732,
			payloadJson: JSON.stringify({
				cashierName: "Иванова А. С.",
				totalRub: 3500,
			}),
		});
		assert.equal(atolRes.success, true);
		assert.ok(atolRes.fiscalSign);

		const shtrihRes = await printShtrihMFiscalReceipt({
			host: "127.0.0.1",
			port: 5555,
			payloadJson: JSON.stringify({
				cashierName: "Иванова А. С.",
				totalRub: 3500,
			}),
		});
		assert.equal(shtrihRes.success, true);
		assert.ok(shtrihRes.fiscalDocNum);
	});

	await t.test("Enumerates system printers and detects thermal label printers", async () => {
		const printers = await getSystemPrinters();
		assert.ok(Array.isArray(printers));
		assert.ok(printers.length >= 2);

		const thermalPrinter = printers.find((p) => p.isThermal);
		assert.ok(thermalPrinter, "Must detect at least one thermal label printer");
		assert.ok(thermalPrinter.name.length > 0);
	});

	await t.test("Direct silent thermal label printing without browser print dialog", async () => {
		const result = await printThermalLabel({
			printerName: "Xprinter XP-365B (Thermal)",
			silent: true,
			widthMm: 58,
			heightMm: 40,
			copies: 1,
			html: `<!DOCTYPE html>
<html>
<head>
  <style>@page{size:58mm 40mm;margin:0;}body{font-family:sans-serif;font-size:10px;padding:2mm;}</style>
</head>
<body>
  <div style="font-weight:bold;">СТЕРИЛИЗАЦИЯ ЦСО</div>
  <div>Пакет: #CSO-2026-08-23-01</div>
  <div>Срок до: 23.09.2026</div>
  <div>Код: [2D-DATAMATRIX]</div>
</body>
</html>`,
		});

		assert.equal(result.success, true);
		assert.equal(result.silent, true);
		assert.equal(result.widthMm, 58);
		assert.equal(result.heightMm, 40);
		assert.ok(result.printedAt);
	});

	await t.test("Direct silent ESC/POS thermal receipt printing over LAN socket", async () => {
		const result = await printEscPosReceipt({
			host: "127.0.0.1",
			port: 9100,
			text: "СТОМАТОЛОГИЯ ДЕНТЕ\nЧек №1402\nИтого: 4500.00 руб.\n",
			silent: true,
			widthMm: 80,
			cutPaper: true,
		});

		assert.equal(result.success, true);
		assert.equal(result.silent, true);
		assert.ok(result.bytesSent);
		assert.ok(result.printedAt);
	});

	await t.test("Direct TCP socket fiscal receipt printing on localhost simulator", async () => {
		const result = await printFiscalReceiptTcpSocket({
			host: "127.0.0.1",
			port: 5555,
			protocol: "atol",
			payloadJson: JSON.stringify({
				cashierName: "Иванова А. С.",
				items: [
					{ name: "Лечение кариеса (А16.07.002)", priceRub: 4500, quantity: 1 },
				],
				totalRub: 4500,
				paymentType: "card",
			}),
		});

		assert.equal(result.success, true);
		assert.ok(result.fiscalSign);
		assert.ok(result.fiscalDocNum);
		assert.ok(result.kktSerialNumber);
	});

	await t.test("Local DICOM folder watcher detects directory and unwatch", async () => {
		const tempWatchDir = path.join(os.tmpdir(), `dente-dicom-watch-test-${Date.now()}`);
		fs.mkdirSync(tempWatchDir, { recursive: true });

		const watchResult = setupDicomFolderWatch(tempWatchDir, "test-callback-1");
		assert.equal(watchResult.success, true);

		const unwatchResult = unwatchDicomFolder(tempWatchDir);
		assert.equal(unwatchResult.success, true);

		try {
			fs.rmSync(tempWatchDir, { recursive: true, force: true });
		} catch {}
	});

	await t.test("Parses FDI tooth codes & patient identifiers from radiology filenames (Vatech, Planmeca, Carestream)", () => {
		// Vatech EzSensor: tooth 16
		const vatech = parseDicomFilenameMetadata("VATECH_EzSensor_tooth_16_20260823.dcm");
		assert.equal(vatech.toothCode, "16");

		// Planmeca ProSensor: tooth 46
		const planmeca = parseDicomFilenameMetadata("PLANMECA_46_EXP01.dcm");
		assert.equal(planmeca.toothCode, "46");

		// Carestream RVG 6200: tooth 37 with patient ID
		const carestream = parseDicomFilenameMetadata("CARESTREAM_RVG_p-1042_tooth-37.ima");
		assert.equal(carestream.toothCode, "37");
		assert.equal(carestream.patientId, "1042");

		// Pediatric primary tooth: tooth 54 (Upper Right Primary First Molar)
		const pediatric = parseDicomFilenameMetadata("PEDIATRIC_patient-990_tooth_54.jpg");
		assert.equal(pediatric.toothCode, "54");
		assert.equal(pediatric.patientId, "990");

		// Empty/unmatched filename
		const plain = parseDicomFilenameMetadata("scan_without_tooth_marker.dcm");
		assert.equal(plain.toothCode, undefined);
	});

	await t.test("Direct silent medical document printing (Form 043/u, Act, Consents) with pageSize and landscape", async () => {
		const resultA4 = await printDocumentSilent({
			htmlContent: "<html><body><h1>МЕДИЦИНСКАЯ КАРТА 043/у</h1><p>Пациент: Иванов И. И.</p></body></html>",
			silent: true,
			title: "Форма 043/у - Иванов",
			pageSize: "A4",
			copies: 1,
		});
		assert.equal(resultA4.success, true);
		assert.equal(resultA4.silent, true);
		assert.equal(resultA4.pageSize, "A4");
		assert.equal(resultA4.landscape, false);

		const resultA5Landscape = await printDocumentSilent({
			htmlContent: "<html><body><h2>СПРАВКА ДЛЯ НАЛОГОВОЙ (КНД 1151156)</h2></body></html>",
			silent: true,
			pageSize: "A5",
			landscape: true,
			margins: { marginType: "custom", top: 10, bottom: 10, left: 15, right: 15 },
		});
		assert.equal(resultA5Landscape.success, true);
		assert.equal(resultA5Landscape.pageSize, "A5");
		assert.equal(resultA5Landscape.landscape, true);
	});

	await t.test("Window state query and fullscreen toggle in headless/test harness", async () => {
		const state = await getWindowState();
		assert.equal(typeof state.isFullScreen, "boolean");
		assert.equal(typeof state.isKiosk, "boolean");

		const toggled = await toggleFullScreen(true);
		assert.equal(toggled.isFullScreen, true);
	});

	await t.test("Multi-vendor dental hardware presets and vendor detection (Vatech, Sirona, Planmeca, CS, KaVo, Xpect)", async () => {
		assert.equal(DENTAL_HARDWARE_PRESETS.length, 6);

		// Vendor path detection
		assert.equal(detectHardwareVendorFromPath("C:\\EzDent-i\\Capture\\scan01.dcm"), "vatech");
		assert.equal(detectHardwareVendorFromPath("C:\\Sidexis\\pdata\\img.dcm"), "sirona");
		assert.equal(detectHardwareVendorFromPath("C:\\Planmeca\\Romexis\\46.dcm"), "planmeca");
		assert.equal(detectHardwareVendorFromPath("C:\\Trophy\\Data\\RVG6200.tif"), "carestream");
		assert.equal(detectHardwareVendorFromPath("C:\\VixWin\\001.jpg"), "kavo");
		assert.equal(detectHardwareVendorFromPath("C:\\XVSensor\\Images\\exp.dcm"), "xpect_vision");
		assert.equal(detectHardwareVendorFromPath("C:\\SomeGenericFolder\\file.dcm"), "generic");

		// Installed hardware detection
		const detected = detectInstalledDentalHardware();
		assert.ok(Array.isArray(detected));

		// Auto watchers
		const watchers = setupAutoHardwareWatchers(null);
		assert.ok(Array.isArray(watchers));
	});

	await t.test("Generates SLIDA INI and XML export files for external software (Sidexis, EzDent, Romexis)", async () => {
		const tempDir = path.join(os.tmpdir(), `dente-slida-test-${Date.now()}`);

		const slidaRes = launchSlidaExport({
			vendor: "sirona",
			targetDir: tempDir,
			patient: {
				patientId: "PID-777",
				lastName: "Соколов",
				firstName: "Дмитрий",
				birthDate: "19870315",
				gender: "M",
				toothCode: "36",
			},
		});

		assert.equal(slidaRes.success, true);
		assert.ok(fs.existsSync(slidaRes.filePath));
		const iniContent = fs.readFileSync(slidaRes.filePath, "utf8");
		assert.ok(iniContent.includes("[Patient]"));
		assert.ok(iniContent.includes("Id=PID-777"));
		assert.ok(iniContent.includes("LastName=Соколов"));
		assert.ok(iniContent.includes("Tooth=36"));

		// Vatech Link.ini
		const vatechRes = launchSlidaExport({
			vendor: "vatech",
			targetDir: tempDir,
			patient: {
				patientId: "PID-777",
				lastName: "Соколов",
				firstName: "Дмитрий",
				birthDate: "19870315",
				gender: "M",
			},
		});
		assert.equal(vatechRes.success, true);
		const vatechContent = fs.readFileSync(vatechRes.filePath, "utf8");
		assert.ok(vatechContent.includes("ChartNo=PID-777"));
		assert.ok(vatechContent.includes("Name=Соколов Дмитрий"));

		// Clean up
		try {
			fs.rmSync(tempDir, { recursive: true, force: true });
		} catch {}
	});

	await t.test("Generates rich anatomical dental preview data URI without 1x1 mock PNGs (Mandate 2)", () => {
		const preview = getAnatomicalDentalPreviewDataUri("16");
		assert.ok(preview.startsWith("data:image/svg+xml;utf8,"));
		assert.ok(!preview.includes("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="));
		assert.ok(preview.includes("FDI%20%2316"));
		assert.ok(preview.includes("RVG%20INTRAORAL"));
	});
});
