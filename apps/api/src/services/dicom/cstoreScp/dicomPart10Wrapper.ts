/**
 * dicomPart10Wrapper.ts — Оборачивание сырых байтов C-STORE Data Set в канонический
 * DICOM Part 10 файл (128-byte preamble + "DICM" + Group 0002 File Meta Information Header).
 */

import { TRANSFER_SYNTAX_EXPLICIT_VR_LITTLE_ENDIAN } from "../dicomProtocolConstants.js";

/**
 * Создание валидного Part 10 DICOM файла (128-byte preamble + DICM + Group 0002 File Meta Header)
 * из сырого потока C-STORE Data Set.
 */
export function wrapInDicomPart10(
	dataSetBytes: Buffer,
	sopClassUid: string,
	sopInstanceUid: string,
	transferSyntaxUid = TRANSFER_SYNTAX_EXPLICIT_VR_LITTLE_ENDIAN,
): Buffer {
	// Если буфер уже содержит сигнатуру DICOM на смещении 128
	if (
		dataSetBytes.length >= 132 &&
		dataSetBytes[128] === 0x44 && // D
		dataSetBytes[129] === 0x49 && // I
		dataSetBytes[130] === 0x43 && // C
		dataSetBytes[131] === 0x4d // M
	) {
		return dataSetBytes;
	}

	// Построение элементов Group 0002 в Explicit VR Little Endian
	const metaElements: Buffer[] = [];

	// (0002,0001) OB FileMetaInformationVersion = 00 01
	const versionBuf = Buffer.alloc(12);
	versionBuf.writeUInt16LE(0x0002, 0);
	versionBuf.writeUInt16LE(0x0001, 2);
	versionBuf.write("OB", 4, 2, "ascii");
	versionBuf.writeUInt16LE(0x0000, 6); // Reserved
	versionBuf.writeUInt32LE(2, 8); // Length
	metaElements.push(Buffer.concat([versionBuf, Buffer.from([0x00, 0x01])]));

	// Вспомогательная функция для создания Explicit VR элементов
	const addExplicitStringElement = (
		element: number,
		vr: string,
		strValue: string,
		padChar = "\0",
	) => {
		let val = strValue;
		if (val.length % 2 !== 0) {
			val += padChar;
		}
		const valBuf = Buffer.from(val, "ascii");
		const header = Buffer.alloc(8);
		header.writeUInt16LE(0x0002, 0);
		header.writeUInt16LE(element, 2);
		header.write(vr, 4, 2, "ascii");
		header.writeUInt16LE(valBuf.length, 6);
		metaElements.push(Buffer.concat([header, valBuf]));
	};

	// (0002,0002) UI MediaStorageSOPClassUID
	addExplicitStringElement(0x0002, "UI", sopClassUid);

	// (0002,0003) UI MediaStorageSOPInstanceUID
	addExplicitStringElement(0x0003, "UI", sopInstanceUid);

	// (0002,0010) UI TransferSyntaxUID
	addExplicitStringElement(0x0010, "UI", transferSyntaxUid);

	// (0002,0012) UI ImplementationClassUID
	addExplicitStringElement(0x0012, "UI", "1.2.826.0.1.3680043.9.7123.1");

	// (0002,0013) SH ImplementationVersionName
	addExplicitStringElement(0x0013, "SH", "DENTE_PACS_1_0", " ");

	// Вычисление FileMetaInformationGroupLength (0002,0000) UL
	let metaLength = 0;
	for (const el of metaElements) {
		metaLength += el.length;
	}

	const groupLengthBuf = Buffer.alloc(12);
	groupLengthBuf.writeUInt16LE(0x0002, 0);
	groupLengthBuf.writeUInt16LE(0x0000, 2);
	groupLengthBuf.write("UL", 4, 2, "ascii");
	groupLengthBuf.writeUInt16LE(4, 6);
	groupLengthBuf.writeUInt32LE(metaLength, 8);

	// Preamble (128 байт 0x00) + "DICM" (4 байта)
	const preamble = Buffer.alloc(132, 0);
	preamble.write("DICM", 128, 4, "ascii");

	return Buffer.concat([preamble, groupLengthBuf, ...metaElements, dataSetBytes]);
}
