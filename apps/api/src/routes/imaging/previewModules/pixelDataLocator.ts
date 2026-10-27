import { open, stat } from "node:fs/promises";
import { parseDicomHeader } from "../dicomParsing.js";
import { readExactFileRange } from "../dicomZipReader.js";
import { dicomFirstFrameHeaderReadLimit, dicomFirstFramePixelReadLimit } from "../imagingConstants.js";

export function locateLittleEndianPixelData(
	buffer: Buffer,
): { valueOffset: number; valueLength: number } | null {
	const pixelTag = Buffer.from([0xe0, 0x7f, 0x10, 0x00]);
	const cursor = buffer.indexOf(pixelTag);
	while (cursor >= 0 && cursor + 8 <= buffer.length) {
		const vr = buffer.subarray(cursor + 4, cursor + 6).toString("latin1");
		const explicitLongVr = ["OB", "OD", "OF", "OL", "OV", "OW", "SQ", "UC", "UR", "UT", "UN"].includes(vr);
		if (explicitLongVr && cursor + 12 <= buffer.length) {
			const valueLength = buffer.readUInt32LE(cursor + 8);
			if (valueLength !== 0xffffffff) return { valueOffset: cursor + 12, valueLength };
			return null;
		}
		const explicitShortVr = /^[A-Z]{2}$/.test(vr);
		if (explicitShortVr && cursor + 8 <= buffer.length) {
			const valueLength = buffer.readUInt16LE(cursor + 6);
			return { valueOffset: cursor + 8, valueLength };
		}
		const valueLength = buffer.readUInt32LE(cursor + 4);
		if (valueLength !== 0xffffffff) return { valueOffset: cursor + 8, valueLength };
		return null;
	}
	return null;
}

export async function readDicomFirstFramePreviewBuffer(
	filePath: string,
	maxFileBytes: number,
): Promise<{ buffer: Buffer | null; warnings: string[] }> {
	const warnings: string[] = [];
	const stats = await stat(filePath);
	const fileHandle = await open(filePath, "r");
	try {
		const prefixLength = Math.min(stats.size, maxFileBytes, dicomFirstFrameHeaderReadLimit);
		const prefix = await readExactFileRange(fileHandle, 0, prefixLength);
		if (!prefix.buffer) {
			return { buffer: null, warnings: [`first_frame_header_read_failed:${prefix.warning ?? "unknown"}`] };
		}
		const pixelData = locateLittleEndianPixelData(prefix.buffer);
		if (!pixelData) {
			warnings.push("Pixel Data was not found inside the bounded first-frame header window.");
			return { buffer: prefix.buffer, warnings };
		}
		const metadata = parseDicomHeader(prefix.buffer);
		const estimatedFrameBytes =
			metadata.imageRows && metadata.imageColumns && metadata.bitsAllocated
				? metadata.imageRows * metadata.imageColumns * (metadata.samplesPerPixel ?? 1) * Math.max(1, Math.ceil(metadata.bitsAllocated / 8))
				: Math.min(pixelData.valueLength, dicomFirstFramePixelReadLimit);
		const frameBytes = Math.min(pixelData.valueLength, estimatedFrameBytes, dicomFirstFramePixelReadLimit);
		const requiredBytes = pixelData.valueOffset + frameBytes;
		if (requiredBytes > maxFileBytes) return { buffer: null, warnings: ["first_frame_preview_byte_limit_exceeded"] };
		if (requiredBytes > stats.size) return { buffer: null, warnings: ["first_frame_pixel_range_out_of_bounds"] };
		if (requiredBytes <= prefix.buffer.length) return { buffer: prefix.buffer.subarray(0, requiredBytes), warnings };

		const boundedFrame = await readExactFileRange(fileHandle, 0, requiredBytes);
		if (!boundedFrame.buffer) {
			return { buffer: null, warnings: [`first_frame_range_read_failed:${boundedFrame.warning ?? "unknown"}`] };
		}
		return { buffer: boundedFrame.buffer, warnings };
	} finally {
		await fileHandle.close();
	}
}
