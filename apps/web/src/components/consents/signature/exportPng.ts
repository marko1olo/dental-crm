import type { SignatureStroke } from "./types";
import { drawAllStrokesOnCanvas } from "./canvas";
import { PAPER_SIGNATURE_FALLBACK_PNG } from "../consentIntegrityHash";

export function exportSignatureToPng(
	strokes: SignatureStroke[],
	width = 400,
	height = 140,
	options: {
		backgroundColor?: string | undefined;
		strokeColor?: string | undefined;
		dpr?: number | undefined;
	} = {},
): string {
	if (typeof document === "undefined") {
		return PAPER_SIGNATURE_FALLBACK_PNG;
	}
	try {
		const canvas = document.createElement("canvas");
		drawAllStrokesOnCanvas(canvas, strokes, {
			backgroundColor: options.backgroundColor ?? "#ffffff",
			defaultColor: options.strokeColor ?? "#0f172a",
			dpr: options.dpr ?? 1,
			width,
			height,
		});
		return canvas.toDataURL("image/png");
	} catch {
		return PAPER_SIGNATURE_FALLBACK_PNG;
	}
}
