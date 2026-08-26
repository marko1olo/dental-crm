/**
 * @dental/web/services/hardware — Hardware Equipment & Clinic Network Emulators.
 *
 * Provides in-memory hardware emulators for testing and local development:
 * 1. AtolKkt10Emulator: Complete ATOL Driver KKT 10 (54-ФЗ / ФФД 1.2) simulator with stateful FN.
 * 2. ShtrihMKktEmulator: Shtrikh-M binary protocol & frame simulator.
 * 3. UsbComScannerEmulator: 2D Barcode / DataMatrix / GS1 hardware scanner simulator.
 * 4. TwainSensorEmulator: Dental intraoral sensor & visiograph simulator (Vatech, Planmeca, Carestream).
 * 5. LocalServerFailoverEmulator: Local offline SQLite/Postgres server synchronization simulator.
 */

import {
	buildAtol10ReceiptJson,
	buildAtolFiscalQrString,
	parseAtol10ErrorCode,
	type Atol10DeviceStatus,
	type Atol10FiscalReceiptRequest,
	type Atol10FiscalResponse,
} from "@dental/shared/hardware";
import {
	buildShtrikhCommandPacket,
	parseShtrikhResponsePacket,
	type ShtrikhMDeviceStatus,
	type ShtrikhMReceiptParams,
} from "@dental/shared/hardware";
import {
	classifyBarcodeScan,
	type DecodedScanResult,
} from "@dental/shared/hardware";

export class AtolKkt10Emulator {
	private fnSerialNumber = "9960440302145896";
	private kktSerialNumber = "0010670000012345";
	private modelName = "АТОЛ 27Ф (Эмулятор)";
	private firmwareVersion = "5.8.14";

	private isOnline = true;
	private isCoverOpened = false;
	private isPaperPresent = true;
	private isPaperNearEnd = false;
	private isFnPresent = true;
	private isFnFiscalized = true;
	private isShiftOpened = true;
	private isShiftExpired24h = false;

	private shiftNumber = 142;
	private receiptNumber = 1;
	private fiscalDocumentCounter = 54320;
	private shiftOpenedAt: Date = new Date(Date.now() - 2 * 3600 * 1000); // 2 hours ago

	private simulatedFailureCode: number | null = null;

	public setOnline(status: boolean): void {
		this.isOnline = status;
	}

	public setPaperPresent(status: boolean): void {
		this.isPaperPresent = status;
		if (!status) this.isPaperNearEnd = false;
	}

	public setCoverOpened(status: boolean): void {
		this.isCoverOpened = status;
	}

	public setShiftExpired(status: boolean): void {
		this.isShiftExpired24h = status;
	}

	public setSimulatedFailure(errorCode: number | null): void {
		this.simulatedFailureCode = errorCode;
	}

	public getStatus(): Atol10DeviceStatus {
		return {
			online: this.isOnline,
			isCoverOpened: this.isCoverOpened,
			isPaperPresent: this.isPaperPresent,
			isPaperNearEnd: this.isPaperNearEnd,
			isFnPresent: this.isFnPresent,
			isFnFiscalized: this.isFnFiscalized,
			isShiftOpened: this.isShiftOpened,
			isShiftExpired24h: this.isShiftExpired24h,
			shiftNumber: this.shiftNumber,
			receiptNumber: this.receiptNumber,
			modelName: this.modelName,
			firmwareVersion: this.firmwareVersion,
			fnSerialNumber: this.fnSerialNumber,
			kktSerialNumber: this.kktSerialNumber,
			error: !this.isOnline
				? "ККТ отключена"
				: !this.isPaperPresent
					? "Нет бумаги"
					: this.isCoverOpened
						? "Открыта крышка ККТ"
						: this.isShiftExpired24h
							? "Смена превысила 24 часа"
							: undefined,
		};
	}

