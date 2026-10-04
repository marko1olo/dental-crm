import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
	Search,
	X,
	BookOpen,
	Zap,
	ShieldCheck,
	ChevronDown,
	ChevronUp,
	ChevronLeft,
	ChevronRight,
	Check,
	FileText,
	Layers,
	Activity,
} from "lucide-react";
import {
	type ClinicalChunk1142,
	type GroupedClinicalProcedure,
	type SpecialtyCategoryKey,
	type VisitNoteFieldsPatch,
	ALL_CLINICAL_CHUNKS_1142,
	SPECIALTY_CATEGORIES_META,
	searchClinicalChunks,
	searchGroupedProcedures,
	buildProcedureVisitNotePatch,
	buildChunkVisitNotePatch,
} from "./clinicalProtocolsCatalog";

export interface ClinicalProtocolsCatalogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly activeTooth?: number | null;
	readonly onApplyPatch: (patch: VisitNoteFieldsPatch, successMessage: string) => void;
	readonly currentNoteForm?: Record<string, any>;
	readonly initialSpecialty?: SpecialtyCategoryKey;
}

export const ClinicalProtocolsCatalogModal: React.FC<ClinicalProtocolsCatalogModalProps> = React.memo(
	function ClinicalProtocolsCatalogModal({
		isOpen,
		onClose,
		activeTooth = null,
		onApplyPatch,
		currentNoteForm = {},
		initialSpecialty = "all",
	}) {
		const [searchQuery, setSearchQuery] = useState<string>("");
		const [activeCategory, setActiveCategory] = useState<SpecialtyCategoryKey>(initialSpecialty);
		const [viewMode, setViewMode] = useState<"procedures" | "chunks" | "diagnoses">("procedures");
		const [expandedProcedureId, setExpandedProcedureId] = useState<string | null>(null);
		const [page, setPage] = useState<number>(1);
		const PAGE_SIZE = 30;

		const tabsRef = useRef<HTMLDivElement>(null);
		const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
		const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

		// Сброс страницы при смене категории, поискового запроса или режима
		useEffect(() => {
			setPage(1);
		}, [searchQuery, activeCategory, viewMode]);

		// Отслеживание возможности скролла табов специализаций
		const checkTabScroll = useCallback(() => {
			const el = tabsRef.current;
			if (!el) return;
			const atStart = el.scrollLeft <= 4;
			const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
			setCanScrollLeft(!atStart);
			setCanScrollRight(!atEnd);
		}, []);

		// Закрытие модального окна по Escape
		useEffect(() => {
			if (!isOpen) return;
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") {
					e.preventDefault();
					onClose();
				}
			};
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [isOpen, onClose]);

		useEffect(() => {
			checkTabScroll();
			const el = tabsRef.current;
			if (!el) return;
			el.addEventListener("scroll", checkTabScroll, { passive: true });
			window.addEventListener("resize", checkTabScroll);
			return () => {
				el.removeEventListener("scroll", checkTabScroll);
				window.removeEventListener("resize", checkTabScroll);
			};
		}, [checkTabScroll, viewMode]);

		const scrollTabs = useCallback((direction: "left" | "right") => {
			const el = tabsRef.current;
			if (!el) return;
			const distance = direction === "left" ? -220 : 220;
			el.scrollBy({ left: distance, behavior: "smooth" });
		}, []);

		// Фильтрация сгруппированных процедур
		const filteredProcedures = useMemo(() => {
			return searchGroupedProcedures(searchQuery, activeCategory);
		}, [searchQuery, activeCategory]);

		// Фильтрация одиночных чанков
		const filteredChunks = useMemo(() => {
			return searchClinicalChunks(searchQuery, activeCategory);
		}, [searchQuery, activeCategory]);

		// Фильтрация диагнозов МКБ-10
		const filteredDiagnoses = useMemo(() => {
			return searchClinicalChunks(searchQuery, "icd10");
		}, [searchQuery]);

		const paginatedProcedures = useMemo(() => {
			return filteredProcedures.slice(0, page * PAGE_SIZE);
		}, [filteredProcedures, page]);

		const paginatedChunks = useMemo(() => {
			return filteredChunks.slice(0, page * PAGE_SIZE);
		}, [filteredChunks, page]);

		const paginatedDiagnoses = useMemo(() => {
			return filteredDiagnoses.slice(0, page * PAGE_SIZE);
		}, [filteredDiagnoses, page]);

		const handleApplyFullProcedure = useCallback((proc: GroupedClinicalProcedure) => {
			const patch = buildProcedureVisitNotePatch(proc, currentNoteForm, activeTooth);
			const toothLabel = activeTooth ? ` (зуб ${activeTooth})` : "";
			onApplyPatch(patch, `Применён протокол: «${proc.procedureName}»${toothLabel}`);
			onClose();
		}, [currentNoteForm, activeTooth, onApplyPatch, onClose]);

		const handleApplySingleChunk = useCallback((chunk: ClinicalChunk1142) => {
			const patch = buildChunkVisitNotePatch(chunk, currentNoteForm, activeTooth);
			const toothLabel = activeTooth ? ` (зуб ${activeTooth})` : "";
			onApplyPatch(patch, `Добавлен раздел: «${chunk.name}»${toothLabel}`);
		}, [currentNoteForm, activeTooth, onApplyPatch]);

		const handleApplyDiagnosis = useCallback((chunk: ClinicalChunk1142) => {
			const patch: VisitNoteFieldsPatch = {
				diagnosis: activeTooth ? `${chunk.name} (зуб ${activeTooth})` : chunk.name,
			};
			onApplyPatch(patch, `Установлен диагноз МКБ-10: ${chunk.name}`);
			onClose();
		}, [activeTooth, onApplyPatch, onClose]);

		if (!isOpen) return null;

		return (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
				role="dialog"
				aria-modal="true"
				aria-label="Каталог клинических протоколов и дневников приёма"
				data-testid="clinical-protocols-catalog-modal"
				onClick={onClose}
			>
				<div
					className="bg-[var(--paper-strong)] border border-[var(--glass-border)] text-[var(--ink)] rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
					onClick={(e) => e.stopPropagation()}
				>
					{/* ── ШАПКА МОДАЛЬНОГО ОКНА ── */}
					<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)] bg-[var(--paper-soft)] shrink-0">
						<div className="flex items-center gap-2.5">
							<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--teal-soft)] shadow-2xs shrink-0">
								<BookOpen size={18} />
							</div>
							<div>
								<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
									<h3 className="text-sm sm:text-base font-extrabold text-[var(--ink)] leading-tight">
										Каталог клинических протоколов
									</h3>
									<span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal-soft)] shrink-0">
										1 142 протокола
									</span>
									{activeTooth && (
										<span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/30 shrink-0">
											{`Зуб ${activeTooth}`}
										</span>
									)}
								</div>
								<p className="text-[11px] text-[var(--muted)]">
									1-клик заполнение карты и дневника приёма: жалобы • анамнез • объективно • лечение • рекомендации
								</p>
							</div>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
							aria-label="Закрыть"
							data-testid="btn-close-protocols-catalog-modal"
						>
							<X size={18} />
						</button>
					</div>

					{/* ── ПОИСКОВАЯ СТРОКА И РЕЖИМЫ ОТОБРАЖЕНИЯ ── */}
					<div className="p-3 border-b border-[var(--glass-border)] bg-[var(--paper)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
						<div className="relative flex-1">
							<Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск по процедуре, МКБ-10, материалу или симптому (например: кариес, пульпит, виниры)..."
								className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal)] transition-colors placeholder:text-[var(--muted)]"
								autoFocus
								data-testid="input-search-protocols"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
									aria-label="Очистить поиск"
								>
									<X size={14} />
								</button>
							)}
						</div>

						{/* Переключатель вида */}
						<div className="flex items-center gap-1 bg-[var(--paper-soft)] p-1 rounded-lg border border-[var(--glass-border)] shrink-0 self-start sm:self-auto">
							<button
								type="button"
								onClick={() => setViewMode("procedures")}
								style={viewMode === "procedures" ? { backgroundColor: "var(--teal-fill)", color: "var(--on-teal)" } : undefined}
								className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
									viewMode === "procedures"
										? "shadow-2xs"
										: "text-[var(--ink)] hover:text-[var(--teal-dark)]"
								}`}
								data-testid="btn-view-mode-procedures"
							>
								<Layers size={13} />
								<span>Процедуры ({filteredProcedures.length})</span>
							</button>

							<button
								type="button"
								onClick={() => setViewMode("chunks")}
								style={viewMode === "chunks" ? { backgroundColor: "var(--teal-fill)", color: "var(--on-teal)" } : undefined}
								className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
									viewMode === "chunks"
										? "shadow-2xs"
										: "text-[var(--ink)] hover:text-[var(--teal-dark)]"
								}`}
								data-testid="btn-view-mode-chunks"
							>
								<FileText size={13} />
								<span>Все блоки ({filteredChunks.length})</span>
							</button>

							<button
								type="button"
								onClick={() => setViewMode("diagnoses")}
								style={viewMode === "diagnoses" ? { backgroundColor: "var(--teal-fill)", color: "var(--on-teal)" } : undefined}
								className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
									viewMode === "diagnoses"
										? "shadow-2xs"
										: "text-[var(--ink)] hover:text-[var(--teal-dark)]"
								}`}
								data-testid="btn-view-mode-diagnoses"
							>
								<Activity size={13} />
								<span>МКБ-10 ({filteredDiagnoses.length})</span>
							</button>
						</div>
					</div>

					{/* ── ТАБЫ СПЕЦИАЛЬНОСТЕЙ СО СКРОЛЛОМ И СТРЕЛКАМИ ── */}
					{viewMode !== "diagnoses" && (
						<div className="relative px-2 py-2 border-b border-[var(--glass-border)] bg-[var(--paper-soft)] shrink-0 flex items-center">
							{/* Левая стрелка прокрутки */}
							{canScrollLeft && (
								<div className="absolute left-1 z-10 flex items-center pr-2 bg-gradient-to-r from-[var(--paper-soft)] via-[var(--paper-soft)]/90 to-transparent">
									<button
										type="button"
										onClick={() => scrollTabs("left")}
										className="w-6 h-6 rounded-md bg-[var(--paper-strong)] border border-[var(--glass-border)] shadow-xs flex items-center justify-center text-[var(--ink)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] transition-colors cursor-pointer"
										aria-label="Прокрутить вкладки влево"
									>
										<ChevronLeft size={14} />
									</button>
								</div>
							)}

							{/* Контейнер вкладок */}
							<div
								ref={tabsRef}
								className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full"
							>
								{SPECIALTY_CATEGORIES_META.map((meta) => {
									const isActive = activeCategory === meta.key;
									return (
										<button
											key={meta.key}
											type="button"
											onClick={() => setActiveCategory(meta.key)}
											style={isActive ? { backgroundColor: "var(--teal-fill)", color: "var(--on-teal)", borderColor: "var(--teal-fill)" } : undefined}
											className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap select-none ${
												isActive
													? "shadow-2xs"
													: "bg-[var(--paper)] text-[var(--ink)] border-[var(--glass-border)] hover:border-[var(--teal)] hover:text-[var(--teal-dark)]"
											}`}
											data-testid={`tab-specialty-${meta.key}`}
										>
											<span>{meta.shortLabel}</span>
											<span
												style={isActive ? { backgroundColor: "rgba(255, 255, 255, 0.22)", color: "inherit" } : undefined}
												className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
													isActive
														? ""
														: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--glass-border)]"
												}`}
											>
												{meta.count}
											</span>
										</button>
									);
								})}
							</div>

							{/* Правая стрелка прокрутки */}
							{canScrollRight && (
								<div className="absolute right-1 z-10 flex items-center pl-2 bg-gradient-to-l from-[var(--paper-soft)] via-[var(--paper-soft)]/90 to-transparent">
									<button
										type="button"
										onClick={() => scrollTabs("right")}
										className="w-6 h-6 rounded-md bg-[var(--paper-strong)] border border-[var(--glass-border)] shadow-xs flex items-center justify-center text-[var(--ink)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] transition-colors cursor-pointer"
										aria-label="Прокрутить вкладки вправо"
									>
										<ChevronRight size={14} />
									</button>
								</div>
							)}
						</div>
					)}

					{/* ── ТЕЛО КАТАЛОГА (ПЛОТНЫЙ 2-3 КОЛОНОЧНЫЙ ГРИД) ── */}
					<div
						className="flex-1 overflow-y-auto p-3 sm:p-4"
						data-testid="protocols-catalog-list"
					>
						{viewMode === "procedures" && (
							<>
								{filteredProcedures.length === 0 ? (
									<div className="text-center py-12 text-[var(--muted)]">
										<p className="text-sm font-semibold">Процедуры по запросу «{searchQuery}» не найдены</p>
										<p className="text-xs mt-1">Попробуйте изменить поисковый запрос или выбрать вкладку «Все»</p>
									</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
										{paginatedProcedures.map((proc) => {
											const isExpanded = expandedProcedureId === proc.id;
											return (
												<div
													key={proc.id}
													className={`p-3 sm:p-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] hover:border-[var(--teal)]/60 transition-all shadow-2xs flex flex-col justify-between space-y-2.5 ${
														isExpanded ? "ring-1 ring-[var(--teal)] bg-[var(--paper-strong)]" : ""
													}`}
													data-testid={`card-procedure-${proc.id}`}
												>
													{/* Заголовок карточки: бейджи и название */}
													<div className="space-y-1.5">
														<div className="flex items-center gap-1.5 flex-wrap">
															<span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal-soft)]">
																{proc.categoryName}
															</span>
															{proc.matchedIcd10 && (
																<span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/40">
																	{proc.matchedIcd10.split(" ")[0]}
																</span>
															)}
															<span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--glass-border)]">
																{proc.totalChunks} этапов
															</span>
														</div>

														<h4
															className="text-xs sm:text-sm font-bold text-[var(--ink)] leading-snug line-clamp-2"
															title={proc.procedureName}
														>
															{proc.procedureName}
														</h4>
													</div>

													{/* Чипы клинических этапов */}
													<div className="flex items-center gap-1 flex-wrap pt-2 border-t border-[var(--glass-border)] text-xs">
														<span className="text-[10px] font-bold text-[var(--muted)] mr-0.5">Этапы:</span>
														{proc.complaints && (
															<button
																type="button"
																onClick={() => handleApplySingleChunk(proc.complaints!)}
																className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] text-[var(--ink)] transition-colors cursor-pointer"
																title="Вставить только жалобы"
															>
																+ Жалобы
															</button>
														)}
														{proc.anamnesis && (
															<button
																type="button"
																onClick={() => handleApplySingleChunk(proc.anamnesis!)}
																className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] text-[var(--ink)] transition-colors cursor-pointer"
																title="Вставить только анамнез"
															>
																+ Анамнез
															</button>
														)}
														{proc.objective && (
															<button
																type="button"
																onClick={() => handleApplySingleChunk(proc.objective!)}
																className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] text-[var(--ink)] transition-colors cursor-pointer"
																title="Вставить только объективный статус"
															>
																+ Статус
															</button>
														)}
														{proc.treatment && (
															<button
																type="button"
																onClick={() => handleApplySingleChunk(proc.treatment!)}
																className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] text-[var(--ink)] transition-colors cursor-pointer"
																title="Вставить только протокол лечения"
															>
																+ Лечение
															</button>
														)}
														{proc.recommendations && (
															<button
																type="button"
																onClick={() => handleApplySingleChunk(proc.recommendations!)}
																className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] text-[var(--ink)] transition-colors cursor-pointer"
																title="Вставить только рекомендации"
															>
																+ Реком.
															</button>
														)}
													</div>

													{/* Кнопки действий: 1-клик и детали */}
													<div className="flex items-center gap-1.5 pt-2 border-t border-[var(--glass-border)] mt-auto">
														<button
															type="button"
															onClick={() => handleApplyFullProcedure(proc)}
															style={{ backgroundColor: "var(--teal-fill)", color: "var(--on-teal)" }}
															className="h-8 px-3 rounded-lg text-xs font-extrabold shadow-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5 flex-1 cursor-pointer touch-manipulation active:scale-[0.98]"
															title="1-клик вставка жалоб, анамнеза, статуса, протокола лечения и рекомендаций"
															data-testid={`btn-apply-full-proc-${proc.id}`}
														>
															<Zap size={13} className="shrink-0" />
															<span>Применить (1 клик)</span>
														</button>

														<button
															type="button"
															onClick={() => setExpandedProcedureId(isExpanded ? null : proc.id)}
															className={`h-8 px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
																isExpanded
																	? "border-[var(--teal)] bg-[var(--teal-soft)] text-[var(--teal-dark)]"
																	: "border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)]"
															}`}
															title="Посмотреть текст разделов"
															aria-label={isExpanded ? "Свернуть" : "Развернуть детали"}
														>
															<span>{isExpanded ? "Свернуть" : "Детали"}</span>
															{isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
														</button>
													</div>

													{/* Развернутый предварительный просмотр текста */}
													{isExpanded && (
														<div className="pt-2 border-t border-[var(--glass-border)] space-y-2 text-xs animate-in fade-in duration-100 max-h-64 overflow-y-auto pr-1">
															{proc.complaints && (
																<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--glass-border)]">
																	<div className="flex items-center justify-between mb-1">
																		<span className="font-bold text-[11px] text-[var(--teal-dark)]">Жалобы</span>
																		<button
																			type="button"
																			onClick={() => handleApplySingleChunk(proc.complaints!)}
																			className="text-[10px] font-bold text-[var(--teal-dark)] hover:underline cursor-pointer"
																		>
																			+ Вставить
																		</button>
																	</div>
																	<p className="text-[11px] text-[var(--ink)] leading-relaxed whitespace-pre-wrap">{proc.complaints.text}</p>
																</div>
															)}
															{proc.anamnesis && (
																<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--glass-border)]">
																	<div className="flex items-center justify-between mb-1">
																		<span className="font-bold text-[11px] text-[var(--teal-dark)]">Анамнез</span>
																		<button
																			type="button"
																			onClick={() => handleApplySingleChunk(proc.anamnesis!)}
																			className="text-[10px] font-bold text-[var(--teal-dark)] hover:underline cursor-pointer"
																		>
																			+ Вставить
																		</button>
																	</div>
																	<p className="text-[11px] text-[var(--ink)] leading-relaxed whitespace-pre-wrap">{proc.anamnesis.text}</p>
																</div>
															)}
															{proc.objective && (
																<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--glass-border)]">
																	<div className="flex items-center justify-between mb-1">
																		<span className="font-bold text-[11px] text-[var(--teal-dark)]">Объективный статус</span>
																		<button
																			type="button"
																			onClick={() => handleApplySingleChunk(proc.objective!)}
																			className="text-[10px] font-bold text-[var(--teal-dark)] hover:underline cursor-pointer"
																		>
																			+ Вставить
																		</button>
																	</div>
																	<p className="text-[11px] text-[var(--ink)] leading-relaxed whitespace-pre-wrap">{proc.objective.text}</p>
																</div>
															)}
															{proc.treatment && (
																<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--glass-border)]">
																	<div className="flex items-center justify-between mb-1">
																		<span className="font-bold text-[11px] text-[var(--teal-dark)]">Проведенное лечение</span>
																		<button
																			type="button"
																			onClick={() => handleApplySingleChunk(proc.treatment!)}
																			className="text-[10px] font-bold text-[var(--teal-dark)] hover:underline cursor-pointer"
																		>
																			+ Вставить
																		</button>
																	</div>
																	<p className="text-[11px] text-[var(--ink)] leading-relaxed whitespace-pre-wrap">{proc.treatment.text}</p>
																</div>
															)}
															{proc.recommendations && (
																<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--glass-border)]">
																	<div className="flex items-center justify-between mb-1">
																		<span className="font-bold text-[11px] text-[var(--teal-dark)]">Рекомендации</span>
																		<button
																			type="button"
																			onClick={() => handleApplySingleChunk(proc.recommendations!)}
																			className="text-[10px] font-bold text-[var(--teal-dark)] hover:underline cursor-pointer"
																		>
																			+ Вставить
																		</button>
																	</div>
																	<p className="text-[11px] text-[var(--ink)] leading-relaxed whitespace-pre-wrap">{proc.recommendations.text}</p>
																</div>
															)}
														</div>
													)}
												</div>
											);
										})}
									</div>
								)}

								{filteredProcedures.length > paginatedProcedures.length && (
									<div className="text-center pt-4">
										<button
											type="button"
											onClick={() => setPage((p) => p + 1)}
											className="h-8 px-4 rounded-lg text-xs font-bold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors cursor-pointer"
										>
											Показать ещё {Math.min(PAGE_SIZE, filteredProcedures.length - paginatedProcedures.length)} из {filteredProcedures.length}
										</button>
									</div>
								)}
							</>
						)}

						{viewMode === "chunks" && (
							<>
								{filteredChunks.length === 0 ? (
									<div className="text-center py-12 text-[var(--muted)]">
										<p className="text-sm font-semibold">Блоки по запросу «{searchQuery}» не найдены</p>
									</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
										{paginatedChunks.map((chunk) => (
											<div
												key={chunk.id}
												className="p-3 sm:p-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] hover:border-[var(--teal)]/60 transition-all shadow-2xs flex flex-col justify-between h-full space-y-2"
											>
												<div className="space-y-1.5 min-w-0">
													<div className="flex items-center gap-1.5 flex-wrap">
														<span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal-soft)]">
															{chunk.categoryName}
														</span>
														<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--glass-border)]">
															ID: {chunk.id}
														</span>
													</div>
													<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] leading-snug line-clamp-2" title={chunk.name}>
														{chunk.name}
													</h4>
													<p className="text-xs text-[var(--muted)] line-clamp-3 leading-relaxed">
														{chunk.text}
													</p>
												</div>

												<div className="pt-2 border-t border-[var(--glass-border)] mt-auto">
													<button
														type="button"
														onClick={() => handleApplySingleChunk(chunk)}
														className="w-full h-8 px-3 rounded-lg text-xs font-bold bg-[var(--teal-soft)] hover:bg-[var(--teal-fill)] hover:text-[var(--on-teal)] text-[var(--teal-dark)] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
														title="Вставить блок в соответствующий раздел карты"
													>
														<Zap size={13} />
														<span>Вставить в дневник</span>
													</button>
												</div>
											</div>
										))}
									</div>
								)}

								{filteredChunks.length > paginatedChunks.length && (
									<div className="text-center pt-4">
										<button
											type="button"
											onClick={() => setPage((p) => p + 1)}
											className="h-8 px-4 rounded-lg text-xs font-bold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors cursor-pointer"
										>
											Показать ещё {Math.min(PAGE_SIZE, filteredChunks.length - paginatedChunks.length)} из {filteredChunks.length}
										</button>
									</div>
								)}
							</>
						)}

						{viewMode === "diagnoses" && (
							<>
								{filteredDiagnoses.length === 0 ? (
									<div className="text-center py-12 text-[var(--muted)]">
										<p className="text-sm font-semibold">Диагнозы МКБ-10 по запросу «{searchQuery}» не найдены</p>
									</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 items-stretch">
										{paginatedDiagnoses.map((diag) => (
											<div
												key={diag.id}
												className="p-2.5 sm:p-3 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] hover:border-[var(--teal)]/60 transition-all shadow-2xs flex items-center justify-between gap-2.5"
											>
												<div className="space-y-1 min-w-0 flex-1">
													<div className="flex items-center gap-2">
														{diag.icd10 && (
															<span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/40 shrink-0">
																{diag.icd10}
															</span>
														)}
													</div>
													<h4 className="text-xs sm:text-sm font-semibold text-[var(--ink)] leading-snug line-clamp-2" title={diag.name}>
														{diag.name}
													</h4>
												</div>

												<button
													type="button"
													onClick={() => handleApplyDiagnosis(diag)}
													style={{ backgroundColor: "var(--teal-fill)", color: "var(--on-teal)" }}
													className="shrink-0 h-8 px-3 rounded-lg text-xs font-bold hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
													title="Установить этот диагноз в карту приёма"
												>
													<Check size={13} />
													<span>Выбрать</span>
												</button>
											</div>
										))}
									</div>
								)}

								{filteredDiagnoses.length > paginatedDiagnoses.length && (
									<div className="text-center pt-4">
										<button
											type="button"
											onClick={() => setPage((p) => p + 1)}
											className="h-8 px-4 rounded-lg text-xs font-bold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors cursor-pointer"
										>
											Показать ещё {Math.min(PAGE_SIZE, filteredDiagnoses.length - paginatedDiagnoses.length)} из {filteredDiagnoses.length}
										</button>
									</div>
								)}
							</>
						)}
					</div>

					{/* ── ПОДВАЛ МОДАЛЬНОГО ОКНА ── */}
					<div className="px-4 py-2.5 border-t border-[var(--glass-border)] bg-[var(--paper-soft)] flex items-center justify-between text-xs text-[var(--muted)] shrink-0">
						<div className="flex items-center gap-2">
							<ShieldCheck size={14} className="text-emerald-500 shrink-0" />
							<span>Стандарты СтАР & Минздрава РФ • Полный массив 1 142 клинических протокола</span>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="h-7 sm:h-8 px-3 rounded-lg text-xs font-bold border border-[var(--glass-border)] bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] transition-colors cursor-pointer"
						>
							Закрыть
						</button>
					</div>
				</div>
			</div>
		);
	},
);
