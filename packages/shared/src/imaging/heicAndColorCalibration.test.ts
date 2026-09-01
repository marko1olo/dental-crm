import test from "node:test";
import assert from "node:assert/strict";
import {
	COLOR_SPACES,
	EXIF_ORIENTATIONS,
	isHeicOrHeifBuffer,
	isHeicFileNameOrMime,
	getOrientedDimensions,
	transformDisplayP3ToSrgb,
	transformSrgbToDisplayP3,
	srgbToLinear,
	linearToSrgb,
	calculateDeltaE76,
	calculateDeltaE2000,
	findBestMatchingVitaShades,
	applyNeutralGrayCalibration,
	applyDentalClinicalFilter,
	VITA_SHADES_CATALOG,
	srgbToLab,
} from "../index.js";

test("ISOBMFF HEIC/HEIF buffer detection", () => {
	// Construct simulated HEIC ftyp box: length 24, 'ftyp', 'heic'
	const heicHeader = new Uint8Array([
		0x00, 0x00, 0x00, 0x18, // box length 24
		0x66, 0x74, 0x79, 0x70, // 'ftyp'
		0x68, 0x65, 0x69, 0x63, // 'heic'
		0x00, 0x00, 0x00, 0x00, // minor version
		0x6d, 0x69, 0x66, 0x31, // 'mif1'
		0x68, 0x65, 0x69, 0x78, // 'heix'
	]);

	assert.equal(isHeicOrHeifBuffer(heicHeader), true);

	// Construct simulated JPEG buffer (0xFFD8)
	const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
	assert.equal(isHeicOrHeifBuffer(jpegHeader), false);

	// Construct simulated PNG buffer
	const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	assert.equal(isHeicOrHeifBuffer(pngHeader), false);
});

test("HEIC file name and MIME detection", () => {
	assert.equal(isHeicFileNameOrMime("IMG_4921.HEIC"), true);
	assert.equal(isHeicFileNameOrMime("patient_photo.heif"), true);
	assert.equal(isHeicFileNameOrMime("image/heic"), true);
	assert.equal(isHeicFileNameOrMime("image/heif-sequence"), true);
	assert.equal(isHeicFileNameOrMime("photo.jpg"), false);
	assert.equal(isHeicFileNameOrMime("image/png"), false);
	assert.equal(isHeicFileNameOrMime(null), false);
});

test("EXIF orientation dimension rotation", () => {
	// 90 deg rotation swaps width and height
	const oriented90 = getOrientedDimensions(4032, 3024, EXIF_ORIENTATIONS.ROTATE_90_CW);
	assert.equal(oriented90.width, 3024);
	assert.equal(oriented90.height, 4032);

	// 180 deg rotation keeps dimensions
	const oriented180 = getOrientedDimensions(4032, 3024, EXIF_ORIENTATIONS.ROTATE_180);
	assert.equal(oriented180.width, 4032);
	assert.equal(oriented180.height, 3024);
});

test("Apple Display P3 to sRGB Color Matrix Conversion", () => {
	// Test pure white (255, 255, 255) maps to white
	const white = transformDisplayP3ToSrgb({ r: 255, g: 255, b: 255 });
	assert.equal(white.r, 255);
	assert.equal(white.g, 255);
	assert.equal(white.b, 255);

	// Test pure black (0, 0, 0) maps to black
	const black = transformDisplayP3ToSrgb({ r: 0, g: 0, b: 0 });
	assert.equal(black.r, 0);
	assert.equal(black.g, 0);
	assert.equal(black.b, 0);

	// Test VITA A2 tooth color in Display P3
	const sampleP3 = { r: 227, g: 214, b: 184 };
	const convertedSrgb = transformDisplayP3ToSrgb(sampleP3);
	assert.ok(convertedSrgb.r >= 220 && convertedSrgb.r <= 235);
	assert.ok(convertedSrgb.g >= 205 && convertedSrgb.g <= 220);
	assert.ok(convertedSrgb.b >= 170 && convertedSrgb.b <= 190);
});

test("CIE L*a*b* and CIEDE2000 Delta E Calculation", () => {
	const labA1 = { L: 79.8, a: 0.8, b: 16.5 };
	const labA2 = { L: 76.2, a: 1.5, b: 19.8 };

	const deltaE00 = calculateDeltaE2000(labA1, labA2);
	assert.ok(deltaE00 > 0 && deltaE00 < 5.0, `DeltaE should be in realistic dental range, got ${deltaE00}`);

	// Identical colors have Delta E = 0
	assert.equal(calculateDeltaE2000(labA1, labA1), 0);
});

test("VITA Classical Shade Matcher", () => {
	// Sample color for B1 shade
	const sampleB1 = VITA_SHADES_CATALOG.find((s) => s.code === "B1")!.srgbApprox;
	const matches = findBestMatchingVitaShades(sampleB1, "sRGB", 3);

	assert.ok(matches.length === 3);
	assert.ok(matches[0] !== undefined);
	assert.ok((matches[0]?.deltaE2000 ?? 99) < 10.0);
});

test("18% Neutral Gray Card Calibration", () => {
	const pixels = new Uint8ClampedArray([
		140, 140, 140, 255, // slightly overexposed gray
		200, 180, 150, 255, // tooth pixel
	]);

	// Sample gray card at 140
	applyNeutralGrayCalibration(pixels, { r: 140, g: 140, b: 140 });

	// Should scale down toward 118
	assert.ok((pixels[0] ?? 0) <= 120);
	assert.ok((pixels[1] ?? 0) <= 120);
	assert.ok((pixels[2] ?? 0) <= 120);
});

test("Dental Clinical Enamel and Gingival Vascular Filters", () => {
	const pixels = new Uint8ClampedArray([
		210, 80, 80, 255, // vascular gingiva (red dominant)
		230, 220, 200, 255, // enamel (bright)
	]);

	// Apply gingival vascular filter
	applyDentalClinicalFilter(pixels, "gingival_vascular");
	// Red should be enhanced
	assert.ok((pixels[0] ?? 0) >= 210);

	// Apply enamel contrast filter
	applyDentalClinicalFilter(pixels, "enamel_contrast");
	assert.ok((pixels[4] ?? 0) >= 220);
});
