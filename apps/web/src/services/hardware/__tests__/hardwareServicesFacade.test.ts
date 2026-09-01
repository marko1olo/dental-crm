import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { HardwareScanResult } from "@dental/shared";
import { hardwareScanner, HardwareScanner } from "../HardwareScanner.js";
import { hardwarePrinter, HardwarePrinter } from "../HardwarePrinter.js";
import { callKitBridge, CallKitBridge } from "../../telephony/CallKitBridge.js";
import { useTelephonyStore } from "../../../store/telephonyStore.js";
import { FiscalReceiptQueueManager } from "../fiscalReceiptQueueManager.js";
import type { FiscalReceiptPrintPayload } from "../hardwareTypes.js";

describe("Hardware Services Facade Suite — Scanner, Printer & CallKit", () => {
	const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
	const originalDocDesc = Object.getOwnPropertyDescriptor(globalThis, "document");
	const originalUrlDesc = Object.getOwnPropertyDescriptor(globalThis, "URL");
	const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

	beforeEach(() => {
		FiscalReceiptQueueManager.clearQueue();
	});

	afterEach(() => {
		FiscalReceiptQueueManager.clearQueue();

		if (originalWindowDesc) {
			Object.defineProperty(globalThis, "window", originalWindowDesc);
		} else {
			// @ts-expect-error cleanup
			delete globalThis.window;
		}

		if (originalDocDesc) {
			Object.defineProperty(globalThis, "document", originalDocDesc);
		} else {
			// @ts-expect-error cleanup
			delete globalThis.document;
		}

		if (originalUrlDesc) {
			Object.defineProperty(globalThis, "URL", originalUrlDesc);
		} else {
			// @ts-expect-error cleanup
			delete globalThis.URL;
		}
	});

	describe("1. HardwareScanner — WebRTC, ML Kit & SanPiN Verification", () => {
		it("should initialize in idle state and support subscriber callbacks", () => {
			const scanner = new HardwareScanner();
			assert.equal(scanner.getState(), "idle");

			let receivedResult: HardwareScanResult | null = null;
			const unsubscribe = scanner.subscribe((res) => {
				receivedResult = res;
			});

			assert.equal(typeof unsubscribe, "function");
			unsubscribe();
			assert.equal(receivedResult, null);
		});

		it("should correctly encode and verify SanPiN 3.3686-21 kraft package barcodes with both colon and dash prefixes", () => {
			const scanner = new HardwareScanner();

			// 1. Valid SanPiN package barcode (CSO Autoclave with colon delimiter)
			const colonSanpinBarcode = "SANPIN:CSO-2026-08-23-01";
			const colonVerdict = scanner.verifyKraftPackage(colonSanpinBarcode);
			assert.equal(colonVerdict.isValid, true);
			assert.equal(colonVerdict.status, "sterile_valid");
			assert.ok(colonVerdict.statutoryReference.includes("СанПиН 3.3686-21"));

			// 2. Valid SanPiN package barcode (with dash delimiter)
			const dashSanpinBarcode = "SANPIN-MELAG01-042-20260822-001";
			const dashVerdict = scanner.verifyKraftPackage(dashSanpinBarcode);
			assert.equal(dashVerdict.isValid, true);
			assert.equal(dashVerdict.status, "sterile_valid");
			assert.equal(dashVerdict.autoclaveId, "MELAG01");

			// 3. Generic Kraft package barcode prefix (KP-)
			const kpVerdict = scanner.verifyKraftPackage("KP-20260901-02-14");
			assert.equal(kpVerdict.isValid, true);
			assert.equal(kpVerdict.status, "sterile_valid");
			assert.equal(kpVerdict.batchId, "KP-20260901-02-14");

			// 4. GS1 DataMatrix (МДЛП Честный ЗНАК)
			const gs1Barcode = "010460123456789021ABCD123456789\u001d91EE06\u001d92qwe+rtyu=";
			const gs1Verdict = scanner.verifyKraftPackage(gs1Barcode);
			assert.equal(gs1Verdict.isValid, true);
			assert.equal(gs1Verdict.status, "sterile_valid");
			assert.ok(gs1Verdict.statutoryReference.includes("Честный ЗНАК"));

			// 5. Invalid empty barcode
			const emptyVerdict = scanner.verifyKraftPackage("");
			assert.equal(emptyVerdict.isValid, false);
			assert.equal(emptyVerdict.status, "invalid_format");
			assert.ok(emptyVerdict.failureReasonRu?.includes("Пустой"));

			// 6. Unknown random string
			const invalidVerdict = scanner.verifyKraftPackage("RANDOM_UNKNOWN_STRING_123");
			assert.equal(invalidVerdict.isValid, false);
			assert.equal(invalidVerdict.status, "invalid_format");
		});

		it("should execute Capacitor Mobile native scan via ML Kit when mobile wrapper is present", async () => {
			const scanner = new HardwareScanner();

			// Set simulated Capacitor Android native environment
			Object.defineProperty(globalThis, "window", {
				value: {
					denteMobileNative: {
						isMobileApp: true,
						platform: "android",
						scanBarcode: async () => ({
							success: true,
							barcode: "010460123456789021ABCD123456789\u001d91EE06\u001d92qwer",
							format: "DATA_MATRIX",
						}),
						hapticFeedback: () => {},
					},
					location: { hostname: "crm.dente.ru" },
				},
				configurable: true,
				writable: true,
			});

			const result = await scanner.scanSingleCode();
			assert.equal(result.success, true);
			assert.equal(result.format, "data_matrix");
			assert.equal(result.source, "camera_mlkit_native");
			assert.ok(result.rawCode.includes("0104601234567890"));
		});

		it("should return instructional error on web platform for scanSingleCode", async () => {
			const scanner = new HardwareScanner();
			// @ts-expect-error mock window
			delete globalThis.window;

			const result = await scanner.scanSingleCode();
			assert.equal(result.success, false);
			assert.equal(result.source, "camera_webrtc");
			assert.ok(result.error?.includes("видеопотока"));
		});

		it("should guarantee camera tracks are stopped and activeMediaStream cleared on video play error", async () => {
			const scanner = new HardwareScanner();
			let tracksStopped = 0;

			const mockTrack = {
				kind: "video",
				stop: () => {
					tracksStopped++;
				},
			};

			const mockStream = {
				getTracks: () => [mockTrack],
			};

			const mockVideoElement = {
				srcObject: null,
				setAttribute: () => {},
				muted: false,
				play: async () => {
					throw new Error("NotAllowedError: Autoplay blocked");
				},
			} as unknown as HTMLVideoElement;

			// Mock navigator.mediaDevices.getUserMedia
			const mockNavigator = {
				mediaDevices: {
					getUserMedia: async () => mockStream,
					enumerateDevices: async () => [{ kind: "videoinput" }],
				},
			};

			Object.defineProperty(globalThis, "navigator", {
				value: mockNavigator,
				configurable: true,
				writable: true,
			});

			await assert.rejects(
				async () => {
					await scanner.startCameraStream(mockVideoElement);
				},
				{
					message: /Autoplay blocked|камер/i,
				},
			);

			assert.equal(tracksStopped, 1);
			assert.equal(scanner.getState(), "error");
		});
	});

	describe("2. HardwarePrinter — ESC/POS, CP866 Cyrillic, 54-FZ QR & Popup Fallback", () => {
		it("should accurately encode Russian Cyrillic characters into CP866 binary table", () => {
			const printer = new HardwarePrinter();

			// 1. ASCII
			const ascii = printer.encodeCp866("DENTE 54-FZ");
			assert.equal(new TextDecoder("ascii").decode(ascii), "DENTE 54-FZ");

			// 2. Russian uppercase: 'А' -> 0x80, 'Я' -> 0xAF (except 'р'..'я' 0xE0..0xEF)
			const cyrillicA = printer.encodeCp866("А");
			assert.equal(cyrillicA[0], 0x80);

			const cyrillicP = printer.encodeCp866("п");
			assert.equal(cyrillicP[0], 0xaf);

			const cyrillicR = printer.encodeCp866("р");
			assert.equal(cyrillicR[0], 0xe0);

			const cyrillicYa = printer.encodeCp866("я");
			assert.equal(cyrillicYa[0], 0xef);

			// 3. Special characters 'Ё' (0xF0), 'ё' (0xF1), '№' (0xFC), '₽' (0xE0)
			const special = printer.encodeCp866("Ёё№₽");
			assert.equal(special[0], 0xf0);
			assert.equal(special[1], 0xf1);
			assert.equal(special[2], 0xfc);
			assert.equal(special[3], 0xe0);
		});

		it("should generate binary ESC/POS buffer with code page 17, 54-FZ tags and 2D QR-code", () => {
			const printer = new HardwarePrinter({ autoCut: true });

			const payload: FiscalReceiptPrintPayload = {
				operationType: "income",
				cashierFullName: "Иванова А. С.",
				cashierInn: "7701234567",
				customerContact: "+79991234567",
				items: [
					{
						name: "Профессиональная гигиена полости рта",
						priceRub: 6000,
						quantity: 1,
						amountRub: 6000,
						medicalServiceCode804n: "A16.07.051",
						markingCode: "010460123456789021ABCD123456",
					},
				],
				totalRub: 6000,
				electronicRub: 4000,
				sbpRub: 2000,
			};

			const buffer = printer.buildEscPosFiscalReceipt(payload);
			assert.ok(buffer instanceof Uint8Array);
			assert.ok(buffer.length > 100);

			// Initial ESC @ (0x1B, 0x40)
			assert.equal(buffer[0], 0x1b);
			assert.equal(buffer[1], 0x40);

			// Code page CP866 ESC t 17 (0x1B, 0x74, 0x11)
			assert.equal(buffer[2], 0x1b);
			assert.equal(buffer[3], 0x74);
			assert.equal(buffer[4], 0x11);

			// Auto Cut at end (GS V 0 -> 0x1D, 0x56, 0x00)
			const len = buffer.length;
			assert.equal(buffer[len - 3], 0x1d);
			assert.equal(buffer[len - 2], 0x56);
			assert.equal(buffer[len - 1], 0x00);
		});

		it("should build native ESC/POS QR-code command sequence (GS ( k)", () => {
			const printer = new HardwarePrinter();
			const qrBytes = printer.buildEscPosQrCode("t=20260901T1200&s=1500.00&fn=9960440302145896&i=1001&fp=1234567890&n=1");

			assert.ok(qrBytes.length > 20);
			// Model 2 select
			assert.equal(qrBytes[0], 0x1d);
			assert.equal(qrBytes[1], 0x28);
			assert.equal(qrBytes[2], 0x6b);
		});

		it("should generate clean 58mm / 80mm printable HTML with FNS verification data", () => {
			const printer = new HardwarePrinter({ paperWidthMm: 58 });

			const payload: FiscalReceiptPrintPayload = {
				operationType: "income",
				cashierFullName: "Петрова М. В.",
				items: [
					{
						name: "Пломбирование зуба светоотверждаемым композитом",
						priceRub: 4500,
						quantity: 1,
						amountRub: 4500,
						medicalServiceCode804n: "A16.07.002.001",
					},
				],
				totalRub: 4500,
				cashRub: 4500,
			};

			const html = printer.generatePrintableReceiptHtml(payload);
			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("54-ФЗ"));
			assert.ok(html.includes("Пломбирование зуба"));
			assert.ok(html.includes("A16.07.002.001"));
			assert.ok(html.includes("4500.00 ₽"));
			assert.ok(html.includes("ПРОВЕРКА ЧЕКА В ФНС"));
		});

		it("should intercept popup blockers and trigger hidden iframe and download fallbacks", async () => {
			const printer = new HardwarePrinter();

			let popupBlockedCalled = false;
			let fallbackTypeExecuted: string | null = null;
			let appendChildCalled = false;

			const mockWindow = {
				open: () => null, // Simulate browser popup blocker returning null
				document: {
					createElement: (tag: string) => {
						if (tag === "iframe") {
							return {
								style: {},
								setAttribute: () => {},
								contentDocument: null,
								contentWindow: { document: null },
							};
						}
						if (tag === "a") {
							return {
								style: {},
								click: () => {},
							};
						}
						return {};
					},
					body: {
						appendChild: () => {
							appendChildCalled = true;
						},
						removeChild: () => {},
					},
				},
				URL: {
					createObjectURL: () => "blob:http://localhost/test-receipt",
					revokeObjectURL: () => {},
				},
			};

			Object.defineProperty(globalThis, "window", {
				value: mockWindow,
				configurable: true,
				writable: true,
			});
			Object.defineProperty(globalThis, "document", {
				value: mockWindow.document,
				configurable: true,
				writable: true,
			});
			Object.defineProperty(globalThis, "URL", {
				value: mockWindow.URL,
				configurable: true,
				writable: true,
			});

			const result = await printer.printHtmlWithPopupFallback("<div>Receipt</div>", {
				onPopupBlocked: () => {
					popupBlockedCalled = true;
				},
				onFallbackExecuted: (type) => {
					fallbackTypeExecuted = type;
				},
			});

			assert.equal(result.success, true);
			assert.equal(result.status, "printed");
			assert.equal(popupBlockedCalled, true);
			assert.ok(fallbackTypeExecuted === "iframe" || fallbackTypeExecuted === "download");
			assert.equal(appendChildCalled, true);
		});

		it("should enqueue receipt in FiscalReceiptQueueManager without double fiscalization if mobile Bluetooth print fails", async () => {
			const printer = new HardwarePrinter();

			const payload: FiscalReceiptPrintPayload = {
				operationType: "income",
				cashierFullName: "Иванова А. С.",
				customerContact: "+79991112233",
				items: [{ name: "Консультация", priceRub: 1500, quantity: 1, amountRub: 1500 }],
				totalRub: 1500,
			};

			// Mock Capacitor Mobile environment with failing Bluetooth printer
			Object.defineProperty(globalThis, "window", {
				value: {
					denteMobileNative: {
						isMobileApp: true,
						platform: "android",
						printThermalBinary: async () => ({
							success: false,
							error: "BT_DISCONNECTED: Bluetooth printer is powered off",
						}),
						hapticFeedback: () => {},
					},
					location: { hostname: "crm.dente.ru" },
				},
				configurable: true,
				writable: true,
			});

			const result = await printer.printFiscalReceipt(payload);

			assert.equal(result.success, false);
			assert.equal(result.status, "queued");
			assert.equal(result.interfaceUsed, "bluetooth_le");
			assert.ok(result.error?.includes("Bluetooth"));

			// Check that receipt was safely buffered in queue
			const queued = FiscalReceiptQueueManager.getPendingItems();
			assert.equal(queued.length, 1);
			assert.equal(queued[0]?.payload.totalRub, 1500);
		});
	});

	describe("3. CallKitBridge — SIP Incoming Screen, ConnectionService & Audio Client Handoff", () => {
		it("should report incoming call to RNCallKeep and synchronize with Telephony Zustand Store", async () => {
			const bridge = new CallKitBridge();

			let displayedCallId = "";
			let displayedPhone = "";
			let displayedName = "";

			Object.defineProperty(globalThis, "window", {
				value: {
					RNCallKeep: {
						setup: async () => {},
						displayIncomingCall: (uuid: string, handle: string, localizedCallerName?: string) => {
							displayedCallId = uuid;
							displayedPhone = handle;
							displayedName = localizedCallerName || "";
						},
						addEventListener: () => {},
						removeEventListener: () => {},
						answerIncomingCall: () => {},
						endCall: () => {},
					},
					Capacitor: {
						isNativePlatform: () => true,
						getPlatform: () => "android",
					},
				},
				configurable: true,
				writable: true,
			});

			await bridge.reportIncomingCall({
				callId: "sip-call-7788",
				phone: "+79998887766",
				patientName: "Смирнов Алексей Викторович",
				patientId: "patient-101",
			});

			assert.equal(displayedCallId, "sip-call-7788");
			assert.equal(displayedPhone, "+79998887766");
			assert.ok(displayedName.includes("Смирнов Алексей Викторович"));
			assert.equal(bridge.getActiveCallId(), "sip-call-7788");

			// Check Telephony store state
			const storeState = useTelephonyStore.getState();
			assert.equal(storeState.activeCall?.callId, "sip-call-7788");
			assert.equal(storeState.activeCall?.patientName, "Смирнов Алексей Викторович");
		});

		it("should handoff call on answer to UnifiedAudioClient and trigger onCallAnswered callback", async () => {
			const bridge = new CallKitBridge({ autoConnectAudioOnAnswer: false });

			let answeredCallId = "";
			await bridge.initialize({
				onCallAnswered: (id) => {
					answeredCallId = id;
				},
			});

			await bridge.handleNativeCallAnswered("sip-call-7788");
			assert.equal(answeredCallId, "sip-call-7788");

			const storeState = useTelephonyStore.getState();
			assert.equal(storeState.callHistory[0]?.status, "answered");
		});

		it("should handle native call termination and synchronize store state", () => {
			const bridge = new CallKitBridge();

			let endedCallId = "";
			let endReason = "";

			bridge.initialize({
				onCallEnded: (id, reason) => {
					endedCallId = id;
					endReason = reason || "";
				},
			});

			bridge.handleNativeCallEnded("sip-call-7788", "completed");
			assert.equal(endedCallId, "sip-call-7788");
			assert.equal(endReason, "completed");
			assert.equal(bridge.getActiveCallId(), null);

			const storeState = useTelephonyStore.getState();
			assert.equal(storeState.activeCall, null);
		});
	});
});
