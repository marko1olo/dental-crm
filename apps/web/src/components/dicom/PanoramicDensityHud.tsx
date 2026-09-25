import React from "react";
import type { classifyMischBoneDensity } from "./panoramicMprMath";

export interface PanoramicDensityHudProps {
	readonly boneRecommendation: ReturnType<typeof classifyMischBoneDensity> | null;
	readonly probedHU: number | null;
}

export const PanoramicDensityHud: React.FC<PanoramicDensityHudProps> = ({
	boneRecommendation,
	probedHU,
}) => {
	if (!boneRecommendation) return null;

	return (
		<div className="mpr-density-hud">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<span
						className={`mpr-density-badge ${
							boneRecommendation.mischClass === "D1"
								? "mpr-badge-d1"
								: boneRecommendation.mischClass === "D2"
									? "mpr-badge-d2"
									: boneRecommendation.mischClass === "D3"
										? "mpr-badge-d3"
										: boneRecommendation.mischClass === "D4"
											? "mpr-badge-d4"
											: "mpr-badge-d5"
						}`}
					>
						{boneRecommendation.mischClass}
					</span>
					<span className="text-xs font-bold text-white">
						{boneRecommendation.label}
					</span>
				</div>
				<span className="text-sm font-black text-[var(--teal)]">
					{probedHU} HU
				</span>
			</div>

			<p className="text-[12px] text-neutral-300 leading-snug">
				{boneRecommendation.clinicalAdvice}
			</p>

			<div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 border-t border-neutral-800 pt-1.5">
				<span>Обороты: {boneRecommendation.drillingRpm}</span>
				<span>Торк: {boneRecommendation.torqueNcm}</span>
				{boneRecommendation.corticalTap && (
					<span className="text-red-400">МЕТЧИК ОБЯЗАТЕЛЕН</span>
				)}
				{boneRecommendation.underDrilling && (
					<span className="text-amber-400">НЕДОПРЕПАРИРОВАНИЕ</span>
				)}
			</div>
		</div>
	);
};
