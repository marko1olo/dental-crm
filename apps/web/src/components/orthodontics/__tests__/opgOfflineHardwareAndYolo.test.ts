import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	detectOptimalOpgBackend,
	calculateIoU,
	applyNms,
	decodeYolo11Output,
	LIODON_CLASSES,
} from "../opgAiInferenceService";

describe("OPG Local AI — Hardware Providers & YOLO11 Tensor NMS", () => {
	it("detects and resolves execution provider based on preferences", () => {
		const preferences: Array<"auto" | "webgpu" | "webgl" | "wasm"> = ["auto", "webgpu", "webgl", "wasm"];
		for (const pref of preferences) {
			const info = detectOptimalOpgBackend(pref);
			assert.ok(["webgpu", "webgl", "wasm"].includes(info.backend));
			assert.ok(info.labelRu.length > 0);
			assert.ok(info.badge.length > 0);
		}
		const wasm = detectOptimalOpgBackend("wasm");
		assert.equal(wasm.backend, "wasm");
		assert.equal(wasm.badge, "CPU");
	});

	it("correctly identifies Liodon clinical pathology class mappings", () => {
		assert.equal(LIODON_CLASSES[0], "caries");
		assert.equal(LIODON_CLASSES[1], "periapical_lesion");
		assert.equal(LIODON_CLASSES[2], "impacted_tooth");
	});

	it("calculates IoU correctly for identical, overlapping, and disjoint boxes", () => {
		const b1 = { x1: 10, y1: 10, x2: 50, y2: 50 };
		const b2 = { x1: 10, y1: 10, x2: 50, y2: 50 };
		assert.equal(calculateIoU(b1, b2), 1.0);

		const b3 = { x1: 100, y1: 100, x2: 150, y2: 150 };
		assert.equal(calculateIoU(b1, b3), 0.0);

		const b4 = { x1: 30, y1: 10, x2: 70, y2: 50 };
		const iou = calculateIoU(b1, b4);
		assert.ok(iou > 0.3 && iou < 0.4);
	});

	it("applies NMS to suppress duplicate overlapping pathology boxes", () => {
		const detections = [
			{ id: "c1", label: "caries" as const, confidence: 0.92, x1: 100, y1: 100, x2: 140, y2: 140, cx: 120, cy: 120 },
			{ id: "c2", label: "caries" as const, confidence: 0.75, x1: 102, y1: 101, x2: 141, y2: 139, cx: 121, cy: 120 },
			{ id: "imp1", label: "impacted_tooth" as const, confidence: 0.88, x1: 400, y1: 200, x2: 460, y2: 260, cx: 430, cy: 230 },
		];
		const filtered = applyNms(detections, 0.45);
		assert.equal(filtered.length, 2);
		assert.equal(filtered[0]?.id, "c1");
		assert.equal(filtered[1]?.id, "imp1");
	});

	it("decodes raw YOLO11 tensor [1, 7, 8400] into accurate clinical bounding boxes", () => {
		const numAnchors = 8400;
		const numChannels = 7;
		const tensor = new Float32Array(numChannels * numAnchors);

		const a = 42;
		tensor[0 * numAnchors + a] = 320;
		tensor[1 * numAnchors + a] = 300;
		tensor[2 * numAnchors + a] = 40;
		tensor[3 * numAnchors + a] = 50;
		tensor[4 * numAnchors + a] = 0.89;

		const a2 = 500;
		tensor[0 * numAnchors + a2] = 120;
		tensor[1 * numAnchors + a2] = 400;
		tensor[2 * numAnchors + a2] = 60;
		tensor[3 * numAnchors + a2] = 70;
		tensor[6 * numAnchors + a2] = 0.94;

		const decoded = decodeYolo11Output(tensor, 1280, 720, 0.25, 0.45);
		assert.equal(decoded.length, 2);
		const impacted = decoded.find((d) => d.label === "impacted_tooth");
		const caries = decoded.find((d) => d.label === "caries");
		assert.ok(impacted);
		assert.ok(caries);
		assert.equal(caries.cx, 640);
		assert.equal(impacted.cx, 240);
	});
});
