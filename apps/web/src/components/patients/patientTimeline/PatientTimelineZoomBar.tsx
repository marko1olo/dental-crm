import React from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { ImagingStudy } from "@dental/shared";
import { formatStudyDateKey } from "./types";

export interface PatientTimelineZoomBarProps {
	readonly activeStudy: ImagingStudy | null;
	readonly cardWidth: number;
	readonly onCardWidthChange: (width: number) => void;
}

export const PatientTimelineZoomBar: React.FC<PatientTimelineZoomBarProps> = ({
	activeStudy,
	cardWidth,
	onCardWidthChange,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#0a1120] border-t border-[#1e2d47] text-xs text-slate-400 shrink-0">
			<div className="flex items-center gap-2 min-w-0">
				{activeStudy ? (
					<div className="flex items-center gap-2 truncate">
						<span className="text-[#00C853] font-bold">Выбран:</span>
						<span className="font-semibold text-white truncate">
							{activeStudy.title || "Исследование"}
						</span>
						<span className="text-slate-400 font-mono text-[11px]">
							({formatStudyDateKey(activeStudy.capturedAt || activeStudy.studyDate).formattedDate})
						</span>
						{activeStudy.toothCode && (
							<span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
								Зуб #{activeStudy.toothCode}
							</span>
						)}
					</div>
				) : (
					<span>Выберите снимок для детального просмотра</span>
				)}
			</div>

			<div
				className="flex items-center gap-2 ml-auto"
				data-testid="timeline-zoom-slider-container"
			>
				<span className="text-[11px] text-slate-400 font-semibold">Масштаб превью:</span>
				<ZoomOut className="w-3.5 h-3.5 text-slate-400" />
				<input
					type="range"
					min="90"
					max="260"
					step="10"
					value={cardWidth}
					onChange={(e) => onCardWidthChange(Number(e.target.value))}
					className="w-24 sm:w-32 h-1.5 bg-[#17253d] accent-[#00C853] rounded-lg cursor-pointer"
					title="Регулировка размера карточек снимков (90px - 260px)"
					data-testid="timeline-preview-zoom-slider"
					aria-label="Масштаб превью снимков"
				/>
				<ZoomIn className="w-3.5 h-3.5 text-slate-400" />
				<span className="text-[10px] font-mono text-emerald-400 w-10 text-right">
					{cardWidth}px
				</span>
			</div>
		</div>
	);
};
