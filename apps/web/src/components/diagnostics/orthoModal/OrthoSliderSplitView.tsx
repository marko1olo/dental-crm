import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface OrthoSliderSplitViewProps {
	beforeImageUrl: string | null;
	currentImageUrl: string | null;
	sliderPosition: number;
	setSliderPosition: (pos: number) => void;
}

export const OrthoSliderSplitView: React.FC<OrthoSliderSplitViewProps> = ({
	beforeImageUrl,
	currentImageUrl,
	sliderPosition,
	setSliderPosition,
}) => {
	return (
		<div className="relative w-full h-72 sm:h-80 rounded-2xl bg-[var(--paper)] border border-[var(--line)] overflow-hidden select-none">
			{/* Before background */}
			<div className="absolute inset-0 flex items-center justify-center bg-[var(--paper-soft)]">
				{beforeImageUrl ? (
					<img src={beforeImageUrl} alt="До" className="w-full h-full object-cover" />
				) : (
					<span className="text-xs text-[var(--muted)]">Загрузите снимок «До» для сравнения</span>
				)}
				<span className="absolute top-3 left-3 bg-amber-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs">
					ДО ЛЕЧЕНИЯ
				</span>
			</div>

			{/* After overlay with clipPath */}
			<div
				className="absolute inset-0 overflow-hidden flex items-center justify-center"
				style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
			>
				{currentImageUrl ? (
					<img src={currentImageUrl} alt="После" className="w-full h-full object-cover" />
				) : (
					<div className="w-full h-full bg-[var(--paper)] flex items-center justify-center">
						<span className="text-xs text-[var(--muted)]">Нет фото После</span>
					</div>
				)}
				<span className="absolute top-3 right-3 bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs">
					ПОСЛЕ / СЕЙЧАС
				</span>
			</div>

			{/* Divider line & handle */}
			<div
				className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize flex items-center justify-center pointer-events-none"
				style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
			>
				<div className="w-7 h-7 rounded-full bg-white text-[var(--ink)] shadow-md flex items-center justify-center border border-[var(--line)]">
					<ChevronLeft size={12} className="-mr-1 text-[var(--muted)]" />
					<ChevronRight size={12} className="-ml-1 text-[var(--muted)]" />
				</div>
			</div>

			{/* Range input overlay */}
			<input
				type="range"
				min={0}
				max={100}
				value={sliderPosition}
				onChange={(e) => setSliderPosition(Number(e.target.value))}
				aria-label="Положение шторки сравнения До/После"
				className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-10"
			/>
		</div>
	);
};
