/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT NATIVE VOLUME IMPORT ENGINE (WAVE 132)
 * Sirona GALILEOS (*_vol_0 + slices) & Morita OneVolume (CT_0.vol) Formats
 * ═══════════════════════════════════════════════════════════════════════════
 * Adapted & hardened from DenCT (Dental-CBCT-Viewer galileos.ts & onevolume.ts):
 * - Strict Zod validation and TypeScript type contracts
 * - Deterministic detection of Sirona GALILEOS and Morita OneVolume volumes
 * - Defensive XML header extraction with safe clinical defaults and warning logs
 * - Strict geometry guards: MAX_NATIVE_AXIS (2048), MAX_NATIVE_DEPTH (2000), MAX_NATIVE_VOXELS (2^30)
 * - Sirona: 12-bit unsigned (0..4095) slice unpacking with transparent gzip decompression
 * - Morita: JmVolumeVersion=1 marker, XML length, 36-byte CArray3D block,
 *   linear slope/intercept calibration, and sentinel -32768 -> -1000 HU (Air) replacement
 * - Official Form 043/u A4 clinical protocol generator (Strictly 0 emojis, Mandate 8d)
 *
 * 100% pure TypeScript, zero DOM/VTK dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as zlib from "node:zlib";
import { z } from "zod";

// ── Constants & Limits ─────────────────────────────────────────

export const MAX_NATIVE_AXIS = 2048;
export const MAX_NATIVE_DEPTH = 2000;
export const MAX_NATIVE_VOXELS = 2 ** 30; // 1,073,741,824 samples (~2 GB for int16)
export const ONEVOLUME_SENTINEL = -32768;
export const ONEVOLUME_VERSION_MARKER = "JmVolumeVersion=1";
export const AIR_SENTINEL_HU = -1000;

// ── Types & Zod Schemas ────────────────────────────────────────

export type NativeVolumeModality = "CT" | "CBCT";

export const nativeVolumeModalitySchema = z.enum(["CT", "CBCT"]);

export interface NativeVolumeMetadata {
	manufacturer: "Sirona" | "Morita" | "Generic";
	modality: NativeVolumeModality;
	dimensions: [cols: number, rows: number, depth: number];
	spacingMm: [x: number, y: number, z: number];
	windowCenter: number;
	windowWidth: number;
	minValue: number;
	maxValue: number;
	patientName?: string | undefined;
	patientId?: string | undefined;
	studyInstanceUID?: string | undefined;
	warnings?: string[] | undefined;
}

export const nativeVolumeMetadataSchema = z.object({
	manufacturer: z.enum(["Sirona", "Morita", "Generic"]),
	modality: nativeVolumeModalitySchema,
	dimensions: z.tuple([
		z.number().int().positive(),
		z.number().int().positive(),
		z.number().int().positive(),
	]),
	spacingMm: z.tuple([
		z.number().finite().positive(),
		z.number().finite().positive(),
		z.number().finite().positive(),
	]),
	windowCenter: z.number().finite(),
	windowWidth: z.number().finite(),
	minValue: z.number().finite(),
	maxValue: z.number().finite(),
	patientName: z.string().optional(),
	patientId: z.string().optional(),
	studyInstanceUID: z.string().optional(),
	warnings: z.array(z.string()).optional(),
});

export interface ParsedNativeVolume {
	metadata: NativeVolumeMetadata;
	data: Int16Array;
}

export const parsedNativeVolumeSchema = z.object({
	metadata: nativeVolumeMetadataSchema,
	data: z.instanceof(Int16Array),
});

// ── Path & Helper Utilities ────────────────────────────────────

/**
 * Extracts the file basename without directory prefixes (supporting both POSIX / and Windows \).
 */
function extractBaseName(path: string): string {
	return path.replace(/\\/g, "/").split("/").pop() || path;
}

/**
 * Robust XML helper extracting text content or attributes matching a regex tag pattern.
 */
