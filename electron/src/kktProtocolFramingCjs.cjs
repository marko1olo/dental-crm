/**
 * DENTE Dental CRM — Shared KKT Protocol Framing & Parsers (ATOL v3/JSON & Shtrikh-M)
 */

const { createDesktopLogger } = require("./desktopLogger.cjs");

const logger = createDesktopLogger("KktProtocolFraming");

function mapAtolKktErrorCode(code) {
	switch (code) {
		case 0: return "Ошибок нет (OK)";
		case 1: return "Нет связи с фискальным регистратором (порт недоступен)";
		case 2: return "Закончилась чековая лента (Out of Paper)";
		case 3: return "Открыта крышка фискального регистратора";
		case 4: return "Смена превысила 24 часа (требуется снятие Z-отчета)";
		case 5: return "Ошибка фискального накопителя (ФН)";
		case 6: return "Неверный пароль кассира/администратора";
		case 7: return "Недопустимый режим налогообложения";
		default: return `Ошибка АТОЛ (код 0x${code.toString(16)})`;
	}
}

function mapShtrikhKktErrorCode(code) {
	switch (code) {
		case 0x00: return "Ошибок нет (OK)";
		case 0x01: return "Выдача данных: нет данных";
		case 0x02: return "Команда не поддерживается в данном режиме";
		case 0x03: return "Ошибка контрольной ленты или датчика бумаги";
		case 0x04: return "Отсутствует бумага (Out of Paper)";
		case 0x05: return "Снята крышка принтера";
		case 0x08: return "Исчерпан ресурс фискального накопителя";
		case 0x4a: return "Ошибка контрольной суммы XOR пакета";
		default: return `Ошибка ШТРИХ-М (код 0x${code.toString(16)})`;
	}
}

function computeXorChecksum(buf, startIdx = 1, endIdx = buf.length) {
	let crc = 0;
	for (let i = startIdx; i < endIdx; i++) {
		crc ^= buf[i] ?? 0;
	}
	return crc & 0xff;
}

function buildShtrikhMCommandPacket(commandCode, dataBuffer = Buffer.alloc(0), password = 30) {
	const passwordBuf = Buffer.alloc(4);
	passwordBuf.writeUInt32LE(password, 0);
	const length = 1 + 4 + dataBuffer.length;
	const header = Buffer.from([0x02, length, commandCode]);
	const payload = Buffer.concat([header, passwordBuf, dataBuffer]);
	const crc = computeXorChecksum(payload, 1, payload.length);
	return Buffer.concat([payload, Buffer.from([crc])]);
}

function buildAtolV3StatusPacket() {
	const payload = Buffer.from([0x02, 0x01, 0x3f]);
	const lrc = computeXorChecksum(payload, 1, payload.length);
	return Buffer.concat([payload, Buffer.from([lrc])]);
}

function buildAtolStatusHttpRequest(host, port) {
	const body = JSON.stringify({ type: "getDeviceStatus" });
	return Buffer.from(
		[
			"POST /operations/sync HTTP/1.1",
			`Host: ${host}:${port}`,
			"Content-Type: application/json",
			`Content-Length: ${Buffer.byteLength(body, "utf8")}`,
			"Connection: close",
			"",
			body,
		].join("\r\n"),
		"utf8",
	);
}

