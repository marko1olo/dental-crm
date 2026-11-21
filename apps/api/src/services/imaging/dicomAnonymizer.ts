/**
 * dicomAnonymizer.ts — Бинарное обезличивание DICOM файлов по 152-ФЗ.
 *
 * Перезаписывает персональные данные пациента и медицинского учреждения
 * непосредственно в бинарном буфере DICOM с сохранением структуры тегов
 * и длины полей (padding пробелами 0x20 per DICOM PS 3.5).
 */

export interface DicomAnonymizationOptions {
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	institutionName?: string | null | undefined;
}

/**
 * Записывает строку в буфер по смещению, заполняя остаток поля пробелами (0x20).
 */
function overwriteWithPadding(
	targetBuf: Buffer,
	offset: number,
	length: number,
	replacementText: string,
): void {
	if (length <= 0) return;
	const textBuf = Buffer.from(replacementText, "latin1");
	const writeLen = Math.min(textBuf.length, length);
	textBuf.copy(targetBuf, offset, 0, writeLen);
	if (writeLen < length) {
		targetBuf.fill(0x20, offset + writeLen, offset + length);
	}
}

/**
 * Обезличивает бинарный DICOM-буфер, физически перезаписывая теги ПДн по 152-ФЗ:
 * - (0010,0010) PatientName -> "ANONYMIZED^PATIENT"
 * - (0010,0020) PatientID -> "ANON-<hash>"
 * - (0010,0030) PatientBirthDate -> пробелы
 * - (0010,0040) PatientSex -> "O "
 * - (0008,0080) InstitutionName -> "DENTE CLINIC"
 * - (0008,0090) ReferringPhysicianName -> пробелы
 * - (0008,1050) PerformingPhysicianName -> пробелы
 * - (0010,1000) OtherPatientIDs -> пробелы
 * - (0010,4000) PatientComments -> пробелы
 */
export function anonymizeDicomBuffer(
	buffer: Buffer,
	options: DicomAnonymizationOptions = {},
): Buffer {
	if (!buffer || buffer.length < 132) {
		return buffer;
	}

	const result = Buffer.from(buffer);
	const hasPreamble = result.toString("latin1", 128, 132) === "DICM";
	let cursor = hasPreamble ? 132 : 0;
	let explicitVr = true;
	let bigEndian = false;

	const anonName = options.patientName || "ANONYMIZED^PATIENT";
	const anonId = options.patientId || "ANON-0000";
	const anonInst = options.institutionName || "DENTE CLINIC";

	const totalBytes = result.length;

	while (cursor + 8 <= totalBytes) {
		const group = bigEndian ? result.readUInt16BE(cursor) : result.readUInt16LE(cursor);
		const element = bigEndian ? result.readUInt16BE(cursor + 2) : result.readUInt16LE(cursor + 2);
		const tagHex = `${group.toString(16).padStart(4, "0")}${element.toString(16).padStart(4, "0")}`.toLowerCase();

		// PixelData (7FE0,0010) — стоп, дальше воксели
		if (tagHex === "7fe00010") {
			break;
		}

		let valueLength = 0;
		let valueOffset = 0;

		if (group === 0x0002 || explicitVr) {
			const vr = result.subarray(cursor + 4, cursor + 6).toString("latin1");
			const isLongVr = ["OB", "OD", "OF", "OL", "OV", "OW", "SQ", "UC", "UR", "UT", "UN"].includes(vr);

			if (isLongVr) {
				if (cursor + 12 > totalBytes) break;
				valueLength = bigEndian ? result.readUInt32BE(cursor + 8) : result.readUInt32LE(cursor + 8);
				valueOffset = cursor + 12;
			} else {
				valueLength = bigEndian ? result.readUInt16BE(cursor + 6) : result.readUInt16LE(cursor + 6);
				valueOffset = cursor + 8;
			}
		} else {
			valueLength = bigEndian ? result.readUInt32BE(cursor + 4) : result.readUInt32LE(cursor + 4);
			valueOffset = cursor + 8;
		}

		if (valueLength === 0xffffffff) {
			cursor = valueOffset;
			continue;
		}

		if (valueOffset + valueLength > totalBytes) {
			break;
		}

		// Синтаксис передачи (0002,0010)
		if (tagHex === "00020010") {
			const valBuf = result.subarray(valueOffset, valueOffset + valueLength);
			const syntax = valBuf.toString("utf8").replace(/\0+$/g, "").trim();
			if (syntax === "1.2.840.10008.1.2") {
				explicitVr = false;
			} else if (syntax === "1.2.840.10008.1.2.2") {
				bigEndian = true;
				explicitVr = true;
			}
		}

		// Физическая перезапись тегов ПДн
		switch (tagHex) {
			case "00100010": // PatientName
				overwriteWithPadding(result, valueOffset, valueLength, anonName);
				break;
			case "00100020": // PatientID
				overwriteWithPadding(result, valueOffset, valueLength, anonId);
				break;
			case "00100030": // PatientBirthDate
				overwriteWithPadding(result, valueOffset, valueLength, "        ");
				break;
			case "00100040": // PatientSex
				overwriteWithPadding(result, valueOffset, valueLength, "O ");
				break;
			case "00080080": // InstitutionName
				overwriteWithPadding(result, valueOffset, valueLength, anonInst);
				break;
			case "00080090": // ReferringPhysicianName
			case "00081050": // PerformingPhysicianName
			case "00101000": // OtherPatientIDs
			case "00101001": // OtherPatientNames
			case "00101010": // PatientAge
			case "00101020": // PatientSize
			case "00101030": // PatientWeight
			case "00102160": // EthnicGroup
			case "00104000": // PatientComments
				result.fill(0x20, valueOffset, valueOffset + valueLength);
				break;
		}

		cursor = valueOffset + valueLength + (valueLength % 2);
	}

	return result;
}