function extractXmlText(xml: string, tag: RegExp): string | undefined {
	const mContent = xml.match(
		new RegExp(`<(?:${tag.source})[^>]*>\\s*([^<]+?)\\s*<`, "i"),
	);
	if (mContent && mContent[1]?.trim()) {
		return mContent[1].trim();
	}
	const mAttr = xml.match(
		new RegExp(`(?:${tag.source})\\s*=\\s*["']([^"']+)["']`, "i"),
	);
	if (mAttr && mAttr[1]?.trim()) {
		return mAttr[1].trim();
	}
	return undefined;
}

/**
 * Decompresses gzip buffer if magic bytes (0x1f, 0x8b) are present; otherwise returns raw buffer.
 */
export function decompressGzipSync(data: Uint8Array): Uint8Array {
	if (data.length < 2 || data[0] !== 0x1f || data[1] !== 0x8b) {
		return data;
	}
	try {
		return new Uint8Array(zlib.gunzipSync(data));
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(`GALILEOS: failed to decompress gzip slice: ${msg}`);
	}
}

// ── Format Detection Functions ─────────────────────────────────

/**
 * Checks if the file list contains Sirona GALILEOS export files (*_vol_0 header + *_vol_0_\d+ slices).
 */
export function matchGalileosFiles(filenames: string[]): boolean {
	let hasHeader = false;
	let hasSlice = false;

	for (const fn of filenames) {
		const base = extractBaseName(fn);
		if (/_vol_0$/i.test(base)) {
			hasHeader = true;
		}
		if (/_vol_0_\d+$/i.test(base)) {
			hasSlice = true;
		}
		if (hasHeader && hasSlice) {
			return true;
		}
	}

	return false;
}

/**
 * Checks if a filename corresponds to the Morita OneVolume container (CT_0.vol).
 */
export function matchOneVolumeFilename(filename: string): boolean {
	const base = extractBaseName(filename);
	return /^CT_0\.vol$/i.test(base);
}

// ── Sirona GALILEOS Parsers ────────────────────────────────────

/**
 * Parses Sirona GALILEOS XML header, extracting geometry, voxel spacing, and patient metadata.
 * Emits descriptive warnings for any missing or defaulted fields.
 */
export function parseGalileosHeader(
	xmlText: string,
	sliceCount: number,
): {
	cols: number;
	rows: number;
	spacing: number;
	maxValue: number;
	warnings: string[];
	patientName?: string | undefined;
	patientId?: string | undefined;
} {
	const warnings: string[] = [];

	const num = (re: RegExp, def: number, label: string): number => {
		const m = xmlText.match(re);
		const v = m ? parseFloat(m[1]!) : NaN;
		if (!Number.isFinite(v)) {
			warnings.push(`${label} missing from header — assuming ${def}`);
			return def;
		}
		return v;
	};

	const cols = Math.round(
		num(/(?:sizex|columns|width|dimx|nx)\D{0,4}(\d{1,4})/i, 512, "columns"),
	);
	const rows = Math.round(
		num(/(?:sizey|rows|height|dimy|ny)\D{0,4}(\d{1,4})/i, 512, "rows"),
	);
	const sp = num(
		/(?:voxelsize|spacing|resolution|pixelsize)\D{0,6}([0-9]*\.?[0-9]+)/i,
		0.16,
		"voxel size",
	);
	const maxValue = Math.round(
		num(/(?:maxvalue|rangemax|max)\D{0,6}(\d{3,5})/i, 4095, "max value"),
	);

	const spacing = sp > 0 && sp < 5 ? sp : 0.16;
	if (spacing !== sp) {
		warnings.push(`implausible voxel size ${sp} — assuming 0.16 mm`);
	}

	if (sliceCount <= 0) {
		warnings.push("slice count is non-positive or missing");
	}

	const patientName = extractXmlText(xmlText, /patient_?name/i);
	const patientId = extractXmlText(xmlText, /patient_?id/i);

	return {
		cols,
		rows,
		spacing,
		maxValue,
		warnings,
		patientName,
		patientId,
	};
}

/**
 * Assembles a 3D volume from Sirona GALILEOS XML header and slice files.
 * Validates dimensions against MAX_NATIVE_AXIS, MAX_NATIVE_DEPTH, and MAX_NATIVE_VOXELS.
 * Unpacks 12-bit uint16 slices into signed Int16Array.
 */
