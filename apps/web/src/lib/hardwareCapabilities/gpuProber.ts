/**
 * hardwareCapabilities/gpuProber.ts — Layer 1: GPU Architecture Probing & Fillrate Benchmark
 *
 * Implements GPU detection, WebGL debug info extraction, WebGPU adapter enumeration,
 * hybrid dual-GPU discovery (NVIDIA Optimus), and safe WebGL context teardown.
 */

import type { HardwareGpuType } from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../safeLocalStorage";
import type { GpuDetails, HybridGpuDetectionResult, WebGpuAdapterInfo } from "./types";
import { WEBGPU_ADAPTER_STORAGE_KEY } from "./constants";

let cachedGpuDetails: GpuDetails | null = null;
let cachedWebGpuInfo: WebGpuAdapterInfo | null = null;
let cachedFillrateScore: number | null = null;

/**
 * Classifies GPU architecture from unmasked renderer and vendor strings.
 */
export function classifyGpuArchitecture(
	renderer: string | null,
	vendor: string | null,
): HardwareGpuType {
	const raw = `${vendor ?? ""} ${renderer ?? ""}`.toLowerCase();
	if (!raw.trim()) return "unknown";
	const str = raw.replace(/\((r|tm)\)/gi, " ").replace(/\s+/g, " ");

	// 1. Software rasterizers
	if (
		str.includes("swiftshader") ||
		str.includes("llvmpipe") ||
		str.includes("softpipe") ||
		str.includes("software rasterizer") ||
		str.includes("basic render") ||
		str.includes("microsoft basic")
	) {
		return "software";
	}

	// 2. Apple Silicon (M1/M2/M3/M4 / Apple GPU)
	if (
		str.includes("apple") &&
		(str.includes("m1") ||
			str.includes("m2") ||
			str.includes("m3") ||
			str.includes("m4") ||
			str.includes("gpu"))
	) {
		return "apple_silicon";
	}

	// 3. Discrete GPUs (NVIDIA, AMD Radeon RX/Pro, Intel Arc)
	if (
		str.includes("nvidia") ||
		str.includes("geforce") ||
		str.includes("quadro") ||
		str.includes("rtx") ||
		str.includes("gtx") ||
		(str.includes("radeon") &&
			(str.includes("rx") || str.includes("pro") || str.includes("xt"))) ||
		str.includes("arc ") ||
		str.includes("arc(") ||
		str.includes("arc a") ||
		str.includes("intel arc") ||
		str.includes("iris xe max")
	) {
		return "discrete";
	}

	// 4. Integrated GPUs (Intel HD/UHD/Iris, AMD Radeon APU, mobile GPUs)
	if (
		str.includes("intel") ||
		str.includes("hd graphics") ||
		str.includes("uhd graphics") ||
		str.includes("iris") ||
		str.includes("adreno") ||
		str.includes("mali") ||
		str.includes("powervr") ||
		str.includes("radeon")
	) {
		return "integrated";
	}

	return "unknown";
}

/**
 * Evaluates whether a WebGPU adapter description/vendor represents a high-performance discrete GPU.
 */
export function classifyWebGpuAdapter(
	info: Partial<WebGpuAdapterInfo> | null | undefined,
): boolean {
	if (!info) return false;
	const raw = `${info.vendor ?? ""} ${info.architecture ?? ""} ${info.device ?? ""} ${info.description ?? ""}`.toLowerCase();
	if (!raw.trim()) return false;
	const str = raw.replace(/\((r|tm)\)/gi, " ").replace(/\s+/g, " ");

	return (
		str.includes("nvidia") ||
		str.includes("geforce") ||
		str.includes("quadro") ||
		str.includes("rtx") ||
		str.includes("gtx") ||
		(str.includes("radeon") &&
			(str.includes("rx") || str.includes("pro") || str.includes("xt") || str.includes("discrete"))) ||
		str.includes("arc ") ||
		str.includes("arc(") ||
		str.includes("arc a") ||
		str.includes("intel arc") ||
		str.includes("iris xe max")
	);
}

