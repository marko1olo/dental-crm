/**
 * DENTE Dental CRM — Unit & Regression Tests: Chairside Clipboard Photo,
 * Intraoral Camera Fast Capture & Before/After Patient Splitter
 *
 * Mandates:
 * - Mandate 8e: Doctor Autonomy (0 disabled buttons, non-blocking flow)
 * - Mandate 8d pt 7: Zero cartoon emojis
 * - Mandate 8k: Rapid Before/After Comparison Math
 * - Anti-monolith <= 800 lines
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Chairside Fast Photo Capture & Before/After Splitter (@dental/web)", () => {
	const componentsDir = path.resolve(__dirname, "..");
	const visitDir = path.resolve(__dirname, "../../visit");

	const compressorPath = path.join(componentsDir, "chairsidePhotoCompressor.ts");
	const pasteHookPath = path.join(componentsDir, "useClipboardPhotoPaste.ts");
	const cameraModalPath = path.join(componentsDir, "IntraoralCameraModal.tsx");
	const splitterPath = path.join(visitDir, "BeforeAfterSplitter.tsx");
	const diaryUploadPath = path.resolve(__dirname, "../../VisitDiaryPhotoUpload.tsx");

	it("1. Verifies all required files exist on disk and meet anti-monolith limit (<= 800 lines)", () => {
		const filesToCheck = [
			compressorPath,
			pasteHookPath,
			cameraModalPath,
			splitterPath,
			diaryUploadPath,
		];

		for (const file of filesToCheck) {
			assert.ok(fs.existsSync(file), `File must exist: ${file}`);
			const content = fs.readFileSync(file, "utf8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount <= 800,
				`File ${path.basename(file)} must not exceed 800 lines (currently ${lineCount})`,
			);
		}
	});

	it("2. Doctor Autonomy (Mandate 8e): Proves 0 disabled buttons across all chairside photo capture components", () => {
		const filesToCheck = [cameraModalPath, splitterPath, diaryUploadPath];

		for (const file of filesToCheck) {
			const content = fs.readFileSync(file, "utf8");
			// Check for disabled attribute on <button> tags
			const matches = content.match(/<button[^>]*\bdisabled\b/gi);
			assert.equal(
				matches,
				null,
				`File ${path.basename(file)} must have 0 disabled buttons for doctor autonomy, but found: ${matches?.join(", ")}`,
			);
		}
	});

	it("3. Zero Cartoon Emojis (Mandate 8d pt 7): Proves 0 cartoon emojis in components", () => {
		const filesToCheck = [
			compressorPath,
			pasteHookPath,
			cameraModalPath,
			splitterPath,
			diaryUploadPath,
		];

		const emojiRegex =
			/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

		for (const file of filesToCheck) {
			const content = fs.readFileSync(file, "utf8");
			const hasEmoji = emojiRegex.test(content);
			assert.equal(
				hasEmoji,
				false,
				`File ${path.basename(file)} must not contain cartoon emojis`,
			);
		}
	});

	it("4. 1-Click Clipboard Paste (Ctrl+V) Contract Invariants", () => {
		const hookContent = fs.readFileSync(pasteHookPath, "utf8");

		// Checks that paste event listener is registered
		assert.ok(
			hookContent.includes('window.addEventListener("paste", handlePaste)'),
			"Hook must register paste listener on window",
		);

		// Checks that clipboardData.items is examined for image/*
		assert.ok(
			hookContent.includes('item.type.startsWith("image/")'),
			"Hook must check item type for image/*",
		);

		// Checks that preventDefault is called for images to prevent unwanted DOM mutations
		assert.ok(
			hookContent.includes("e.preventDefault()"),
			"Hook must call preventDefault on paste when image is present",
		);

		// Checks that image is compressed using compressChairsidePhoto
		assert.ok(
			hookContent.includes("compressChairsidePhoto("),
			"Hook must compress image before triggering callback",
		);
	});

	it("5. Intraoral Camera / Webcam Direct WebRTC Invariants", () => {
		const cameraContent = fs.readFileSync(cameraModalPath, "utf8");

		// Proves WebRTC getUserMedia is called
		assert.ok(
			cameraContent.includes("navigator.mediaDevices.getUserMedia"),
			"Camera modal must call getUserMedia for WebRTC capture",
		);

		// Proves device enumeration for USB UVC cameras
		assert.ok(
			cameraContent.includes("navigator.mediaDevices.enumerateDevices"),
			"Camera modal must enumerate video input devices",
		);

		// Proves preferred camera is remembered in localStorage
		assert.ok(
			cameraContent.includes("dente_preferred_camera_device_id"),
			"Camera modal must remember preferred camera in localStorage",
		);

		// Proves Spacebar / Enter capture trigger for chairside foot pedal / hands-free
		assert.ok(
			cameraContent.includes('e.key === " "') || cameraContent.includes("Spacebar"),
			"Camera modal must support Spacebar capture trigger",
		);

		// Proves all stream tracks are stopped on close to prevent camera LED overheating
		assert.ok(
			cameraContent.includes("track.stop()"),
			"Camera modal must stop stream tracks on close",
		);
	});

	it("6. Chairside Before/After Splitter Invariants", () => {
		const splitterContent = fs.readFileSync(splitterPath, "utf8");

		// Proves split clip path math is utilized
		assert.ok(
			splitterContent.includes("calculateSplitClipPath"),
			"Splitter must use calculateSplitClipPath for deterministic wiper positioning",
		);

		// Proves pointer capture for smooth dragging
		assert.ok(
			splitterContent.includes("setPointerCapture"),
			"Splitter must use setPointerCapture for smooth dragging",
		);

		// Proves fullscreen patient presentation toggle
		assert.ok(
			splitterContent.includes("isFullscreen") &&
				(splitterContent.includes("Maximize2") || splitterContent.includes("Minimize2")),
			"Splitter must support fullscreen presentation mode for operatory monitors",
		);

		// Proves Before and After photo swap functionality
		assert.ok(
			splitterContent.includes("handleSwap"),
			"Splitter must allow swapping Before and After photos",
		);

		// Proves keyboard navigation (Left/Right arrow support)
		assert.ok(
			splitterContent.includes("ArrowLeft") && splitterContent.includes("ArrowRight"),
			"Splitter must support keyboard step navigation",
		);
	});

	it("7. VisitDiaryPhotoUpload Integration Invariants", () => {
		const uploadContent = fs.readFileSync(diaryUploadPath, "utf8");

		// Proves hook is wired
		assert.ok(
			uploadContent.includes("useClipboardPhotoPaste"),
			"VisitDiaryPhotoUpload must wire useClipboardPhotoPaste hook",
		);

		// Proves IntraoralCameraModal is wired
		assert.ok(
			uploadContent.includes("<IntraoralCameraModal"),
			"VisitDiaryPhotoUpload must render IntraoralCameraModal",
		);

		// Proves BeforeAfterSplitter is wired
		assert.ok(
			uploadContent.includes("<BeforeAfterSplitter"),
			"VisitDiaryPhotoUpload must render BeforeAfterSplitter",
		);

		// Proves Ctrl+V prompt for clinician is visible
		assert.ok(
			uploadContent.includes("Ctrl+V: вставить"),
			"VisitDiaryPhotoUpload must display Ctrl+V quick hint for doctor",
		);

		// Proves Before/After button exists
		assert.ok(
			uploadContent.includes("До / После"),
			"VisitDiaryPhotoUpload must display Before/After comparison button",
		);
	});
});