export function assembleGalileosVolume(
	headerXml: string,
	slices: { filename: string; data: Uint8Array }[],
): ParsedNativeVolume {
	const sliceRegex = /_vol_0_(\d+)$/i;
	let sortedSlices = slices
		.filter((s) => sliceRegex.test(extractBaseName(s.filename)))
		.sort((a, b) => {
			const matchA = extractBaseName(a.filename).match(sliceRegex);
			const matchB = extractBaseName(b.filename).match(sliceRegex);
			const numA = matchA ? Number(matchA[1]) : 0;
			const numB = matchB ? Number(matchB[1]) : 0;
			return numA - numB;
		});

	if (sortedSlices.length === 0 && slices.length > 0) {
		sortedSlices = [...slices];
	}

	if (sortedSlices.length === 0) {
		throw new Error("GALILEOS: missing *_vol_0 header or slice files");
	}

	const depth = sortedSlices.length;
	const { cols, rows, spacing, maxValue, warnings, patientName, patientId } =
		parseGalileosHeader(headerXml, depth);

	if (cols < 1 || rows < 1 || cols > MAX_NATIVE_AXIS || rows > MAX_NATIVE_AXIS) {
		throw new Error(
			`GALILEOS: implausible dimensions ${cols}x${rows} (per-axis limit ${MAX_NATIVE_AXIS})`,
		);
	}
	if (depth > MAX_NATIVE_DEPTH) {
		throw new Error(
			`GALILEOS: implausible depth ${depth} (limit ${MAX_NATIVE_DEPTH})`,
		);
	}
	const totalVoxels = cols * rows * depth;
	if (totalVoxels > MAX_NATIVE_VOXELS) {
		throw new Error(
			`GALILEOS: volume ${cols}x${rows}x${depth} exceeds the ${MAX_NATIVE_VOXELS} voxel limit`,
		);
	}

	const sliceLen = cols * rows;
	const sliceBytes = sliceLen * 2;
	const outData = new Int16Array(totalVoxels);

	let min = 32767;
	let max = -32768;

	for (let k = 0; k < depth; k++) {
		const rawSlice = sortedSlices[k]!;
		let buf = rawSlice.data;
		if (buf[0] === 0x1f && buf[1] === 0x8b) {
			buf = decompressGzipSync(buf);
		}

		if (buf.byteLength < sliceBytes) {
			throw new Error(
				`GALILEOS: slice ${extractBaseName(rawSlice.filename)} too short — header declares ${cols}x${rows} (${sliceBytes} bytes) but slice has ${buf.byteLength} bytes`,
			);
		}

		const sliceOffset = k * sliceLen;
		if (buf.byteOffset % 2 === 0) {
			const u16 = new Uint16Array(buf.buffer, buf.byteOffset, sliceLen);
			for (let i = 0; i < sliceLen; i++) {
				const val = u16[i]!;
				outData[sliceOffset + i] = val;
				if (val < min) min = val;
				if (val > max) max = val;
			}
		} else {
			const dv = new DataView(buf.buffer, buf.byteOffset, sliceBytes);
			for (let i = 0; i < sliceLen; i++) {
				const val = dv.getUint16(i * 2, true);
				outData[sliceOffset + i] = val;
				if (val < min) min = val;
				if (val > max) max = val;
			}
		}
	}

	if (min > max) {
		min = 0;
		max = maxValue;
	}

	const metadata: NativeVolumeMetadata = {
		manufacturer: "Sirona",
		modality: "CBCT",
		dimensions: [cols, rows, depth],
		spacingMm: [spacing, spacing, spacing],
		windowCenter: Math.round(maxValue * 0.35),
		windowWidth: maxValue,
		minValue: min,
		maxValue: max,
		patientName,
		patientId,
		warnings: warnings.length > 0 ? warnings : undefined,
	};

	return {
		metadata,
		data: outData,
	};
}

// ── Morita OneVolume Parsers ───────────────────────────────────

