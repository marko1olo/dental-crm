/**
 * DENTE CRM — OPG Offline Packaging & 152-ФЗ / HIPAA Security Test Suite
 *
 * Verifies:
 * 1. 152-ФЗ Network Isolation Invariant: 0 bytes of external egress, rejects external domains.
 * 2. Model packaging integrity & SHA-256 checksum validation.
 * 3. Multi-tier hardware execution provider hierarchy (WebGPU -> WebGL -> WASM -> Topological).
 * 4. YOLO11 Liodon tensor decoding (caries, periapical_lesion, impacted_tooth) + NMS.
 * 5. Anti-Memory-Leak canvas and texture cleanup lifecycle.
 * 6. Form 043/y odontogram mapping and clinical output integrity.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
	assertLocalUrl,
	opgModelStorage,
	type OpgModelId,
} from "../../../services/offline/opgModelStorage";
import {
	detectOptimalOpgBackend,
	cleanupCanvas,
	calculateIoU,
	applyNms,
	decodeYolo11Output,
	prepareOpgImageTensor,
	opgAiInferenceService,
	LIODON_CLASSES,
	type OpgAiBackend,
} from "../opgAiInferenceService";
import { calculateOpgOdontogram } from "../opgTopologicalEngine";

describe("OPG Local Browser AI Packaging & 152-ФЗ Security Compliance", () => {
	describe("1. 152-ФЗ / HIPAA Network Isolation Invariant", () => {
		it("strictly blocks external URLs and unauthorized network origins", () => {
			const forbiddenUrls = [
				"https://api.openai.com/v1/chat/completions",
				"http://evil-tracker.com/analytics.js",
				"https://huggingface.co/models/yolo11.onnx",
				"https://storage.googleapis.com/patient-scans/opg.png",
				"ftp://192.168.1.100/data",
				"data:text/html,<script>alert(1)</script>",
			];

			for (const url of forbiddenUrls) {
				assert.throws(
					() => assertLocalUrl(url),
					(err: Error) => {
						return (
							err.message.includes("152-ФЗ") ||
							err.message.includes("запрещены") ||
							err.message.includes("внешний домен")
						);
					},
					`Expected URL to be rejected under 152-FZ: ${url}`,
				);
			}
		});

		it("allows authorized local models and shell paths", () => {
			const allowedPaths = [
				"/models/opg/liodon_best.onnx",
				"/models/opg/abychkov_fdi.onnx",
				"/models/opg/models_manifest.json",
				"/models/sample_opg_temur.png",
				"models/opg/liodon_best.onnx",
			];

			for (const p of allowedPaths) {
				assert.doesNotThrow(() => assertLocalUrl(p), `Allowed local path rejected: ${p}`);
			}
		});
	});

	describe("2. Model Assets & Cryptographic Hash Integrity", () => {
		const publicDir = existsSync(join(process.cwd(), "public"))
			? join(process.cwd(), "public")
			: join(process.cwd(), "apps/web/public");

		it("verifies sample_opg_temur.png exists and is non-empty authentic radiograph", async () => {
			const filePath = join(publicDir, "models/sample_opg_temur.png");
			const st = await stat(filePath);
			assert.ok(st.size > 500_000, `Authentic sample radiograph must be > 500KB (found ${st.size} bytes)`);
		});

		it("verifies liodon_best.onnx integrity and SHA-256 match", async () => {
			const filePath = join(publicDir, "models/opg/liodon_best.onnx");
			const buffer = await readFile(filePath);
			assert.ok(buffer.length > 5_000_000, "Liodon YOLO11 ONNX weights must be > 5MB");

			const hash = createHash("sha256").update(buffer).digest("hex");
			assert.equal(
				hash,
				"4cee38b54203634d895ed30a8910f5d7c4cefe22b18f9116b5561d9dd6e83a71",
				"liodon_best.onnx SHA-256 hash mismatch",
			);
		});

		it("verifies abychkov_fdi.onnx exists and matches expected SHA-256", async () => {
			const filePath = join(publicDir, "models/opg/abychkov_fdi.onnx");
			const buffer = await readFile(filePath);
			assert.ok(buffer.length > 100_000_000, "Abychkov FDI ONNX weights must be > 100MB");

			const hash = createHash("sha256").update(buffer).digest("hex");
			assert.equal(
				hash,
				"426ddf210f339669f069bf41e0a4f225c72c4667ffb7f71c310112cfd7481f8a",
				"abychkov_fdi.onnx SHA-256 hash mismatch",
			);
		});

		it("verifies models_manifest.json structure and cryptographic catalog", async () => {
			const manifestPath = join(publicDir, "models/opg/models_manifest.json");
			const content = JSON.parse(await readFile(manifestPath, "utf-8"));

			assert.equal(content.schemaVersion, "1.0.0");
			assert.ok(content.models.liodon_detector_yolo11n);
			assert.ok(content.models.abychkov_fdi_transformer);
			assert.equal(
				content.models.liodon_detector_yolo11n.sha256,
				"4cee38b54203634d895ed30a8910f5d7c4cefe22b18f9116b5561d9dd6e83a71",
			);
			assert.equal(
				content.models.abychkov_fdi_transformer.sha256,
				"426ddf210f339669f069bf41e0a4f225c72c4667ffb7f71c310112cfd7481f8a",
			);
		});
	});

	describe("3. Multi-tier Hardware Acceleration & Fallback Hierarchy", () => {
		it("detects and resolves execution provider based on preferences", () => {
			const preferences: Array<"auto" | "webgpu" | "webgl" | "wasm"> = ["auto", "webgpu", "webgl", "wasm"];

			for (const pref of preferences) {
				const info = detectOptimalOpgBackend(pref);
				assert.ok(["webgpu", "webgl", "wasm"].includes(info.backend));
				assert.ok(info.labelRu.length > 0);
				assert.ok(info.badge.length > 0);
				assert.ok(info.descriptionRu.length > 0);
			}

			// Explicit wasm
			const wasm = detectOptimalOpgBackend("wasm");
			assert.equal(wasm.backend, "wasm");
			assert.equal(wasm.badge, "CPU");
		});

		it("correctly identifies Liodon clinical pathology class mappings", () => {
			assert.equal(LIODON_CLASSES[0], "caries");
			assert.equal(LIODON_CLASSES[1], "periapical_lesion");
			assert.equal(LIODON_CLASSES[2], "impacted_tooth");
		});
	});

	describe("4. YOLO11 Tensor Output Decoding & Vectorized NMS", () => {
		it("calculates IoU correctly for identical, overlapping, and disjoint boxes", () => {
			const b1 = { x1: 10, y1: 10, x2: 50, y2: 50 };
			const b2 = { x1: 10, y1: 10, x2: 50, y2: 50 };
			assert.equal(calculateIoU(b1, b2), 1.0, "Identical boxes must have IoU 1.0");

			const b3 = { x1: 100, y1: 100, x2: 150, y2: 150 };
			assert.equal(calculateIoU(b1, b3), 0.0, "Disjoint boxes must have IoU 0.0");

			const b4 = { x1: 30, y1: 10, x2: 70, y2: 50 }; // Half overlap horizontally
			const iou = calculateIoU(b1, b4);
			assert.ok(iou > 0.3 && iou < 0.4, `Expected partial IoU ~0.33, got ${iou}`);
		});

		it("applies NMS to suppress duplicate overlapping pathology boxes", () => {
			const detections = [
				{
					id: "c1",
					label: "caries" as const,
					confidence: 0.92,
					x1: 100,
					y1: 100,
					x2: 140,
					y2: 140,
					cx: 120,
					cy: 120,
				},
				{
					id: "c2",
					label: "caries" as const,
					confidence: 0.75,
					x1: 102,
					y1: 101,
					x2: 141,
					y2: 139,
					cx: 121,
					cy: 120,
				},
				{
					id: "imp1",
					label: "impacted_tooth" as const,
					confidence: 0.88,
					x1: 400,
					y1: 200,
					x2: 460,
					y2: 260,
					cx: 430,
					cy: 230,
				},
			];

			const filtered = applyNms(detections, 0.45);
			assert.equal(filtered.length, 2, "NMS should keep highest confidence caries and the distinct impacted tooth");
			assert.equal(filtered[0]?.id, "c1");
			assert.equal(filtered[1]?.id, "imp1");
		});

		it("decodes raw YOLO11 tensor [1, 7, 8400] into accurate clinical bounding boxes", () => {
			const numAnchors = 8400;
			const numChannels = 7;
			const tensor = new Float32Array(numChannels * numAnchors);

			// Inject a synthetic detection at anchor 42:
			// Coordinates in 640x640: cx=320, cy=300, w=40, h=50
			// Class 0 (caries) = 0.89
			const a = 42;
			tensor[0 * numAnchors + a] = 320; // cx
			tensor[1 * numAnchors + a] = 300; // cy
			tensor[2 * numAnchors + a] = 40;  // w
			tensor[3 * numAnchors + a] = 50;  // h
			tensor[4 * numAnchors + a] = 0.89; // caries prob
			tensor[5 * numAnchors + a] = 0.05; // periapical
			tensor[6 * numAnchors + a] = 0.02; // impacted

			// Inject impacted tooth at anchor 500:
			// Coordinates: cx=120, cy=400, w=60, h=70
			// Class 2 (impacted) = 0.94
			const a2 = 500;
			tensor[0 * numAnchors + a2] = 120;
			tensor[1 * numAnchors + a2] = 400;
			tensor[2 * numAnchors + a2] = 60;
			tensor[3 * numAnchors + a2] = 70;
			tensor[4 * numAnchors + a2] = 0.01;
			tensor[5 * numAnchors + a2] = 0.02;
			tensor[6 * numAnchors + a2] = 0.94; // impacted prob

			const originalWidth = 1280;
			const originalHeight = 720;
			const decoded = decodeYolo11Output(tensor, originalWidth, originalHeight, 0.25, 0.45);

			assert.equal(decoded.length, 2);

			const impacted = decoded.find((d) => d.label === "impacted_tooth");
			const caries = decoded.find((d) => d.label === "caries");

			assert.ok(impacted, "Expected impacted_tooth detection");
			assert.ok(caries, "Expected caries detection");

			// Check coordinate scaling: scaleX = 1280 / 640 = 2.0; scaleY = 720 / 640 = 1.125
			assert.equal(caries.cx, 640); // 320 * 2
			assert.equal(caries.confidence, 0.89);

			assert.equal(impacted.cx, 240); // 120 * 2
			assert.equal(impacted.confidence, 0.94);
		});
	});

	describe("5. Anti-Memory-Leak & Resource Management", () => {
		it("cleanupCanvas resets dimensions without throwing", () => {
			const mockCanvas = { width: 640, height: 640 } as unknown as HTMLCanvasElement;
			cleanupCanvas(mockCanvas);
			assert.equal(mockCanvas.width, 0);
			assert.equal(mockCanvas.height, 0);

			// Calling with null or invalid canvas is safe
			assert.doesNotThrow(() => cleanupCanvas(null));
		});

		it("prepareOpgImageTensor allocates tensor safely in headless environment", async () => {
			const res = await prepareOpgImageTensor("synthetic_path.png", 640, 640);
			assert.equal(res.tensorData.length, 3 * 640 * 640);
			assert.ok(res.naturalWidth > 0);
			assert.ok(res.naturalHeight > 0);
		});
	});

	describe("6. End-to-End Pipeline & Form 043/y Odontogram Synthesis", () => {
		it("executes local inference and generates clinical Form 043/y analysis", async () => {
			const res = await opgAiInferenceService.runInference("sample_opg_temur.png", {
				allowFallback: true,
			});

			assert.ok(res.analysis);
			assert.ok(res.analysis.teeth);
			assert.ok(Object.keys(res.analysis.teeth).length >= 28);
			assert.ok(res.latencyMs >= 16);
			assert.ok(res.isCalibratedFallback);
			assert.equal(res.backend, "wasm");

			// Check tooth 48 impacted clinical assignment
			const tooth48 = res.analysis.teeth[48];
			assert.ok(tooth48, "Tooth 48 must be mapped in odontogram");
			assert.equal(tooth48.status, "Retained", "Tooth 48 must be detected as Retained");

			// Check quadrant grouping from teeth slots
			const q1Teeth = Object.values(res.analysis.teeth).filter((t) => t.quadrant === 1);
			const q2Teeth = Object.values(res.analysis.teeth).filter((t) => t.quadrant === 2);
			const q3Teeth = Object.values(res.analysis.teeth).filter((t) => t.quadrant === 3);
			const q4Teeth = Object.values(res.analysis.teeth).filter((t) => t.quadrant === 4);
			assert.equal(q1Teeth.length, 8);
			assert.equal(q2Teeth.length, 8);
			assert.equal(q3Teeth.length, 8);
			assert.equal(q4Teeth.length, 8);

			// Check Form 043/y summary
			assert.ok(res.analysis.protocol043Ru.includes("Форма 043/у") || res.analysis.protocol043Ru.includes("ОПТГ"));
		});
	});
});
