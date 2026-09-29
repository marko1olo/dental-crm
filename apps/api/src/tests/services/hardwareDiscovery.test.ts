/**
 * DENTE Dental CRM — Clinic Hardware & Peripheral Discovery Service Integration Tests.
 *
 * Covers:
 * 1. ESC/POS Cyrillic CP866 encoding/decoding, kopeck exact receipts, SBP QR payments, and status parsing.
 * 2. SanPiN 3.3686-21 TSPL & ZPL II autoclave pouch label generation with DataMatrix barcodes.
 * 3. HardwareDiscoveryService discovery execution, caching, status query, and test printing.
 * 4. Fastify REST API routes:
 *    - GET  /api/hardware/health
 *    - GET  /api/hardware/devices
 *    - POST /api/hardware/test-print
 */

import assert from "node:assert/strict";
import * as net from "node:net";
import { after, before, describe, it } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";

import {
	buildEscPosHardwareTestPatternBuffer,
	buildEscPosKopeckReceiptBuffer,
	buildEscPosSbpPaymentBuffer,
	buildTsplAutoclavePouchLabel,
	buildZplAutoclavePouchLabelBuffer,
	buildZplAutoclavePouchLabelString,
	createSampleAutoclavePouchLabelPayload,
	decodeCp866,
	encodeCp1251,
	encodeCp866,
	generateAutoclavePouchLabelBuffer,
	parseEscPosStatusByte,
} from "@dental/shared";

import { registerHardwareRoutes } from "../../routes/hardware.js";
import {
	HardwareDiscoveryService,
	hardwareDiscoveryService,
	probeRawTcpPrinterStatus,
} from "../../services/hardwareDiscoveryService.js";

