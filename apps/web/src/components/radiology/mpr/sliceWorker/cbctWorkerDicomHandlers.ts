/**
 * cbctWorkerDicomHandlers.ts — Обработчики декодирования DICOM и генерации LOD воркера (Мандат 8b <= 120 строк).
 */

import type { CbctVoxelVolume } from "../../cbctMprMath";
import type { CbctWorkerOutboundMessage, DecodeDicomSlicesPayload, GenerateProgressiveLodPayload } from "./cbctSliceWorkerTypes";

function readRawVoxel(raw: number, bitsStored: number, mask: number, isSigned: boolean, signBit: number, signExt: number, isLin: boolean, intInt: number, slope: number, intercept: number): number {
	let val = bitsStored < 16 ? raw & mask : raw;
	if (isSigned) {
		if (bitsStored < 16) { if ((val & signBit) !== 0) val -= signExt; }
		else { val = (val << 16) >> 16; }
	}
	const hu = isLin ? ((val + intInt) | 0) : Math.round(val * slope + intercept);
	return hu < -32768 ? -32768 : hu > 32767 ? 32767 : hu;
}

function getRawSlice(buf: ArrayBuffer, off: number, count: number, isSigned: boolean): Int16Array | Uint16Array {
	if (off % 2 === 0 && buf.byteLength >= off + count * 2) {
		return isSigned ? new Int16Array(buf, off, count) : new Uint16Array(buf, off, count);
	}
	const sb = buf.slice(off, off + count * 2);
	const safe = sb.slice(0, sb.byteLength - (sb.byteLength % 2));
	return isSigned ? new Int16Array(safe) : new Uint16Array(safe);
}

export function handleDecodeDicomSlices(msg: DecodeDicomSlicesPayload, postMessage: (resp: CbctWorkerOutboundMessage, transfer?: Transferable[]) => void): void {
	try {
		const results: Array<{ sliceIndex: number; pixelBuffer: ArrayBufferLike; minHU: number; maxHU: number }> = [];
		const transferList: Transferable[] = [];
		for (const task of msg.tasks) {
			const { sliceIndex, buffer, pixelDataByteOffset: off, width, height, bitsStored, isSigned, rescaleSlope, rescaleIntercept, flipX, flipY } = task;
			const count = width * height; const slope = Number.isFinite(rescaleSlope) && rescaleSlope > 0 ? rescaleSlope : 1.0;
			const intercept = Number.isFinite(rescaleIntercept) ? rescaleIntercept : 0.0;
			const isLin = slope === 1.0 && Math.floor(intercept) === intercept; const intInt = intercept | 0;
			const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
			const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000; const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;
			const rawSlice = getRawSlice(buffer, off, count, isSigned);
			const sliceData = new Int16Array(count);
			let localMin = 32767; let localMax = -32768;

			for (let y = 0; y < height; y++) {
				const srcRow = (flipY ? height - 1 - y : y) * width; const dstRow = y * width;
				for (let x = 0; x < width; x++) {
					const raw = rawSlice[srcRow + (flipX ? width - 1 - x : x)]!;
					const clamped = readRawVoxel(raw, bitsStored, mask, isSigned, signBit, signExt, isLin, intInt, slope, intercept);
					sliceData[dstRow + x] = clamped;
					if (clamped < localMin) localMin = clamped; if (clamped > localMax) localMax = clamped;
				}
			}
			transferList.push(sliceData.buffer);
			results.push({ sliceIndex, pixelBuffer: sliceData.buffer, minHU: localMin === 32767 ? 0 : localMin, maxHU: localMax === -32768 ? 0 : localMax });
		}
		postMessage({ type: "DICOM_SLICES_DECODED", requestId: msg.requestId, results }, transferList);
	} catch (err) {
		postMessage({ type: "ERROR", requestId: msg.requestId, error: `Failed to decode DICOM slices: ${err instanceof Error ? err.message : String(err)}` });
	}
}

export function handleGenerateProgressiveLod(msg: GenerateProgressiveLodPayload, postMessage: (resp: CbctWorkerOutboundMessage, transfer?: Transferable[]) => void): void {
	try {
		const lodW = Math.max(1, Math.floor(msg.width / 2)); const lodH = Math.max(1, Math.floor(msg.height / 2));
		const lodD = Math.max(1, msg.sampledSlices.length); const lodData = new Int16Array(lodW * lodH * lodD);
		const slope = Number.isFinite(msg.rescaleSlope) && msg.rescaleSlope > 0 ? msg.rescaleSlope : 1.0;
		const intercept = Number.isFinite(msg.rescaleIntercept) ? msg.rescaleIntercept : 0.0;
		const isLin = slope === 1.0 && Math.floor(intercept) === intercept; const intInt = intercept | 0;
		const bitsStored = msg.bitsStored > 0 && msg.bitsStored <= 16 ? msg.bitsStored : 16;
		const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
		const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000; const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;
		let minHU = 32767; let maxHU = -32768;

		for (let lz = 0; lz < lodD; lz++) {
			const { buffer: buf, pixelDataByteOffset: off } = msg.sampledSlices[lz]!;
			const srcCount = msg.width * msg.height;
			const rawSlice = getRawSlice(buf, off, srcCount, msg.isSigned);
			const dstZ = lz * (lodW * lodH);
			for (let ly = 0; ly < lodH; ly++) {
				const srcRow = (msg.flipY ? msg.height - 1 - ly * 2 : ly * 2) * msg.width;
				const dstRow = dstZ + ly * lodW;
				for (let lx = 0; lx < lodW; lx++) {
					const sx = lx * 2; const raw = rawSlice[srcRow + (msg.flipX ? msg.width - 1 - sx : sx)]!;
					const clamped = readRawVoxel(raw, bitsStored, mask, msg.isSigned, signBit, signExt, isLin, intInt, slope, intercept);
					lodData[dstRow + lx] = clamped;
					if (clamped < minHU) minHU = clamped; if (clamped > maxHU) maxHU = clamped;
				}
			}
		}

		const lodVolume: CbctVoxelVolume = {
			id: `lod0-${msg.seriesId}`, dimensions: { width: lodW, height: lodH, depth: lodD },
			spacingMm: { x: msg.spacingMm.x * 2, y: msg.spacingMm.y * 2, z: (msg.depth * msg.spacingMm.z) / lodD },
			originMm: msg.originMm, physicalSizeMm: msg.physicalSizeMm, data: lodData,
			minHU: minHU === 32767 ? 0 : minHU, maxHU: maxHU === -32768 ? 0 : maxHU,
			rescaleSlope: msg.rescaleSlope, rescaleIntercept: msg.rescaleIntercept,
			defaultWindowWidth: msg.defaultWindowWidth ?? 4400, defaultWindowLevel: msg.defaultWindowLevel ?? 1300, isDisposed: false,
		};
		const transfers: Transferable[] = [];
		if (lodData.buffer instanceof ArrayBuffer) transfers.push(lodData.buffer);
		postMessage({ type: "PROGRESSIVE_LOD_GENERATED", requestId: msg.requestId, volume: lodVolume }, transfers);
	} catch (err) {
		postMessage({ type: "ERROR", requestId: msg.requestId, error: `Failed to generate progressive LOD volume: ${err instanceof Error ? err.message : String(err)}` });
	}
}