/**
 * Detects hybrid dual-GPU topologies (e.g. Intel Iris/UHD iGPU primary + NVIDIA RTX/AMD dGPU).
 * If a discrete GPU is discovered via WebGPU DXGI enumeration or ANGLE, marks the system
 * for auto-promotion to high-performance tier (Ultra/Balanced) so doctor CBCT 3D volume
 * raymarching does not run in crippled low-spec mode.
 */
export function detectHybridGpuStatus(
	webglRenderer: string | null,
	webglVendor: string | null,
	webgpuInfo: WebGpuAdapterInfo | null,
): HybridGpuDetectionResult {
	const webglArch = classifyGpuArchitecture(webglRenderer, webglVendor);

	// Scenario 1: WebGL already runs directly on a discrete GPU
	if (webglArch === "discrete") {
		return {
			isHybridGraphics: false,
			primaryRenderer: webglRenderer,
			discreteGpuRenderer: webglRenderer,
			hybridGraphicsNotice: null,
			shouldPromoteToDiscrete: false,
		};
	}

	// Scenario 2: Discrete GPU detected via WebGPU DXGI adapter auto-awakening
	if (webgpuInfo && (webgpuInfo.isDiscrete || classifyWebGpuAdapter(webgpuInfo))) {
		const discreteName =
			webgpuInfo.description ||
			webgpuInfo.architecture ||
			webgpuInfo.vendor ||
			"NVIDIA / AMD Discrete Accelerator";

		return {
			isHybridGraphics: true,
			primaryRenderer: webglRenderer,
			discreteGpuRenderer: discreteName,
			hybridGraphicsNotice: `Обнаружен аппаратный ускоритель ${discreteName} (WebGPU DXGI). Высокопроизводительный профиль КЛКТ активирован автоматически.`,
			shouldPromoteToDiscrete: true,
		};
	}

	// Scenario 3: Running on integrated GPU (Intel HD/UHD/Iris, AMD APU) with no discrete GPU awakened
	if (webglArch === "integrated") {
		return {
			isHybridGraphics: false,
			primaryRenderer: webglRenderer,
			discreteGpuRenderer: null,
			hybridGraphicsNotice:
				"Активен базовый рендер (Intel iGPU). Для ноутбуков с двойной графикой (NVIDIA Optimus) назначьте браузеру режим «Высокая производительность» в параметрах графики Windows.",
			shouldPromoteToDiscrete: false,
		};
	}

	// Scenario 4: Apple Silicon, Software or Unknown
	return {
		isHybridGraphics: false,
		primaryRenderer: webglRenderer,
		discreteGpuRenderer: null,
		hybridGraphicsNotice: null,
		shouldPromoteToDiscrete: false,
	};
}

/**
 * Probes WebGPU adapter with 'high-performance' power preference.
 * On dual-GPU laptops (NVIDIA Optimus / AMD Enduro), this signals the OS/DXGI runtime
 * to query the discrete GPU, causing it to report its device description (e.g. RTX 3060).
 */
export async function probeWebGpuAdapter(): Promise<WebGpuAdapterInfo | null> {
	if (cachedWebGpuInfo !== null) {
		return cachedWebGpuInfo;
	}

	// Check local storage persistence first
	try {
		const stored = safeLocalStorageGetItem(WEBGPU_ADAPTER_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as WebGpuAdapterInfo;
			if (parsed && typeof parsed.isDiscrete === "boolean") {
				cachedWebGpuInfo = parsed;
				return parsed;
			}
		}
	} catch {
		// ignore
	}

	if (typeof navigator === "undefined" || !("gpu" in navigator) || !(navigator as any).gpu) {
		return null;
	}

	try {
		const gpu = (navigator as any).gpu;
		if (!gpu || typeof gpu.requestAdapter !== "function") {
			return null;
		}
		const adapter = await gpu.requestAdapter({
			powerPreference: "high-performance",
		});
		if (!adapter) {
			return null;
		}

		let rawInfo: any = null;
		if ("info" in adapter && (adapter as any).info) {
			rawInfo = (adapter as any).info;
		} else if (typeof (adapter as any).requestAdapterInfo === "function") {
			rawInfo = await (adapter as any).requestAdapterInfo();
		}

		const vendor = typeof rawInfo?.vendor === "string" ? rawInfo.vendor : null;
		const architecture = typeof rawInfo?.architecture === "string" ? rawInfo.architecture : null;
		const device = typeof rawInfo?.device === "string" ? rawInfo.device : null;
		const description = typeof rawInfo?.description === "string" ? rawInfo.description : null;

		const isDiscrete = classifyWebGpuAdapter({ vendor, architecture, device, description });

		const result: WebGpuAdapterInfo = {
			vendor,
			architecture,
			device,
			description,
			isDiscrete,
		};

		cachedWebGpuInfo = result;

		try {
			safeLocalStorageSetItem(WEBGPU_ADAPTER_STORAGE_KEY, JSON.stringify(result));
		} catch {
			// ignore storage quota
		}

		return result;
	} catch {
		return null;
	}
}

