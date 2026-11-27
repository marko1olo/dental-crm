/**
 * DENTE CRM — CBCT Canvas Capture & Compression Utilities
 * Compresses canvas frames to WebP/JPEG (0.85 quality) to protect Fastify API from 413 Payload Too Large
 * and reduce IndexedDB/localStorage memory consumption while preserving clinical diagnostic resolution.
 * Standards: Mandate 8b (Sweet Spot 90-130 lines), Mandate 8wx (RAM Guardian).
 */

import type React from "react";
import { clientLogger } from "../../../../services/logging/clientLogger";

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
	} catch (error) {
		// Fallback if browser does not support image/webp export from canvas
		clientLogger.warn("CBCT canvas capture: WebP export unsupported, falling back to JPEG", error);
	}

	try {
		const jpegUrl = canvas.toDataURL("image/jpeg", 0.85);
		if (jpegUrl && jpegUrl.startsWith("data:image/jpeg")) {
			return jpegUrl;
		}
	} catch (error) {
		// Fallback to standard PNG
		clientLogger.warn("CBCT canvas capture: JPEG export failed, falling back to PNG", error);
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
	} catch (error) {
		// Canvas capture can fail on tainted or uninitialized headless surfaces
		clientLogger.warn("CBCT canvas capture: DOM/ref slice capture failed", error);
	}

	return null;
}