	public openShift(operatorName = "Иванова А. С."): Atol10FiscalResponse {
		if (!this.isOnline) return { success: false, errorCode: 6, errorDescription: "ККТ недоступна" };
		if (!this.isPaperPresent) return { success: false, errorCode: 1, errorDescription: parseAtol10ErrorCode(1) };
		if (this.isCoverOpened) return { success: false, errorCode: 2, errorDescription: parseAtol10ErrorCode(2) };

		this.shiftNumber++;
		this.isShiftOpened = true;
		this.isShiftExpired24h = false;
		this.shiftOpenedAt = new Date();
		this.fiscalDocumentCounter++;

		return {
			success: true,
			shiftNumber: this.shiftNumber,
			fiscalDocumentNumber: this.fiscalDocumentCounter,
			fiscalDocumentDateTime: new Date().toISOString(),
			fnSerialNumber: this.fnSerialNumber,
			kktSerialNumber: this.kktSerialNumber,
		};
	}

	public closeShift(operatorName = "Иванова А. С."): Atol10FiscalResponse {
		if (!this.isOnline) return { success: false, errorCode: 6, errorDescription: "ККТ недоступна" };
		if (!this.isPaperPresent) return { success: false, errorCode: 1, errorDescription: parseAtol10ErrorCode(1) };

		this.isShiftOpened = false;
		this.isShiftExpired24h = false;
		this.fiscalDocumentCounter++;

		return {
			success: true,
			shiftNumber: this.shiftNumber,
			fiscalDocumentNumber: this.fiscalDocumentCounter,
			fiscalDocumentDateTime: new Date().toISOString(),
			fnSerialNumber: this.fnSerialNumber,
			kktSerialNumber: this.kktSerialNumber,
		};
	}

	public printFiscalReceipt(req: Atol10FiscalReceiptRequest): Atol10FiscalResponse {
		if (!this.isOnline) {
			return { success: false, errorCode: 6, errorDescription: "ККТ недоступна по сети" };
		}
		if (this.simulatedFailureCode !== null) {
			return {
				success: false,
				errorCode: this.simulatedFailureCode,
				errorDescription: parseAtol10ErrorCode(this.simulatedFailureCode),
			};
		}
		if (!this.isPaperPresent && !req.electronical) {
			return { success: false, errorCode: 1, errorDescription: parseAtol10ErrorCode(1) };
		}
		if (this.isCoverOpened) {
			return { success: false, errorCode: 2, errorDescription: parseAtol10ErrorCode(2) };
		}
		if (this.isShiftExpired24h) {
			return { success: false, errorCode: 3, errorDescription: parseAtol10ErrorCode(3) };
		}

		this.fiscalDocumentCounter++;
		this.receiptNumber++;

		const now = new Date();
		const fiscalSign = Math.floor(1000000000 + Math.random() * 9000000000).toString();
		const qrCode = buildAtolFiscalQrString({
			issuedAt: now,
			totalRub: req.total,
			fnSerial: this.fnSerialNumber,
			fiscalDocNum: this.fiscalDocumentCounter,
			fiscalSign,
			operationType: req.type === "sellReturn" ? "income_return" : "income",
		});

		return {
			success: true,
			fiscalSign,
			fiscalDocumentNumber: this.fiscalDocumentCounter,
			fiscalDocumentDateTime: now.toISOString(),
			shiftNumber: this.shiftNumber,
			receiptNumber: this.receiptNumber,
			fnSerialNumber: this.fnSerialNumber,
			kktSerialNumber: this.kktSerialNumber,
			fnsUrl: "www.nalog.gov.ru",
			qrCode,
		};
	}
}

export class ShtrihMKktEmulator {
	private fnSerialNumber = "9960440302145896";
	private kktSerialNumber = "0010670000005432";
	private modelName = "ШТРИХ-М-01Ф (Эмулятор)";
	private isOnline = true;
	private isPaperPresent = true;
	private isCoverClosed = true;
	private isShiftOpen = true;
	private docCounter = 10450;

	public setOnline(status: boolean): void {
		this.isOnline = status;
	}

	public setPaperPresent(status: boolean): void {
		this.isPaperPresent = status;
	}

	public getStatus(): ShtrikhMDeviceStatus {
		return {
			online: this.isOnline,
			operatorNumber: 1,
			flags: this.isPaperPresent ? 0 : 0x01,
			mode: this.isShiftOpen ? 2 : 3,
			subMode: 0,
			isPaperPresent: this.isPaperPresent,
			isCoverClosed: this.isCoverClosed,
			isFnPresent: true,
			isShiftOpen: this.isShiftOpen,
			isShiftExpired24h: false,
			modelName: this.modelName,
			firmwareVersion: "4.15.2",
			kktSerialNumber: this.kktSerialNumber,
			fnSerialNumber: this.fnSerialNumber,
			error: !this.isOnline ? "ШТРИХ-М недоступен" : !this.isPaperPresent ? "Нет бумаги" : undefined,
		};
	}

