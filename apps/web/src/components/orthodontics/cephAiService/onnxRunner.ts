import type { LandmarkKey } from "../cephalometricMath";
import { CLINICAL_16_CHANNELS } from "./channels";
import { decodeHeatmaps } from "./coordTransforms";
import type { CephAiActiveBackend, CephAiLandmarkDetail } from "./types";

interface OrtSession {
	run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array }>>;
}

export async function tryRunOnnxCephModel(
	tensorData: Float32Array,
	backend: CephAiActiveBackend,
	precision: "int8" | "fp32",
	naturalWidth: number,
	naturalHeight: number,
): Promise<{ success: boolean; landmarks?: Record<LandmarkKey, CephAiLandmarkDetail> }> {
	if (typeof window === "undefined") return { success: false };

	const globalAny = window as unknown as {
		ort?: {
			InferenceSession: { create: (url: string, opts: unknown) => Promise<OrtSession> };
			Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown;
		};
	};

	if (!globalAny.ort?.InferenceSession) return { success: false };

	try {
		const modelPath = precision === "fp32"
			? "/models/cephalometric/landmarks-cepha29.onnx"
			: "/models/cephalometric/landmarks-cepha29.int8.onnx";

		const epList = backend === "webgpu"
			? ["webgpu", "wasm"]
			: backend === "webgl"
				? ["webgl", "wasm"]
				: ["wasm"];

		const session = await globalAny.ort.InferenceSession.create(modelPath, {
			executionProviders: epList,
			graphOptimizationLevel: "all",
		});

		const inputTensor = new globalAny.ort.Tensor("float32", tensorData, [1, 3, 768, 768]);
		const outputMap = await session.run({ input: inputTensor });
		const heatmapsTensor = outputMap.heatmaps || Object.values(outputMap)[0];

		if (!heatmapsTensor?.data) return { success: false };

		const decoded29 = decodeHeatmaps(heatmapsTensor.data, 29, 192, 192, 4, naturalWidth, naturalHeight);
		const rawLandmarks: Record<LandmarkKey, CephAiLandmarkDetail> = {} as Record<LandmarkKey, CephAiLandmarkDetail>;

		for (const k of Object.keys(CLINICAL_16_CHANNELS) as LandmarkKey[]) {
			const chInfo = CLINICAL_16_CHANNELS[k];
			const pt = decoded29[chInfo.channel];
			if (pt) {
				rawLandmarks[k] = {
					x: pt.x,
					y: pt.y,
					confidence: pt.confidence,
					nameRu: chInfo.nameRu,
					category: chInfo.category,
					channel: chInfo.channel,
				};
			}
		}
		return { success: true, landmarks: rawLandmarks };
	} catch {
		return { success: false };
	}
}
