import React from "react";
import { ChevronLeft, ChevronRight, Layers, ZoomIn, ZoomOut } from "lucide-react";

export interface FilmstripTopBarProps {
	totalCount: number;
	modalityFilter: string;
	setModalityFilter: (val: string) => void;
	cardWidth: number;
	setCardWidth: (val: number) => void;
	onScrollLeft: () => void;
	onScrollRight: () => void;
	onToggleCollapse?: (() => void) | undefined;
}

export function FilmstripTopBar({
	totalCount, modalityFilter, setModalityFilter, cardWidth, setCardWidth,
	onScrollLeft, onScrollRight, onToggleCollapse,
}: FilmstripTopBarProps) {
	return (
		<div className="flex items-center justify-between px-3 py-1 bg-[#0b1320] border-b border-[#1e293b] text-[11px] text-[#94a3b8] h-7 shrink-0">
			<div className="flex items-center gap-2.5">
				<div className="flex items-center gap-1 font-semibold text-slate-200">
					<Layers size={12} className="text-[#00C853]" />
					<span>ЛЕНТА СНИМКОВ</span>
					<span className="text-[#10b981] font-bold">({totalCount})</span>
				</div>

				<div className="flex items-center gap-1">
					<span>Режим:</span>
					<select
						value={modalityFilter}
						onChange={(e) => setModalityFilter(e.target.value)}
						className="px-1.5 py-0.5 rounded bg-[#1e293b] text-slate-200 border border-[#334155] text-[11px] outline-none cursor-pointer"
						data-testid="filmstrip-modality-filter"
					>
						<option value="all">Все режимы</option>
						<option value="io">IO-сенсор (RVG)</option>
						<option value="pano">Панорама (ОПТГ)</option>
						<option value="cbct">КТ 3D (КЛКТ)</option>
					</select>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1.5 mr-2">
					<ZoomOut size={12} className="text-slate-400" />
					<input
						type="range"
						min="70"
						max="150"
						step="5"
						value={cardWidth}
						onChange={(e) => setCardWidth(Number(e.target.value))}
						className="w-16 h-1 bg-[#1e293b] accent-[#00C853] cursor-pointer"
						title="Масштаб превью снимков в ленте"
						data-testid="filmstrip-zoom-slider"
					>
					</input>
					<ZoomIn size={12} className="text-slate-400" />
				</div>

				<button
					type="button"
					onClick={onScrollLeft}
					className="p-1 rounded hover:bg-[#1e293b] text-slate-300 border border-[#1e293b] cursor-pointer"
					title="Прокрутить влево"
					data-testid="filmstrip-scroll-left"
				>
					<ChevronLeft size={14} />
				</button>
				<button
					type="button"
					onClick={onScrollRight}
					className="p-1 rounded hover:bg-[#1e293b] text-slate-300 border border-[#1e293b] cursor-pointer"
					title="Прокрутить вправо"
					data-testid="filmstrip-scroll-right"
				>
					<ChevronRight size={14} />
				</button>

				{onToggleCollapse && (
					<button
						type="button"
						onClick={onToggleCollapse}
						className="px-1.5 py-0.5 rounded text-[10px] bg-[#1e293b] hover:bg-[#334155] text-slate-300 cursor-pointer ml-1"
						title="Свернуть ленту снимков"
					>
						Свернуть
					</button>
				)}
			</div>
		</div>
	);
}
