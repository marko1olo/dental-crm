import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DICOM_CONTRAST_PRESETS,
	buildContrastLUT,
	calculateCbctVramUsage,
	disposeCbctSeriesTextures,
	disposeFullWebGlPipeline,
	huToGrayscale8Bit,
	isVramBudgetExceeded,
	parseDicomDataset,
	rawPixelToHounsfieldUnit,
} from "../imaging/index.js";

/**
 * Helper to build a valid synthetic binary DICOM buffer for unit tests.
 */
function createSyntheticDicomBuffer(options: {
	readonly patientName?: string;
	readonly patientId?: string;
	readonly modality?: string;
	readonly rows?: number;
	readonly columns?: number;
	readonly bitsAllocated?: number;
	readonly pixelSpacing?: string; // "0.25\\0.25"
	readonly sliceThickness?: string; // "0.5"
	readonly windowCenter?: string; // "500"
	readonly windowWidth?: string; // "2000"
	readonly rescaleIntercept?: string; // "-1024"
	readonly rescaleSlope?: string; // "1.0"
	readonly hasPreamble?: boolean;
}): Uint8Array {
	const elements: { tag: [number, number]; vr: string; value: string | number | Uint8Array }[] = [];

	if (options.modality) {
		elements.push({ tag: [0x0008, 0x0060], vr: "CS", value: options.modality });
	}
	if (options.patientName) {
		elements.push({ tag: [0x0010, 0x0010], vr: "PN", value: options.patientName });
	}
	if (options.patientId) {
		elements.push({ tag: [0x0010, 0x0020], vr: "LO", value: options.patientId });
	}
	if (options.sliceThickness) {
		elements.push({ tag: [0x0018, 0x0050], vr: "DS", value: options.sliceThickness });
	}
	if (options.rows) {
		elements.push({ tag: [0x0028, 0x0010], vr: "US", value: options.rows });
	}
	if (options.columns) {
		elements.push({ tag: [0x0028, 0x0011], vr: "US", value: options.columns });
	}
	if (options.pixelSpacing) {
		elements.push({ tag: [0x0028, 0x0030], vr: "DS", value: options.pixelSpacing });
	}
	if (options.bitsAllocated) {
		elements.push({ tag: [0x0028, 0x0100], vr: "US", value: options.bitsAllocated });
	}
	if (options.windowCenter) {
		elements.push({ tag: [0x0028, 0x1050], vr: "DS", value: options.windowCenter });
	}
	if (options.windowWidth) {
		elements.push({ tag: [0x0028, 0x1051], vr: "DS", value: options.windowWidth });
	}
	if (options.rescaleIntercept) {
		elements.push({ tag: [0x0028, 0x1052], vr: "DS", value: options.rescaleIntercept });
	}
	if (options.rescaleSlope) {
		elements.push({ tag: [0x0028, 0x1053], vr: "DS", value: options.rescaleSlope });
	}

	const preambleSize = options.hasPreamble !== false ? 132 : 0;
	let totalSize = preambleSize;

	// Calculate size
	for (const el of elements) {
		const isUS = el.vr === "US";
		const valLen = isUS ? 2 : typeof el.value === "string" ? el.value.length : (el.value as Uint8Array).length;
		totalSize += 8 + valLen; // tag(4) + vr(2) + len(2) + val
	}

	const buf = new Uint8Array(totalSize);
	const view = new DataView(buf.buffer);

	if (options.hasPreamble !== false) {
		// "DICM" magic
		buf[128] = "D".charCodeAt(0);
		buf[129] = "I".charCodeAt(0);
		buf[130] = "C".charCodeAt(0);
		buf[131] = "M".charCodeAt(0);
	}

	let offset = preambleSize;

	for (const el of elements) {
		const [group, elem] = el.tag;
		view.setUint16(offset, group, true);
		view.setUint16(offset + 2, elem, true);
		buf[offset + 4] = el.vr.charCodeAt(0);
		buf[offset + 5] = el.vr.charCodeAt(1);

		if (el.vr === "US" && typeof el.value === "number") {
			view.setUint16(offset + 6, 2, true);
			view.setUint16(offset + 8, el.value, true);
			offset += 10;
		} else if (typeof el.value === "string") {
			const strBytes = new TextEncoder().encode(el.value);
			view.setUint16(offset + 6, strBytes.length, true);
			buf.set(strBytes, offset + 8);
			offset += 8 + strBytes.length;
		}
	}

	return buf;
}

