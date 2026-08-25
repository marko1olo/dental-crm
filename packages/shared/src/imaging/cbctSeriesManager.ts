/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LARGE CBCT SERIES GPU MEMORY MANAGEMENT & WEBGL TEXTURE DISPOSAL
 * Prevents VRAM exhaustion and GPU Context Lost for > 400 slice series
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface CbctSeriesVramStats {
	readonly sliceCount: number;
	readonly width: number;
	readonly height: number;
	readonly bytesPerPixel: number;
	readonly bytesPerSlice: number;
	readonly totalVramBytes: number;
	readonly totalVramMb: number;
	readonly exceedsBudget: boolean;
}

export const DEFAULT_MAX_CBCT_VRAM_BUDGET_MB = 512.0;

/**
 * Calculates accurate VRAM footprint for large CBCT series in MB.
 */
export function calculateCbctVramUsage(
	sliceCount: number,
	width = 512,
	height = 512,
	bytesPerPixel = 2, // 16-bit DICOM
	maxVramBudgetMb = DEFAULT_MAX_CBCT_VRAM_BUDGET_MB,
): CbctSeriesVramStats {
	const validSlices = Math.max(0, sliceCount);
	const validWidth = Math.max(1, width);
	const validHeight = Math.max(1, height);
	const validBpp = Math.max(1, bytesPerPixel);

	const bytesPerSlice = validWidth * validHeight * validBpp;
	const totalVramBytes = validSlices * bytesPerSlice;
	const totalVramMb = Number((totalVramBytes / (1024 * 1024)).toFixed(2));
	const exceedsBudget = totalVramMb > maxVramBudgetMb;

	return {
		sliceCount: validSlices,
		width: validWidth,
		height: validHeight,
		bytesPerPixel: validBpp,
		bytesPerSlice,
		totalVramBytes,
		totalVramMb,
		exceedsBudget,
	};
}

/**
 * Determines whether a CBCT series exceeds the specified GPU memory budget.
 */
export function isVramBudgetExceeded(
	sliceCount: number,
	width = 512,
	height = 512,
	maxVramBudgetMb = DEFAULT_MAX_CBCT_VRAM_BUDGET_MB,
	bytesPerPixel = 2,
): boolean {
	return calculateCbctVramUsage(sliceCount, width, height, bytesPerPixel, maxVramBudgetMb).exceedsBudget;
}

export interface WebGlDisposalReport {
	readonly texturesDisposed: number;
	readonly buffersDisposed: number;
	readonly programsDisposed: number;
	readonly framebuffersDisposed: number;
	readonly contextLostTriggered: boolean;
	readonly estimatedVramFreedMb: number;
}

/**
 * Safely unloads and deletes an array of WebGL textures in batch from GPU VRAM.
 */
export function disposeCbctSeriesTextures(
	gl: any,
	textures: readonly (any | null | undefined)[],
	width = 512,
	height = 512,
	bytesPerPixel = 2,
): { readonly texturesDisposed: number; readonly estimatedVramFreedMb: number } {
	let texturesDisposed = 0;
	if (!gl || typeof gl.deleteTexture !== "function") {
		return { texturesDisposed: 0, estimatedVramFreedMb: 0 };
	}

	for (const tex of textures) {
		if (tex) {
			try {
				gl.deleteTexture(tex);
				texturesDisposed++;
			} catch {
				// Continue safely on disposal
			}
		}
	}

	const bytesPerSlice = width * height * bytesPerPixel;
	const vramFreedBytes = texturesDisposed * bytesPerSlice;
	const estimatedVramFreedMb = Number((vramFreedBytes / (1024 * 1024)).toFixed(2));

	return {
		texturesDisposed,
		estimatedVramFreedMb,
	};
}

/**
 * Fully purges WebGL / Canvas resources (textures, buffers, shaders, framebuffers)
 * and triggers loseContext to prevent GPU memory leaks across sessions.
 */
export function disposeFullWebGlPipeline(
	gl: any,
	resources?: {
		readonly textures?: readonly (any | null | undefined)[];
		readonly buffers?: readonly (any | null | undefined)[];
		readonly programs?: readonly (any | null | undefined)[];
		readonly framebuffers?: readonly (any | null | undefined)[];
		readonly sliceWidth?: number;
		readonly sliceHeight?: number;
		readonly bytesPerPixel?: number;
	},
): WebGlDisposalReport {
	let texturesDisposed = 0;
	let buffersDisposed = 0;
	let programsDisposed = 0;
	let framebuffersDisposed = 0;
	let contextLostTriggered = false;

	if (!gl) {
		return {
			texturesDisposed: 0,
			buffersDisposed: 0,
			programsDisposed: 0,
			framebuffersDisposed: 0,
			contextLostTriggered: false,
			estimatedVramFreedMb: 0,
		};
	}

	// 1. Textures
	if (resources?.textures && typeof gl.deleteTexture === "function") {
		for (const tex of resources.textures) {
			if (tex) {
				try {
					gl.deleteTexture(tex);
					texturesDisposed++;
				} catch {
					// Ignore
				}
			}
		}
	}

	// 2. Buffers
	if (resources?.buffers && typeof gl.deleteBuffer === "function") {
		for (const buf of resources.buffers) {
			if (buf) {
				try {
					gl.deleteBuffer(buf);
					buffersDisposed++;
				} catch {
					// Ignore
				}
			}
		}
	}

	// 3. Programs
	if (resources?.programs && typeof gl.deleteProgram === "function") {
		for (const prog of resources.programs) {
			if (prog) {
				try {
					gl.deleteProgram(prog);
					programsDisposed++;
				} catch {
					// Ignore
				}
			}
		}
	}

	// 4. Framebuffers
	if (resources?.framebuffers && typeof gl.deleteFramebuffer === "function") {
		for (const fb of resources.framebuffers) {
			if (fb) {
				try {
					gl.deleteFramebuffer(fb);
					framebuffersDisposed++;
				} catch {
					// Ignore
				}
			}
		}
	}

	// 5. Trigger loseContext
	try {
		const loseExt = gl.getExtension ? gl.getExtension("WEBGL_lose_context") : null;
		if (loseExt && typeof loseExt.loseContext === "function") {
			loseExt.loseContext();
			contextLostTriggered = true;
		}
	} catch {
		// Ignore if not supported
	}

	const width = resources?.sliceWidth ?? 512;
	const height = resources?.sliceHeight ?? 512;
	const bpp = resources?.bytesPerPixel ?? 2;
	const vramFreedMb = Number(
		((texturesDisposed * width * height * bpp) / (1024 * 1024)).toFixed(2),
	);

	return {
		texturesDisposed,
		buffersDisposed,
		programsDisposed,
		framebuffersDisposed,
		contextLostTriggered,
		estimatedVramFreedMb: vramFreedMb,
	};
}
