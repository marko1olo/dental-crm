/**
 * headerParser.ts — Быстрый парсер DICOM метаданных заголовка (Мандат 8b <= 120 строк).
 */

import dicomParser from "dicom-parser";
import type { ParsedDicomHeaderInfo } from "./types";

export function extractDicomHeaderInfo(buffer: ArrayBuffer): ParsedDicomHeaderInfo {
	try {
		const headerBytes = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 131072)));
		const dataSet = dicomParser.parseDicom(headerBytes, { untilTag: "x7fe00010" });
		const studyUid = dataSet.string("x0020000d") || `1.2.643.5.1.13.2.${Date.now()}`;
		const seriesUid = dataSet.string("x0020000e") || undefined;
		const sopUid = dataSet.string("x00080018") || undefined;
		const patientName = dataSet.string("x00100010") || undefined;
		const patientId = dataSet.string("x00100020") || undefined;
		const studyDate = dataSet.string("x00080020") || undefined;
		return {
			studyInstanceUid: studyUid,
			seriesUid,
			sopInstanceUid: sopUid,
			patientName,
			patientId,
			studyDate,
		};
	} catch {
		return {
			studyInstanceUid: `1.2.643.5.1.13.2.${Date.now()}`,
		};
	}
}