function tryExtractJsonFromKktBuffer(buf) {
	if (!buf || buf.length === 0) return null;
	const text = buf.toString("utf8").trim();
	if (!text) return null;

	const headerSepIdx = text.indexOf("\r\n\r\n");
	const bodyCandidate = headerSepIdx !== -1 ? text.slice(headerSepIdx + 4).trim() : text;
	const firstBrace = bodyCandidate.indexOf("{");
	const lastBrace = bodyCandidate.lastIndexOf("}");
	if (firstBrace === -1 || lastBrace <= firstBrace) return null;

	const slice = bodyCandidate.slice(firstBrace, lastBrace + 1);
	try {
		const parsed = JSON.parse(slice);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch (err) {
		logger.debug("Incomplete or malformed JSON frame from KKT", {
			error: err instanceof Error ? err.message : String(err),
		});
		return null;
	}
}

function build54FzQrString({ fnSerial, fiscalDocNum, fiscalSign, totalRub, operationType }) {
	if (!fnSerial || !fiscalDocNum || !fiscalSign) return undefined;
	const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
	const sum = typeof totalRub === "number" && Number.isFinite(totalRub) ? totalRub.toFixed(2) : "0.00";
	const n = operationType === "income_return" || operationType === 2 ? 2 : 1;
	return `t=${ts}&s=${sum}&fn=${fnSerial}&i=${fiscalDocNum}&fp=${fiscalSign}&n=${n}`;
}

function isKktTcpResponseComplete(protocol, responseData) {
	if (!responseData || responseData.length === 0) return false;
	const trimmedStart = responseData.toString("utf8").trimStart();
	if (trimmedStart.startsWith("{") || trimmedStart.startsWith("HTTP/")) {
		return tryExtractJsonFromKktBuffer(responseData) !== null;
	}
	if (responseData.includes(0x7b) && tryExtractJsonFromKktBuffer(responseData) !== null) {
		return true;
	}
	if (responseData[0] === 0x02) {
		if (responseData.length < 4) return false;
		const frameLen = responseData[1];
		if (frameLen >= 2) return responseData.length >= frameLen + 2;
		return responseData.length >= 4;
	}
	if (responseData[0] === 0x06 && protocol !== "shtrih") return true;
	return false;
}

function makeUnreachableStatus({ latencyMs, error, status = "unreachable", protocolError = false }) {
	return {
		online: false,
		status,
		protocolError,
		fiscalFallbackMode: "offline_queue",
		paperOk: false,
		coverClosed: false,
		fnPresent: false,
		fnFiscalized: false,
		latencyMs,
		error,
	};
}

function parseKktStatusFrame(protocol, responseData, latencyMs) {
	if (!responseData || responseData.length === 0) {
		return makeUnreachableStatus({
			latencyMs,
			status: "protocol_error",
			protocolError: true,
			error: "ККТ приняла TCP-соединение, но закрыла его без ответа протокола",
		});
	}

	const jsonObj = tryExtractJsonFromKktBuffer(responseData);
	if (jsonObj) {
		const first = Array.isArray(jsonObj.results) ? (jsonObj.results[0] || {}) : jsonObj;
		const deviceInfo = first.deviceInfo && typeof first.deviceInfo === "object" ? first.deviceInfo : {};
		const fnInfo = first.fnInfo && typeof first.fnInfo === "object" ? first.fnInfo : {};
		const shiftInfo = first.shiftInfo && typeof first.shiftInfo === "object" ? first.shiftInfo : {};
		const errorCode = typeof first.errorCode === "number"
			? first.errorCode
			: typeof jsonObj.errorCode === "number"
				? jsonObj.errorCode
				: 0;

		const paperOk = deviceInfo.paperPresent !== undefined
			? Boolean(deviceInfo.paperPresent)
			: first.paperOk !== undefined
				? Boolean(first.paperOk)
				: !first.outOfPaper && errorCode !== 2;
		const coverClosed = deviceInfo.coverClosed !== undefined
			? Boolean(deviceInfo.coverClosed)
			: first.coverClosed !== undefined
				? Boolean(first.coverClosed)
				: !first.coverOpen && errorCode !== 3;
		const fnPresent = fnInfo.fnPresent !== undefined
			? Boolean(fnInfo.fnPresent)
			: first.fnPresent !== undefined
				? Boolean(first.fnPresent)
				: errorCode !== 5;
		const fnFiscalized = fnInfo.fiscalized !== undefined ? Boolean(fnInfo.fiscalized) : fnPresent;
		const shiftOpen = shiftInfo.state === "opened" || Boolean(first.shiftOpen);
		const healthy = paperOk && coverClosed && fnPresent && errorCode === 0;

		return {
			online: true,
			status: healthy ? "ready" : "hardware_alert",
			fiscalFallbackMode: healthy ? "direct" : "offline_queue",
			paperOk,
			coverClosed,
			fnPresent,
			fnFiscalized,
			shiftOpen,
			latencyMs,
			modelName: String(deviceInfo.modelName || first.modelName || "АТОЛ 27Ф (LAN)"),
			...(deviceInfo.firmwareVersion ? { firmwareVersion: String(deviceInfo.firmwareVersion) } : {}),
			...(fnInfo.fnNumber || first.fnNumber ? { fnSerial: String(fnInfo.fnNumber || first.fnNumber) } : {}),
			...(deviceInfo.serialNumber || first.kktSerialNumber
				? { kktSerialNumber: String(deviceInfo.serialNumber || first.kktSerialNumber) }
				: {}),
			error: errorCode !== 0
				? mapAtolKktErrorCode(errorCode)
				: !paperOk
					? "Закончилась чековая лента"
					: !coverClosed
						? "Открыта крышка ККТ"
						: !fnPresent
							? "Фискальный накопитель не обнаружен"
							: undefined,
		};
	}

	if (responseData[0] !== 0x02 || responseData.length < 5) {
		return makeUnreachableStatus({
			latencyMs,
			status: "protocol_error",
			protocolError: true,
			error: `Повреждённый или неполный фрейм ответа ККТ (${responseData.length} байт)`,
		});
	}

	const frameLen = responseData[1];
	const expectedTotalLen = frameLen + 2;
	if (frameLen < 2 || responseData.length < expectedTotalLen) {
		return makeUnreachableStatus({
			latencyMs,
			status: "protocol_error",
			protocolError: true,
			error: `Обрезанный бинарный фрейм ККТ: получено ${responseData.length} из ${expectedTotalLen} байт`,
		});
	}

	const expectedCrc = computeXorChecksum(responseData, 1, expectedTotalLen - 1);
	const actualCrc = responseData[expectedTotalLen - 1];
	if (expectedCrc !== actualCrc) {
		return makeUnreachableStatus({
			latencyMs,
			status: "protocol_error",
			protocolError: true,
			error: `Ошибка контрольной суммы XOR фрейма ККТ (ожидалось 0x${expectedCrc.toString(16)}, получено 0x${actualCrc.toString(16)})`,
		});
	}

	const cmd = responseData[2];
	const errorCode = responseData[3] ?? 0;

	if (protocol === "shtrih") {
		let paperOk = errorCode !== 0x03 && errorCode !== 0x04;
		let coverClosed = errorCode !== 0x05;
		let fnPresent = errorCode !== 0x08;
		let shiftOpen = false;
		if (expectedTotalLen >= 10) {
			const flags = responseData.readUInt16LE(5);
			const modeByte = responseData[7] ?? 0;
			paperOk = paperOk && (flags & 0x0002) !== 0;
			coverClosed = coverClosed && (flags & 0x0400) === 0;
			fnPresent = fnPresent && (flags & 0x0020) !== 0;
			shiftOpen = (modeByte & 0x0f) === 2 || (modeByte & 0x0f) === 3;
		}
		const healthy = errorCode === 0 && paperOk && coverClosed && fnPresent;
		return {
			online: true,
			status: healthy ? "ready" : "hardware_alert",
			fiscalFallbackMode: healthy ? "direct" : "offline_queue",
			paperOk,
			coverClosed,
			fnPresent,
			fnFiscalized: fnPresent,
			shiftOpen,
			latencyMs,
			modelName: "ШТРИХ-М-01Ф (LAN)",
			errorCode: errorCode !== 0 ? `SHTRIKH_ERR_${errorCode}` : undefined,
		error:
			errorCode !== 0
				? mapShtrikhKktErrorCode(errorCode)
				: !paperOk
					? "Отсутствует чековая лента"
					: !coverClosed
						? "Открыта крышка ФР ШТРИХ-М"
						: !fnPresent
							? "ФН не обнаружен"
							: undefined,
		};
	}

	const flagsByte = expectedTotalLen >= 6 ? responseData[4] : 0;
	const paperOk = errorCode !== 2 && (flagsByte & 0x01) === 0;
	const coverClosed = errorCode !== 3 && (flagsByte & 0x02) === 0;
	const fnPresent = errorCode !== 5 && (flagsByte & 0x04) === 0;
	const shiftOpen = (flagsByte & 0x08) !== 0;
	const healthy = errorCode === 0 && paperOk && coverClosed && fnPresent;

	return {
		online: true,
		status: healthy ? "ready" : "hardware_alert",
		fiscalFallbackMode: healthy ? "direct" : "offline_queue",
		paperOk,
		coverClosed,
		fnPresent,
		fnFiscalized: fnPresent,
		shiftOpen,
		latencyMs,
		command: `0x${cmd.toString(16)}`,
		modelName: "АТОЛ v3 (LAN)",
		errorCode: errorCode !== 0 ? `ATOL_ERR_${errorCode}` : undefined,
		error:
			errorCode !== 0
				? mapAtolKktErrorCode(errorCode)
				: !paperOk
					? "Закончилась чековая лента"
					: !coverClosed
						? "Открыта крышка ККТ"
						: !fnPresent
							? "ФН не обнаружен"
							: undefined,
	};
}

function parseKktTcpResponse(protocol, responseData, requestPayload) {
	const jsonObj = tryExtractJsonFromKktBuffer(responseData);
	if (jsonObj) {
		const firstResult = Array.isArray(jsonObj.results) ? (jsonObj.results[0] || {}) : jsonObj;
		const errorCode = typeof firstResult.errorCode === "number" ? firstResult.errorCode : typeof jsonObj.errorCode === "number" ? jsonObj.errorCode : 0;

		if (errorCode !== 0 || firstResult.success === false || jsonObj.success === false) {
			const fallbackMsg = protocol === "shtrih" ? mapShtrikhKktErrorCode(errorCode) : mapAtolKktErrorCode(errorCode);
			const errorText = firstResult.errorDescription || firstResult.error || jsonObj.error || fallbackMsg;
			return {
				success: false,
				status: "hardware_offline",
				errorCode: `${protocol === "shtrih" ? "SHTRIKH" : "ATOL"}_ERR_${errorCode}`,
				error: errorText,
			};
		}

		const fiscalParams =
			(firstResult.fiscalParams && typeof firstResult.fiscalParams === "object" ? firstResult.fiscalParams : null) ||
			(jsonObj.fiscalParams && typeof jsonObj.fiscalParams === "object" ? jsonObj.fiscalParams : null) ||
			firstResult;

		const rawFd = fiscalParams.fiscalDocumentNumber ?? fiscalParams.fiscalDocNum ?? fiscalParams.fd;
		const rawFpd = fiscalParams.fiscalDocumentSign ?? fiscalParams.fiscalSign ?? fiscalParams.fpd;
		const rawFn = fiscalParams.fnNumber ?? fiscalParams.fnSerial;
		const rawKktSerial = fiscalParams.kktSerialNumber ?? fiscalParams.registrationNumber ?? fiscalParams.serialNumber;
		const rawShift = fiscalParams.shiftNumber ?? fiscalParams.shiftNum;

		const fiscalDocNum = rawFd !== undefined && rawFd !== null ? String(rawFd) : undefined;
		const fiscalSign = rawFpd !== undefined && rawFpd !== null ? String(rawFpd) : undefined;
		const fnSerial = rawFn !== undefined && rawFn !== null ? String(rawFn) : undefined;
		const kktSerialNumber = rawKktSerial !== undefined && rawKktSerial !== null ? String(rawKktSerial) : undefined;
		const shiftNum = rawShift !== undefined && rawShift !== null && !Number.isNaN(Number(rawShift)) ? Number(rawShift) : undefined;
		const qrString =
			typeof fiscalParams.qrString === "string" && fiscalParams.qrString.length > 0
				? fiscalParams.qrString
				: typeof jsonObj.qrString === "string" && jsonObj.qrString.length > 0
					? jsonObj.qrString
					: build54FzQrString({ fnSerial, fiscalDocNum, fiscalSign, totalRub: requestPayload?.totalRub, operationType: requestPayload?.operationType });

		return {
			success: true,
			status: "printed",
			errorCode: 0,
			...(fiscalSign !== undefined ? { fiscalSign } : {}),
			...(fiscalDocNum !== undefined ? { fiscalDocNum, fiscalDocumentNumber: fiscalDocNum } : {}),
			...(shiftNum !== undefined ? { shiftNum } : {}),
			...(kktSerialNumber !== undefined ? { kktSerialNumber } : {}),
			...(fnSerial !== undefined ? { fnSerial } : {}),
			...(qrString !== undefined ? { qrString } : {}),
			printedAt: new Date().toISOString(),
		};
	}

	if (!responseData || responseData.length === 0) {
		return { success: false, status: "hardware_offline", error: "ККТ закрыла TCP-соединение без ответа" };
	}
	if (responseData[0] === 0x06) {
		return { success: true, status: "printed", errorCode: 0, printedAt: new Date().toISOString() };
	}
	if (responseData.length < 4) {
		return { success: false, status: "hardware_offline", error: `Неполный ответ от ККТ (${responseData.length} байт)` };
	}

	const errorCode = responseData[3] !== undefined ? responseData[3] : 0;
	if (errorCode !== 0) {
		return {
			success: false,
			status: "hardware_offline",
			errorCode: `${protocol === "shtrih" ? "SHTRIKH" : "ATOL"}_ERR_${errorCode}`,
			error: protocol === "shtrih" ? mapShtrikhKktErrorCode(errorCode) : mapAtolKktErrorCode(errorCode),
		};
	}

	const fiscalDocNum = responseData.length >= 10 ? String(responseData.readUInt32LE(5)) : undefined;
	const fiscalSign = responseData.length >= 14 ? String(responseData.readUInt32LE(9)) : undefined;
	const shiftNum = responseData.length >= 16 ? responseData.readUInt16LE(13) : undefined;

	return {
		success: true,
		status: "printed",
		errorCode: 0,
		...(fiscalSign !== undefined ? { fiscalSign } : {}),
		...(fiscalDocNum !== undefined ? { fiscalDocNum, fiscalDocumentNumber: fiscalDocNum } : {}),
		...(shiftNum !== undefined ? { shiftNum } : {}),
		printedAt: new Date().toISOString(),
	};
}

module.exports = {
	mapAtolKktErrorCode,
	mapShtrikhKktErrorCode,
	computeXorChecksum,
	buildShtrikhMCommandPacket,
	buildAtolV3StatusPacket,
	buildAtolStatusHttpRequest,
	tryExtractJsonFromKktBuffer,
	build54FzQrString,
	isKktTcpResponseComplete,
	makeUnreachableStatus,
	parseKktStatusFrame,
	parseKktTcpResponse,
};
