import React, { useMemo } from "react";
import { type CbctViewportType, ROMEXIS_COLORS, getViewportOrientationLabels } from "../cbctMprMath";

export interface OrientationCube3DProps {
	readonly viewportType: CbctViewportType;
	readonly size?: number | undefined;
}

export const OrientationCube3D: React.FC<OrientationCube3DProps> = ({ viewportType, size = 48 }) => {
	const labels = useMemo(() => getViewportOrientationLabels(viewportType), [viewportType]);
	const activeColor = labels.planeColor;

	return (
		<div
			className="relative flex flex-col items-center justify-center select-none pointer-events-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] opacity-60 hover:opacity-100 transition-opacity"
			title={`3D Ориентационный компас: ${labels.planeNameRu}`}
			data-testid={`cbct-orientation-cube-${viewportType}`}
		>
			<svg width={size} height={size} viewBox="-30 -30 60 60" className="overflow-visible">
				<polygon
					points="0,-22 20,-11 0,0 -20,-11"
					fill={viewportType === "axial" ? activeColor : "#18181b"}
					fillOpacity={viewportType === "axial" ? 0.85 : 0.5}
					stroke={viewportType === "axial" ? activeColor : "#27272a"}
					strokeWidth="1.2"
				/>
				<text
					x="0" y="-10" textAnchor="middle" dominantBaseline="middle"
					fill={viewportType === "axial" ? "#ffffff" : "#a1a1aa"}
					fontSize="8" fontWeight="bold" fontFamily="monospace"
				>
					{viewportType === "axial" ? "A" : "S"}
				</text>

				<polygon
					points="-20,-11 0,0 0,22 -20,11"
					fill={viewportType === "coronal" || viewportType === "sagittal" ? activeColor : "#09090b"}
					fillOpacity={viewportType === "coronal" || viewportType === "sagittal" ? 0.85 : 0.5}
					stroke={viewportType === "coronal" || viewportType === "sagittal" ? activeColor : "#27272a"}
					strokeWidth="1.2"
				/>
				<text
					x="-10" y="6" textAnchor="middle" dominantBaseline="middle"
					fill={viewportType === "coronal" || viewportType === "sagittal" ? "#ffffff" : "#71717a"}
					fontSize="8" fontWeight="bold" fontFamily="monospace"
				>
					{viewportType === "axial" ? "R" : viewportType === "coronal" ? "R" : "A"}
				</text>

				<polygon
					points="0,0 20,-11 20,11 0,22"
					fill={viewportType === "panoramic" || viewportType === "cross_section" ? activeColor : "#18181b"}
					fillOpacity={viewportType === "panoramic" || viewportType === "cross_section" ? 0.85 : 0.5}
					stroke={viewportType === "panoramic" || viewportType === "cross_section" ? activeColor : "#27272a"}
					strokeWidth="1.2"
				/>
				<text
					x="10" y="6" textAnchor="middle" dominantBaseline="middle"
					fill={viewportType === "panoramic" || viewportType === "cross_section" ? "#ffffff" : "#71717a"}
					fontSize="8" fontWeight="bold" fontFamily="monospace"
				>
					{viewportType === "sagittal" ? "P" : "L"}
				</text>

				<line x1="0" y1="0" x2="0" y2="-26" stroke={ROMEXIS_COLORS.axial} strokeWidth="1.5" strokeLinecap="round" />
				<circle cx="0" cy="-26" r="1.5" fill={ROMEXIS_COLORS.axial} />
				<line x1="0" y1="0" x2="-23" y2="13" stroke={ROMEXIS_COLORS.coronal} strokeWidth="1.5" strokeLinecap="round" />
				<circle cx="-23" cy="13" r="1.5" fill={ROMEXIS_COLORS.coronal} />
				<line x1="0" y1="0" x2="23" y2="13" stroke={ROMEXIS_COLORS.sagittal} strokeWidth="1.5" strokeLinecap="round" />
				<circle cx="23" cy="13" r="1.5" fill={ROMEXIS_COLORS.sagittal} />
			</svg>
		</div>
	);
};