export function getCachedWebGpuInfo(): WebGpuAdapterInfo | null {
	if (cachedWebGpuInfo !== null) return cachedWebGpuInfo;
	try {
		const stored = safeLocalStorageGetItem(WEBGPU_ADAPTER_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as WebGpuAdapterInfo;
			if (parsed && typeof parsed.isDiscrete === "boolean") {
				cachedWebGpuInfo = parsed;
				return parsed;
			}
		}
	} catch {
		// ignore
	}
	return null;
}

/**
 * Probes WebGL 1/2 capabilities and safely tears down the context
 * via WEBGL_lose_context to avoid exhausting the browser's context pool.
 */
export function detectGpuDetails(): GpuDetails {
	if (cachedGpuDetails !== null) {
		return cachedGpuDetails;
	}

	if (typeof document === "undefined" && typeof OffscreenCanvas === "undefined") {
		return {
			renderer: null,
			vendor: null,
			gpuType: "unknown",
			webgl2Supported: false,
			maxTextureSize: null,
			max3dTextureSize: null,
		};
	}

	let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
	let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
	let isWebgl2 = false;

	try {
		if (typeof OffscreenCanvas !== "undefined") {
			canvas = new OffscreenCanvas(32, 32);
		} else if (typeof document !== "undefined") {
			canvas = document.createElement("canvas");
			canvas.width = 32;
			canvas.height = 32;
		}

		if (canvas) {
			try {
				gl = canvas.getContext("webgl2", {
					powerPreference: "high-performance",
					desynchronized: true,
				}) as WebGL2RenderingContext | null;
				if (gl) isWebgl2 = true;
			} catch {
				gl = null;
			}

			if (!gl) {
				try {
					gl = (canvas.getContext("webgl", {
						powerPreference: "high-performance",
						desynchronized: true,
					}) ||
						canvas.getContext("experimental-webgl" as any, {
							powerPreference: "high-performance",
							desynchronized: true,
						})) as WebGLRenderingContext | null;
				} catch {
					gl = null;
				}
			}
		}

		if (!gl) {
			const fallback: GpuDetails = {
				renderer: null,
				vendor: null,
				gpuType: "unknown",
				webgl2Supported: false,
				maxTextureSize: null,
				max3dTextureSize: null,
			};
			cachedGpuDetails = fallback;
			return fallback;
		}

		let renderer: string | null = null;
		let vendor: string | null = null;

		try {
			const ext = gl.getExtension("WEBGL_debug_renderer_info") as {
				UNMASKED_RENDERER_WEBGL: number;
				UNMASKED_VENDOR_WEBGL: number;
			} | null;

			if (ext) {
				const r = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
				if (typeof r === "string" && r.trim().length > 0) renderer = r.trim();
				const v = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
				if (typeof v === "string" && v.trim().length > 0) vendor = v.trim();
			}
		} catch {
			// Extension blocked by security/privacy policy
		}

		if (!renderer) {
			try {
				const r = gl.getParameter(gl.RENDERER);
				if (typeof r === "string" && r.trim().length > 0) renderer = r.trim();
			} catch {
				// ignore
			}
		}

		if (!vendor) {
			try {
				const v = gl.getParameter(gl.VENDOR);
				if (typeof v === "string" && v.trim().length > 0) vendor = v.trim();
			} catch {
				// ignore
			}
		}

		let maxTextureSize: number | null = null;
		let max3dTextureSize: number | null = null;

		try {
			const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
			if (typeof maxTex === "number") maxTextureSize = maxTex;
		} catch {
			// ignore
		}

		if (isWebgl2 && "MAX_3D_TEXTURE_SIZE" in gl) {
			try {
				const max3d = gl.getParameter((gl as WebGL2RenderingContext).MAX_3D_TEXTURE_SIZE);
				if (typeof max3d === "number") max3dTextureSize = max3d;
			} catch {
				// ignore
			}
		}

		const gpuType = classifyGpuArchitecture(renderer, vendor);

		const result: GpuDetails = {
			renderer,
			vendor,
			gpuType,
			webgl2Supported: isWebgl2,
			maxTextureSize,
			max3dTextureSize,
		};
		cachedGpuDetails = result;
		return result;
	} finally {
		// Mandatory context teardown (Blind-Spot Radar #2)
		if (gl) {
			try {
				const loseExt = gl.getExtension("WEBGL_lose_context") as {
					loseContext: () => void;
				} | null;
				loseExt?.loseContext();
			} catch {
				// ignore teardown errors
			}
		}
	}
}

