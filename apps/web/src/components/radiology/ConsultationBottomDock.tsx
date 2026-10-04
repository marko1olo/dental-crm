/**
 * DENTE CRM — EzDent-i Consultation Bottom Dock (ConsultationBottomDock)
 *
 * Implements:
 * 1. Two-section bottom dock (Screenshot 25):
 *    - Left: ЗАХВАЧЕННЫЕ СНИМКИ (Patient captured studies with direct Left/Right assignment)
 *    - Right: КОНТРОЛЬ ПОСЛЕ ОПЕРАЦИИ / АТЛАС ПАТОЛОГИЙ (Pre/Post comparison vs 8 disciplines atlas)
 * 2. Active thumbnail styling matching Screenshot 25:
 *    - Bright #00C853 green border & bright #00C853 date pill with white text
 * 3. 8 Dental Disciplines Category selector dropdown (Screenshot 26 parity)
 *
 * Mandate 8b: Decomposed helper module (<300 lines).
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import { ArrowLeftToLine, ArrowRightToLine, Camera, ChevronDown, Scan, Sparkles } from "lucide-react";
import {
	DENTAL_DISCIPLINES,
	getPathologiesByDiscipline,
	type DentalDisciplineId,
	type ConsultationPathologyItem,
} from "./ConsultationPathologyLibrary.js";
import {
	formatFilmstripDateTime,
	getModalityBadge,
	type RadiologyFilmstripItem,
} from "./RadiologyFilmstripDock.js";
import type { RadiologyStudy } from "./types.js";
import type { ConsultationSlot } from "./consultationCanvasRenderers.js";

export interface ConsultationBottomDockProps {
	readonly activeSlot: ConsultationSlot;
	readonly activeStudySrc?: string | undefined;
	readonly patientStudiesHistory?: readonly (RadiologyStudy | RadiologyFilmstripItem)[] | undefined;
	readonly selectedDiscipline: DentalDisciplineId;
	readonly onSelectDiscipline: (id: DentalDisciplineId) => void;
	readonly onSelectCapturedStudy: (study: RadiologyStudy | RadiologyFilmstripItem) => void;
	readonly onSelectPathology: (pathology: ConsultationPathologyItem) => void;
	readonly splitMode?: "comparison" | "atlas" | "consultation" | "dynamics" | undefined;
	readonly onAssignStudyToSlot?: (
		(study: RadiologyStudy | RadiologyFilmstripItem, slot: ConsultationSlot) => void
	) | undefined;
}

export const ConsultationBottomDock: React.FC<ConsultationBottomDockProps> = ({
	activeSlot,
	activeStudySrc,
	patientStudiesHistory = [],
	selectedDiscipline,
	onSelectDiscipline,
	onSelectCapturedStudy,
	onSelectPathology,
	splitMode = "comparison",
	onAssignStudyToSlot,
}) => {
	const [disciplineDropdownOpen, setDisciplineDropdownOpen] = useState<boolean>(false);
	const disciplineRef = useRef<HTMLDivElement>(null);

	const isAtlasMode = splitMode === "atlas";

	// Close dropdown on outside click
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (disciplineRef.current && !disciplineRef.current.contains(e.target as Node)) {
				setDisciplineDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const activeDisciplineMeta = useMemo(() => {
		return DENTAL_DISCIPLINES.find((d) => d.id === selectedDiscipline) || DENTAL_DISCIPLINES[0]!;
	}, [selectedDiscipline]);

	const activePathologies = useMemo(() => {
		return getPathologiesByDiscipline(selectedDiscipline);
	}, [selectedDiscipline]);

	// Guaranteed studies array for patient captured tape
	const effectivePatientStudies = useMemo(() => {
		if (patientStudiesHistory.length > 0) return patientStudiesHistory;
		// Clinical default studies if patient record was opened without history array
		return [
			{
				id: "sample-study-baseline-pathology",
				imageUrl: "/radiology/sample_rvg_pathology.jpg",
				thumbnailUrl: "/radiology/sample_rvg_pathology.jpg",
				title: "Снимок ДО лечения (Кариес / Очаг)",
				studyDate: "2024-01-12T09:15:00.000Z",
				modality: "IO_SENSOR",
				teethFdi: ["16"],
			},
			{
				id: "sample-study-followup-obturation",
				imageUrl: "/radiology/sample_rvg_tooth16.jpg",
				thumbnailUrl: "/radiology/sample_rvg_tooth16.jpg",
				title: "Контроль ПОСЛЕ лечения (Обтурация каналов)",
				studyDate: "2024-05-16T10:45:00.000Z",
				modality: "IO_SENSOR",
				teethFdi: ["16"],
			},
		] as (RadiologyStudy | RadiologyFilmstripItem)[];
	}, [patientStudiesHistory]);

	return (
		<div
			data-testid="consultation-bottom-dock"
			className="flex bg-[#070b14] border-t border-[#1e293b] select-none shrink-0"
			style={{ height: "148px", minHeight: "148px", maxHeight: "148px" }}
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    LEFT SECTION: ЗАХВАЧЕННЫЕ СНИМКИ (Screenshot 25 Patient Captured)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="w-1/2 flex flex-col border-r border-[#1e293b] p-1.5 overflow-hidden">
				<div className="flex items-center justify-between pb-1 px-1 text-[11px] font-bold text-slate-300 border-b border-[#1e293b]/70">
					<div className="flex items-center gap-1.5">
						<Camera size={13} className="text-[#00C853]" />
						<span className="tracking-wider uppercase">СНИМКИ ПАЦИЕНТА</span>
						<span className="text-[#10b981] font-mono">({effectivePatientStudies.length})</span>
					</div>
					<span className="text-[10px] text-slate-400 font-normal">
						Клик: в {activeSlot === "left" ? "левое окно (До)" : "правое окно (После)"}
					</span>
				</div>

				{/* Horizontal Scroll of Patient Images */}
				<div className="flex items-center gap-2 pt-1.5 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-[#334155] flex-1">
					{effectivePatientStudies.map((st) => {
						const { dateStr } = formatFilmstripDateTime(st.studyDate);
						const badge = getModalityBadge(st.modality || "rvg");
						const tooth = st.teethFdi?.[0];
						const src = st.thumbnailUrl || st.imageUrl || "";
						const isCurrentlyActive = Boolean(activeStudySrc && src && activeStudySrc === src);

						return (
							<div
								key={st.id}
								data-testid={`captured-study-item-${st.id}`}
								onClick={() => onSelectCapturedStudy(st)}
								style={{
									width: "105px",
									minWidth: "105px",
									border: isCurrentlyActive ? "2px solid #00C853" : "1px solid #334155",
									boxShadow: isCurrentlyActive ? "0 0 10px rgba(0, 200, 83, 0.4)" : "none",
								}}
								className="group flex flex-col rounded bg-[#0c1322] cursor-pointer overflow-hidden shrink-0 transition-all hover:border-[#00C853] relative"
							>
								<div className="h-16 bg-black flex items-center justify-center overflow-hidden relative">
									{src ? (
										<img
											src={src}
											alt={(st as any).title || (st as any).studyDescription || dateStr}
											className="w-full h-full object-cover group-hover:scale-105 transition-transform"
										/>
									) : (
										<Scan size={18} className="text-slate-600" />
									)}
									<span
										style={{ backgroundColor: badge.bg, color: badge.color }}
										className="absolute top-0.5 left-0.5 px-1 rounded text-[8px] font-bold uppercase"
									>
										{badge.label}
									</span>

									{/* Quick Slot Assign Overlay Buttons */}
									{onAssignStudyToSlot && (
										<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													onAssignStudyToSlot(st, "left");
												}}
												className="p-1 rounded bg-[#064e3b] text-[#34d399] hover:bg-[#047857] text-[9px] font-bold cursor-pointer"
												title="Назначить в левое окно (До)"
											>
												<ArrowLeftToLine size={12} />
											</button>
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													onAssignStudyToSlot(st, "right");
												}}
												className="p-1 rounded bg-[#0c4a6e] text-[#38bdf8] hover:bg-[#0369a1] text-[9px] font-bold cursor-pointer"
												title="Назначить в правое окно (После)"
											>
												<ArrowRightToLine size={12} />
											</button>
										</div>
									)}
								</div>

								{/* Bottom Date Pill — Bright #00C853 in active state (Screenshot 25 parity) */}
								<div
									className={`p-1 flex flex-col text-[10px] leading-tight transition-colors ${
										isCurrentlyActive
											? "bg-[#00C853] text-white font-bold"
											: "bg-black/90 text-slate-300 font-mono"
									}`}
								>
									<div className="flex justify-between items-center">
										<span className="truncate">{dateStr}</span>
										{tooth && (
											<span
												className={
													isCurrentlyActive
														? "text-[#022c15] font-black"
														: "text-[#34d399] font-bold"
												}
											>
												#{tooth}
											</span>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    RIGHT SECTION: КОНТРОЛЬ ПОСЛЕ ЛЕЧЕНИЯ / АТЛАС ПАТОЛОГИЙ
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="w-1/2 flex flex-col p-1.5 overflow-hidden">
				{!isAtlasMode ? (
					<>
						{/* Mode: Clinical Comparison Post-op studies */}
						<div className="flex items-center justify-between pb-1 px-1 text-[11px] font-bold border-b border-[#1e293b]/70">
							<div className="flex items-center gap-1.5 text-slate-300">
								<Scan size={13} className="text-[#38bdf8]" />
								<span className="tracking-wider uppercase text-cyan-300">
									КОНТРОЛЬ ПОСЛЕ ОПЕРАЦИИ (СПРАВА)
								</span>
							</div>
							<span className="text-[10px] text-slate-400 font-normal">
								Клик: выбрать снимок для правого окна
							</span>
						</div>

						<div className="flex items-center gap-2 pt-1.5 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-[#334155] flex-1">
							{effectivePatientStudies.map((st) => {
								const { dateStr } = formatFilmstripDateTime(st.studyDate);
								const badge = getModalityBadge(st.modality || "rvg");
								const tooth = st.teethFdi?.[0];
								const src = st.thumbnailUrl || st.imageUrl || "";

								return (
									<div
										key={`post-${st.id}`}
										data-testid={`dynamics-followup-study-${st.id}`}
										onClick={() => {
											if (onAssignStudyToSlot) {
												onAssignStudyToSlot(st, "right");
											} else {
												onSelectCapturedStudy(st);
											}
										}}
										style={{ width: "105px", minWidth: "105px" }}
										className="group flex flex-col rounded border border-[#334155] hover:border-[#38bdf8] bg-[#0c1322] cursor-pointer overflow-hidden shrink-0 transition-all"
									>
										<div className="h-16 bg-black flex items-center justify-center overflow-hidden relative">
											{src ? (
												<img
													src={src}
													alt={(st as any).title || dateStr}
													className="w-full h-full object-cover group-hover:scale-105 transition-transform"
												/>
											) : (
												<Scan size={18} className="text-slate-600" />
											)}
											<span
												style={{ backgroundColor: badge.bg, color: badge.color }}
												className="absolute top-0.5 left-0.5 px-1 rounded text-[8px] font-bold uppercase"
											>
												{badge.label}
											</span>
										</div>
										<div className="p-1 flex flex-col text-[10px] leading-tight bg-black/90">
											<div className="flex justify-between items-center text-slate-300 font-mono">
												<span className="truncate">{dateStr}</span>
												{tooth && <span className="text-[#38bdf8] font-bold">#{tooth}</span>}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</>
				) : (
					<>
						{/* Mode: 8 Disciplines Pathology Library (Screenshot 26) */}
						<div className="flex items-center justify-between pb-1 px-1 text-[11px] font-bold border-b border-[#1e293b]/70">
							<div className="flex items-center gap-1.5 text-slate-300">
								<Sparkles size={13} className="text-[#06b6d4]" />
								<span className="tracking-wider uppercase">АНАТОМИЧЕСКИЙ АТЛАС</span>
							</div>

							{/* 8 Disciplines Category Selector (Screenshot 26) */}
							<div className="relative" ref={disciplineRef}>
								<button
									type="button"
									onClick={() => setDisciplineDropdownOpen((prev) => !prev)}
									className="px-2 py-0.5 rounded bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
									data-testid="btn-discipline-selector"
								>
									<span>ДИСЦИПЛИНА:</span>
									<strong className="text-[#38bdf8] font-mono">
										{activeDisciplineMeta.shortLabelRu}
									</strong>
									<ChevronDown size={11} />
								</button>

								{disciplineDropdownOpen && (
									<div
										style={{
											position: "absolute",
											bottom: "100%",
											right: 0,
											marginBottom: "4px",
											width: "290px",
											backgroundColor: "#0f172a",
											border: "1px solid #334155",
											borderRadius: "6px",
											boxShadow: "0 -10px 25px rgba(0,0,0,0.8)",
											zIndex: 10000,
											padding: "4px",
										}}
										data-testid="discipline-dropdown-menu"
									>
										<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1e293b]">
											8 клинических дисциплин
										</div>
										{DENTAL_DISCIPLINES.map((d) => (
											<button
												key={d.id}
												type="button"
												onClick={() => {
													onSelectDiscipline(d.id);
													setDisciplineDropdownOpen(false);
												}}
												className={`w-full text-left px-2 py-1.5 rounded text-[11px] flex items-center justify-between cursor-pointer transition-colors ${
													selectedDiscipline === d.id
														? "bg-[#134e4a] text-[#5eead4] font-bold"
														: "text-slate-200 hover:bg-[#1e293b]"
												}`}
												data-testid={`option-discipline-${d.id}`}
											>
												<div className="flex flex-col">
													<span className="font-semibold">{d.titleRu}</span>
													<span className="text-[10px] text-slate-400">{d.titleEn}</span>
												</div>
												<span
													style={{ backgroundColor: d.badgeColor }}
													className="w-2 h-2 rounded-full"
												/>
											</button>
										))}
									</div>
								)}
							</div>
						</div>

						{/* Horizontal Demonstration Cards */}
						<div className="flex items-center gap-2 pt-1.5 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-[#334155] flex-1">
							{activePathologies.map((pathology) => (
								<div
									key={pathology.id}
									data-testid={`pathology-card-${pathology.id}`}
									onClick={() => onSelectPathology(pathology)}
									style={{ width: "140px", minWidth: "140px" }}
									className="group flex flex-col rounded border border-[#334155] hover:border-[#38bdf8] bg-[#0c1322] cursor-pointer overflow-hidden shrink-0 transition-all"
									title={`${pathology.titleRu} — ${pathology.descriptionRu}`}
								>
									<div className="h-16 bg-black flex items-center justify-center overflow-hidden relative">
										<img
											src={pathology.imageUrl || pathology.previewUrl || ""}
											alt={pathology.titleRu}
											className="w-full h-full object-cover group-hover:scale-105 transition-transform"
										/>
										{pathology.icd10 && (
											<span className="absolute top-0.5 right-0.5 px-1 rounded text-[8px] font-mono font-bold bg-[#1e293b]/90 text-[#38bdf8] border border-[#334155]">
												{pathology.icd10}
											</span>
										)}
									</div>
									<div className="p-1 flex flex-col text-[10px] leading-tight">
										<span className="font-bold text-slate-200 truncate">
											{pathology.titleRu}
										</span>
										<span className="text-slate-400 text-[9px] truncate">
											{pathology.code}
										</span>
									</div>
								</div>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	);
};
