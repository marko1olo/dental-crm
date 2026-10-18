import React, { useRef, useState, useMemo } from "react";
import { Layers } from "lucide-react";
import type { RadiologyStudy } from "./types.js";
import {
	FilmstripTopBar, FilmstripStudyCard,
	type RadiologyFilmstripItem, type RadiologyFilmstripDockProps,
} from "./filmstrip/index.js";

export * from "./filmstrip/index.js";

export const RadiologyFilmstripDock: React.FC<RadiologyFilmstripDockProps> = ({
	studies, activeStudyId, onSelectStudy, onDoubleClickStudy,
	className = "", isCollapsed = false, onToggleCollapse,
}) => {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [cardWidth, setCardWidth] = useState<number>(100);
	const [modalityFilter, setModalityFilter] = useState<string>("all");

	const filteredStudies = useMemo(() => {
		return studies.filter((s) => {
			if (modalityFilter === "all") return true;
			const m = (s.modality || "").toLowerCase();
			if (modalityFilter === "io") return m.includes("io") || m.includes("rvg") || m.includes("sensor");
			if (modalityFilter === "pano") return m.includes("pano") || m.includes("optg");
			if (modalityFilter === "cbct") return m.includes("cbct") || m.includes("3d") || m.includes("кт");
			return true;
		});
	}, [studies, modalityFilter]);

	const handleScrollLeft = () => {
		scrollContainerRef.current?.scrollBy({ left: -220, behavior: "smooth" });
	};

	const handleScrollRight = () => {
		scrollContainerRef.current?.scrollBy({ left: 220, behavior: "smooth" });
	};

	if (isCollapsed) {
		return (
			<div
				data-testid="radiology-filmstrip-dock-collapsed"
				className={`radiology-filmstrip-dock-collapsed flex items-center justify-between px-3 py-1 bg-[var(--paper-soft,#0f172a)] border-t border-[var(--line,#334155)] text-xs text-[var(--ink,#94a3b8)] h-7 ${className}`}
			>
				<div className="flex items-center gap-2">
					<Layers size={13} className="text-[#00C853]" />
					<span className="font-semibold text-slate-200">Лента снимков ({filteredStudies.length})</span>
				</div>
				{onToggleCollapse && (
					<button
						type="button"
						onClick={onToggleCollapse}
						className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1e293b] hover:bg-[#334155] text-slate-300 border border-[#334155] cursor-pointer"
					>
						Развернуть
					</button>
				)}
			</div>
		);
	}

	return (
		<div
			data-testid="radiology-filmstrip-dock"
			className={`radiology-filmstrip-dock flex flex-col bg-[#070b14] border-t border-[#1e293b] select-none ${className}`}
			style={{ minHeight: "120px", maxHeight: "155px" }}
		>
			<FilmstripTopBar
				totalCount={filteredStudies.length}
				modalityFilter={modalityFilter}
				setModalityFilter={setModalityFilter}
				cardWidth={cardWidth}
				setCardWidth={setCardWidth}
				onScrollLeft={handleScrollLeft}
				onScrollRight={handleScrollRight}
				onToggleCollapse={onToggleCollapse}
			/>

			<div
				ref={scrollContainerRef}
				className="flex items-center gap-2 px-3 py-1.5 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-[#334155] scrollbar-track-transparent flex-1"
				data-testid="filmstrip-items-container"
				style={{ scrollBehavior: "smooth" }}
			>
				{filteredStudies.length === 0 ? (
					<div className="flex items-center justify-center w-full h-full text-xs text-slate-400 py-3">
						Нет доступных снимков для отображения
					</div>
				) : (
					filteredStudies.map((study) => (
						<FilmstripStudyCard
							key={study.id}
							study={study}
							isActive={activeStudyId === study.id}
							cardWidth={cardWidth}
							onSelect={() => onSelectStudy(study)}
							onDoubleClick={() => onDoubleClickStudy?.(study)}
						/>
					))
				)}
			</div>
		</div>
	);
};
