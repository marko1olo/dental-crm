import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const getWebRoot = () =>
	fs.existsSync(path.resolve(process.cwd(), "apps/web"))
		? path.resolve(process.cwd(), "apps/web")
		: process.cwd();

describe("ImagingView DICOMweb WADO-RS Autoload & BUG-009 Stubs Cleanup", () => {
	const sourcePath = path.resolve(getWebRoot(), "src/ImagingView.tsx");
	const source = fs.readFileSync(sourcePath, "utf-8");

	it("verifies BUG-009 old instruction stubs ('imaging-cbct-hint', 'Срезы формируются по адресу') are completely purged", () => {
		assert.equal(
			source.includes("imaging-cbct-hint"),
			false,
			"Outdated imaging-cbct-hint class and dashed commentary box must be completely purged",
		);
		assert.equal(
			source.includes("Подключение DICOMweb WADO-RS активно. Срезы КЛКТ формируются по адресу"),
			false,
			"Outdated developer instructional commentary must be purged from clinical production UI",
		);
	});

	it("verifies active CBCT study card includes 1-click launch buttons with data-testid attributes", () => {
		assert.ok(
			source.includes('data-testid="cbct-study-active-card"'),
			"Must render cbct-study-active-card container",
		);
		assert.ok(
			source.includes('data-testid="btn-open-cbct-studio"'),
			"Must include 1-click 3D Romexis Studio button (btn-open-cbct-studio)",
		);
		assert.ok(
			source.includes('data-testid="btn-open-cornerstone-workspace"'),
			"Must include 1-click Cornerstone3D MPR button (btn-open-cornerstone-workspace)",
		);
		assert.ok(
			source.includes('data-testid="btn-load-dicomweb-pacs"'),
			"Must include PACS WADO-RS manual trigger button (btn-load-dicomweb-pacs)",
		);
	});

	it("verifies handleLoadFromDicomweb supports silentOnError option and graceful fallback", () => {
		assert.ok(
			source.includes("handleLoadFromDicomweb = useCallback(async (options?: { silentOnError?: boolean })"),
			"handleLoadFromDicomweb must accept optional silentOnError flag",
		);
		assert.ok(
			source.includes("if (!options?.silentOnError)"),
			"Errors must only trigger error toast if silentOnError is not set",
		);
	});

	it("verifies automatic PACS WADO-RS autoload useEffect is registered for CBCT studies", () => {
		assert.ok(
			source.includes("// Autoload DICOMweb WADO-RS when a CBCT study with PACS linkage is selected"),
			"Autoload hook commentary must be present",
		);
		assert.ok(
			source.includes("if (!selectedImagingStudy || selectedImagingStudy.kind !== \"cbct\") return;"),
			"Autoload must target only cbct studies",
		);
		assert.ok(
			source.includes("handleLoadFromDicomweb({ silentOnError: true });"),
			"Autoload must execute with silentOnError: true to protect offline/unlinked clinic flow",
		);
	});

	it("verifies WADO-RS DICOM instance URI constructor conforms to DICOM PS3.18 standards", () => {
		assert.ok(
			source.includes("wadoUrl = `${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances/${encodeURIComponent(sopUid)}`"),
			"WADO-RS endpoint must follow standard studies/{studyUid}/series/{seriesUid}/instances/{sopUid}",
		);
		assert.ok(
			source.includes('wadoImageIds.push(`wadouri:${wadoUrl}`)'),
			"WADO instances must be wrapped in wadouri: scheme for Cornerstone DICOM Image Loader",
		);
	});

	it("verifies intuitive clean DicomArchiveUploader dropzone is rendered for CBCT studies", () => {
		assert.ok(
			source.includes('<DicomArchiveUploader onImagesLoaded={setLocalImageIds} className="w-full flex-1" />'),
			"DicomArchiveUploader must be cleanly integrated without visual clutter",
		);
	});
});
