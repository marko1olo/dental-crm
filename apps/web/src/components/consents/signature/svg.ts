import type {
	SignaturePoint,
	SignatureStroke,
} from "./types";
import { computeMidpoint } from "./geometry";

const DEFAULT_MIN_WIDTH = 1.2;
const DEFAULT_MAX_WIDTH = 3.5;

export function renderStrokeToSvgPath(points: SignaturePoint[]): string {
	if (!points || points.length === 0) return "";
	const first = points[0];
	if (!first) return "";
	if (points.length === 1) {
		return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
	}
	if (points.length === 2) {
		const second = points[1];
		if (!second) return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
		return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} L ${second.x.toFixed(2)} ${second.y.toFixed(2)}`;
	}

	let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
	for (let i = 1; i < points.length - 1; i++) {
		const current = points[i];
		const next = points[i + 1];
		if (!current || !next) continue;
		const mid = computeMidpoint(current, next);
		path += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)}, ${mid.x.toFixed(2)} ${mid.y.toFixed(2)}`;
	}
	const last = points[points.length - 1];
	if (last) {
		path += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
	}
	return path;
}

export function exportSignatureToSvg(
	strokes: SignatureStroke[],
	width: number,
	height: number,
	options: {
		strokeColor?: string | undefined;
		strokeWidth?: number | undefined;
		backgroundColor?: string | undefined;
		viewBox?: string | undefined;
	} = {},
): string {
	const strokeColor = options.strokeColor || "#0f172a";
	const bg = options.backgroundColor ? `<rect width="100%" height="100%" fill="${options.backgroundColor}"/>` : "";
	const pathStrings: string[] = [];

	for (const stroke of strokes) {
		const points = stroke.points;
		if (!points || points.length === 0) continue;

		const first = points[0];
		if (!first) continue;

		if (points.length === 1 || stroke.isDot) {
			const r = (options.strokeWidth ?? DEFAULT_MAX_WIDTH) / 2;
			pathStrings.push(`<circle cx="${first.x.toFixed(2)}" cy="${first.y.toFixed(2)}" r="${r.toFixed(2)}" fill="${strokeColor}"/>`);
			continue;
		}

		if (points.length === 2) {
			const second = points[1];
			if (!second) continue;
			pathStrings.push(
				`<path d="M ${first.x.toFixed(2)} ${first.y.toFixed(2)} L ${second.x.toFixed(2)} ${second.y.toFixed(2)}" stroke="${strokeColor}" stroke-width="${(options.strokeWidth ?? DEFAULT_MIN_WIDTH).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
			);
			continue;
		}

		const pathData = renderStrokeToSvgPath(points);
		const sw = stroke.width || options.strokeWidth || 2.2;
		pathStrings.push(
			`<path d="${pathData}" stroke="${strokeColor}" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
		);
	}

	const vb = options.viewBox || `0 0 ${width} ${height}`;

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${width}" height="${height}">\n  ${bg}\n  ${pathStrings.join("\n  ")}\n</svg>`;
}
