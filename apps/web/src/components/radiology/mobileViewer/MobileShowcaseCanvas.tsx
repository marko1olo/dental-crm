import { Sparkles } from "lucide-react";
import React from "react";
import type { ImagingStudy } from "../../imaging/types.js";

export interface MobileShowcaseCanvasProps {
	comparisonMode: "single" | "split";
	effectivePreviewUrl?: string | null | undefined;
	computedFilter: string;
	comparisonStudy?: ImagingStudy | null | undefined;
}

export const MobileShowcaseCanvas: React.FC<MobileShowcaseCanvasProps> = ({
	comparisonMode,
	effectivePreviewUrl,
	computedFilter,
	comparisonStudy,
}) => {
	return (
		<div className="flex-1 flex flex-col items-center justify-center my-3 relative overflow-hidden">
			{comparisonMode === "single" || !comparisonStudy ? (
				<div className="w-full h-full max-h-[60vh] flex flex-col items-center justify-center relative">
					{effectivePreviewUrl ? (
						<img
							src={effectivePreviewUrl}
							alt="Снимок для пациента"
							className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10"
							style={{ filter: computedFilter }}
						/>
					) : (
						<div className="w-64 h-64 rounded-2xl bg-slate-900 border border-teal-500/30 flex items-center justify-center text-teal-400 text-sm font-semibold text-center p-4">
							Интраоральный снимок готов к объяснению плана лечения
						</div>
					)}
					<div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-sm border border-teal-500/40 text-xs font-bold text-teal-300 flex items-center gap-1.5">
						<Sparkles size={14} />
						<span>Фокус внимания врача</span>
					</div>
				</div>
			) : (
				<div className="w-full h-full max-h-[60vh] grid grid-cols-2 gap-2">
					<div className="relative flex flex-col items-center justify-center bg-slate-950 rounded-2xl overflow-hidden border border-white/10">
						<div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-bold text-slate-300 font-mono">
							ДО ЛЕЧЕНИЯ
						</div>
						{comparisonStudy.previewUrl ? (
							<img
								src={comparisonStudy.previewUrl}
								alt="До лечения"
								className="w-full h-full object-contain"
							/>
						) : (
							<span className="text-xs text-slate-500">Архивный снимок</span>
						)}
					</div>
					<div className="relative flex flex-col items-center justify-center bg-slate-950 rounded-2xl overflow-hidden border border-teal-500/40">
						<div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-teal-600/90 text-[10px] font-bold text-white font-mono">
							СЕГОДНЯ
						</div>
						{effectivePreviewUrl ? (
							<img
								src={effectivePreviewUrl}
								alt="Текущий снимок"
								className="w-full h-full object-contain"
								style={{ filter: computedFilter }}
							/>
						) : (
							<span className="text-xs text-slate-500">Текущий снимок</span>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
