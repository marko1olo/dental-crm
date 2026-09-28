import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CBCT_HOUNSFIELD_PRESETS,
	DEFAULT_VIEWPORT_TRANSFORM,
	clampCoordinateToVolume,
	disposeCbctVolume,
	extractObliqueMprSlice,
	type CbctViewportType,
	type CbctVoxelVolume,
	type Point3D,
} from "../cbctMprMath";
import { createEmptyCbctVolume } from "../cbctVolumeLifecycleMath";
import { teardownViewportCanvases } from "../../../utils/viewportTeardownHelper";
import { handleCbctKeyDown } from "../useCbctKeyboardShortcuts";

describe("CBCT 3D MPR Stability, Memory Disposal & Periodontitis Invariants (Mandate 8c, 8e)", () => {
	describe("1. Fast Wheel Scrolling & Projection Boundary Stability", () => {
		it("maintains coordinate clamping within physical voxel extents during rapid multi-plane wheel scroll", () => {
			const volume: CbctVoxelVolume = createEmptyCbctVolume(100, 100, 100, 0.2, 0);
			
			// Initial center position in mm: (0, 0, 0)
			let crosshair: Point3D = { x: 0, y: 0, z: 0 };

			// Fast downward scroll on Axial (100 ticks of deltaY > 0)
			for (let i = 0; i < 100; i++) {
				const delta = -1; // Downward scroll moves slice back
				crosshair = clampCoordinateToVolume(
					{ x: crosshair.x, y: crosshair.y, z: crosshair.z + delta * volume.spacingMm.z },
					volume,
				);
			}

			// Must not produce NaN or out-of-bounds coordinate
			assert.ok(!Number.isNaN(crosshair.z), "Z coordinate must not be NaN");
			const halfZ = (volume.dimensions.depth * volume.spacingMm.z) / 2;
			assert.ok(
				crosshair.z >= -halfZ && crosshair.z <= halfZ,
				`Z (${crosshair.z}) must be clamped within [-${halfZ}..${halfZ}]`,
			);

			// Fast upward scroll on Coronal (150 ticks)
			for (let i = 0; i < 150; i++) {
				const delta = 1;
				crosshair = clampCoordinateToVolume(
					{ x: crosshair.x, y: crosshair.y + delta * volume.spacingMm.y, z: crosshair.z },
					volume,
				);
			}
			const halfY = (volume.dimensions.height * volume.spacingMm.y) / 2;
			assert.ok(
				crosshair.y >= -halfY && crosshair.y <= halfY,
				`Y (${crosshair.y}) must be clamped within [-${halfY}..${halfY}]`,
			);

			// Fast scroll on Sagittal (200 ticks with shiftKey = 5x step)
			for (let i = 0; i < 40; i++) {
				const step = 5;
				const delta = 1 * step;
				crosshair = clampCoordinateToVolume(
					{ x: crosshair.x + delta * volume.spacingMm.x, y: crosshair.y, z: crosshair.z },
					volume,
				);
			}
			const halfX = (volume.dimensions.width * volume.spacingMm.x) / 2;
			assert.ok(
				crosshair.x >= -halfX && crosshair.x <= halfX,
				`X (${crosshair.x}) must be clamped within [-${halfX}..${halfX}]`,
			);
		});

		it("proves extraction does not crash or throw RangeError at extreme boundary coordinates", () => {
			const volume: CbctVoxelVolume = createEmptyCbctVolume(80, 80, 80, 0.25, 0);
			const extremePoints: Point3D[] = [
				{ x: -10, y: -10, z: -10 },
				{ x: 10, y: 10, z: 10 },
				{ x: 0, y: 0, z: 0 },
			];

			const planes: CbctViewportType[] = ["axial", "coronal", "sagittal"];
			for (const plane of planes) {
				for (const pt of extremePoints) {
					const res = extractObliqueMprSlice(volume, plane as any, pt, { axialAngleDeg: 0, coronalTiltDeg: 0, sagittalTiltDeg: 0 }, {
						windowWidth: 4400,
						windowLevel: 1300,
						invert: false,
						slabMode: "single",
						slabThicknessMm: 2.0,
						interpolation: "trilinear",
					});
					assert.ok(res.metadata.widthPx > 0, `${plane} slice extraction width must be > 0`);
					assert.ok(res.metadata.heightPx > 0, `${plane} slice extraction height must be > 0`);
				}
			}
		});
	});

	describe("2. WebGL & Canvas Memory Disposal (Mandate 8c & Frontend Invariants Section 4)", () => {
		it("releases 3D voxel volume TypedArray buffer immediately upon disposeCbctVolume call", () => {
			const volume: CbctVoxelVolume = createEmptyCbctVolume(128, 128, 64, 0.2, 0);
			assert.ok(volume.data !== null, "Volume data must be allocated before disposal");
			assert.equal(volume.isDisposed, false, "Volume must not be disposed initially");

			disposeCbctVolume(volume);

			assert.equal(volume.data, null, "Volume data buffer must be set to null to allow immediate GC");
			assert.equal(volume.isDisposed, true, "isDisposed flag must be set to true");

			// Calling disposeCbctVolume multiple times must be safe (idempotent)
			assert.doesNotThrow(() => disposeCbctVolume(volume));
		});

		it("zeros canvas dimensions and invokes context release on unmount via teardownViewportCanvases", () => {
			// Mock DOM container with mock canvas elements
			let loseContextCalled = false;
			let clearRectCalled = false;

			const mockCanvas = {
				width: 512,
				height: 512,
				getContext(type: string) {
					if (type === "webgl" || type === "webgl2") {
						return {
							getExtension(ext: string) {
								if (ext === "WEBGL_lose_context") {
									return {
										loseContext: () => {
											loseContextCalled = true;
										},
									};
								}
								return null;
							},
						};
					}
					if (type === "2d") {
						return {
							clearRect: (_x: number, _y: number, _w: number, _h: number) => {
								clearRectCalled = true;
							},
						};
					}
					return null;
				},
			};

			const mockContainer = {
				querySelectorAll: (selector: string) => {
					if (selector === "canvas") {
						return [mockCanvas as any];
					}
					return [];
				},
			} as unknown as HTMLElement;

			const cleaned = teardownViewportCanvases(mockContainer);

			assert.equal(cleaned, 1, "Must have cleaned 1 canvas");
			assert.equal(mockCanvas.width, 0, "Canvas width must be zeroed to force GPU framebuffer release");
			assert.equal(mockCanvas.height, 0, "Canvas height must be zeroed to force GPU framebuffer release");
			assert.equal(loseContextCalled, true, "WEBGL_lose_context must be invoked");
			assert.equal(clearRectCalled, true, "2D context clearRect must be invoked");
		});

		it("invokes onClose and memory teardown when Escape key is pressed", () => {
			let closed = false;
			const handled = handleCbctKeyDown(
				{ key: "Escape" },
				{ enabled: true, onClose: () => { closed = true; }, activeViewport: "axial" },
			);

			assert.equal(handled, true, "Escape key must be handled by CBCT shortcut engine");
			assert.equal(closed, true, "onClose callback must be triggered on Escape");
		});
	});

	describe("3. Inversion/Negative & Periodontitis Contrast Presets", () => {
		it("provides dedicated high-contrast preset for apical periodontitis & endo detection", () => {
			const endoPreset = CBCT_HOUNSFIELD_PRESETS.find((p) => p.id === "enamel_dentin");
			assert.ok(endoPreset, "Enamel/Dentin/Endo preset must exist");
			assert.ok(
				endoPreset.windowWidth >= 5000,
				`Endo preset window width (${endoPreset.windowWidth}) must be >= 5000 HU for bone canal contrast`,
			);
			assert.ok(
				endoPreset.windowLevel >= 1500,
				`Endo preset window level (${endoPreset.windowLevel}) must be >= 1500 HU`,
			);
			assert.ok(
				endoPreset.descriptionRu.includes("апексов") && endoPreset.descriptionRu.includes("периодонтальной щели"),
				"Preset description must specify apexes and periodontal ligament space",
			);
		});

		it("inverts slice pixel data correctly when invert is enabled", () => {
			const volume: CbctVoxelVolume = createEmptyCbctVolume(40, 40, 40, 0.2, 500);
			const pos: Point3D = { x: 0, y: 0, z: 0 };
			const angles = { axialAngleDeg: 0, coronalTiltDeg: 0, sagittalTiltDeg: 0 };

			const normalSlice = extractObliqueMprSlice(volume, "axial", pos, angles, {
				windowWidth: 4400,
				windowLevel: 1300,
				invert: false,
			});

			const invertedSlice = extractObliqueMprSlice(volume, "axial", pos, angles, {
				windowWidth: 4400,
				windowLevel: 1300,
				invert: true,
			});

			assert.ok(normalSlice.data, "Normal slice data must exist");
			assert.ok(invertedSlice.data, "Inverted slice data must exist");
			assert.equal(normalSlice.data.length, invertedSlice.data.length);
			
			// For non-zero pixels, inverted value is (255 - normal)
			let verifiedInvertedCount = 0;
			for (let i = 0; i < normalSlice.data.length; i += 4) {
				const nVal = normalSlice.data[i];
				const iVal = invertedSlice.data[i];
				if (nVal !== undefined && iVal !== undefined) {
					assert.equal(iVal, 255 - nVal, `Pixel ${i} must be inverted: ${iVal} == 255 - ${nVal}`);
					verifiedInvertedCount++;
				}
			}
			assert.ok(verifiedInvertedCount > 0, "Must have verified inverted pixel values");
		});
	});
});