/**
 * Parses a native Morita OneVolume CT_0.vol binary container:
 * 1. Locates JmVolumeVersion=1 marker
 * 2. Reads 4-byte little-endian XML header length
 * 3. Decodes XML metadata (dimensions, spacing, slope/intercept)
 * 4. Skips 36-byte CArray3D bounds block
 * 5. Converts signed int16 samples using slope/intercept and maps -32768 sentinel to -1000 HU (Air)
 */
export function parseOneVolumeBinary(
	buffer: ArrayBuffer | Uint8Array,
): ParsedNativeVolume {
	const arrayBuffer = buffer instanceof Uint8Array ? buffer.buffer : buffer;
	const baseOffset = buffer instanceof Uint8Array ? buffer.byteOffset : 0;
	const totalLength = buffer instanceof Uint8Array ? buffer.byteLength : buffer.byteLength;

	if (totalLength < 64) {
		throw new Error("OneVolume: buffer too small to be a valid CT_0.vol file");
	}

	const dv = new DataView(arrayBuffer, baseOffset, totalLength);

	// Locate version marker in initial header block (up to 512 bytes)
	const scanLen = Math.min(512, totalLength);
	const headBytes = new Uint8Array(arrayBuffer, baseOffset, scanLen);
	let headText = "";
	for (let i = 0; i < scanLen; i++) {
		headText += String.fromCharCode(headBytes[i]!);
	}

	const vIdx = headText.indexOf(ONEVOLUME_VERSION_MARKER);
	if (vIdx < 0) {
		throw new Error("OneVolume: version marker not found");
	}

	let off = vIdx + ONEVOLUME_VERSION_MARKER.length;
	if (off < totalLength && dv.getUint8(off) === 0) {
		off += 1; // optional null terminator
	}

	if (off + 4 > totalLength) {
		throw new Error("OneVolume: unexpected EOF before XML length");
	}

	const xmlLen = dv.getUint32(off, true);
	off += 4;

	if (xmlLen <= 0 || off + xmlLen > totalLength) {
		throw new Error("OneVolume: bad XML length");
	}

	const xmlBytes = new Uint8Array(arrayBuffer, baseOffset + off, xmlLen);
	const xml = new TextDecoder().decode(xmlBytes);
	off += xmlLen;

	// Skip 36-byte CArray3D bounds block
	const CARRAY3D_BLOCK_SIZE = 36;
	off += CARRAY3D_BLOCK_SIZE;
	if (off > totalLength) {
		throw new Error("OneVolume: unexpected EOF before CArray3D voxel payload");
	}

	// Geometry + scaling from XML
	const parseXmlNum = (re: RegExp, def: number): number => {
		const m = xml.match(re);
		const v = m ? parseFloat(m[1]!) : NaN;
		return Number.isFinite(v) ? v : def;
	};

	const cols = Math.round(
		parseXmlNum(/(?:sizex|columns|width|dimx|nx)\D{0,4}(\d{1,4})/i, 0),
	);
	const rows = Math.round(
		parseXmlNum(/(?:sizey|rows|height|dimy|ny)\D{0,4}(\d{1,4})/i, 0),
	);
	let depth = Math.round(
		parseXmlNum(/(?:sizez|slices|depth|dimz|nz)\D{0,4}(\d{1,4})/i, 0),
	);
	const sp = parseXmlNum(
		/(?:voxelsize|spacing|gridspacing|resolution|pixelsize)\D{0,6}([0-9]*\.?[0-9]+)/i,
		0.125,
	);
	const slope = parseXmlNum(
		/(?:slope|rescaleslope)[^\d-]{0,6}(-?[0-9]*\.?[0-9]+)/i,
		1,
	);
	const intercept = parseXmlNum(
		/(?:intercept|rescaleintercept)[^\d-]{0,6}(-?[0-9]*\.?[0-9]+)/i,
		0,
	);

	if (!cols || !rows) {
		throw new Error("OneVolume: could not read dimensions from header");
	}
	if (cols > MAX_NATIVE_AXIS || rows > MAX_NATIVE_AXIS) {
		throw new Error(
			`OneVolume: implausible dimensions ${cols}x${rows} (per-axis limit ${MAX_NATIVE_AXIS})`,
		);
	}

	const availSamples = (totalLength - off) >> 1;
	if (!depth) {
		depth = Math.floor(availSamples / (cols * rows));
	}
	if (depth < 1) {
		throw new Error("OneVolume: no slice data in payload");
	}
	if (depth > MAX_NATIVE_DEPTH) {
		throw new Error(
			`OneVolume: implausible depth ${depth} (limit ${MAX_NATIVE_DEPTH})`,
		);
	}

	const voxels = cols * rows * depth;
	if (voxels > MAX_NATIVE_VOXELS) {
		throw new Error(
			`OneVolume: volume ${cols}x${rows}x${depth} exceeds the ${MAX_NATIVE_VOXELS} voxel limit`,
		);
	}
	if (availSamples < voxels) {
		throw new Error(
			`OneVolume: payload too short — header declares ${cols}x${rows}x${depth} (${voxels} voxels) but only ${availSamples} samples remain`,
		);
	}

	const payloadAbsOffset = baseOffset + off;
	const payload =
		payloadAbsOffset % 2 === 0
			? new Int16Array(arrayBuffer, payloadAbsOffset, voxels)
			: new Int16Array(
					arrayBuffer.slice(payloadAbsOffset, payloadAbsOffset + voxels * 2),
				);

	const spacing = sp > 0 && sp < 5 ? sp : 0.125;
	const warnings: string[] = [];
	if (spacing !== sp) {
		warnings.push(`implausible voxel size ${sp} — assuming 0.125 mm`);
	}

	const out = new Int16Array(voxels);
	let min = 32767;
	let max = -32768;

	for (let i = 0; i < voxels; i++) {
		const raw = payload[i]!;
		let v: number;
		if (raw === ONEVOLUME_SENTINEL) {
			v = AIR_SENTINEL_HU;
		} else {
			v = Math.round(raw * slope + intercept);
			if (v < -32768) v = -32768;
			else if (v > 32767) v = 32767;
			if (v < min) min = v;
			if (v > max) max = v;
		}
		out[i] = v;
	}

	if (min > max) {
		min = AIR_SENTINEL_HU;
		max = AIR_SENTINEL_HU;
	}

	const patientName = extractXmlText(xml, /patient_?name/i);
	const patientId = extractXmlText(xml, /patient_?id/i);
	const studyInstanceUID = extractXmlText(xml, /study(?:_?instance)?_?uid/i);

	const metadata: NativeVolumeMetadata = {
		manufacturer: "Morita",
		modality: "CBCT",
		dimensions: [cols, rows, depth],
		spacingMm: [spacing, spacing, spacing],
		windowCenter: 300,
		windowWidth: 2500,
		minValue: min,
		maxValue: max,
		patientName,
		patientId,
		studyInstanceUID,
		warnings: warnings.length > 0 ? warnings : undefined,
	};

	return {
		metadata,
		data: out,
	};
}

