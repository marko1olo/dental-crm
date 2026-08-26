/**
 * @dental/shared/hardware — ШТРИХ-М (Shtrikh-M) Protocol Engine.
 *
 * Implements binary frame transport and 54-FZ commands for Shtrikh-M fiscal registrars
 * (ШТРИХ-М-01Ф, ШТРИХ-ON-LINE, РИТЕЙЛ-01Ф, ШТРИХ-СИТИ-Ф) over TCP/IP and COM ports.
 */

export interface ShtrikhMFrame {
	readonly commandCode: number;
	readonly data: Uint8Array;
}

export interface ShtrikhMDeviceStatus {
	readonly online: boolean;
	readonly operatorNumber: number;
	readonly flags: number;
	readonly mode: number;
	readonly subMode: number;
	readonly isPaperPresent: boolean;
	readonly isCoverClosed: boolean;
	readonly isFnPresent: boolean;
	readonly isShiftOpen: boolean;
	readonly isShiftExpired24h: boolean;
	readonly modelName: string;
	readonly firmwareVersion: string;
	readonly kktSerialNumber: string;
	readonly fnSerialNumber: string;
	readonly error?: string | undefined;
}

export interface ShtrikhMReceiptParams {
	readonly cashierPassword?: number | undefined; // default 30
	readonly operatorName: string;
	readonly operationType: 1 | 2 | 3 | 4; // 1 = sell, 2 = sellReturn
	readonly items: Array<{
		readonly name: string;
		readonly priceKopecks: number;
		readonly quantity: number;
		readonly department?: number | undefined;
		readonly vatRate?: 1 | 2 | 3 | 4 | 5 | 6 | undefined; // 6 = none
		readonly paymentMethod?: number | undefined; // 4 = full payment
		readonly paymentSubject?: number | undefined; // 4 = service
		readonly markingRaw?: string | undefined;
	}>;
	readonly cashKopecks?: number | undefined;
	readonly cardKopecks?: number | undefined;
	readonly totalKopecks: number;
}

/**
 * Computes 8-bit XOR checksum (LRC) over payload.
 */
export function computeShtrikhLrc(data: Uint8Array): number {
	let lrc = 0;
	for (let i = 0; i < data.length; i++) {
		const byte = data[i];
		if (byte !== undefined) {
			lrc ^= byte;
		}
	}
	return lrc & 0xff;
}

/**
 * Encapsulates a command into a standard Shtrikh-M framing packet:
 * STX (0x02) + Length (1 byte) + Command (1 byte) + Data + LRC (1 byte)
 */
export function buildShtrikhCommandPacket(commandCode: number, data: Uint8Array = new Uint8Array(0)): Uint8Array {
	const len = 1 + data.length; // command + data
	const packet = new Uint8Array(1 + 1 + len + 1);
	packet[0] = 0x02; // STX
	packet[1] = len;
	packet[2] = commandCode;
	packet.set(data, 3);
	const lrcData = packet.subarray(1, packet.length - 1);
	packet[packet.length - 1] = computeShtrikhLrc(lrcData);
	return packet;
}

/**
 * Decodes a Shtrikh-M response packet and verifies STX & LRC integrity.
 */
export function parseShtrikhResponsePacket(rawBuffer: Uint8Array): {
	readonly success: boolean;
	readonly commandCode?: number | undefined;
	readonly returnCode?: number | undefined;
	readonly data?: Uint8Array | undefined;
	readonly error?: string | undefined;
} {
	if (rawBuffer.length < 4) {
		return { success: false, error: "Пакет слишком короткий (<4 байт)" };
	}

	if (rawBuffer[0] !== 0x02) {
		return { success: false, error: "Неверный стартовый байт (ожидается 0x02 STX)" };
	}

	const len = rawBuffer[1];
	if (len === undefined || rawBuffer.length < 2 + len + 1) {
		return { success: false, error: "Длина пакета не соответствует заголовку" };
	}

	const expectedLrc = rawBuffer[2 + len];
	const lrcData = rawBuffer.subarray(1, 2 + len);
	const calculatedLrc = computeShtrikhLrc(lrcData);

	if (expectedLrc !== calculatedLrc) {
		return {
			success: false,
			error: `Ошибка контрольной суммы LRC (ожидалось 0x${calculatedLrc.toString(16)}, получено 0x${(expectedLrc ?? 0).toString(16)})`,
		};
	}

	const commandCode = rawBuffer[2];
	const returnCode = rawBuffer[3];
	const data = rawBuffer.subarray(4, 2 + len);

	return {
		success: returnCode === 0,
		commandCode,
		returnCode,
		data,
		error: returnCode !== 0 ? parseShtrikhErrorCode(returnCode ?? 255) : undefined,
	};
}

/**
 * Human-readable mapping of Shtrikh-M hardware error codes.
 */
export function parseShtrikhErrorCode(code: number): string {
	const errors: Record<number, string> = {
		0x00: "Ошибок нет",
		0x01: "Недопустимый пароль оператора",
		0x02: "Недопустимый пароль администратора",
		0x15: "Команда не поддерживается в данном режиме",
		0x16: "Некорректные параметры в команде",
		0x17: "Нет бумаги",
		0x18: "Смена превысила 24 часа",
		0x1e: "Открыта крышка",
		0x33: "Ошибка контрольной ленты / ФН",
		0x4a: "Ошибка фискализации",
		0x4c: "Код маркировки не прошел проверку в ФН",
		0x50: "Исчерпан ресурс ФН",
		0x59: "Смена заблокирована",
	};

	return errors[code] || `Ошибка ККТ Штрих-М (0x${code.toString(16).toUpperCase()})`;
}
