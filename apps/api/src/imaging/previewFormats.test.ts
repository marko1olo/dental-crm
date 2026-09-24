import assert from "node:assert/strict";
import test from "node:test";
import {
	browserRenderableImageMimeType,
	classifyImagingFile,
	generateDicomPreviewFallbackSvg,
	inspectLightweightPreviewFeasibility,
	isDicomOrRadiographFile,
} from "./previewFormats.js";

test("browserRenderableImageMimeType", async (t) => {
	await t.test("returns null for null or undefined", () => {
		assert.equal(browserRenderableImageMimeType(null), null);
		assert.equal(browserRenderableImageMimeType(undefined), null);
	});

	await t.test("returns correct mime type for supported extensions", () => {
		assert.equal(browserRenderableImageMimeType("test.png"), "image/png");
		assert.equal(browserRenderableImageMimeType("test.jpg"), "image/jpeg");
		assert.equal(browserRenderableImageMimeType("test.jpeg"), "image/jpeg");
		assert.equal(browserRenderableImageMimeType("test.webp"), "image/webp");
		assert.equal(browserRenderableImageMimeType("test.gif"), "image/gif");
		assert.equal(browserRenderableImageMimeType("test.bmp"), "image/bmp");
	});

	await t.test("is case insensitive", () => {
		assert.equal(browserRenderableImageMimeType("test.PNG"), "image/png");
		assert.equal(browserRenderableImageMimeType("test.JPG"), "image/jpeg");
		assert.equal(browserRenderableImageMimeType("test.WebP"), "image/webp");
	});

	await t.test("returns null for unsupported or unknown extensions", () => {
		assert.equal(browserRenderableImageMimeType("test.dcm"), null);
		assert.equal(browserRenderableImageMimeType("test.zip"), null);
		assert.equal(browserRenderableImageMimeType("test.txt"), null);
		assert.equal(browserRenderableImageMimeType("test"), null);
	});
});

test("isDicomOrRadiographFile", async (t) => {
	await t.test("detects DICOM extensions correctly", () => {
		assert.equal(isDicomOrRadiographFile("scan.dcm"), true);
		assert.equal(isDicomOrRadiographFile("scan.DCM"), true);
		assert.equal(isDicomOrRadiographFile("patient.dicom"), true);
		assert.equal(isDicomOrRadiographFile("slice.ima"), true);
		assert.equal(isDicomOrRadiographFile("visio.rvg"), true);
	});

	await t.test("detects TIFF radiograph extensions", () => {
		assert.equal(isDicomOrRadiographFile("pano.tif"), true);
		assert.equal(isDicomOrRadiographFile("pano.tiff"), true);
	});

	await t.test("returns false for regular web images and other files", () => {
		assert.equal(isDicomOrRadiographFile("photo.png"), false);
		assert.equal(isDicomOrRadiographFile("doc.pdf"), false);
		assert.equal(isDicomOrRadiographFile(null), false);
		assert.equal(isDicomOrRadiographFile(undefined), false);
	});
});

test("classifyImagingFile & inspectLightweightPreviewFeasibility", async (t) => {
	await t.test("classifies browser images", () => {
		assert.equal(classifyImagingFile("photo.jpg"), "browser_image");
		const feasibility = inspectLightweightPreviewFeasibility("photo.jpg");
		assert.equal(feasibility.isRenderableViaWeb, true);
		assert.equal(feasibility.suggestedViewer, "browser_img");
	});

	await t.test("classifies DICOM files and avoids CPU-hang transcoding", () => {
		assert.equal(classifyImagingFile("ct_scan.dcm"), "dicom");
		const feasibility = inspectLightweightPreviewFeasibility("ct_scan.dcm");
		assert.equal(feasibility.isRenderableViaWeb, false);
		assert.equal(feasibility.suggestedViewer, "dicom_web_viewer");
	});

	await t.test("classifies TIFF radiographs", () => {
		assert.equal(classifyImagingFile("xray.tif"), "radiograph_tiff");
		const feasibility = inspectLightweightPreviewFeasibility("xray.tif");
		assert.equal(feasibility.isRenderableViaWeb, false);
		assert.equal(feasibility.suggestedViewer, "external_app");
	});

	await t.test("generates fallback SVG without CPU hang", () => {
		const svg = generateDicomPreviewFallbackSvg({
			modality: "CBCT",
			title: "КЛКТ 3D двух челюстей",
			patientName: "Иванов И.И.",
		});
		assert.ok(svg.includes("<svg"));
		assert.ok(svg.includes("CBCT"));
		assert.ok(svg.includes("КЛКТ 3D двух челюстей"));
	});
});
