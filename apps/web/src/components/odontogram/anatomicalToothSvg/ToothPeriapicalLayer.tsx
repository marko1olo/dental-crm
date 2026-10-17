/**
 * DENTE Dental CRM — Anatomical Tooth Periapical Pathology Layer
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import { PERIAPICAL_LESION_SIZES } from "../ToothSVGPaths";

export interface ToothPeriapicalLayerProps {
	apexHalos: readonly { readonly x: number; readonly y: number }[];
	effectiveLesionSize: number;
}

export const ToothPeriapicalLayer: React.FC<ToothPeriapicalLayerProps> = ({
	apexHalos,
	effectiveLesionSize,
}) => {
	if (effectiveLesionSize <= 0) return null;

	return (
		<g className="tooth-periapical-pathology pointer-events-none">
			{apexHalos.map((apex, i) => (
				<g key={`${apex.x}-${apex.y}-${i}`}>
					<circle
						cx={apex.x}
						cy={apex.y}
						r={effectiveLesionSize}
						fill="url(#dente-granuloma-radial)"
						stroke="#991b1b"
						strokeWidth="1.2"
						strokeDasharray="2 1.5"
						opacity={0.88}
					/>
					<circle
						cx={apex.x}
						cy={apex.y}
						r={Math.max(2, effectiveLesionSize * 0.4)}
						fill="#7f1d1d"
						opacity={0.65}
					/>
				</g>
			))}
		</g>
	);
};

export function resolvePeriapicalLesionSize(
	hasPeriapicalLesion: boolean,
	periapicalLesionSize?: "small" | "medium" | "large" | 6 | 10 | 16 | undefined,
): number {
	if (!hasPeriapicalLesion) return 0;
	if (typeof periapicalLesionSize === "number") return periapicalLesionSize;
	if (periapicalLesionSize && PERIAPICAL_LESION_SIZES[periapicalLesionSize]) {
		return PERIAPICAL_LESION_SIZES[periapicalLesionSize];
	}
	return PERIAPICAL_LESION_SIZES.medium ?? 10;
}
