/**
 * DENTE CRM — EzDent-i Clinical Filmstrip Dock Component
 * Horizontal persistent bottom preview dock for 2D/3D radiology studies.
 * Standards: EzDent-i clinical screenshots 15, 16, 22, 25; Mandate 8b (<=800 lines); Mandate 8c; Desktop density.
 */

import React, { useRef, useState, useMemo } from "react";
import {
	Activity,
	Box,
	Camera,
	ChevronLeft,
	ChevronRight,
	Clock,
	Layers,
	Maximize2,
	Scan,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type { RadiologyStudy } from "./types.js";

export interface RadiologyFilmstripItem {
	readonly id: string;
	readonly title?: string;
	readonly modality: "intraoral_rvg" | "optg_panoramic" | "cbct_3d" | "trg_ceph" | "photo_clinical" | string;
	readonly modalityLabel?: string;
	readonly studyDate: string; // ISO date or "DD.MM.YYYY HH:mm:ss"
	readonly teethFdi?: string[];
	readonly imageUrl?: string;
	readonly thumbnailUrl?: string;
	readonly effectiveDoseMicrosv?: number;
	readonly apparatusModel?: string;
}

export interface RadiologyFilmstripDockProps {
	readonly studies: readonly (RadiologyStudy | RadiologyFilmstripItem)[];
	readonly activeStudyId: string | null;
	readonly onSelectStudy: (study: RadiologyStudy | RadiologyFilmstripItem) => void;
	readonly onDoubleClickStudy?: (study: RadiologyStudy | RadiologyFilmstripItem) => void;
	readonly className?: string;
	readonly isCollapsed?: boolean;
	readonly onToggleCollapse?: () => void;
}

export function formatFilmstripDateTime(rawDate: string): { dateStr: string; timeStr: string } {
	if (!rawDate) return { dateStr: "—", timeStr: "—" };

	// Case 1: already formatted as DD.MM.YYYY HH:mm:ss
	if (/^\d{2}\.\d{2}\.\d{4}/.test(rawDate)) {
		const parts = rawDate.split(" ");
		return {
			dateStr: parts[0] || rawDate,
			timeStr: parts[1] || "",
		};
	}

	// Case 2: Parse ISO or other date string
	try {
		const d = new Date(rawDate);
		if (!Number.isNaN(d.getTime())) {
			const day = String(d.getDate()).padStart(2, "0");
			const month = String(d.getMonth() + 1).padStart(2, "0");
			const year = d.getFullYear();
			const hours = String(d.getHours()).padStart(2, "0");
			const mins = String(d.getMinutes()).padStart(2, "0");
			const secs = String(d.getSeconds()).padStart(2, "0");
			return {
				dateStr: `${day}.${month}.${year}`,
				timeStr: `${hours}:${mins}:${secs}`,
			};
		}
	} catch {
		// Fallback
	}

	return { dateStr: rawDate, timeStr: "" };
}

export function getModalityBadge(modality: string): { label: string; bg: string; color: string } {
	const norm = modality.toLowerCase();
	if (norm.includes("intraoral") || norm.includes("rvg") || norm.includes("io") || norm.includes("sensor")) {
		return { label: "IO-СЕНСОР", bg: "rgba(16, 185, 129, 0.2)", color: "#10b981" };
	}
	if (norm.includes("optg") || norm.includes("pano") || norm.includes("панорам")) {
		return { label: "ПАНОРАМА", bg: "rgba(6, 182, 212, 0.2)", color: "#06b6d4" };
	}
	if (norm.includes("cbct") || norm.includes("3d") || norm.includes("кт")) {
		return { label: "КЛКТ 3D", bg: "rgba(99, 102, 241, 0.2)", color: "#818cf8" };
	}
	if (norm.includes("ceph") || norm.includes("trg") || norm.includes("трг")) {
		return { label: "ТРГ", bg: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" };
	}
	return { label: "СНИМОК", bg: "rgba(148, 163, 184, 0.2)", color: "#cbd5e1" };
}

export const RadiologyFilmstripDock: React.FC<RadiologyFilmstripDockProps> = ({
	studies,
	activeStudyId,
	onSelectStudy,
	onDoubleClickStudy,
	className = "",
	isCollapsed = false,
	onToggleCollapse,
}) => {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [cardWidth, setCardWidth] = useState<number>(100); // 70px .. 160px zoom slider
	const [dateFilter, setDateFilter] = useState<string>("all");
	const [modalityFilter, setModalityFilter] = useState<string>("all");

	// Filter studies by date preset and modality
	const filteredStudies = useMemo(() => {
		return studies.filter((s) => {
			if (modalityFilter !== "all") {
				const m = (s.modality || "").toLowerCase();
				if (modalityFilter === "io" && !m.includes("io") && !m.includes("rvg") && !m.includes("sensor")) return false;
				if (modalityFilter === "pano" && !m.includes("pano") && !m.includes("optg")) return false;
				if (modalityFilter === "cbct" && !m.includes("cbct") && !m.includes("3d") && !m.includes("кт")) return false;
			}
			return true;
		});
	}, [studies, modalityFilter]);

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
			{/* Top Sub-Bar: Filters & Card Zoom Slider (EzDent-i Screenshots 16, 22) */}
			<div className="flex items-center justify-between px-3 py-1 bg-[#0b1320] border-b border-[#1e293b] text-[11px] text-[#94a3b8] h-7 shrink-0">
				<div className="flex items-center gap-2.5">
					<div className="flex items-center gap-1 font-semibold text-slate-200">
						<Layers size={12} className="text-[#00C853]" />
						<span>ЛЕНТА СНИМКОВ</span>
						<span className="text-[#10b981] font-bold">({filteredStudies.length})</span>
					</div>

					{/* Modality Filter Dropdown */}
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

				{/* Right: Scroll arrows & Thumbnail Zoom Slider */}
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
						/>
						<ZoomIn size={12} className="text-slate-400" />
					</div>

					<button
						type="button"
						onClick={handleScrollLeft}
						className="p-1 rounded hover:bg-[#1e293b] text-slate-300 border border-[#1e293b] cursor-pointer"
						title="Прокрутить влево"
						data-testid="filmstrip-scroll-left"
					>
						<ChevronLeft size={14} />
					</button>
					<button
						type="button"
						onClick={handleScrollRight}
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

			{/* Horizontal Thumbnails Row */}
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
					filteredStudies.map((study) => {
						const isActive = activeStudyId === study.id;
						const { dateStr, timeStr } = formatFilmstripDateTime(study.studyDate);
						const badge = getModalityBadge(study.modality || "rvg");
						const teethList = study.teethFdi && study.teethFdi.length > 0 ? study.teethFdi : null;
						const primaryTooth = teethList ? teethList[0] : null;
						const imgSrc = study.thumbnailUrl || study.imageUrl;

						return (
							<div
								key={study.id}
								data-testid={`filmstrip-item-${study.id}`}
								onClick={() => onSelectStudy(study)}
								onDoubleClick={() => onDoubleClickStudy && onDoubleClickStudy(study)}
								style={{
									width: `${cardWidth}px`,
									minWidth: `${cardWidth}px`,
									border: isActive ? "3px solid #00C853" : "1px solid #334155",
									boxShadow: isActive ? "0 0 10px rgba(0, 200, 83, 0.45)" : "none",
								}}
								className={`group relative flex flex-col rounded-md overflow-hidden bg-[#0d1424] cursor-pointer transition-all duration-150 shrink-0 ${
									isActive ? "ring-1 ring-[#00C853]" : "hover:border-[#64748b] hover:bg-[#131d31]"
								}`}
							>
								{/* Thumbnail Box */}
								<div
									className="relative w-full bg-black flex items-center justify-center overflow-hidden"
									style={{ height: `${Math.round(cardWidth * 0.72)}px` }}
								>
									{imgSrc ? (
										<img
											src={imgSrc}
											alt={`Снимок ${dateStr}`}
											className="w-full h-full object-cover transition-transform group-hover:scale-105"
											loading="lazy"
										/>
									) : (
										<div className="flex flex-col items-center justify-center w-full h-full text-slate-500">
											<Scan size={20} className="mb-0.5 opacity-60" />
											<span className="text-[9px]">DICOM</span>
										</div>
									)}

									{/* Modality Tag (Top Left of Thumbnail) */}
									<span
										style={{ backgroundColor: badge.bg, color: badge.color }}
										className="absolute top-1 left-1 px-1 py-0.2 rounded font-bold text-[9px] uppercase tracking-wider backdrop-blur-sm"
									>
										{badge.label.replace("-СЕНСОР", "")}
									</span>

									{/* Tooth FDI Tag (Top Right of Thumbnail) */}
									{primaryTooth && (
										<span
											style={{
												backgroundColor: isActive ? "#00C853" : "#0f766e",
												color: isActive ? "#022c15" : "#ccfbf1",
											}}
											className="absolute top-1 right-1 px-1.5 py-0.2 rounded font-black text-[10px] tracking-tight shadow-sm"
											title={`Зуб FDI: ${primaryTooth}`}
											data-testid={`filmstrip-tooth-${primaryTooth}`}
										>
											#{primaryTooth}
										</span>
									)}
								</div>

								{/* Bottom Metadata Block */}
								<div className="flex flex-col p-1 bg-[#0b1320] border-t border-[#1e293b] leading-tight text-[10px]">
									<div className="flex items-center justify-between text-slate-200 font-semibold truncate">
										<span className="truncate">{dateStr}</span>
										{timeStr && <span className="text-slate-400 text-[9px] ml-1">{timeStr}</span>}
									</div>
									<div className="flex items-center justify-between text-slate-400 text-[9px] mt-0.5">
										<span className="truncate">{(study as any).title || (study as any).studyDescription || badge.label}</span>
										{isActive && (
											<span className="text-[#00C853] font-bold text-[8px] uppercase">Активен</span>
										)}
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
};
