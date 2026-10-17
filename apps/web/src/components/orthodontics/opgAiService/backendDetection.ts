import { getHardwareResourceTier } from "../../../utils/deviceDetection";
import { detectGpuPerformanceTier } from "../../../utils/rafThrottler";
import type { OpgAiBackend, OpgBackendInfo } from "./types";

export function detectOptimalOpgBackend(
	preference: "auto" | "webgpu" | "webgl" | "wasm" = "auto",
): OpgBackendInfo {
	const hasNav = typeof navigator !== "undefined";
	const hasWebGpu = hasNav && "gpu" in navigator && Boolean((navigator as unknown as { gpu?: unknown }).gpu);

	let hasWebGL = false;
	if (typeof document !== "undefined") {
		try {
			const c = document.createElement("canvas");
			hasWebGL = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
		} catch {
			hasWebGL = false;
		}
	}

	const hardwareTier = getHardwareResourceTier();
	const gpuTier = detectGpuPerformanceTier();

	let resolvedBackend: OpgAiBackend = "wasm";
	let isDiscrete = false;

	if (preference === "webgpu") {
		resolvedBackend = hasWebGpu ? "webgpu" : hasWebGL ? "webgl" : "wasm";
		isDiscrete = hasWebGpu;
	} else if (preference === "webgl") {
		resolvedBackend = hasWebGL ? "webgl" : "wasm";
	} else if (preference === "wasm") {
		resolvedBackend = "wasm";
	} else {
		if (hasWebGpu && (hardwareTier === "high" || gpuTier === "high")) {
			resolvedBackend = "webgpu";
			isDiscrete = true;
		} else if (hasWebGL) {
			resolvedBackend = "webgl";
		} else {
			resolvedBackend = "wasm";
		}
	}

	const labels: Record<OpgAiBackend, string> = {
		webgpu: "WebGPU (Аппаратный)",
		webgl: "WebGL 2.0 (Графический)",
		wasm: "WASM (Процессорный SIMD)",
	};

	const badges: Record<OpgAiBackend, string> = {
		webgpu: "WebGPU",
		webgl: "WebGL",
		wasm: "CPU",
	};

	return {
		backend: resolvedBackend,
		labelRu: labels[resolvedBackend],
		badge: badges[resolvedBackend],
		isDiscreteGpu: isDiscrete,
		descriptionRu: "Локальный браузерный движок анализа ОПТГ",
	};
}