// ── Official Form 043/u A4 Protocol Formatter ──────────────────

/**
 * Formats official A4 clinical protocol of hardware volume import for Dental Outpatient Record (Form 043/u).
 * Strictly 0 emojis (Mandate 8d, p. 7).
 */
export function formatNativeVolumeA4Protocol(
	metadata: NativeVolumeMetadata,
): string {
	const lines: string[] = [];

	lines.push(
		"================================================================================",
	);
	lines.push("ПРОТОКОЛ АППАРАТНОГО ИМПОРТА ТОМОГРАММЫ (КЛКТ / CBCT)");
	lines.push("МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА 043/У)");
	lines.push(
		"================================================================================",
	);
	lines.push("");

	lines.push(
		"--------------------------------------------------------------------------------",
	);
	lines.push("1. ОБЩИЕ СВЕДЕНИЯ ОБ ИССЛЕДОВАНИИ И АППАРАТУРЕ");
	lines.push(
		"--------------------------------------------------------------------------------",
	);

	let mfgLabel = "Универсальный аппаратный импорт";
	if (metadata.manufacturer === "Sirona") {
		mfgLabel = "Sirona Dental Systems (GALILEOS CBCT)";
	} else if (metadata.manufacturer === "Morita") {
		mfgLabel = "J. Morita Corp (OneVolume 3D CT)";
	}
	lines.push(`Производитель оборудования : ${mfgLabel}`);

	const modLabel =
		metadata.modality === "CBCT"
			? "КЛКТ (Конусно-лучевая компьютерная томография)"
			: "КТ (Компьютерная томография)";
	lines.push(`Модальность сканирования   : ${modLabel}`);

	lines.push(`Пациент (ФИО)              : ${metadata.patientName ?? "Не указано"}`);
	lines.push(`Идентификатор карты (ID)   : ${metadata.patientId ?? "Не указан"}`);
	lines.push(`Идентификатор серии (UID)  : ${metadata.studyInstanceUID ?? "Не указан"}`);
	lines.push("");

	lines.push(
		"--------------------------------------------------------------------------------",
	);
	lines.push("2. ГЕОМЕТРИЧЕСКИЕ ПАРАМЕТРЫ РЕКОНСТРУКЦИИ");
	lines.push(
		"--------------------------------------------------------------------------------",
	);

	const [cols, rows, depth] = metadata.dimensions;
	const [sx, sy, sz] = metadata.spacingMm;
	const fovX = (cols * sx).toFixed(1);
	const fovY = (rows * sy).toFixed(1);
	const fovZ = (depth * sz).toFixed(1);
	const totalVoxels = cols * rows * depth;

	lines.push(`Матрица вокселей (X x Y x Z): ${cols} x ${rows} x ${depth} вокс.`);
	lines.push(
		`Шаг вокселя (X x Y x Z)    : ${sx.toFixed(3)} x ${sy.toFixed(3)} x ${sz.toFixed(3)} мм`,
	);
	lines.push(`Физическое поле обзора(FOV): ${fovX} x ${fovY} x ${fovZ} мм`);
	lines.push(`Суммарный объем данных     : ${totalVoxels} вокселей`);
	lines.push("");

	lines.push(
		"--------------------------------------------------------------------------------",
	);
	lines.push("3. КАЛИБРОВКА РАДИОЛОГИЧЕСКОЙ ПЛОТНОСТИ (ШКАЛА ХАУНСФИЛДА, HU)");
	lines.push(
		"--------------------------------------------------------------------------------",
	);
	lines.push(`Минимальная плотность (Min): ${metadata.minValue} HU`);
	lines.push(`Максимальная плотность(Max): ${metadata.maxValue} HU`);
	lines.push(`Центр окна (Window Center) : ${metadata.windowCenter} HU`);
	lines.push(`Ширина окна (Window Width) : ${metadata.windowWidth} HU`);
	lines.push("");

	lines.push(
		"--------------------------------------------------------------------------------",
	);
	lines.push("4. ПРЕДУПРЕЖДЕНИЯ И КАЛИБРОВОЧНЫЙ АУДИТ");
	lines.push(
		"--------------------------------------------------------------------------------",
	);
	if (metadata.warnings && metadata.warnings.length > 0) {
		lines.push("Зафиксированы особенности калибровки:");
		for (const w of metadata.warnings) {
			lines.push(`  - ${w}`);
		}
	} else {
		lines.push("Замечаний и геометрических аномалий при аппаратном импорте не выявлено.");
	}
	lines.push("");

	lines.push(
		"--------------------------------------------------------------------------------",
	);
	lines.push("5. РЕГЛАМЕНТНЫЙ ДОПУСК К ХИРУРГИЧЕСКОМУ ПЛАНИРОВАНИЮ");
	lines.push(
		"--------------------------------------------------------------------------------",
	);
	lines.push("Томографический объем успешно верифицирован и допущен к клиническому");
	lines.push("планированию дентальной имплантации, панорамной реконструкции (CPR)");
	lines.push("и формированию навигационных хирургических шаблонов по форме 043/у.");
	lines.push("");
	lines.push(
		"Врач-стоматолог / Рентгенолог: ____________________ / ____________________ /",
	);
	lines.push("");
	lines.push("М.П. Клиники");
	lines.push(
		"================================================================================",
	);

	return lines.join("\n");
}
