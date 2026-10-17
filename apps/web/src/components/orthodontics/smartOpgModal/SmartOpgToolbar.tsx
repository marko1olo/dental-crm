import React from "react";
import { Layers, AlertTriangle, Eye, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface SmartOpgToolbarProps {
	showFdiLabels: boolean;
	onToggleFdiLabels: () => void;
	showPathologies: boolean;
	onTogglePathologies: () => void;
	isPatientMode: boolean;
	onTogglePatientMode: () => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onResetZoom: () => void;
}

export const SmartOpgToolbar: React.FC<SmartOpgToolbarProps> = ({
	showFdiLabels,
	onToggleFdiLabels,
	showPathologies,
	onTogglePathologies,
	isPatientMode,
	onTogglePatientMode,
	onZoomIn,
	onZoomOut,
	onResetZoom,
}) => {
	return (
		<div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-20 flex flex-wrap items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-[var(--paper-strong)]/95 backdrop-blur-md rounded-xl border border-[var(--line)] shadow-lg text-[var(--ink)]">
			<button
				type="button"
				onClick={onToggleFdiLabels}
				className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[44px] sm:min-h-[36px] transition-colors cursor-pointer ${
					showFdiLabels
						? "bg-sky-500 text-white shadow-xs"
						: "text-[var(--ink)] hover:bg-[var(--paper-hover,#f1f5f9)]"
				}`}
			>
				<Layers className="w-3.5 h-3.5" />
				Номера FDI
			</button>

			<button
				type="button"
				onClick={onTogglePathologies}
				className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[44px] sm:min-h-[36px] transition-colors cursor-pointer ${
					showPathologies
						? "bg-rose-500 text-white shadow-xs"
						: "text-[var(--ink)] hover:bg-[var(--paper-hover,#f1f5f9)]"
				}`}
			>
				<AlertTriangle className="w-3.5 h-3.5" />
				Патологии
			</button>

			<button
				type="button"
				onClick={onTogglePatientMode}
				className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[44px] sm:min-h-[36px] transition-colors cursor-pointer ${
					isPatientMode
						? "bg-emerald-500 text-white shadow-xs"
						: "text-[var(--ink)] hover:bg-[var(--paper-hover,#f1f5f9)]"
				}`}
			>
				<Eye className="w-3.5 h-3.5" />
				Для пациента
			</button>

			<div className="h-4 w-px bg-[var(--line)] mx-1" />

			<button
				type="button"
				onClick={onZoomIn}
				className="p-1.5 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-[var(--ink)] hover:bg-[var(--paper-hover,#f1f5f9)] transition-colors cursor-pointer"
				title="Увеличить"
			>
				<ZoomIn className="w-4 h-4" />
			</button>
			<button
				type="button"
				onClick={onZoomOut}
				className="p-1.5 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-[var(--ink)] hover:bg-[var(--paper-hover,#f1f5f9)] transition-colors cursor-pointer"
				title="Уменьшить"
			>
				<ZoomOut className="w-4 h-4" />
			</button>
			<button
				type="button"
				onClick={onResetZoom}
				className="p-1.5 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-[var(--ink)] hover:bg-[var(--paper-hover,#f1f5f9)] transition-colors cursor-pointer"
				title="Сброс масштаба"
			>
				<RotateCcw className="w-4 h-4" />
			</button>
		</div>
	);
};
