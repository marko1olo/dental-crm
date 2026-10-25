import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	cleanupCanvas,
	prepareOpgImageTensor,
	opgAiInferenceService,
} from "../opgAiInferenceService";

describe("OPG Local AI — Memory Lifecycle & E2E Pipeline", () => {
	it("cleanupCanvas resets dimensions without throwing", () => {
		const mockCanvas = { width: 640, height: 640 } as unknown as HTMLCanvasElement;
		cleanupCanvas(mockCanvas);
		assert.equal(mockCanvas.width, 0);
		assert.equal(mockCanvas.height, 0);
		assert.doesNotThrow(() => cleanupCanvas(null));
	});

	it("prepareOpgImageTensor allocates tensor safely in headless environment", async () => {
		const res = await prepareOpgImageTensor("synthetic_path.png", 640, 640);
		assert.equal(res.tensorData.length, 3 * 640 * 640);
		assert.ok(res.naturalWidth > 0);
		assert.ok(res.naturalHeight > 0);
	});

	it("executes local inference and generates clinical analysis without throwing", async () => {
		const res = await opgAiInferenceService.runInference("sample_opg_temur.png", { allowFallback: true });
		assert.ok(res.analysis);
		assert.ok(res.analysis.teeth);
		assert.ok(Object.keys(res.analysis.teeth).length >= 28);
		assert.ok(res.latencyMs >= 16);
		assert.ok(res.isCalibratedFallback);
		assert.equal(res.backend, "wasm");

		const tooth48 = res.analysis.teeth[48];
		assert.ok(tooth48);
		assert.equal(tooth48.status, "Retained");

		assert.ok(res.analysis.protocol043Ru.includes("Медицинская карта") || res.analysis.protocol043Ru.includes("ОПТГ"));
	});
});
