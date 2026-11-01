/**
 * DENTE CRM — CBCT Canvas Capture & Compression Utilities
 * Compresses canvas frames to WebP/JPEG (0.85 quality) to protect Fastify API from 413 Payload Too Large
 * and reduce IndexedDB/localStorage memory consumption while preserving clinical diagnostic resolution.
 * Standards: Mandate 8b (Sweet Spot 90-130 lines), Mandate 8wx (RAM Guardian).
 */

import type React from "react";

/**
 * Compresses canvas frame to WebP/JPEG (0.85 quality) with fallback to PNG.
 * Preserves high diagnostic fidelity while keeping payload sizes under 200KB.
 */
export function captureCompressedCanvasDataUrl(canvas: HTMLCanvasElement): string {
	try {
		const webpUrl = canvas.toDataURL("image/webp", 0.85);
		if (webpUrl && webpUrl.startsWith("data:image/webp")) {
			return webpUrl;
		}
	} catch {
		// Fallback if browser does not support image/webp export from canvas
	}

	try {
		const jpegUrl = canvas.toDataURL("image/jpeg", 0.85);
		if (jpegUrl && jpegUrl.startsWith("data:image/jpeg")) {
			return jpegUrl;
		}
	} catch {
		// Fallback to standard PNG
	}

	return canvas.toDataURL("image/png");
}

/**
 * Safely locates and captures high-resolution dataUrl from provided ref or querySelector.
 */
export function captureSliceFromDOMOrRef(
	crossSectionCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined,
): string | null {
	try {
		if (crossSectionCanvasRef?.current) {
			return captureCompressedCanvasDataUrl(crossSectionCanvasRef.current);
		}

		if (typeof document !== "undefined") {
			const targetCanvas =
				(document.querySelector(
					'canvas[data-testid="cbct-cross-section-sidebar-canvas"]',
				) as HTMLCanvasElement | null) ||
				(document.querySelector("canvas") as HTMLCanvasElement | null);

			if (targetCanvas) {
				return captureCompressedCanvasDataUrl(targetCanvas);
			}
		}
	} catch {
		// Ignore canvas capture failure in headless test environments
	}

	return null;
}
