import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
	DENTAL_HARDWARE_PRESETS,
	DENTAL_PHOTO_PROTOCOL_12,
	KNOWN_CT_VIEWER_CANDIDATES,
	VENDOR_CLI_TEMPLATES,
	checkKktStatusTcpSocket,
	detectCtModality,
	detectHardwareVendorFromPath,
	detectInstalledCtViewers,
	detectInstalledDentalHardware,
	extractPatientHint,
	formatCommandLineBridge,
	generateVddsMediaContent,
	getAnatomicalDentalPreviewDataUri,
	getLocalServerStatus,
	getSystemPrinters,
	getTwainDevices,
	getVendorCliTemplate,
	getWindowState,
	getWindowsSerialPorts,
	launchCliBridge,
	launchExternalCtViewer,
	launchSlidaExport,
	launchVddsExport,
	matchPhotoProtocolSlot,
	openCbctPopoutWindow,
	parseDicomFilenameMetadata,
	parseHotFolderFilenameMetadata,
	parseSlidaResponse,
	parseVddsMediaResponse,
	printAtol10FiscalReceipt,
	printEscPosReceipt,
	printFiscalReceiptTcpSocket,
	printShtrihMFiscalReceipt,
	scanDownloadsForCt,
	setupAutoHardwareWatchers,
	setupDicomFolderWatch,
	switchLocalDatabaseMode,
	toggleFullScreen,
	unwatchDicomFolder,
} from "../main.cjs";

function createOneShotTcpServer(onData) {
	return new Promise((resolve) => {
		const server = net.createServer((socket) => {
			socket.once("data", (buf) => {
				const resp = onData(buf);
				if (resp) socket.end(resp);
			});
		});
		server.listen(0, "127.0.0.1", () => {
			const addr = server.address();
			resolve({ server, port: typeof addr === "object" && addr ? addr.port : 0 });
		});
	});
}

