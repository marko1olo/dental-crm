import React from "react";
import { Activity, Camera, Download, Loader2, Sparkles, X } from "lucide-react";

export interface PanoramicHeaderProps {
	readonly sliceThicknessMm: number;
	readonly blendMode: "mip" | "average";
	readonly loading: boolean;
	readonly isExporting: boolean;
	readonly onAutoDetectArch: () => void;
	readonly onExportTo043: () => void;
	readonly onLocalDownload: () => void;
	readonly onClose: () => void;
}

export const PanoramicHeader: React.FC<PanoramicHeaderProps> = ({
	sliceThicknessMm,
	blendMode,
	loading,
	isExporting,
	onAutoDetectArch,
	onExportTo043,
	onLocalDownload,
	onClose,
}) => {
	return (
		<div className="mpr-toolbar bg-neutral-900 border-b border-neutral-800 px-3 pr-2 sm:pr-3 py-1.5 flex flex-nowrap justify-between items-center cursor-move handle gap-2 overflow-x-auto no-scrollbar min-h-[36px]">
			<div className="flex items-center gap-2 shrink-0 min-w-0">
				<div className="flex items-center gap-1.5 min-w-0">
					<Activity className="w-4 h-4 text-[var(--teal)] shrink-0" />
					<h3 className="text-white font-bold text-xs sm:text-sm tracking-tight truncate max-w-[180px] sm:max-w-none min-w-0">
						3D MPR & ОПТГ
					</h3>
				</div>
				<span className="text-[11px] font-bold text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded-lg border border-neutral-700 whitespace-nowrap hidden sm:inline-flex shrink-0">
					{sliceThicknessMm > 0
						? `Слой: ${sliceThicknessMm} мм (${blendMode.toUpperCase()})`
						: "Тонкий луч (Ray)"}
				</span>
			</div>

			{/* ACTIONS */}
			<div className="flex items-center gap-1.5 shrink-0 pr-2">
				<button
					type="button"
					onClick={onAutoDetectArch}
					disabled={loading}
					aria-label="Автоматическое определение зубной дуги"
					className="mpr-btn-touch text-xs font-bold bg-indigo-600/80 hover:bg-indigo-600 text-white px-2.5 py-1 rounded-lg border border-indigo-500/50 flex items-center gap-1 transition-all shadow-sm active:scale-95 whitespace-nowrap min-h-[32px]"
					title="Автоматическое определение зубной дуги по MIP срезу КЛКТ"
				>
					<Sparkles className="w-3.5 h-3.5 text-amber-300" />
					<span className="hidden sm:inline">Авто-дуга</span>
				</button>

				<button
					type="button"
					onClick={onExportTo043}
					disabled={loading || isExporting}
					aria-label="Экспорт в форму 043/у"
					className="mpr-btn-touch mpr-btn-success text-xs font-bold px-2.5 py-1 whitespace-nowrap min-h-[32px] flex items-center gap-1"
					title="Прикрепить снимок к амбулаторной карте 043/у"
				>
					{isExporting ? (
						<Loader2 className="w-3.5 h-3.5 animate-spin" />
					) : (
						<Camera className="w-3.5 h-3.5" />
					)}
					<span className="hidden sm:inline">В карту 043/у</span>
				</button>

				<button
					type="button"
					onClick={onLocalDownload}
					disabled={loading}
					aria-label="Скачать снимок"
					className="mpr-btn-touch text-xs font-medium px-2 py-1 min-h-[32px] min-w-[32px]"
					title="Скачать JPG"
				>
					<Download className="w-3.5 h-3.5" />
				</button>

				<button
					type="button"
					onClick={onClose}
					data-testid="panoramic-close-btn"
					aria-label="Закрыть окно панорамы"
					className="text-neutral-400 hover:text-white min-h-[32px] min-w-[32px] inline-flex items-center justify-center p-1 rounded-lg text-base font-bold transition-colors hover:bg-neutral-800"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
};
