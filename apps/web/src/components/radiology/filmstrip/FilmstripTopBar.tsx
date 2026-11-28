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
		<div className="flex items-center justify-between px-3 py-1 bg-[var(--paper)] border-b border-[var(--line)] text-[11px] text-[var(--ink-muted)] h-7 shrink-0">
			<div className="flex items-center gap-2.5">
				<div className="flex items-center gap-1 font-semibold text-[var(--ink)]">
					<Layers size={12} className="text-[var(--primary)]" />
					<span>Лента снимков</span>
					<span className="text-emerald-500 font-bold">({totalCount})</span>
				</div>

				<div className="flex items-center gap-1">
					<span>Режим:</span>
					<select
						value={modalityFilter}
						onChange={(e) => setModalityFilter(e.target.value)}
						className="px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] text-[11px] outline-none cursor-pointer"
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
					<ZoomOut size={12} className="text-[var(--ink-muted)]" />
					<input
						type="range"
						min="70"
						max="150"
						step="5"
						value={cardWidth}
						onChange={(e) => setCardWidth(Number(e.target.value))}
						className="w-16 h-1 bg-[var(--paper-soft)] accent-[var(--primary)] cursor-pointer"
						title="Масштаб превью снимков в ленте"
						data-testid="filmstrip-zoom-slider"
					>
					</input>
					<ZoomIn size={12} className="text-[var(--ink-muted)]" />
				</div>

				<button
					type="button"
					onClick={onScrollLeft}
					className="p-1 rounded hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--line)] cursor-pointer"
					title="Прокрутить влево"
					data-testid="filmstrip-scroll-left"
				>
					<ChevronLeft size={14} />
				</button>
				<button
					type="button"
					onClick={onScrollRight}
					className="p-1 rounded hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--line)] cursor-pointer"
					title="Прокрутить вправо"
					data-testid="filmstrip-scroll-right"
				>
					<ChevronRight size={14} />
				</button>

				{onToggleCollapse && (
					<button
						type="button"
						onClick={onToggleCollapse}
						className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] cursor-pointer ml-1"
						title="Свернуть ленту снимков"
					>
						Свернуть
					</button>
				)}
			</div>
		</div>
	);
}