describe("DICOM / PACS Panoramic MPR & 3D Dental Imaging Engine (Parser, Voxel Anatomy & WebGL Lifecycles)", () => {
	it("1. DICOM Parser: Decodes binary header, modality, voxel spacing and window presets", () => {
		const dicomBytes = createSyntheticDicomBuffer({
			patientName: "Petrov Petr Petrovich",
			patientId: "PAT-2026-999",
			modality: "CBCT",
			rows: 512,
			columns: 512,
			bitsAllocated: 16,
			pixelSpacing: "0.25\\0.25",
			sliceThickness: "0.5",
			windowCenter: "500",
			windowWidth: "2000",
			rescaleIntercept: "-1024",
			rescaleSlope: "1.0",
			hasPreamble: true,
		});

		const dataset = parseDicomDataset(dicomBytes);
		assert.equal(dataset.hasPreamble, true);
		assert.equal(dataset.patientName, "Petrov Petr Petrovich");
		assert.equal(dataset.patientId, "PAT-2026-999");
		assert.equal(dataset.modality, "CBCT");
		assert.equal(dataset.rows, 512);
		assert.equal(dataset.columns, 512);
		assert.equal(dataset.bitsAllocated, 16);
		assert.deepEqual(dataset.pixelSpacing, [0.25, 0.25]);
		assert.equal(dataset.sliceThickness, 0.5);
		assert.deepEqual(dataset.voxelSpacing, { x: 0.25, y: 0.25, z: 0.5 });
		assert.equal(dataset.windowCenter, 500);
		assert.equal(dataset.windowWidth, 2000);
		assert.equal(dataset.rescaleIntercept, -1024);
		assert.equal(dataset.rescaleSlope, 1.0);

		// Calibrated HU test
		const rawVal = 1874;
		const hu = rawPixelToHounsfieldUnit(rawVal, dataset.rescaleSlope, dataset.rescaleIntercept);
		assert.equal(hu, 850); // 1874 - 1024 = 850 HU (D2 bone)
	});

	it("5. Contrast & WW/WL Presets (Bone, Soft Tissue, Enamel & Nerve/Sinus)", () => {
		// Verify preset definitions
		assert.equal(DICOM_CONTRAST_PRESETS.bone.windowWidth, 2000);
		assert.equal(DICOM_CONTRAST_PRESETS.bone.windowCenter, 500);
		assert.equal(DICOM_CONTRAST_PRESETS.soft_tissue.windowWidth, 400);
		assert.equal(DICOM_CONTRAST_PRESETS.soft_tissue.windowCenter, 40);
		assert.equal(DICOM_CONTRAST_PRESETS.enamel.windowWidth, 3000);
		assert.equal(DICOM_CONTRAST_PRESETS.enamel.windowCenter, 1000);

		// Test HU to 8-bit mapping with bone window (WL 500, WW 2000 -> range -500..1500)
		const byteLow = huToGrayscale8Bit(-600, 2000, 500);
		assert.equal(byteLow, 0);

		const byteHigh = huToGrayscale8Bit(1600, 2000, 500);
		assert.equal(byteHigh, 255);

		const byteCenter = huToGrayscale8Bit(500, 2000, 500);
		assert.equal(byteCenter, 128);

		// Inverted HU mapping: air (-1000 HU <= -600 HU) maps to 10 (#090d16 dark graphite)
		const byteAirInverted = huToGrayscale8Bit(-1000, 2000, 500, true);
		assert.equal(byteAirInverted, 10);
		const byteBoneInverted = huToGrayscale8Bit(1600, 2000, 500, true);
		assert.equal(byteBoneInverted, 0);

		// LUT generation with Invert (0..255 index mapped to 0..255 output)
		const lutInverted = buildContrastLUT({ windowWidth: 256, windowCenter: 128, invert: true });
		assert.equal(lutInverted.length, 256);
		assert.equal(lutInverted[0], 255);
		assert.equal(lutInverted[255], 0);
	});

	it("6. Large CBCT Series GPU Memory Management (>400 slices) & WebGL Texture Disposal (0 Leaks)", () => {
		// Calculation for 450 slices of 512x512 with 16-bit (2 bytes)
		// 450 * 512 * 512 * 2 = 235,929,600 bytes = 225.0 MB
		const vram450 = calculateCbctVramUsage(450, 512, 512, 2);
		assert.equal(vram450.sliceCount, 450);
		assert.equal(vram450.totalVramMb, 225.0);
		assert.equal(vram450.exceedsBudget, false); // < 512 MB budget

		// Massive series exceeding 512 MB budget: 1100 slices
		// 1100 * 512 * 512 * 2 = 550.0 MB
		const exceeds = isVramBudgetExceeded(1100, 512, 512, 512.0, 2);
		assert.equal(exceeds, true);

		// Batch disposal of 450 GPU textures
		let deletedCount = 0;
		const mockGl = {
			deleteTexture: (_tex: any) => { deletedCount++; },
			deleteBuffer: (_buf: any) => {},
			deleteProgram: (_prog: any) => {},
			deleteFramebuffer: (_fb: any) => {},
			getExtension: (name: string) => {
				if (name === "WEBGL_lose_context") {
					return { loseContext: () => {} };
				}
				return null;
			},
		};

		const mockTextures = Array.from({ length: 450 }, (_, i) => ({ id: `tex_${i}` }));
		const disposal = disposeCbctSeriesTextures(mockGl, mockTextures, 512, 512, 2);
		assert.equal(disposal.texturesDisposed, 450);
		assert.equal(disposal.estimatedVramFreedMb, 225.0);
		assert.equal(deletedCount, 450);

		// Full pipeline purge
		const fullDisposal = disposeFullWebGlPipeline(mockGl, {
			textures: mockTextures,
			buffers: [{ id: "b1" }, { id: "b2" }],
			programs: [{ id: "p1" }],
			framebuffers: [{ id: "fb1" }],
		});
		assert.equal(fullDisposal.texturesDisposed, 450);
		assert.equal(fullDisposal.buffersDisposed, 2);
		assert.equal(fullDisposal.programsDisposed, 1);
		assert.equal(fullDisposal.framebuffersDisposed, 1);
		assert.equal(fullDisposal.contextLostTriggered, true);
	});
});