test("Desktop Standalone Windows Runtime Harness", async (t) => {
	await t.test("Enumerates Windows COM serial ports safely without phantom hardware", async () => {
		const ports = await getWindowsSerialPorts();
		assert.ok(Array.isArray(ports));
		for (const port of ports) {
			assert.ok(typeof port.path === "string" && port.path.startsWith("COM"));
		}
	});

	await t.test("Lists real TWAIN/WIA/HotFolder devices without 16 phantom sensors", async () => {
		const devices = await getTwainDevices({ skipWia: true, includeInstalledPresets: false });
		assert.ok(Array.isArray(devices));
		assert.equal(devices.some((d) => d.id === "twain-vatech-ezsensor" && d.connected === false), false);
		for (const dev of devices) {
			assert.ok(typeof dev.id === "string" && dev.id.length > 0);
			assert.ok(["twain_ds", "wia", "hot_folder", "installed_software"].includes(dev.source));
		}
	});

	await t.test("Queries honest PG18 local server status and rejects legacy sqlite_standalone", async () => {
		const closedProbe = net.createServer();
		await new Promise((r) => closedProbe.listen(0, "127.0.0.1", r));
		const closedPort = closedProbe.address().port;
		await new Promise((r) => closedProbe.close(r));

		const offlineStatus = await getLocalServerStatus({
			pgPort: closedPort,
			apiBaseUrl: `http://127.0.0.1:${closedPort}`,
		});
		assert.equal(offlineStatus.isRunning, false);
		assert.equal(offlineStatus.pgReady, false);
		assert.notEqual(offlineStatus.engine, "sqlite_standalone");
		assert.equal(offlineStatus.engine, "embedded-postgres");
		assert.equal(offlineStatus.syncMode, "offline_buffer");

		const rejected = await switchLocalDatabaseMode("sqlite_standalone");
		assert.equal(rejected.success, false);
		assert.notEqual(rejected.activeMode, "sqlite_standalone");

		const switched = await switchLocalDatabaseMode("postgres_native");
		assert.equal(switched.success, true);
		assert.equal(switched.activeMode, "postgres_native");
		await switchLocalDatabaseMode("embedded-postgres");
	});

	await t.test("Direct ATOL Driver 10 and Shtrikh-M fiscal print execution", async () => {
		const { server: atolServer, port: atolPort } = await createOneShotTcpServer(() =>
			Buffer.from(
				JSON.stringify({
					results: [
						{
							errorCode: 0,
							fiscalParams: {
								fiscalDocumentNumber: 401,
								fiscalDocumentSign: "3456789012",
								fnNumber: "9960440302145896",
								registrationNumber: "0010670000012345",
							},
						},
					],
				}),
				"utf8",
			),
		);

		const { server: shtrihServer, port: shtrihPort } = await createOneShotTcpServer(() => {
			const frame = Buffer.alloc(15, 0);
			frame[0] = 0x02;
			frame[1] = 13;
			frame[2] = 0x85;
			frame[3] = 0x00;
			frame[4] = 30;
			frame.writeUInt32LE(502, 5);
			frame.writeUInt32LE(192837465, 9);
			frame[14] = 0x55;
			return frame;
		});

		try {
			const atolRes = await printAtol10FiscalReceipt({
				host: "127.0.0.1",
				port: atolPort,
				payloadJson: JSON.stringify({ cashierName: "Иванова А. С.", totalRub: 3500 }),
			});
			assert.equal(atolRes.success, true);
			assert.equal(atolRes.fiscalSign, "3456789012");

			const shtrihRes = await printShtrihMFiscalReceipt({
				host: "127.0.0.1",
				port: shtrihPort,
				payloadJson: JSON.stringify({ cashierName: "Иванова А. С.", totalRub: 3500 }),
			});
			assert.equal(shtrihRes.success, true);
			assert.equal(shtrihRes.fiscalDocNum, "502");
		} finally {
			atolServer.close();
			shtrihServer.close();
		}
	});

	await t.test("Enumerates system printers cleanly without fabricated hardware", async () => {
		const printers = await getSystemPrinters();
		assert.ok(Array.isArray(printers));
		for (const p of printers) {
			assert.equal(typeof p.name, "string");
			assert.equal(typeof p.isThermal, "boolean");
		}
	});

	await t.test("Direct silent ESC/POS thermal receipt printing over real LAN TCP socket", async () => {
		let receivedBytes = Buffer.alloc(0);
		let onServerReceived;
		const receivedPromise = new Promise((resolve) => {
			onServerReceived = resolve;
		});
		const escPosServer = net.createServer((socket) => {
			const chunks = [];
			socket.on("data", (c) => chunks.push(c));
			socket.on("end", () => {
				receivedBytes = Buffer.concat(chunks);
				onServerReceived();
			});
		});
		await new Promise((r) => escPosServer.listen(0, "127.0.0.1", r));
		const escPosPort = escPosServer.address().port;

		try {
			const result = await printEscPosReceipt({
				host: "127.0.0.1",
				port: escPosPort,
				text: "СТОМАТОЛОГИЯ ДЕНТЕ\nЧек №1402\nИтого: 4500.00 руб.\n",
				silent: true,
				widthMm: 80,
				cutPaper: true,
			});

			await receivedPromise;
			assert.equal(result.success, true);
			assert.equal(result.silent, true);
			assert.ok(result.bytesSent > 0);
			assert.ok(receivedBytes.includes(Buffer.from("ДЕНТЕ", "utf8")));
		} finally {
			escPosServer.close();
		}
	});

	await t.test("Direct TCP socket fiscal receipt printing and honest KKT status check", async () => {
		const { server: kktServer, port: kktPort } = await createOneShotTcpServer((buf) => {
			const text = buf.toString("utf8");
			if (text.includes("getDeviceStatus")) {
				return Buffer.from(
					JSON.stringify({
						results: [
							{
								errorCode: 0,
								deviceInfo: { paperPresent: true, coverClosed: true, modelName: "АТОЛ 27Ф" },
								fnInfo: { fnPresent: true, fiscalized: true, fnNumber: "9960440302145896" },
							},
						],
					}),
					"utf8",
				);
			}
			return Buffer.from(
				JSON.stringify({
					results: [
						{
							errorCode: 0,
							fiscalParams: {
								fiscalDocumentNumber: 615,
								fiscalDocumentSign: "1122334455",
								fnNumber: "9960440302145896",
								kktSerialNumber: "0010670000012345",
							},
						},
					],
				}),
				"utf8",
			);
		});

		try {
			const status = await checkKktStatusTcpSocket({ host: "127.0.0.1", port: kktPort, protocol: "atol" });
			assert.equal(status.online, true);
			assert.equal(status.paperOk, true);
			assert.equal(status.coverClosed, true);
			assert.equal(status.fnPresent, true);

			const result = await printFiscalReceiptTcpSocket({
				host: "127.0.0.1",
				port: kktPort,
				protocol: "atol",
				payloadJson: JSON.stringify({
					cashierName: "Иванова А. С.",
					items: [{ name: "Лечение кариеса (А16.07.002)", priceRub: 4500, quantity: 1 }],
					totalRub: 4500,
					paymentType: "card",
				}),
			});

			assert.equal(result.success, true);
			assert.equal(result.fiscalSign, "1122334455");
			assert.equal(result.fiscalDocNum, "615");
		} finally {
			kktServer.close();
		}
	});

	await t.test("Local DICOM folder watcher detects directory and unwatch", async () => {
		const tempWatchDir = path.join(os.tmpdir(), `dente-dicom-watch-test-${Date.now()}`);
		fs.mkdirSync(tempWatchDir, { recursive: true });
		try {
			const watchResult = setupDicomFolderWatch(tempWatchDir, "test-callback-1");
			assert.equal(watchResult.success, true);
			const unwatchResult = unwatchDicomFolder(tempWatchDir);
			assert.equal(unwatchResult.success, true);
		} finally {
			fs.rmSync(tempWatchDir, { recursive: true, force: true });
		}
	});

	await t.test("Parses FDI tooth codes & patient identifiers from radiology filenames", () => {
		const vatech = parseDicomFilenameMetadata("VATECH_EzSensor_tooth_16_20260823.dcm");
		assert.equal(vatech.toothCode, "16");
		const planmeca = parseDicomFilenameMetadata("PLANMECA_46_EXP01.dcm");
		assert.equal(planmeca.toothCode, "46");
		const carestream = parseDicomFilenameMetadata("CARESTREAM_RVG_p-1042_tooth-37.ima");
		assert.equal(carestream.toothCode, "37");
		assert.equal(carestream.patientId, "1042");
		const pediatric = parseDicomFilenameMetadata("PEDIATRIC_patient-990_tooth_54.jpg");
		assert.equal(pediatric.toothCode, "54");
		assert.equal(pediatric.patientId, "990");
		const plain = parseDicomFilenameMetadata("scan_without_tooth_marker.dcm");
		assert.equal(plain.toothCode, undefined);
	});

	await t.test("Window state query and fullscreen toggle in headless harness", async () => {
		const state = await getWindowState();
		assert.equal(typeof state.isFullScreen, "boolean");
		assert.equal(typeof state.isKiosk, "boolean");
		const toggled = await toggleFullScreen(true);
		assert.equal(toggled.isFullScreen, true);
	});

	await t.test("Multi-vendor dental hardware presets and vendor detection across 5 families", () => {
		assert.equal(DENTAL_HARDWARE_PRESETS.length, 37);
		const families = new Set(DENTAL_HARDWARE_PRESETS.map((p) => p.family));
		for (const f of ["rvg", "cbct_opg", "scanner_3d", "document_scanner", "photo_protocol"]) {
			assert.ok(families.has(f));
		}
		assert.equal(detectHardwareVendorFromPath("C:\\EzDent-i\\Capture\\scan01.dcm"), "vatech");
		assert.equal(detectHardwareVendorFromPath("C:\\Sidexis\\pdata\\img.dcm"), "sirona");
		assert.equal(detectHardwareVendorFromPath("C:\\Planmeca\\Romexis\\46.dcm"), "planmeca");
		assert.equal(detectHardwareVendorFromPath("C:\\SomeGenericFolder\\file.dcm"), "generic");
		assert.ok(Array.isArray(detectInstalledDentalHardware()));
		assert.ok(Array.isArray(setupAutoHardwareWatchers(null)));
	});

	await t.test("Generates and parses SLIDA, VDDS-Media, and CLI bridge payloads", async () => {
		const tempDir = path.join(os.tmpdir(), `dente-exchange-test-${Date.now()}`);
		try {
			const slidaRes = launchSlidaExport({
				vendor: "sirona",
				targetDir: tempDir,
				patient: { patientId: "PID-777", lastName: "Соколов", firstName: "Дмитрий", birthDate: "19870315", gender: "M", toothCode: "36" },
			});
			assert.equal(slidaRes.success, true);
			assert.ok(fs.readFileSync(slidaRes.filePath, "utf8").includes("Id=PID-777"));

			const parsedIni = parseSlidaResponse("[Patient]\nId=P-888\nTooth=25\nModality=IO\nStatus=OK\nFile=C:\\Sidexis\\P888.dcm");
			assert.equal(parsedIni.success, true);
			assert.equal(parsedIni.patientId, "P-888");

			const vddsRes = launchVddsExport({
				targetDir: tempDir,
				patient: { patientId: "PID-500", lastName: "Морозов", firstName: "Артем", birthDate: "19920412", gender: "M", toothCode: "46" },
			});
			assert.equal(vddsRes.success, true);
			assert.ok(vddsRes.content.includes("ID=PID-500"));
			assert.equal(parseVddsMediaResponse("[VDDS]\nStatus=SUCCESS\nID=PID-500\nZAHN=46").patientId, "PID-500");

			const cliRes = await launchCliBridge({
				vendor: "eighteeth",
				patient: { patientId: "P-303", lastName: "Сидоров", firstName: "Олег" },
				exePath: "C:\\NanoPix\\NanoPix.exe",
			});
			assert.equal(cliRes.success, true);
			assert.ok(cliRes.commandLine.includes("P-303"));
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	await t.test("Hot folder metadata parser, 12-slot photo protocol and anatomical SVG preview", () => {
		const dcmMeta = parseHotFolderFilenameMetadata("VATECH_patient-102_tooth-16.dcm");
		assert.equal(dcmMeta.fileCategory, "dicom");
		assert.equal(dcmMeta.toothCode, "16");
		assert.equal(dcmMeta.vendor, "vatech");

		assert.equal(DENTAL_PHOTO_PROTOCOL_12.length, 12);
		assert.equal(matchPhotoProtocolSlot("IMG_0001_portrait_rest.jpg")?.id, "extraoral_portrait_rest");

		const preview = getAnatomicalDentalPreviewDataUri("16");
		assert.ok(preview.startsWith("data:image/svg+xml;utf8,"));
		assert.ok(preview.includes("FDI%20%2316"));
	});

	await t.test("CT viewer detection, download scan and popout window launch", async () => {
		assert.ok(KNOWN_CT_VIEWER_CANDIDATES.length >= 4);
		const installed = await detectInstalledCtViewers();
		assert.ok(installed.some((v) => v.id === "dente-cbct-studio"));

		const internalRes = await launchExternalCtViewer({ viewerId: "dente-cbct-studio", studyPath: "study-ct-99" });
		assert.equal(internalRes.success, true);
		assert.ok(internalRes.url.includes("studyId=study-ct-99"));

		const missingExeRes = await launchExternalCtViewer({ exePath: "C:\\NonExistentPath\\Viewer.exe" });
		assert.equal(missingExeRes.success, false);

		assert.equal(extractPatientHint("Барабаш_И_В_CBCT_2026.zip"), "Барабаш И В");
		assert.equal(detectCtModality("CBCT_Maxilla.zip", false), "CBCT");

		const tempDir = path.join(os.tmpdir(), `dente-ct-scan-test-${Date.now()}`);
		fs.mkdirSync(tempDir, { recursive: true });
		try {
			fs.writeFileSync(path.join(tempDir, "Барабаш_И_В_CBCT_Scan.zip"), Buffer.alloc(1024));
			const scanResults = await scanDownloadsForCt({ hotFolderPath: tempDir, maxDays: 7, maxDepth: 2 });
			assert.equal(scanResults.length, 1);
			assert.equal(scanResults[0].detectedModality, "CBCT");
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}

		const popout = await openCbctPopoutWindow({ studyId: "study-vol-101", patientId: "pat-888" });
		assert.equal(popout.success, true);
		assert.ok(popout.url.includes("studyId=study-vol-101"));
		assert.ok(VENDOR_CLI_TEMPLATES.sirona.includes("{patientId}"));
		assert.equal(getVendorCliTemplate("unknown_vendor"), VENDOR_CLI_TEMPLATES.generic);
	});
});
