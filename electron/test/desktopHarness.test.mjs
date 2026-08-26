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
});