/**
 * Runs a micro-benchmark (rendering 3 simple color fills on an offscreen canvas)
 * to measure GPU raster fillrate without triggering browser Long Tasks (>20ms).
 */
export function runFillrateMicroBenchmark(): number | null {
	if (cachedFillrateScore !== null) {
		return cachedFillrateScore;
	}
	if (typeof document === "undefined" && typeof OffscreenCanvas === "undefined") {
		return null;
	}
	if (typeof performance === "undefined" || typeof performance.now !== "function") {
		return null;
	}

	let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
	let gl: WebGLRenderingContext | null = null;

	try {
		if (typeof OffscreenCanvas !== "undefined") {
			canvas = new OffscreenCanvas(128, 128);
		} else if (typeof document !== "undefined") {
			canvas = document.createElement("canvas");
			canvas.width = 128;
			canvas.height = 128;
		}
		if (!canvas) return null;

		gl = (canvas.getContext("webgl", { powerPreference: "high-performance" }) ||
			canvas.getContext("experimental-webgl" as any, { powerPreference: "high-performance" })) as WebGLRenderingContext | null;
		if (!gl) return null;

		const t0 = performance.now();
		gl.viewport(0, 0, 128, 128);

		for (let i = 0; i < 3; i++) {
			gl.clearColor((i * 0.3) % 1.0, 0.4, 0.7, 1.0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.finish();
		}
		const durationMs = performance.now() - t0;

		let score = 50;
		if (durationMs <= 2.5) {
			score = 100;
		} else if (durationMs <= 6.0) {
			score = 80;
		} else if (durationMs <= 14.0) {
			score = 50;
		} else if (durationMs <= 25.0) {
			score = 25;
		} else {
			score = 10;
		}

		cachedFillrateScore = score;
		return score;
	} catch {
		return null;
	} finally {
		if (gl) {
			try {
				const loseExt = gl.getExtension("WEBGL_lose_context") as {
					loseContext: () => void;
				} | null;
				loseExt?.loseContext();
			} catch {
				// ignore
			}
		}
	}
}

// ============================================================================
// TEST HOOKS & INTERNAL CACHE INJECTION
// ============================================================================

export function _setCachedGpuDetailsForTests(details: GpuDetails | null): void {
	cachedGpuDetails = details;
}

export function _setCachedFillrateScoreForTests(score: number | null): void {
	cachedFillrateScore = score;
}

export function _setCachedWebGpuInfoForTests(info: WebGpuAdapterInfo | null): void {
	cachedWebGpuInfo = info;
}

export function _resetGpuProberStateForTests(): void {
	cachedGpuDetails = null;
	cachedFillrateScore = null;
	cachedWebGpuInfo = null;
}
