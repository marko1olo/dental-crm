/**
 * CbctHeaderLayoutButtons.tsx — Кнопки переключения раскладки, фуллскрина и закрытия (Мандат 8b).
 */

import React from "react";
import { Columns2, Columns3, Grid2X2, Maximize2, Minimize2, X } from "lucide-react";
import type { ViewLayoutMode } from "../cbctStudioTypes";

export interface CbctHeaderLayoutButtonsProps {
	readonly viewLayout: ViewLayoutMode;
	readonly setViewLayout: (layout: ViewLayoutMode) => void;
	readonly isFullscreen: boolean;
	readonly handleToggleFullscreenModal: () => void;
	readonly onClose: () => void;
}

export const CbctHeaderLayoutButtons: React.FC<CbctHeaderLayoutButtonsProps> = ({
	viewLayout,
	setViewLayout,
	isFullscreen,
	handleToggleFullscreenModal,
	onClose,
}) => {
	return (
		<div className="flex items-center gap-1 flex-shrink-0">
			<div className="hidden md:flex items-center gap-0.5 bg-[var(--paper)] p-0.5 rounded-lg border border-[var(--line)]">
				<button
					type="button"
					onClick={() => setViewLayout("quad_view")}
					className={`p-1.5 rounded transition-colors ${viewLayout === "quad_view" ? "bg-[var(--primary)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
					title="Сетка 2×2 (Аксиальный, Сагиттальный, Коронарный, 3D)"
				>
					<Grid2X2 className="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onClick={() => setViewLayout("axial_primary")}
					className={`p-1.5 rounded transition-colors ${viewLayout === "axial_primary" ? "bg-[var(--primary)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
					title="Крупный аксиальный срез"
				>
					<Columns2 className="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onClick={() => setViewLayout("pano_cross")}
					className={`p-1.5 rounded transition-colors ${viewLayout === "pano_cross" ? "bg-[var(--primary)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
					title="Панорама + Кросс-секция"
				>
					<Columns3 className="w-3.5 h-3.5" />
				</button>
			</div>

			<button
				type="button"
				onClick={handleToggleFullscreenModal}
				className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)]/50 text-[var(--text)] flex items-center justify-center transition-colors"
				title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
			>
				{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
			</button>

			<button
				type="button"
				onClick={onClose}
				className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--danger)]/15 hover:text-[var(--danger)] text-[var(--text)] flex items-center justify-center transition-colors"
				title="Закрыть 3D-просмотрщик"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
};
