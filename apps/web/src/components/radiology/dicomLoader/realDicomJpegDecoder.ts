/**
 * realDicomJpegDecoder.ts — Декодирование JPEG Lossless (1.2.840.10008.1.2.4.70) (Мандат 8b).
 */

import * as jpegPkg from "jpeg-lossless-decoder-js";
const JpegDecoder: any = (jpegPkg as any).Decoder || (jpegPkg as any).default?.Decoder || (jpegPkg as any).default;

export function decodeJpegLosslessSliceBuffer(buffer: ArrayBuffer): Uint16Array | null {
	const u8 = new Uint8Array(buffer);
	let soi = -1;
	let eoi = -1;
	const maxSearch = Math.min(u8.length - 1, 16384);
	for (let i = 0; i < maxSearch; i++) {
		if (u8[i] === 0xff && u8[i + 1] === 0xd8) {
			soi = i;
			break;
		}
	}
	if (soi === -1) return null;
	for (let i = u8.length - 2; i >= Math.max(0, u8.length - 8192); i--) {
		if (u8[i] === 0xff && u8[i + 1] === 0xd9) {
			eoi = i + 2;
			break;
		}
	}
	if (eoi === -1) return null;
	try {
		const dec = new JpegDecoder();
		const subBuf = u8.subarray(soi, eoi);
		const arrBuf = subBuf.buffer.slice(subBuf.byteOffset, subBuf.byteOffset + subBuf.byteLength);
		const decoded = dec.decode(arrBuf, 0, arrBuf.byteLength, 2);
		return decoded instanceof Uint16Array ? decoded : new Uint16Array(decoded.buffer);
	} catch {
		return null;
	}
}
