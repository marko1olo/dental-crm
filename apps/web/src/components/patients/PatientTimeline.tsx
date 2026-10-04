/**
 * PatientTimeline.tsx — Хронологический таймлайн исследований пациента (EzDent-i Снимки 15, 16).
 *
 * Архитектурные стандарты:
 * 1. EzDent-i Снимки 15, 16: Хронологическая группировка исследований по датам (26.09.2026, 20.09.2026, 24.03.2026).
 * 2. Разделительные зеленые линии: Каждая дата отделяется четкой горизонтальной зеленой линией #00C853.
 * 3. Активный выбранный снимок: Выделяется яркой 3px зеленой рамкой #00C853, свечением и зеленой плашкой времени.
 * 4. Горизонтальный слайдер зума превью (Нижний угол): Плавное регулирование размера карточек от 90px до 260px.
 * 5. Быстрые фильтры по дате и аппарату: ● Дата [ Все ▾ ], ● Режим раб [ Все ▾ ].
 * 6. 1-клик запуск 3D КЛКТ Студии или 2D DICOM-просмотрщика.
 */

import React, { useMemo, useState } from "react";
import {
	Box,
	Calendar,
	Camera,
	Check,
	ChevronRight,
	Compass,
	Eye,
	Filter,
	Layers,
	Scan,
	Settings,
	Sliders,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type { ImagingStudy } from "@dental/shared";
import {
	matchesDatePreset,
	type TactileDatePreset,
} from "../radiology/RadiologyPatientSearchModal";

export type TimelineDatePreset = "all" | "today" | "yesterday" | "3days" | "last_week" | "last_month";

export const TIMELINE_DATE_PRESETS: Array<{ id: TimelineDatePreset; label: string }> = [
	{ id: "all", label: "Все даты" },
	{ id: "today", label: "Сегодня" },
	{ id: "yesterday", label: "Вчера" },
	{ id: "3days", label: "3 дня" },
	{ id: "last_week", label: "Неделя" },
	{ id: "last_month", label: "Месяц" },
];

export const FDI_TEETH_LIST = [
	"18", "17", "16", "15", "14", "13", "12", "11",
	"21", "22", "23", "24", "25", "26", "27", "28",
	"48", "47", "46", "45", "44", "43", "42", "41",
	"31", "32", "33", "34", "35", "36", "37", "38",
];

export interface PatientTimelineProps {
	readonly studies: readonly ImagingStudy[];
	readonly activeStudyId?: string | null | undefined;
	readonly onSelectStudy?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenStudio?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenViewer?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenControl?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenTactileSearch?: (() => void) | undefined;
	readonly defaultZoomPx?: number | undefined;
	readonly className?: string | undefined;
}

export interface GroupedDateStudies {
	readonly dateKey: string;
	readonly formattedDate: string;
	readonly timestampMs: number;
	readonly items: readonly ImagingStudy[];
}

export function formatStudyDateKey(dateStr: string | null | undefined): {
	dateKey: string;
	formattedDate: string;
	timeStr: string;
	timestampMs: number;
} {
	if (!dateStr) {
		return { dateKey: "undated", formattedDate: "Без даты", timeStr: "", timestampMs: 0 };
	}

	// Case 1: Already DD.MM.YYYY [HH:mm:ss]
	const ruMatch = /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?/.exec(dateStr);
	if (ruMatch) {
		const [, day, month, year, time] = ruMatch;
		const d = new Date(Number(year), Number(month) - 1, Number(day));
		return {
			dateKey: `${year}-${month}-${day}`,
			formattedDate: `${day}.${month}.${year}`,
			timeStr: time || "",
			timestampMs: d.getTime(),
		};
	}

	// Case 2: ISO string or standard parseable date
	try {
		const d = new Date(dateStr);
		if (!Number.isNaN(d.getTime())) {
			const day = String(d.getDate()).padStart(2, "0");
			const month = String(d.getMonth() + 1).padStart(2, "0");
			const year = d.getFullYear();
			const hours = String(d.getHours()).padStart(2, "0");
			const mins = String(d.getMinutes()).padStart(2, "0");
			const secs = String(d.getSeconds()).padStart(2, "0");
			return {
				dateKey: `${year}-${month}-${day}`,
				formattedDate: `${day}.${month}.${year}`,
				timeStr: `${hours}:${mins}:${secs}`,
				timestampMs: d.getTime(),
			};
		}
	} catch {
		// Fallback
	}

	return { dateKey: dateStr, formattedDate: dateStr, timeStr: "", timestampMs: 0 };
}

export function getModalityColor(modality: string | null | undefined): {
	label: string;
	bg: string;
	text: string;
	border: string;
} {
	const norm = (modality || "").toLowerCase();
	if (norm.includes("io") || norm.includes("rvg") || norm.includes("sensor") || norm.includes("сенсор") || norm.includes("periapical")) {
		return { label: "IO-СЕНСОР", bg: "rgba(16, 185, 129, 0.18)", text: "#10b981", border: "rgba(16, 185, 129, 0.4)" };
	}
	if (norm.includes("pano") || norm.includes("opg") || norm.includes("панорам")) {
		return { label: "ПАНОРАМА", bg: "rgba(6, 182, 212, 0.18)", text: "#06b6d4", border: "rgba(6, 182, 212, 0.4)" };
	}
	if (norm.includes("cbct") || norm.includes("3d") || norm.includes("кт")) {
		return { label: "КЛКТ 3D", bg: "rgba(99, 102, 241, 0.18)", text: "#818cf8", border: "rgba(99, 102, 241, 0.4)" };
	}
	if (norm.includes("ceph") || norm.includes("trg") || norm.includes("трг")) {
		return { label: "ТРГ", bg: "rgba(245, 158, 11, 0.18)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.4)" };
	}
	if (norm.includes("camera") || norm.includes("камер") || norm.includes("video")) {
		return { label: "IO-КАМЕРА", bg: "rgba(236, 72, 153, 0.18)", text: "#f472b6", border: "rgba(236, 72, 153, 0.4)" };
	}
	if (norm.includes("photo") || norm.includes("фото") || norm.includes("twain")) {
		return { label: "ДРУГОЕ", bg: "rgba(168, 85, 247, 0.18)", text: "#c084fc", border: "rgba(168, 85, 247, 0.4)" };
	}
	return { label: "СНИМОК", bg: "rgba(148, 163, 184, 0.18)", text: "#cbd5e1", border: "rgba(148, 163, 184, 0.4)" };
}

export const PatientTimeline: React.FC<PatientTimelineProps> = ({
	studies,
	activeStudyId: externalActiveStudyId,
	onSelectStudy,
	onOpenStudio,
	onOpenViewer,
	onOpenControl,
	onOpenTactileSearch,
	defaultZoomPx = 140,
	className = "",
}) => {
	// Local active study state if not controlled from outside
	const [internalActiveId, setInternalActiveId] = useState<string | null>(
		studies[0]?.id || null,
	);
	const activeStudyId = externalActiveStudyId !== undefined ? externalActiveStudyId : internalActiveId;

	// Zoom preview card width (90px .. 260px)
	const [cardWidth, setCardWidth] = useState<number>(defaultZoomPx);

	// Quick dropdown and preset filters
	const [selectedModalityFilter, setSelectedModalityFilter] = useState<string>("all");
	const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all");
	const [selectedDatePreset, setSelectedDatePreset] = useState<TimelineDatePreset>("all");
	const [selectedToothFilter, setSelectedToothFilter] = useState<string>("all");

	// Filter studies
	const filteredStudies = useMemo(() => {
		return studies.filter((study) => {
			if (selectedModalityFilter !== "all") {
				const m = (study.modality || study.kind || "").toLowerCase();
				if (selectedModalityFilter === "io" && !m.includes("io") && !m.includes("rvg") && !m.includes("periapical") && !m.includes("sensor")) return false;
				if (selectedModalityFilter === "opg" && !m.includes("opg") && !m.includes("pan")) return false;
				if (selectedModalityFilter === "cbct" && !m.includes("cbct") && !m.includes("3d") && !m.includes("кт")) return false;
				if (selectedModalityFilter === "ceph" && !m.includes("ceph") && !m.includes("trg")) return false;
				if (selectedModalityFilter === "camera" && !m.includes("camera") && !m.includes("камер") && !m.includes("video")) return false;
				if (selectedModalityFilter === "other" && !m.includes("other") && !m.includes("photo") && !m.includes("twain") && !m.includes("фото")) return false;
			}
			if (selectedDateFilter !== "all") {
				const info = formatStudyDateKey(study.capturedAt || study.studyDate);
				if (info.formattedDate !== selectedDateFilter) return false;
			}
			if (selectedDatePreset !== "all") {
				if (!matchesDatePreset(study.capturedAt || study.studyDate, selectedDatePreset as TactileDatePreset)) {
					return false;
				}
			}
			if (selectedToothFilter !== "all") {
				if (String(study.toothCode || "") !== selectedToothFilter) {
					return false;
				}
			}
			return true;
		});
	}, [studies, selectedModalityFilter, selectedDateFilter, selectedDatePreset, selectedToothFilter]);

	// Group studies chronologically by date (newest first)
	const groupedStudies = useMemo<GroupedDateStudies[]>(() => {
		const groupsMap = new Map<string, { formattedDate: string; timestampMs: number; items: ImagingStudy[] }>();

		for (const study of filteredStudies) {
			const { dateKey, formattedDate, timestampMs } = formatStudyDateKey(
				study.capturedAt || study.studyDate,
			);
			const existing = groupsMap.get(dateKey);
			if (existing) {
				existing.items.push(study);
			} else {
				groupsMap.set(dateKey, {
					formattedDate,
					timestampMs,
					items: [study],
				});
			}
		}

		// Sort date groups descending
		const sortedGroups: GroupedDateStudies[] = [];
		for (const [dateKey, val] of groupsMap.entries()) {
			// Sort items within group by time descending
			val.items.sort((a, b) => {
				const tA = new Date(a.capturedAt || a.studyDate || 0).getTime();
				const tB = new Date(b.capturedAt || b.studyDate || 0).getTime();
				return tB - tA;
			});
			sortedGroups.push({
				dateKey,
				formattedDate: val.formattedDate,
				timestampMs: val.timestampMs,
				items: val.items,
			});
		}

		sortedGroups.sort((a, b) => b.timestampMs - a.timestampMs);
		return sortedGroups;
	}, [filteredStudies]);

	// Extract unique dates for the dropdown
	const availableDates = useMemo(() => {
		const datesSet = new Set<string>();
		for (const s of studies) {
			const info = formatStudyDateKey(s.capturedAt || s.studyDate);
			if (info.formattedDate && info.formattedDate !== "Без даты") {
				datesSet.add(info.formattedDate);
			}
		}
		return Array.from(datesSet);
	}, [studies]);

	// Extract teeth present in studies
	const availableTeeth = useMemo(() => {
		const teeth = new Set<string>();
		for (const s of studies) {
			if (s.toothCode) teeth.add(String(s.toothCode));
		}
		return Array.from(teeth).sort();
	}, [studies]);

	const handleCardClick = (study: ImagingStudy) => {
		setInternalActiveId(study.id);
		if (onSelectStudy) {
			onSelectStudy(study);
		}
	};

	const handleCardDoubleClick = (study: ImagingStudy) => {
		const isCbct = study.kind === "cbct" || (study.sliceCount && study.sliceCount > 1);
		if (isCbct && onOpenStudio) {
			onOpenStudio(study);
		} else if (onOpenViewer) {
			onOpenViewer(study);
		}
	};

	const activeStudy = useMemo(() => {
		return studies.find((s) => s.id === activeStudyId) || null;
	}, [studies, activeStudyId]);

	return (
		<div
			className={`flex flex-col w-full h-full bg-[#080d18] text-slate-100 rounded-xl border border-[#1b273d] overflow-hidden select-none ${className}`}
			data-testid="patient-timeline-container"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. TOP TOOLBAR: EzDent-i Date & Modality Dropdowns (Снимки 15, 16)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-[#0d1627] border-b border-[#1e2d47] text-xs shrink-0">
				<div className="flex items-center gap-2.5 flex-wrap">
					{/* Header Label */}
					<div className="flex items-center gap-1.5 font-bold text-emerald-400">
						<Scan className="w-4 h-4 text-[#00C853]" />
						<span className="tracking-wide">ТАЙМЛАЙН</span>
						<span className="text-slate-400 font-normal">({filteredStudies.length})</span>
					</div>

					{/* 1-Click Segmented Date Preset Chips */}
					<div className="flex items-center gap-0.5 p-0.5 bg-[#080d18] rounded-lg border border-[#1e2d47]" data-testid="timeline-date-presets-bar">
						{TIMELINE_DATE_PRESETS.map((preset) => (
							<button
								key={preset.id}
								type="button"
								onClick={() => {
									setSelectedDatePreset(preset.id);
									if (preset.id !== "all") setSelectedDateFilter("all");
								}}
								className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
									selectedDatePreset === preset.id
										? "bg-[#00C853] text-[#012812] font-black shadow-xs"
										: "text-slate-400 hover:text-white hover:bg-[#131f33]"
								}`}
								data-testid={`timeline-date-preset-${preset.id}`}
							>
								{preset.label}
							</button>
						))}
					</div>

					{/* Dropdown: ● Дата [ Все ▾ ] */}
					<div className="flex items-center gap-1 text-slate-300">
						<span className="text-[#00C853] font-black">●</span>
						<span className="font-semibold text-slate-300">Дата:</span>
						<select
							value={selectedDateFilter}
							onChange={(e) => {
								setSelectedDateFilter(e.target.value);
								if (e.target.value !== "all") setSelectedDatePreset("all");
							}}
							className="h-7 px-2 rounded-md bg-[#131f33] border border-[#233554] text-white text-xs outline-none cursor-pointer hover:border-emerald-500"
							data-testid="timeline-date-filter"
						>
							<option value="all">Все даты</option>
							{availableDates.map((dateStr) => (
								<option key={dateStr} value={dateStr}>
									{dateStr}
								</option>
							))}
						</select>
					</div>

					{/* Dropdown: ● Зуб FDI [ Все ▾ ] */}
					<div className="flex items-center gap-1 text-slate-300">
						<span className="text-[#00C853] font-black">●</span>
						<span className="font-semibold text-slate-300">Зуб:</span>
						<select
							value={selectedToothFilter}
							onChange={(e) => setSelectedToothFilter(e.target.value)}
							className="h-7 px-2 rounded-md bg-[#131f33] border border-[#233554] text-white text-xs outline-none cursor-pointer hover:border-emerald-500"
							data-testid="timeline-tooth-filter"
						>
							<option value="all">Все зубы</option>
							{FDI_TEETH_LIST.map((tooth) => {
								const hasStudy = availableTeeth.includes(tooth);
								return (
									<option key={tooth} value={tooth}>
										#{tooth} {hasStudy ? "● (есть)" : ""}
									</option>
								);
							})}
						</select>
					</div>

					{/* Dropdown: ● Режим раб [ Все ▾ ] */}
					<div className="flex items-center gap-1 text-slate-300">
						<span className="text-[#00C853] font-black">●</span>
						<span className="font-semibold text-slate-300">Режим:</span>
						<select
							value={selectedModalityFilter}
							onChange={(e) => setSelectedModalityFilter(e.target.value)}
							className="h-7 px-2 rounded-md bg-[#131f33] border border-[#233554] text-white text-xs outline-none cursor-pointer hover:border-emerald-500"
							data-testid="timeline-modality-filter"
						>
							<option value="all">Все режимы</option>
							<option value="io">IO-сенсор (RVG)</option>
							<option value="opg">Панорама (ОПТГ)</option>
							<option value="cbct">КТ 3D (КЛКТ)</option>
							<option value="ceph">Цефалостат (ТРГ)</option>
							<option value="camera">IO-камера (Видео)</option>
							<option value="other">Другое (TWAIN/Фото)</option>
						</select>
					</div>
				</div>

				{/* 1-Click Launch of Tactile Matrix Modal */}
				{onOpenTactileSearch && (
					<button
						type="button"
						onClick={onOpenTactileSearch}
						className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-bold rounded-lg bg-[#2E8B57] hover:bg-[#237A4B] text-white shadow-xs active:scale-95 transition-all cursor-pointer"
						data-testid="btn-timeline-open-tactile-search"
						title="Открыть тактильную матрицу поиска исследований (Аппарат + Период)"
					>
						<Filter className="w-3.5 h-3.5" />
						<span>Матрица поиска</span>
					</button>
				)}
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. CHRONOLOGICAL TIMELINE BODY WITH GREEN DIVIDER LINES
			    ═══════════════════════════════════════════════════════════════════ */}
			<div
				className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-6"
				data-testid="timeline-groups-scroll-area"
			>
				{groupedStudies.length === 0 ? (
					<div
						className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2"
						data-testid="timeline-empty-message"
					>
						<Scan className="w-8 h-8 opacity-40 text-emerald-400" />
						<span className="text-xs font-semibold">Нет снимков по выбранным фильтрам</span>
					</div>
				) : (
					groupedStudies.map((group) => (
						<div
							key={group.dateKey}
							className="flex flex-col gap-3"
							data-testid={`timeline-date-group-${group.dateKey}`}
						>
							{/* Date Header with Horizontal Green Divider Line (EzDent-i Screenshots 15, 16) */}
							<div className="flex flex-col gap-1">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Calendar className="w-4 h-4 text-[#00C853]" />
										<span className="text-sm font-extrabold text-white tracking-wide">
											{group.formattedDate}
										</span>
										<span className="text-[11px] px-2 py-0.5 rounded-full bg-[#101b2f] text-emerald-300 font-semibold border border-[#233554]">
											{group.items.length}{" "}
											{group.items.length === 1
												? "снимок"
												: group.items.length < 5
													? "снимка"
													: "снимков"}
										</span>
									</div>
								</div>

								{/* Horizontal Green Separator Line (#00C853) */}
								<div
									className="w-full h-[2px] bg-gradient-to-r from-[#00C853] via-[#00C853]/80 to-transparent shadow-[0_0_6px_rgba(0,200,83,0.35)]"
									data-testid="timeline-green-divider-line"
								/>
							</div>

							{/* Studies Cards Row / Grid for this date */}
							<div
								className="flex flex-wrap items-stretch gap-3"
								style={{
									display: "grid",
									gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
								}}
							>
								{group.items.map((study) => {
									const isSelected = activeStudyId === study.id;
									const isCbct = study.kind === "cbct" || (study.sliceCount && study.sliceCount > 1);
									const { timeStr, formattedDate } = formatStudyDateKey(
										study.capturedAt || study.studyDate,
									);
									const badge = getModalityColor(study.modality || study.kind);
									const toothCode = study.toothCode;
									const imgSrc = study.previewUrl;

									return (
										<div
											key={study.id}
											onClick={() => handleCardClick(study)}
											onDoubleClick={() => handleCardDoubleClick(study)}
											data-testid={`timeline-study-card-${study.id}`}
											data-study-card-id={study.id}
											data-active={isSelected ? "true" : "false"}
											style={{
												border: isSelected ? "3px solid #00C853" : "1px solid #1e2d47",
												boxShadow: isSelected
													? "0 0 14px rgba(0, 200, 83, 0.45)"
													: "none",
											}}
											className={`patient-study-card group relative flex flex-col rounded-xl overflow-hidden bg-[#0c1424] cursor-pointer transition-all duration-150 shrink-0 ${
												isSelected
													? "ring-2 ring-[#00C853] bg-[#0f1b31]"
													: "hover:border-[#384e72] hover:bg-[#111c33]"
											}`}
										>
											{/* Thumbnail Preview Box */}
											<div
												className="relative w-full bg-black flex items-center justify-center overflow-hidden"
												style={{ height: `${Math.round(cardWidth * 0.75)}px` }}
											>
												{imgSrc ? (
													<img
														src={imgSrc}
														alt={`Снимок ${formattedDate}`}
														className="w-full h-full object-cover transition-transform group-hover:scale-105"
														loading="lazy"
													/>
												) : (
													<div className="flex flex-col items-center justify-center w-full h-full text-slate-500">
														{isCbct ? (
															<Box className="w-6 h-6 mb-1 opacity-70 text-indigo-400" />
														) : (
															<Scan className="w-6 h-6 mb-1 opacity-70 text-emerald-400" />
														)}
														<span className="text-[10px] font-mono">DICOM</span>
													</div>
												)}

												{/* Modality Tag (Top Left of Thumbnail) */}
												<span
													style={{
														backgroundColor: badge.bg,
														color: badge.text,
														borderColor: badge.border,
													}}
													className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider backdrop-blur-md border shadow-xs"
												>
													{badge.label}
												</span>

												{/* Tooth FDI Tag (Top Right of Thumbnail) */}
												{toothCode && (
													<span
														style={{
															backgroundColor: isSelected ? "#00C853" : "#0d9488",
															color: isSelected ? "#012812" : "#ffffff",
														}}
														className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded font-black text-[10px] tracking-tight shadow-md"
														title={`Зуб FDI: #${toothCode}`}
														data-testid={`timeline-tooth-${toothCode}`}
													>
														#{toothCode}
													</span>
												)}

												{/* Active Selection Glow Pill / Indicator */}
												{isSelected && (
													<div className="absolute inset-0 border-2 border-[#00C853] pointer-events-none rounded-t-xl" />
												)}
											</div>

											{/* Bottom Metadata & Timestamp Block */}
											<div className="flex flex-col p-2 bg-[#090f1d] border-t border-[#1a273e] text-[11px] leading-tight flex-1 justify-between gap-1.5">
												<div>
													<div className="flex items-center justify-between">
														<span
															className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
																isSelected
																	? "bg-[#00C853] text-[#012812] font-black"
																	: "bg-[#142036] text-slate-300 font-semibold"
															}`}
															data-testid={`timeline-time-${study.id}`}
														>
															{timeStr || formattedDate}
														</span>
														{isSelected && (
															<span className="text-[#00C853] font-black text-[9px] uppercase flex items-center gap-0.5">
																<Check className="w-3 h-3 stroke-[3]" />
																Активен
															</span>
														)}
													</div>
													<h5
														className="text-xs font-bold text-white truncate mt-1"
														title={study.title || badge.label}
													>
														{study.title || badge.label}
													</h5>
												</div>

												{/* Quick 1-Click Action Buttons */}
												<div className="flex items-center gap-1.5 pt-1 border-t border-[#172338]">
													{isCbct ? (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																if (onOpenStudio) onOpenStudio(study);
															}}
															className="flex-1 h-6 px-2 rounded text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
															data-testid={`btn-timeline-launch-3d-${study.id}`}
															title="Открыть в 3D MPR Студии"
														>
															<Box className="w-3 h-3" />
															<span>3D КТ</span>
														</button>
													) : (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																if (onOpenViewer) onOpenViewer(study);
															}}
															className="flex-1 h-6 px-2 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
															data-testid={`btn-timeline-launch-viewer-${study.id}`}
															title="Открыть снимок в просмотрщике"
														>
															<Eye className="w-3 h-3" />
															<span>Вьюер</span>
														</button>
													)}

													{onOpenControl && (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																onOpenControl(study);
															}}
															className="h-6 w-6 rounded bg-[#131f33] hover:bg-[#1a2c47] text-slate-300 hover:text-white border border-[#233554] flex items-center justify-center cursor-pointer transition-colors"
															title="Контроль сопоставления"
														>
															<Settings className="w-3 h-3" />
														</button>
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					))
				)}
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    3. BOTTOM STATUS BAR: Preview Zoom Slider (Снимки 15, 16)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#0a1120] border-t border-[#1e2d47] text-xs text-slate-400 shrink-0">
				{/* Active Study Info */}
				<div className="flex items-center gap-2 min-w-0">
					{activeStudy ? (
						<div className="flex items-center gap-2 truncate">
							<span className="text-[#00C853] font-bold">Выбран:</span>
							<span className="font-semibold text-white truncate">
								{activeStudy.title || "Исследование"}
							</span>
							<span className="text-slate-400 font-mono text-[11px]">
								({formatStudyDateKey(activeStudy.capturedAt || activeStudy.studyDate).formattedDate})
							</span>
							{activeStudy.toothCode && (
								<span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
									Зуб #{activeStudy.toothCode}
								</span>
							)}
						</div>
					) : (
						<span>Выберите снимок для детального просмотра</span>
					)}
				</div>

				{/* Horizontal Thumbnail Zoom Slider (EzDent-i Screenshots 15, 16) */}
				<div
					className="flex items-center gap-2 ml-auto"
					data-testid="timeline-zoom-slider-container"
				>
					<span className="text-[11px] text-slate-400 font-semibold">Масштаб превью:</span>
					<ZoomOut className="w-3.5 h-3.5 text-slate-400" />
					<input
						type="range"
						min="90"
						max="260"
						step="10"
						value={cardWidth}
						onChange={(e) => setCardWidth(Number(e.target.value))}
						className="w-24 sm:w-32 h-1.5 bg-[#17253d] accent-[#00C853] rounded-lg cursor-pointer"
						title="Регулировка размера карточек снимков (90px - 260px)"
						data-testid="timeline-preview-zoom-slider"
						aria-label="Масштаб превью снимков"
					/>
					<ZoomIn className="w-3.5 h-3.5 text-slate-400" />
					<span className="text-[10px] font-mono text-emerald-400 w-10 text-right">
						{cardWidth}px
					</span>
				</div>
			</div>
		</div>
	);
};
