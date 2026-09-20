/**
 * viewportTeardownHelper.ts
 *
 * Low-Spec GC Invariant (Mandate 8c & Low-RAM Celeron/iGPU):
 * Deterministic disposal of WebGL rendering contexts, 2D canvases, and GPU backing stores
 * when unmounting medical imaging viewports (Cornerstone3D, DICOM RVG, CBCT MPR).
 */

export interface TeardownCanvasOptions {
	readonly loseWebGlContext?: boolean;
	readonly clear2dContext?: boolean;
}

/**
 * Traverses container element, zeros canvas backing store dimensions (width=0, height=0),
 * invokes WEBGL_lose_context extension to force VRAM release, and clears 2D buffers.
 */
export function teardownViewportCanvases(
	container: HTMLElement | null,
	options: TeardownCanvasOptions = { loseWebGlContext: true, clear2dContext: true },
): number {
	if (!container) return 0;
	const canvases = container.querySelectorAll("canvas");
	let cleanedCount = 0;

	canvases.forEach((canvas) => {
		try {
			if (options.loseWebGlContext !== false) {
				const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
				if (gl) {
					const loseContext = (
						gl as WebGLRenderingContext | WebGL2RenderingContext
					).getExtension("WEBGL_lose_context");
					if (loseContext) {
						loseContext.loseContext();
					}
				}
			}

			if (options.clear2dContext !== false) {
				const ctx2d = canvas.getContext("2d");
				if (ctx2d) {
					ctx2d.clearRect(0, 0, canvas.width, canvas.height);
				}
			}
		} catch {
			// Silently handle detached context errors
		}

		// Chromium/Firefox/WebKit releases GPU framebuffer memory immediately when dimensions are zeroed
		canvas.width = 0;
		canvas.height = 0;
		cleanedCount++;
	});

	return cleanedCount;
}