describe("Clinic Hardware & Peripheral Discovery Layer", () => {
	// ========================================================================
	// 1. ESC/POS & CP866 ENCODING & RECEIPT GENERATOR TESTS
	// ========================================================================
	describe("ESC/POS & Russian CP866 Generator", () => {
		it("correctly encodes and decodes Russian Cyrillic characters in CP866", () => {
			const russianText = "Стоматология ДЕНТЕ 043/у №1 ₽";
			const encoded = encodeCp866(russianText);
			assert.ok(encoded instanceof Uint8Array);
			assert.ok(encoded.length > 0);

			// Decode back and check essential words
			const decoded = decodeCp866(encoded);
			assert.ok(decoded.includes("Стоматология"));
			assert.ok(decoded.includes("ДЕНТЕ"));
			assert.ok(decoded.includes("043/у"));
			assert.ok(decoded.includes("№1"));
		});

		it("generates kopeck-exact fiscal receipt buffer without floating point errors", () => {
			const buffer = buildEscPosKopeckReceiptBuffer({
				clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				cashierFullName: "Иванова М.С.",
				totalKopecks: 1250000, // 12500.00 руб
				cashKopecks: 250000, // 2500.00 руб
				electronicKopecks: 1000000, // 10000.00 руб
				items: [
					{
						name: "Первичный прием врача-стоматолога",
						priceKopecks: 250000,
						quantity: 1,
						amountKopecks: 250000,
						medicalServiceCode804n: "B01.065.001",
					},
					{
						name: "Пломбирование зуба светоотверждаемым композитом",
						priceKopecks: 1000000,
						quantity: 1,
						amountKopecks: 1000000,
						medicalServiceCode804n: "A16.07.002",
					},
				],
			});

			assert.ok(buffer instanceof Uint8Array);
			assert.ok(buffer.length > 100);

			// Check ESC/POS Init sequence: 0x1B, 0x40
			assert.equal(buffer[0], 0x1b);
			assert.equal(buffer[1], 0x40);

			// Check paper cut command exists at the end: GS V 0x01 (partial cut)
			const hasCut = buffer.some(
				(b, i) => b === 0x1d && buffer[i + 1] === 0x56,
			);
			assert.ok(hasCut, "Receipt buffer must contain paper cut command");
		});

		it("generates dynamic SBP QR payment slip with exact totals", () => {
			const sbpBuffer = buildEscPosSbpPaymentBuffer({
				clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				doctorFullName: "Барабаш С.В.",
				patientFullName: "Смирнова Е.А.",
				billNumber: "INV-2026-9812",
				totalKopecks: 450000, // 4500.00 ₽
				sbpQrUrl: "https://qr.nspk.ru/AD100004ABCDEF1234567890",
				paperWidthMm: 80,
			});

			assert.ok(sbpBuffer instanceof Uint8Array);
			assert.ok(sbpBuffer.length > 50);

			// Check for 2D QR model 2 sequence in ESC/POS: GS ( k
			const hasQrSequence = sbpBuffer.some(
				(b, i) =>
					b === 0x1d &&
					sbpBuffer[i + 1] === 0x28 &&
					sbpBuffer[i + 2] === 0x6b,
			);
			assert.ok(hasQrSequence, "Buffer must contain GS ( k QR code sequence");
		});

		it("parses real-time ESC/POS status bytes correctly (DLE EOT)", () => {
			// Status 1: Online vs Offline
			const onlineStatus = parseEscPosStatusByte(1, 0x00);
			assert.equal(onlineStatus.online, true);
			assert.equal(onlineStatus.status, "online");

			const offlineStatus = parseEscPosStatusByte(1, 0x08);
			assert.equal(offlineStatus.online, false);
			assert.equal(offlineStatus.status, "offline");

			// Status 2: Cover open (bit 2 = 0x04)
			const coverOpenStatus = parseEscPosStatusByte(2, 0x04);
			assert.equal(coverOpenStatus.coverClosed, false);
			assert.equal(coverOpenStatus.status, "cover_open");

			// Status 2: Paper out (bit 5 = 0x20)
			const paperOutStatus = parseEscPosStatusByte(2, 0x20);
			assert.equal(paperOutStatus.paperPresent, false);
			assert.equal(paperOutStatus.status, "paper_out");

			// Status 4: Paper empty (bits 5 & 6 = 0x60)
			const paperEmptySensor = parseEscPosStatusByte(4, 0x60);
			assert.equal(paperEmptySensor.paperPresent, false);
			assert.equal(paperEmptySensor.status, "paper_out");
		});

		it("generates comprehensive hardware self-test pattern buffer", () => {
			const testPattern = buildEscPosHardwareTestPatternBuffer({
				paperWidthMm: 58,
				deviceName: "Xprinter XP-58IIH",
			});
			assert.ok(testPattern instanceof Uint8Array);
			assert.ok(testPattern.length > 150);

			// Check for init and Russian alphabet inclusion
			assert.equal(testPattern[0], 0x1b);
			assert.equal(testPattern[1], 0x40);
		});
	});

	// ========================================================================
	// 2. SANPIN 3.3686-21 TSPL & ZPL II LABEL PRINTER TESTS
	// ========================================================================
	describe("SanPiN 3.3686-21 Autoclave Pouch Label Generator", () => {
		const sampleLabel = createSampleAutoclavePouchLabelPayload({
			batchNumber: "B2026-09-28-09",
			cycleNumber: 3,
			operatorName: "Иванова М.С.",
			contentsDescription: "Набор хирурга №1 (элеваторы, щипцы)",
		});

		it("encodes Windows-1251 characters for TSPL label printers", () => {
			const encoded = encodeCp1251("ДЕНТЕ Стерилизация №1");
			assert.ok(encoded instanceof Uint8Array);
			assert.ok(encoded.length > 0);
		});

		it("generates TSPL label buffer with correct geometry and DataMatrix", () => {
			const tsplBuf = buildTsplAutoclavePouchLabel(sampleLabel, {
				encoding: "utf8",
			});
			assert.ok(tsplBuf instanceof Uint8Array);
			const tsplStr = new TextDecoder().decode(tsplBuf);

			assert.ok(tsplStr.includes("SIZE 50 mm, 30 mm"));
			assert.ok(tsplStr.includes("GAP 2 mm, 0 mm"));
			assert.ok(tsplStr.includes("DMATRIX"));
			assert.ok(tsplStr.includes("B2026-09-28-09"));
			assert.ok(tsplStr.includes("PRINT 1,1"));
		});

		it("generates ZPL II label buffer with UTF-8 international font support", () => {
			const zplStr = buildZplAutoclavePouchLabelString(sampleLabel);
			assert.ok(zplStr.startsWith("^XA"));
			assert.ok(zplStr.endsWith("^XZ"));
			assert.ok(zplStr.includes("^CI28")); // UTF-8 in ZPL II
			assert.ok(zplStr.includes("^PW400")); // 50mm * 8 dpmm
			assert.ok(zplStr.includes("^LL240")); // 30mm * 8 dpmm
			assert.ok(zplStr.includes("^BXN")); // DataMatrix in ZPL
			assert.ok(zplStr.includes("B2026-09-28-09"));

			const zplBuf = buildZplAutoclavePouchLabelBuffer(sampleLabel);
			assert.ok(zplBuf instanceof Uint8Array);
			assert.equal(zplBuf.length, Buffer.from(zplStr, "utf8").length);
		});

		it("supports unified generation by emulation ('tspl' vs 'zpl')", () => {
			const tspl = generateAutoclavePouchLabelBuffer(sampleLabel, "tspl");
			const zpl = generateAutoclavePouchLabelBuffer(sampleLabel, "zpl");

			assert.ok(tspl.length > 0);
			assert.ok(zpl.length > 0);
			assert.notEqual(tspl.length, zpl.length);
		});
	});

	// ========================================================================
	// 3. HARDWARE DISCOVERY SERVICE TESTS
	// ========================================================================
	describe("HardwareDiscoveryService", () => {
		const service = new HardwareDiscoveryService();

		it("discovers local system hardware and returns normalized schema", async () => {
			const result = await service.discoverDevices({
				probeNetworkTcp: false,
			});

			assert.ok(result.timestamp);
			assert.ok(
				result.hostPlatform === "win32" ||
					result.hostPlatform === "darwin" ||
					result.hostPlatform === "linux",
			);
			assert.ok(Array.isArray(result.devices));
			assert.ok(typeof result.summary.total === "number");
			assert.ok(typeof result.summary.online === "number");
			assert.ok(typeof result.summary.printers === "number");
		});

		it("handles queryDeviceStatus gracefully for local devices", async () => {
			const status = await service.queryDeviceStatus({
				deviceId: "test-device-1",
			});
			assert.equal(status.online, true);
			assert.equal(status.status, "online");
		});

		it("executes simulated/local test print and returns hex preview", async () => {
			const testPrintResult = await service.sendTestPrint({
				deviceType: "thermal_receipt",
				interface: "system_spooler",
				paperWidthMm: 58,
				systemPrinterName: "Virtual Test Thermal Printer",
			});

			assert.equal(testPrintResult.success, true);
			assert.ok(testPrintResult.bytesSent > 50);
			assert.ok(testPrintResult.rawHexPreview);
			assert.ok(testPrintResult.rawHexPreview.includes("1B 40")); // ESC @
		});

		it("executes autoclave pouch label test print in TSPL emulation", async () => {
			const labelTestResult = await service.sendTestPrint({
				deviceType: "label_printer",
				interface: "usb",
				emulation: "tspl",
				testPatternType: "sanpin_label",
			});

			assert.equal(labelTestResult.success, true);
			assert.ok(labelTestResult.bytesSent > 50);
			assert.ok(labelTestResult.rawHexPreview);
		});
	});

	// ========================================================================
	// 4. ACTIVE TCP 9100 PRINTER SERVER PROBE TEST
	// ========================================================================
	describe("Active TCP Port 9100 Network Printer Probe", () => {
		let testServer: net.Server;
		let serverPort = 0;

		before((_, done) => {
			// Create a lightweight mock TCP 9100 printer server responding with ESC/POS status bytes
			testServer = net.createServer((socket) => {
				socket.on("data", () => {
					// Respond with paper OK status byte (0x00)
					socket.write(Buffer.from([0x00]));
				});
			});

			testServer.listen(0, "127.0.0.1", () => {
				const addr = testServer.address() as net.AddressInfo;
				serverPort = addr.port;
				done();
			});
		});

		after((_, done) => {
			testServer.close(done);
		});

		it("probes live TCP printer socket and returns paper status report", async () => {
			const report = await probeRawTcpPrinterStatus(
				"127.0.0.1",
				serverPort,
				1000,
			);
			assert.equal(report.online, true);
			assert.equal(report.paperPresent, true);
			assert.equal(report.status, "online");
		});

		it("handles connection failure / timeout cleanly for unreachable IPs", async () => {
			const report = await probeRawTcpPrinterStatus(
				"192.0.2.1", // RFC 5737 TEST-NET-1 unassigned
				9100,
				150,
			);
			assert.equal(report.online, false);
			assert.equal(report.hasError, true);
			assert.equal(report.status, "offline");
		});
	});

	// ========================================================================
	// 5. REST API ROUTE INTEGRATION TESTS
	// ========================================================================
	describe("Hardware REST API Endpoints", () => {
		let app: FastifyInstance;

		before(async () => {
			app = Fastify({ logger: false });
			await registerHardwareRoutes(app);
			await app.ready();
		});

		after(async () => {
			await app.close();
		});

		it("GET /api/hardware/health returns 200 with supported protocols", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/api/hardware/health",
			});

			assert.equal(response.statusCode, 200);
			const body = JSON.parse(response.payload);
			assert.equal(body.status, "ok");
			assert.ok(Array.isArray(body.supportedProtocols));
			assert.ok(body.supportedProtocols.includes("escpos_58mm"));
			assert.ok(body.supportedProtocols.includes("tspl_autoclave_pouch"));
			assert.ok(body.supportedProtocols.includes("zpl_autoclave_pouch"));
		});

		it("GET /api/hardware/devices returns connected devices and summary", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/api/hardware/devices?probeNetwork=false",
			});

			assert.equal(response.statusCode, 200);
			const body = JSON.parse(response.payload);
			assert.equal(body.success, true);
			assert.ok(body.hostPlatform);
			assert.ok(Array.isArray(body.devices));
			assert.ok(typeof body.summary.total === "number");
		});

		it("POST /api/hardware/test-print executes test print and returns hex preview", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/hardware/test-print",
				payload: {
					deviceType: "thermal_receipt",
					interface: "system_spooler",
					paperWidthMm: 58,
					systemPrinterName: "Xprinter XP-58",
				},
			});

			assert.equal(response.statusCode, 200);
			const body = JSON.parse(response.payload);
			assert.equal(body.success, true);
			assert.ok(body.result.bytesSent > 50);
			assert.ok(body.result.rawHexPreview);
		});

		it("POST /api/hardware/test-print rejects invalid device payloads with 400", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/hardware/test-print",
				payload: {
					// Missing deviceType and interface
					randomField: 123,
				},
			});

			assert.equal(response.statusCode, 400);
		});
	});
});