	public processRawPacket(packet: Uint8Array): Uint8Array {
		if (!this.isOnline) {
			return new Uint8Array(0);
		}

		const parsed = parseShtrikhResponsePacket(packet);
		if (!parsed.success && parsed.error) {
			return buildShtrikhCommandPacket(0xff, new Uint8Array([0x16])); // error
		}

		const cmd = packet[2];
		if (cmd === 0x10) {
			// Query short status
			const returnCode = !this.isPaperPresent ? 0x17 : 0x00;
			return buildShtrikhCommandPacket(0x10, new Uint8Array([returnCode, 1, 0, 0, 0, 0, 0, 0, 0]));
		}

		if (cmd === 0x17) {
			// Open receipt
			this.docCounter++;
			const returnCode = !this.isPaperPresent ? 0x17 : 0x00;
			return buildShtrikhCommandPacket(0x17, new Uint8Array([returnCode, 1]));
		}

		if (cmd === 0x85) {
			// Close receipt
			const returnCode = !this.isPaperPresent ? 0x17 : 0x00;
			return buildShtrikhCommandPacket(0x85, new Uint8Array([returnCode, 1]));
		}

		return buildShtrikhCommandPacket(cmd ?? 0x00, new Uint8Array([0x00]));
	}

	public printReceipt(params: ShtrikhMReceiptParams): {
		success: boolean;
		fiscalDocNum?: string;
		fiscalSign?: string;
		error?: string;
	} {
		if (!this.isOnline) {
			return { success: false, error: "Касса ШТРИХ-М отключена" };
		}
		if (!this.isPaperPresent) {
			return { success: false, error: "Нет бумаги в кассе ШТРИХ-М" };
		}

		this.docCounter++;
		const fiscalSign = Math.floor(1000000000 + Math.random() * 9000000000).toString();

		return {
			success: true,
			fiscalDocNum: String(this.docCounter),
			fiscalSign,
		};
	}
}

export class UsbComScannerEmulator {
	private listeners: Array<(event: DecodedScanResult) => void> = [];

	public subscribe(callback: (event: DecodedScanResult) => void): () => void {
		this.listeners.push(callback);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== callback);
		};
	}

	/**
	 * Simulates physical scanning of a 2D barcode via Virtual COM port or USB HID burst.
	 */
	public triggerScan(rawBarcode: string, source: "usb_com_serial" | "usb_hid_keyboard" = "usb_com_serial"): DecodedScanResult {
		const decoded = classifyBarcodeScan(rawBarcode, source);
		for (const listener of this.listeners) {
			listener(decoded);
		}
		return decoded;
	}
}

export class TwainSensorEmulator {
	private connectedDevices = [
		{
			id: "twain-vatech-ezsensor-emu",
			name: "Vatech EzSensor Classic HD (Эмулятор TWAIN)",
			type: "sensor" as const,
			connected: true,
		},
		{
			id: "twain-planmeca-prosensor-emu",
			name: "Planmeca ProSensor HD (Эмулятор TWAIN)",
			type: "sensor" as const,
			connected: true,
		},
		{
			id: "twain-carestream-rvg6200-emu",
			name: "Carestream RVG 6200 Intraoral Sensor (Эмулятор TWAIN)",
			type: "sensor" as const,
			connected: true,
		},
	];

	public listDevices() {
		return [...this.connectedDevices];
	}

	public acquireImage(deviceId: string, toothCode = "16"): {
		success: boolean;
		dataBase64?: string;
		toothCode?: string;
		error?: string;
	} {
		const device = this.connectedDevices.find((d) => d.id === deviceId);
		if (!device || !device.connected) {
			return { success: false, error: "Датчик визиографа не подключен или занят" };
		}

		// 1x1 PNG sample
		const sampleB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
		return {
			success: true,
			dataBase64: `data:image/png;base64,${sampleB64}`,
			toothCode,
		};
	}
}
