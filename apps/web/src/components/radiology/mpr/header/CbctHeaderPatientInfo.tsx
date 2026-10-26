/**
 * CbctHeaderPatientInfo.tsx — Отображение ФИО пациента и параметров объема КЛКТ (Мандат 8b).
 */

import React from "react";
import { DicomCube3D } from "../../../icons/DentalIcons";
import type { CbctVoxelVolume } from "../../cbctMprMath";

export interface CbctHeaderPatientInfoProps {
	readonly resolvedPatientName: string;
	readonly loadedSliceCount: number;
	readonly volume: CbctVoxelVolume | null;
}

export const CbctHeaderPatientInfo: React.FC<CbctHeaderPatientInfoProps> = ({
	resolvedPatientName,
	loadedSliceCount,
	volume,
}) => {
	const dims = volume?.dimensions;
	const spacing = volume?.spacingMm;
	const metaStr = dims && spacing
		? `${dims.width}×${dims.height}×${dims.depth} · ${spacing.z.toFixed(2)} мм`
		: `${loadedSliceCount} срезов`;

	return (
		<div className="flex items-center gap-3 min-w-0 flex-shrink">
			<div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)] flex-shrink-0">
				<DicomCube3D className="w-5 h-5" />
			</div>
			<div className="min-w-0">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold text-[var(--text)] truncate max-w-[200px] sm:max-w-[280px]">
						{resolvedPatientName}
					</h2>
					<span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 whitespace-nowrap">
						3D КЛКТ
					</span>
				</div>
				<p className="text-[11px] text-[var(--text-muted)] truncate">
					{metaStr}
				</p>
			</div>
		</div>
	);
};
