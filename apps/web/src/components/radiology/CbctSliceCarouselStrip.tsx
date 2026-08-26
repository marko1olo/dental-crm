import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import type { CrossSectionBoneProfile } from "./cbctCrossSectionEngine";

export interface CbctSliceCarouselStripProps {
	slices: CrossSectionBoneProfile[];
	activeSliceIndex: number;
	onSelectSlice: (index: number) => void;
}

export const CbctSliceCarouselStrip: React.FC<CbctSliceCarouselStripProps> = ({
	slices,
	activeSliceIndex,
	onSelectSlice,
}) => {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const activeItemRef = useRef<HTMLButtonElement>(null);

	// Auto-scroll active card into view
	useEffect(() => {
		if (activeItemRef.current && scrollContainerRef.current) {
			activeItemRef.current.scrollIntoView({
				behavior: "smooth",
				block: "nearest",
				inline: "center",
			});
		}
	}, [activeSliceIndex]);

	const handleScrollLeft = () => {
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollBy({ left: -220, behavior: "smooth" });
		}
	};

	const handleScrollRight = () => {
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollBy({ left: 220, behavior: "smooth" });
		}
	};

	return (
		<div className="relative flex items-center w-full bg-slate-950/80 border-t border-slate-800 p-2 gap-2 select-none">
			{/* Left navigation button (>= 44x44px touch target) */}
			<button
				type="button"
				onClick={() => {
					handleScrollLeft();
					if (activeSliceIndex > 0) onSelectSlice(activeSliceIndex - 1);
				}}
				disabled={activeSliceIndex <= 0}
				className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-[var(--teal,#06b6d4)] hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all shrink-0 z-10"
				title="Предыдущий срез (Стрелка влево)"
				aria-label="Предыдущий срез"
			>
				<ChevronLeft className="w-5 h-5" />
			</button>

			{/* Scrollable Slice Carousel */}
			<div
				ref={scrollContainerRef}
				className="flex-1 flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
				data-testid="cbct-slice-carousel"
			>
				{slices.map((slice) => {
					const isActive = slice.sliceIndex === activeSliceIndex;

					// Determine safety dot color
					let dotColorClass = "bg-emerald-400";
					if (slice.nerveClearance) {
						if (slice.nerveClearance.isDanger) dotColorClass = "bg-rose-500 animate-pulse";
						else if (slice.nerveClearance.isWarning) dotColorClass = "bg-amber-400";
					} else if (slice.sinusClearance) {
						if (slice.sinusClearance.status === "severe_atrophy_two_stage") dotColorClass = "bg-rose-500";
						else if (slice.sinusClearance.status === "lateral_window_indicated") dotColorClass = "bg-amber-400";
						else if (slice.sinusClearance.status === "crestal_lift_indicated") dotColorClass = "bg-cyan-400";
					}

					return (
						<button
							key={`slice-thumb-${slice.sliceIndex}`}
							ref={isActive ? activeItemRef : null}
							type="button"
							onClick={() => onSelectSlice(slice.sliceIndex)}
							className={`flex flex-col min-w-[100px] min-h-[44px] p-2 rounded-xl border text-left transition-all shrink-0 active:scale-95 cursor-pointer ${
								isActive
									? "bg-[var(--teal-surface,#083344)] border-[var(--teal,#06b6d4)] text-white shadow-[0_0_12px_rgba(6,182,212,0.35)] ring-1 ring-[var(--teal,#06b6d4)]"
									: "bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
							}`}
							data-testid={`slice-thumb-${slice.sliceIndex}`}
						>
							<div className="flex items-center justify-between gap-1 w-full">
								<span className="text-[11px] font-bold text-slate-300">
									#{slice.sliceIndex + 1}
								</span>
								{slice.fdiTooth && (
									<span
										className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
											isActive
												? "bg-[var(--teal,#06b6d4)] text-slate-950"
												: "bg-slate-800 text-slate-300"
										}`}
									>
										{slice.fdiTooth}
									</span>
								)}
								<span className={`w-2 h-2 rounded-full ${dotColorClass}`} />
							</div>

							<div className="flex items-center justify-between text-[10px] mt-1 gap-1">
								<span className={isActive ? "text-cyan-200 font-semibold" : "text-slate-400"}>
									H:{slice.crestBoneHeightMm}
								</span>
								<span className={isActive ? "text-purple-200 font-semibold" : "text-slate-400"}>
									W:{slice.crestalWidthMm}
								</span>
							</div>
						</button>
					);
				})}
			</div>

			{/* Right navigation button (>= 44x44px touch target) */}
			<button
				type="button"
				onClick={() => {
					handleScrollRight();
					if (activeSliceIndex < slices.length - 1) onSelectSlice(activeSliceIndex + 1);
				}}
				disabled={activeSliceIndex >= slices.length - 1}
				className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-[var(--teal,#06b6d4)] hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all shrink-0 z-10"
				title="Следующий срез (Стрелка вправо)"
				aria-label="Следующий срез"
			>
				<ChevronRight className="w-5 h-5" />
			</button>
		</div>
	);
};
