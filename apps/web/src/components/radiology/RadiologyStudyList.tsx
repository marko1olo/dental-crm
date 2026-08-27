import {
	Activity,
	Calendar,
	Camera,
	ChevronDown,
	ChevronRight,
	Clock,
	Download,
	Eye,
	FileText,
	Filter,
	Layers,
	Maximize2,
	Plus,
	Printer,
	RotateCw,
	Scan,
	Search,
	Sparkles,
	Tag,
	Target,
	Trash2,
	User,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { formatRadiationDose } from "./radiologyMath";
import {
	RADIOLOGY_MODALITIES,
	type RadiologyModality,
	type RadiologyStudy,
} from "./types";

export interface RadiologyStudyListProps {
	studies: RadiologyStudy[];
	onSelectStudy: (study: RadiologyStudy) => void;
	onOpenReferralModal?: (study?: RadiologyStudy) => void;
	onDeleteStudy?: (studyId: string) => void;
	activeStudyId?: string | null;
	className?: string;
}

export const RadiologyStudyList: React.FC<RadiologyStudyListProps> = ({
	studies,
	onSelectStudy,
	onOpenReferralModal,
	onDeleteStudy,
	activeStudyId,
	className = "",
}) => {
	// Search and filter states
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedModality, setSelectedModality] = useState<string>("all");
	const [selectedToothFilter, setSelectedToothFilter] = useState<string>("");
	const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "dose_desc">("date_desc");
	const [expandedStudyId, setExpandedStudyId] = useState<string | null>(null);

	// Modality options
	const modalityFilters = useMemo(() => {
		return [
			{ id: "all", label: "Все снимки", count: studies.length },
			{
				id: "cbct_3d",
				label: "3D КЛКТ",
				count: studies.filter((s) => s.modality === "cbct_3d").length,
			},
			{
				id: "optg_panoramic",
				label: "ОПТГ",
				count: studies.filter((s) => s.modality === "optg_panoramic").length,
			},
			{
				id: "intraoral_rvg",
				label: "Визиограф (RVG)",
				count: studies.filter((s) => s.modality === "intraoral_rvg").length,
			},
			{
				id: "trg_ceph",
				label: "ТРГ",
				count: studies.filter((s) => s.modality === "trg_ceph").length,
			},
			{
				id: "bitewing",
				label: "Bite-wing",
				count: studies.filter((s) => s.modality === "bitewing").length,
			},
		];
	}, [studies]);

	// Filtered and sorted studies
	const filteredStudies = useMemo(() => {
		let result = [...studies];

		// Modality filter
		if (selectedModality !== "all") {
			result = result.filter((s) => s.modality === selectedModality);
		}

		// Tooth filter
		if (selectedToothFilter.trim()) {
			const tf = selectedToothFilter.trim();
			result = result.filter((s) =>
				s.teethFdi?.some((tooth) => tooth.includes(tf)) ||
				s.anatomicalArea?.toLowerCase().includes(tf.toLowerCase())
			);
		}

		// Search query
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			result = result.filter(
				(s) =>
					s.anatomicalArea?.toLowerCase().includes(q) ||
					s.patientName?.toLowerCase().includes(q) ||
					s.doctorName?.toLowerCase().includes(q) ||
					s.diagnosticNotes?.toLowerCase().includes(q) ||
					s.diagnosisIcd10?.toLowerCase().includes(q) ||
					s.teethFdi?.some((t) => t.includes(q))
			);
		}

		// Sorting
		result.sort((a, b) => {
			if (sortBy === "date_desc") {
				return new Date(b.studyDate).getTime() - new Date(a.studyDate).getTime();
			}
			if (sortBy === "date_asc") {
				return new Date(a.studyDate).getTime() - new Date(b.studyDate).getTime();
			}
			if (sortBy === "dose_desc") {
				return (b.effectiveDoseMicrosv || 0) - (a.effectiveDoseMicrosv || 0);
			}
			return 0;
		});

		return result;
	}, [studies, selectedModality, selectedToothFilter, searchQuery, sortBy]);

	return (
		<div
			className={`flex flex-col w-full h-full bg-[var(--paper)] border border-[var(--line)] rounded-2xl overflow-hidden shadow-sm ${className}`}
			data-testid="radiology-study-list-container"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. TOP FILTER AND SEARCH BAR (Touch Targets >= 44x44px)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)] flex flex-col gap-3">
				{/* Search & Action Row */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
					<div className="relative flex-1">
						<Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по зубу (FDI), диагнозу МКБ, врачу, описанию..."
							className="w-full pl-10 pr-4 min-h-[44px] text-xs md:text-sm rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-colors shadow-inner"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--ink)] p-1"
							>
								✕
							</button>
						)}
					</div>

					<div className="flex items-center gap-2">
						{/* FDI Tooth Input */}
						<div className="relative w-32 shrink-0">
							<Target className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
							<input
								type="text"
								value={selectedToothFilter}
								onChange={(e) => setSelectedToothFilter(e.target.value)}
								placeholder="Зуб FDI..."
								className="w-full pl-8 pr-2 min-h-[44px] text-xs font-mono rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
							/>
						</div>

						{/* Sort Select */}
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as any)}
							className="min-h-[44px] px-3 text-xs font-semibold rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] shrink-0"
						>
							<option value="date_desc">Сначала новые</option>
							<option value="date_asc">Сначала старые</option>
							<option value="dose_desc">По дозе (мкЗв)</option>
						</select>

						{/* New Referral Button */}
						{onOpenReferralModal && (
							<button
								type="button"
								onClick={() => onOpenReferralModal()}
								className="flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] text-xs md:text-sm font-bold shadow-md hover:opacity-95 active:scale-95 transition-all shrink-0"
								data-testid="create-referral-top-btn"
							>
								<Plus className="w-4 h-4" />
								<span>Направление</span>
							</button>
						)}
					</div>
				</div>

				{/* Modality Chips Tabs (>= 44x44px touch targets) */}
				<div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
					{modalityFilters.map((mod) => {
						const isSelected = selectedModality === mod.id;
						return (
							<button
								key={mod.id}
								type="button"
								onClick={() => setSelectedModality(mod.id)}
								className={`flex items-center gap-2 min-h-[44px] px-4 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all ${
									isSelected
										? "bg-[var(--teal-surface)] border-2 border-[var(--teal)] text-[var(--teal)] shadow-sm"
										: "bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--teal)]"
								}`}
								data-testid={`modality-filter-${mod.id}`}
							>
								<span>{mod.label}</span>
								<span
									className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
										isSelected
											? "bg-[var(--teal)] text-white"
											: "bg-[var(--line)] text-[var(--muted)]"
									}`}
								>
									{mod.count}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. STUDIES LIST BODY (Elimination of micro-fonts <= 11px)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
				{filteredStudies.length === 0 ? (
					<div className="flex flex-col items-center justify-center p-12 text-center text-[var(--muted)] gap-3 my-auto">
						<Scan className="w-12 h-12 stroke-1 text-[var(--muted)]" />
						<div className="text-sm font-bold text-[var(--ink)]">
							Снимки не найдены
						</div>
						<p className="text-xs max-w-sm">
							По заданным фильтрам нет исследований. Попробуйте изменить поисковый
							запрос или сбросить фильтры.
						</p>
					</div>
				) : (
					filteredStudies.map((study) => {
						const isSelected = activeStudyId === study.id;
						const isExpanded = expandedStudyId === study.id;
						const dose = formatRadiationDose(study.effectiveDoseMicrosv ?? 25.0);
						const modalityInfo = RADIOLOGY_MODALITIES[study.modality];

						return (
							<div
								key={study.id}
								className={`flex flex-col p-4 rounded-2xl border transition-all ${
									isSelected
										? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-md ring-1 ring-[var(--teal-soft)]"
										: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--teal)] hover:shadow-sm"
								}`}
								data-testid={`study-card-${study.id}`}
							>
								<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
									{/* Left Info Column */}
									<div className="flex items-start gap-3.5 min-w-0">
										{/* Modality Icon / Thumbnail */}
										<div className="w-14 h-14 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] shrink-0 shadow-inner">
											<Scan className="w-7 h-7" />
										</div>

										<div className="flex flex-col min-w-0">
											{/* Top Badges: Modality & FDI Tooth */}
											<div className="flex items-center gap-2 flex-wrap mb-1">
												<span className="px-2.5 py-0.5 rounded-lg bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] text-xs font-bold uppercase tracking-wide">
													{study.modalityLabel}
												</span>

												{/* Teeth FDI >= 13-14px bold per mandate */}
												{study.teethFdi && study.teethFdi.length > 0 && (
													<div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)]">
														<Target className="w-3.5 h-3.5 text-[var(--teal)]" />
														<span className="text-xs md:text-sm font-bold">
															Зуб: {study.teethFdi.join(", ")}
														</span>
													</div>
												)}

												{/* Diagnosis ICD-10 */}
												{study.diagnosisIcd10 && (
													<span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
														{study.diagnosisIcd10}
													</span>
												)}
											</div>

											{/* Anatomical Title */}
											<h3 className="text-sm md:text-base font-bold text-[var(--ink)] truncate">
												{study.anatomicalArea}
											</h3>

											{/* Date & Doctor (Study Date >= 13-14px bold) */}
											<div className="flex items-center gap-3 text-xs text-[var(--muted)] mt-1 flex-wrap">
												<span className="flex items-center gap-1 font-bold text-[var(--ink)] text-xs md:text-sm">
													<Calendar className="w-3.5 h-3.5 text-[var(--teal)]" />
													{study.studyDate}
												</span>
												<span>•</span>
												<span className="flex items-center gap-1">
													<User className="w-3.5 h-3.5" />
													{study.doctorName}
												</span>
											</div>
										</div>
									</div>

									{/* Right: Radiation Dose Badge & Action Buttons (>= 44x44px) */}
									<div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[var(--line)]">
										{/* Radiation Dose Badge (>= 13-14px bold per mandate) */}
										<div
											className={`flex items-center gap-2 px-3 py-2 rounded-xl border shadow-sm ${dose.badgeClass}`}
											title="Эффективная доза по СанПиН"
										>
											<Activity className="w-4 h-4" />
											<div className="flex flex-col">
												<span className="text-xs uppercase font-bold tracking-wider opacity-80">
													Доза
												</span>
												<span className="text-sm font-bold tracking-tight">
													{dose.microsvText}
												</span>
											</div>
										</div>

										{/* Interactive View Button (Primary Action, >= 44x44px) */}
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => onSelectStudy(study)}
												className="flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-[var(--teal)] text-white hover:opacity-90 text-xs md:text-sm font-bold shadow-sm active:scale-95 transition-all"
												title="Открыть в кибер-просмотрщике с линейкой и метками"
												data-testid={`open-cyber-viewer-${study.id}`}
											>
												<Eye className="w-4 h-4 text-white" />
												<span>Просмотр снимка</span>
											</button>

											<button
												type="button"
												onClick={() =>
													setExpandedStudyId(isExpanded ? null : study.id)
												}
												className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors"
												title={isExpanded ? "Свернуть описание" : "Развернуть описание"}
											>
												{isExpanded ? (
													<ChevronDown className="w-4 h-4" />
												) : (
													<ChevronRight className="w-4 h-4" />
												)}
											</button>
										</div>
									</div>
								</div>

								{/* Expandable Diagnostic Description (Zero text overflow) */}
								{isExpanded && (
									<div className="mt-3 pt-3 border-t border-[var(--line)] flex flex-col gap-2.5 bg-[var(--paper-soft)] p-3.5 rounded-xl animate-in fade-in duration-150">
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
												Клиническое описание и заключение:
											</span>
											{study.metadata?.apparatusModel && (
												<span className="text-xs text-[var(--muted)] font-medium">
													Аппарат: {study.metadata.apparatusModel}
												</span>
											)}
										</div>

										<div className="text-xs md:text-sm text-[var(--ink)] leading-relaxed font-sans min-w-0 break-words">
											{study.diagnosticNotes ? (
												<div className="whitespace-pre-line">
													{study.diagnosticNotes}
												</div>
											) : (
												<span className="text-[var(--muted)] italic">
													Описание отсутствует.
												</span>
											)}
										</div>

										{/* Rulers and Landmarks Count */}
										<div className="flex items-center gap-4 text-xs text-[var(--muted)] font-medium pt-1 border-t border-[var(--line)]">
											<span>
												Линейки:{" "}
												<strong className="text-[var(--ink)]">
													{study.measurements?.length || 0}
												</strong>
											</span>
											<span>
												Метки зубов:{" "}
												<strong className="text-[var(--ink)]">
													{study.landmarks?.length || 0}
												</strong>
											</span>
											{onDeleteStudy && (
												<button
													type="button"
													onClick={() => onDeleteStudy(study.id)}
													className="ml-auto text-rose-500 hover:text-rose-700 text-xs font-semibold flex items-center gap-1"
												>
													<Trash2 className="w-3.5 h-3.5" />
													<span>Удалить снимок</span>
												</button>
											)}
										</div>
									</div>
								)}
							</div>
						);
					})
				)}
			</div>
		</div>
	);
};
