/**
 * BeforeAfterSplitter.tsx
 * DENTE Dental CRM — Chairside Before & After Splitter (Wiper Slider).
 */

import React from "react";
import { MoveHorizontal, Maximize2, Minimize2, ArrowLeftRight, RotateCcw, X } from "lucide-react";
import { useBeforeAfterSplitter } from "./useBeforeAfterSplitter.js";
import { BeforeAfterPhotoDrawer } from "./BeforeAfterPhotoDrawer.js";
import { BeforeAfterViewport } from "./BeforeAfterViewport.js";
import type { BeforeAfterSplitterProps } from "./beforeAfterTypes.js";

export * from "./beforeAfterTypes.js";

export const BeforeAfterSplitter: React.FC<BeforeAfterSplitterProps> = ({
	beforeUrl, afterUrl, beforeLabel = "ДО", afterLabel = "ПОСЛЕ",
	photos = [], onClose, compact = false, className = "",
}) => {
	const s = useBeforeAfterSplitter(beforeUrl, afterUrl, photos);

	return (
		<div
			className={`flex flex-col bg-[var(--paper)] border border-[var(--line)] rounded-xl overflow-hidden shadow-lg select-none ${
				s.isFullscreen ? "fixed inset-0 z-50 rounded-none border-0" : compact ? "w-full" : "w-full max-w-4xl mx-auto"
			} ${className}`}
		>
			<div className="flex items-center justify-between px-3 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)]">
				<div className="flex items-center gap-2">
					<MoveHorizontal className="w-4 h-4 text-[var(--accent)]" />
					<span className="text-xs font-semibold text-[var(--ink)]">Сравнение снимков До / После</span>
					<span className="text-[10px] text-[var(--muted)] font-mono">{s.splitPercent}%</span>
				</div>

				<div className="flex items-center gap-1.5">
					{photos.length > 2 && (
						<button
							type="button"
							onClick={() => s.setIsSelectingPhotos((prev) => !prev)}
							className={`text-xs px-2.5 py-1 rounded-md border border-[var(--line)] transition-colors min-h-[32px] flex items-center gap-1 ${s.isSelectingPhotos ? "bg-[var(--accent)] text-white" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"}`}
							title="Выбрать снимки для сравнения из списка"
						>
							<span>Выбор снимков</span>
						</button>
					)}
					<button
						type="button"
						onClick={s.handleSwap}
						className="text-xs p-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
						title="Поменять снимки До и После местами"
						aria-label="Поменять местами"
					>
						<ArrowLeftRight className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onClick={() => s.setSplitPercent(50)}
						className="text-xs p-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
						title="Сброс шторки на 50%"
						aria-label="Сброс шторки"
					>
						<RotateCcw className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						onClick={() => s.setIsFullscreen((prev) => !prev)}
						className="text-xs p-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
						title={s.isFullscreen ? "Выйти из полноэкранного режима (Esc)" : "Развернуть на весь экран"}
						aria-label="На весь экран"
					>
						{s.isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
					</button>
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="text-xs p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
							title="Закрыть"
							aria-label="Закрыть"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					)}
				</div>
			</div>

			{s.isSelectingPhotos && photos.length > 0 && (
				<BeforeAfterPhotoDrawer
					photos={photos}
					activeBeforeUrl={s.activeBeforeUrl}
					activeAfterUrl={s.activeAfterUrl}
					onSelectBefore={s.setActiveBeforeUrl}
					onSelectAfter={s.setActiveAfterUrl}
				/>
			)}

			<BeforeAfterViewport
				containerRef={s.containerRef}
				splitPercent={s.splitPercent}
				isFullscreen={s.isFullscreen}
				activeBeforeUrl={s.activeBeforeUrl}
				activeAfterUrl={s.activeAfterUrl}
				beforeLabel={beforeLabel}
				afterLabel={afterLabel}
				onPointerDown={s.handlePointerDown}
				onPointerMove={s.handlePointerMove}
				onPointerUp={s.handlePointerUp}
				onWheel={s.handleWheel}
				onKeyDown={s.handleKeyDown}
			/>

			<div className="px-3 py-1.5 bg-[var(--paper-soft)] border-t border-[var(--line)] text-[10px] text-[var(--muted)] flex items-center justify-between">
				<span>Перетаскивайте шторку мышью или колесиком для сравнения</span>
				<span className="font-mono">Клавиши: ← / →</span>
			</div>
		</div>
	);
};
