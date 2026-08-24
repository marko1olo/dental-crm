import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_DICOM_VIEWPORT_STATE,
	EMBOSS_SHADOW_KERNEL_3X3,
	SHARPEN_KERNEL_3X3,
	apply2DConvolutionFilter,
	buildDicomTonalLUT,
	calculate1FingerPan,
	calculate2FingerWindowLevel,
	calculatePinchCenter,
	calculatePinchDistance,
	calculatePinchZoom,
	calibrateMmPerPixel,
	disposeWebGlRenderingContext,
	measureBoneHeightAndWidth,
	measureDistanceMm,
	measureRootCanalWorkingLength,
} from "../imaging/index.js";

describe("Clinical Dental DICOM / RVG Imaging Engine (Тач-жесты, калибровка, фильтры и утилизация WebGL)", () => {
	it("1. Tablet Touch Gestures: Pinch-to-zoom calculation & clamp bounds", () => {
		// Distance calculation between 2 touch points
		const t1 = { clientX: 100, clientY: 100 };
		const t2 = { clientX: 100, clientY: 200 };
		const dist = calculatePinchDistance(t1, t2);
		assert.equal(dist, 100);

		const center = calculatePinchCenter(t1, t2);
		assert.deepEqual(center, { x: 100, y: 150 });

		// Zoom in (fingers spreading from 100px to 200px -> 2.0x zoom)
		const zoomIn = calculatePinchZoom(100, 200, 1.0);
		assert.equal(zoomIn, 2.0);

		// Zoom out (fingers pinching from 200px to 100px -> 0.5x zoom)
		const zoomOut = calculatePinchZoom(200, 100, 1.0);
		assert.equal(zoomOut, 0.5);

		// Clamp bounds test (min 0.25, max 16.0)
		const clampedMax = calculatePinchZoom(10, 500, 1.0);
		assert.equal(clampedMax, 16.0);

		const clampedMin = calculatePinchZoom(500, 10, 1.0);
		assert.equal(clampedMin, 0.25);
	});

	it("2. Tablet Touch Gestures: 1-finger pan and 2-finger Window/Level (WW/WL)", () => {
		// 1-finger pan translation
		const start = { x: 150, y: 200 };
		const current = { x: 210, y: 240 };
		const initialPan = { x: 0, y: 0 };
		const newPan = calculate1FingerPan(start, current, initialPan);
		assert.equal(newPan.x, 60);
		assert.equal(newPan.y, 40);

		// 2-finger Window Level adjustment (deltaX adjusts width, deltaY adjusts center)
		const wl = calculate2FingerWindowLevel(50, -30, 2000, 500, 2.0);
		assert.equal(wl.windowWidth, 2100); // 2000 + 50 * 2
		assert.equal(wl.windowCenter, 560);  // 500 - (-30) * 2
	});

	it("3. Calibrated Millimeter Ruler & Subpixel Measurements (Spherical & Implant References)", () => {
		// Calibration: 5.0 mm reference sphere spanning 200 pixels
		const p1 = { x: 100, y: 100 };
		const p2 = { x: 300, y: 100 };
		const mmPerPx = calibrateMmPerPixel(p1, p2, 5.0);
		assert.equal(mmPerPx, 0.025); // 5.0 / 200 = 0.025 mm/px

		// Measure root canal distance using calibrated scale
		const canalApex = { x: 100, y: 100 };
		const canalCrown = { x: 100, y: 900 }; // 800 px distance
		const canalMeasurement = measureDistanceMm(canalApex, canalCrown, mmPerPx);
		assert.equal(canalMeasurement.distancePx, 800);
		assert.equal(canalMeasurement.distanceMm, 20.0); // 800 * 0.025 = 20.0 mm
	});

	it("4. Multi-Segment Root Canal Working Length Tracing", () => {
		const mmPerPx = 0.025;
		const curvedCanalPoints = [
			{ x: 100, y: 100 },
			{ x: 100, y: 400 }, // 300 px segment (7.5 mm)
			{ x: 180, y: 640 }, // dx=80, dy=240 -> dist=Math.sqrt(6400+57600)=Math.sqrt(64000) ~ 252.98 px (6.32 mm)
			{ x: 230, y: 800 }, // dx=50, dy=160 -> dist=Math.sqrt(2500+25600)=Math.sqrt(28100) ~ 167.63 px (4.19 mm)
		];

		const canal = measureRootCanalWorkingLength(curvedCanalPoints, mmPerPx);
		assert.ok(canal.totalLengthMm > 17.5 && canal.totalLengthMm < 18.5);
		assert.equal(canal.segments.length, 3);
		assert.equal(canal.segments[0], 7.5);
	});

	it("5. Alveolar Bone Height & Width Measurement for Implant Candidacy", () => {
		const mmPerPx = 0.025;
		// Good candidate: Height 10.0 mm (400 px), Width 6.0 mm (240 px)
		const goodBone = measureBoneHeightAndWidth(
			{ x: 100, y: 100 },
			{ x: 100, y: 500 }, // 400 px = 10.0 mm
			{ x: 50, y: 200 },
			{ x: 290, y: 200 }, // 240 px = 6.0 mm
			mmPerPx,
		);
		assert.equal(goodBone.heightMm, 10.0);
		assert.equal(goodBone.widthMm, 6.0);
		assert.equal(goodBone.isImplantCandidate, true);

		// Insufficient bone width (3.5 mm) -> candidate false (requires bone graft / sinus lift)
		const narrowBone = measureBoneHeightAndWidth(
			{ x: 100, y: 100 },
			{ x: 100, y: 500 },
			{ x: 50, y: 200 },
			{ x: 190, y: 200 }, // 140 px = 3.5 mm
			mmPerPx,
		);
		assert.equal(narrowBone.widthMm, 3.5);
		assert.equal(narrowBone.isImplantCandidate, false);
	});

	it("6. Radiographic Tonal Transforms (Negative Film Inversion & Window/Level LUT)", () => {
		// Standard positive LUT
		const posLut = buildDicomTonalLUT({ windowWidth: 256, windowCenter: 128, invert: false });
		assert.equal(posLut.length, 256);
		assert.equal(posLut[0], 0);
		assert.equal(posLut[255], 255);

		// Negative film inversion LUT
		const negLut = buildDicomTonalLUT({ windowWidth: 256, windowCenter: 128, invert: true });
		assert.equal(negLut[0], 255);
		assert.equal(negLut[255], 0);
	});

	it("7. High-Frequency 2D Convolution Filters (Sharpen 3x3 & 3D Emboss Relief)", () => {
		// Mock 4x4 RGBA image buffer (16 pixels)
		const width = 4;
		const height = 4;
		const src = new Uint8ClampedArray(width * height * 4);
		for (let i = 0; i < src.length; i += 4) {
			src[i] = 128;     // R
			src[i + 1] = 128; // G
			src[i + 2] = 128; // B
			src[i + 3] = 255; // A
		}
		// Create high-contrast center edge
		src[20] = 240; // pixel (1, 1) R
		src[21] = 240; // pixel (1, 1) G
		src[22] = 240; // pixel (1, 1) B

		// Apply Sharpen filter
		const sharpened = apply2DConvolutionFilter(src, width, height, SHARPEN_KERNEL_3X3);
		assert.equal(sharpened.length, src.length);
		assert.ok(sharpened[20]! >= 240); // Center edge enhanced
		assert.equal(sharpened[23], 255); // Alpha preserved

		// Apply Emboss relief filter
		const embossed = apply2DConvolutionFilter(src, width, height, EMBOSS_SHADOW_KERNEL_3X3, 128);
		assert.equal(embossed.length, src.length);
		assert.equal(embossed[3], 255);
	});

	it("8. WebGL / Canvas Resource Lifecycle & Zero Memory Leaks Guarantee", () => {
		let deletedTextures = 0;
		let deletedBuffers = 0;
		let deletedPrograms = 0;
		let lostContextCalled = false;

		const mockGl = {
			deleteTexture: (_tex: any) => { deletedTextures++; },
			deleteBuffer: (_buf: any) => { deletedBuffers++; },
			deleteProgram: (_prog: any) => { deletedPrograms++; },
			getExtension: (name: string) => {
				if (name === "WEBGL_lose_context") {
					return {
						loseContext: () => { lostContextCalled = true; },
					};
				}
				return null;
			},
		};

		const disposal = disposeWebGlRenderingContext(mockGl, {
			textures: [{ id: "tex1" }, { id: "tex2" }],
			buffers: [{ id: "buf1" }],
			programs: [{ id: "prog1" }],
		});

		assert.equal(disposal.texturesDisposed, 2);
		assert.equal(disposal.buffersDisposed, 1);
		assert.equal(disposal.programsDisposed, 1);
		assert.equal(disposal.contextLostTriggered, true);
		assert.equal(deletedTextures, 2);
		assert.equal(deletedBuffers, 1);
		assert.equal(deletedPrograms, 1);
		assert.equal(lostContextCalled, true);
	});
});
