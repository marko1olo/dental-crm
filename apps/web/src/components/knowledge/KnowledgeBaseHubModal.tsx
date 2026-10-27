/**
 * DENTE CRM — Knowledge Base & Learning Hub Modal (Fullscreen Studio)
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Rule 7 Universal 3-Tier Architecture
 * Tier 3 Studio / Knowledge Hub: 2-pane responsive interactive learning center.
 * Apple HIG: Full mobile responsiveness (390x844), 0px horizontal scroll, touch targets >= 44px.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	ArrowLeft,
	ArrowRight,
	BarChart3,
	BookOpen,
	Boxes,
	Calendar,
	CreditCard,
	FileSpreadsheet,
	FileText,
	Flame,
	Gamepad2,
	HelpCircle,
	Keyboard,
	Network,
	PhoneCall,
	Printer,
	Search,
	Sparkles,
	Wrench,
	X,
	Zap,
} from "lucide-react";
import {
	CLINICAL_GUIDES,
	ClinicalGuideRenderer,
	ClinicalHelpHotkeyBadge,
	GUIDE_CATEGORIES,
	type ClinicalGuideCategory,
	type ClinicalGuideTab,
	getGuideById,
	searchClinicalGuides,
} from "../help";

export interface KnowledgeBaseHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: ClinicalGuideTab;
	readonly onStartTour?: (trackId?: string) => void;
	readonly onOpenShortcuts?: () => void;
}

export const KnowledgeBaseHubModal: React.FC<KnowledgeBaseHubModalProps> = React.memo(({
	isOpen,
	onClose,
	initialTab = "schedule",
	onStartTour,
	onOpenShortcuts,
}) => {
	const [activeTab, setActiveTab] = useState<ClinicalGuideTab>(initialTab);
	const [selectedCategory, setSelectedCategory] = useState<ClinicalGuideCategory | "all">("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [mobileView, setMobileView] = useState<"list" | "detail">("list");
	const searchInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isOpen) {
			if (initialTab) {
				setActiveTab(initialTab);
			}
			setSearchQuery("");
			setSelectedCategory("all");
			setMobileView("list");
		}
	}, [isOpen, initialTab]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const filteredGuides = useMemo(() => {
		let list = searchQuery.trim() ? searchClinicalGuides(searchQuery) : CLINICAL_GUIDES;
		if (selectedCategory !== "all") {
			list = list.filter((g) => g.category === selectedCategory);
		}
		return list;
	}, [searchQuery, selectedCategory]);

	useEffect(() => {
		if (filteredGuides.length > 0 && !filteredGuides.some((g) => g.id === activeTab)) {
			const first = filteredGuides[0];
			if (first) {
				setActiveTab(first.id);
			}
		}
	}, [filteredGuides, activeTab]);

	const activeGuideMeta = useMemo(() => getGuideById(activeTab), [activeTab]);

	const nextGuide = useMemo(() => {
		const currentIndex = CLINICAL_GUIDES.findIndex((g) => g.id === activeTab);
		if (currentIndex >= 0 && currentIndex < CLINICAL_GUIDES.length - 1) {
			return CLINICAL_GUIDES[currentIndex + 1];
		}
		return null;
	}, [activeTab]);

	if (!isOpen) return null;

	const handlePrint = () => {
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	const handleLaunchTour = (trackId?: string) => {
		onClose();
		if (onStartTour) {
			onStartTour(trackId);
		} else {
			window.dispatchEvent(
				new CustomEvent("dente:start-doctor-tour", {
					detail: trackId ? { trackId } : undefined,
				}),
			);
		}
	};

	const handleOpenShortcutsOverlay = () => {
		onClose();
		if (onOpenShortcuts) {
			onOpenShortcuts();
		} else {
			window.dispatchEvent(new CustomEvent("dente:open-shortcuts-overlay"));
		}
	};

	const getGuideIcon = (id: ClinicalGuideTab) => {
		switch (id) {
			case "schedule": return Calendar;
			case "odontogram": return Sparkles;
			case "medical_record": return FileText;
			case "cashier": return CreditCard;
			case "imaging": return Zap;
			case "treatment_plans": return FileSpreadsheet;
			case "dental_lab": return Wrench;
			case "inventory": return Boxes;
			case "sanpin": return Flame;
			case "leads": return PhoneCall;
			case "lan_mesh": return Network;
			case "analytics": return BarChart3;
			default: return BookOpen;
		}
	};

	const getTourTrackForGuide = (id: ClinicalGuideTab): string => {
		switch (id) {
			case "schedule":
			case "cashier":
			case "leads":
			case "analytics":
				return "reception_admin";
			case "imaging":
				return "imaging_diagnostics";
			default:
				return "solo_doctor";
		}
	};

	return (
		<div
			className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 backdrop-blur-xs p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-labelledby="knowledge-hub-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				className="w-full max-w-6xl h-full max-h-[92vh] bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Top Modal Bar */}
				<div className="px-4 sm:px-5 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
							<BookOpen size={18} />
						</div>
						<div className="min-w-0">
							<h1 id="knowledge-hub-title" className="text-sm sm:text-base font-bold tracking-tight truncate">
								<span className="sm:hidden">База знаний</span>
								<span className="hidden sm:inline">Обучение и База знаний DENTE</span>
							</h1>
							<p className="text-[11px] text-[var(--muted)] hidden sm:block truncate">
								Практическое руководство по всем 12 модулям стоматологической CRM без канцелярита
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
						<button
							type="button"
							onClick={() => handleLaunchTour(getTourTrackForGuide(activeTab))}
							className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-teal-500 text-white text-xs font-semibold hover:bg-teal-600 shadow-xs transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-0"
							title="Запустить интерактивный обучающий квест с подсветкой кнопок"
						>
							<Gamepad2 size={16} />
							<span className="hidden md:inline">Интерактивный тренажёр</span>
						</button>

						<button
							type="button"
							onClick={handleOpenShortcutsOverlay}
							className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-0"
							title="Шпаргалка горячих клавиш (?)"
						>
							<Keyboard size={15} className="text-teal-500" />
							<span className="hidden sm:inline">Клавиши</span>
						</button>

						<button
							type="button"
							onClick={handlePrint}
							className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] border border-transparent hover:border-[var(--line)] transition-colors cursor-pointer"
							title="Печать текущего руководства"
							aria-label="Печать руководства"
						>
							<Printer size={16} />
						</button>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] border border-transparent hover:border-[var(--line)] transition-colors cursor-pointer"
							aria-label="Закрыть окно базы знаний"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* 2-Pane Main Layout with Mobile Switch */}
				<div className="flex-1 flex overflow-hidden min-h-0">
					{/* Left Sidebar: Navigation & Guide List */}
					<aside
						className={`${
							mobileView === "detail" ? "hidden" : "flex"
						} sm:flex w-full sm:w-80 md:w-88 border-r border-[var(--line)] bg-[var(--paper-soft)] flex-col shrink-0 overflow-hidden`}
					>
						{/* Search Bar */}
						<div className="p-3 border-b border-[var(--line)] space-y-2 shrink-0 bg-[var(--paper)]">
							<div className="relative">
								<Search
									size={14}
									className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
								/>
								<input
									ref={searchInputRef}
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Поиск по темам, кнопкам и клавишам..."
									className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder-[var(--muted)] focus:outline-hidden focus:ring-1 focus:ring-teal-500 min-h-[44px] sm:min-h-[34px]"
								/>
								{searchQuery && (
									<button
										type="button"
										onClick={() => setSearchQuery("")}
										className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
										aria-label="Очистить поиск"
									>
										<X size={12} />
									</button>
								)}
							</div>

							{/* Category Filters */}
							<div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar overscroll-contain">
								<button
									type="button"
									onClick={() => setSelectedCategory("all")}
									className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-[28px] flex items-center justify-center ${
										selectedCategory === "all"
											? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/30"
											: "text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--paper-soft)] border border-[var(--line)]"
									}`}
								>
									{`Все (${CLINICAL_GUIDES.length})`}
								</button>
								{GUIDE_CATEGORIES.map((cat) => (
									<button
										key={cat.id}
										type="button"
										onClick={() => setSelectedCategory(cat.id)}
										className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-[28px] flex items-center justify-center ${
											selectedCategory === cat.id
												? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/30"
												: "text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--paper-soft)] border border-[var(--line)]"
										}`}
									>
										{cat.label}
									</button>
								))}
							</div>
						</div>

						{/* Guides Scrollable List */}
						<div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0 overscroll-contain">
							{filteredGuides.length === 0 ? (
								<div className="py-12 text-center text-[var(--muted)] space-y-1">
									<HelpCircle size={24} className="mx-auto text-[var(--muted)]/50" />
									<p className="text-xs font-semibold">Ничего не найдено</p>
									<p className="text-[11px]">Попробуйте другой поисковый запрос</p>
								</div>
							) : (
								filteredGuides.map((guide) => {
									const isActive = activeTab === guide.id;
									const Icon = getGuideIcon(guide.id);

									return (
										<button
											key={guide.id}
											type="button"
											onClick={() => {
												setActiveTab(guide.id);
												setMobileView("detail");
											}}
											className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 min-h-[52px] ${
												isActive
													? "bg-[var(--paper)] border-teal-500 shadow-2xs"
													: "bg-transparent border-transparent hover:bg-[var(--paper)]/60 hover:border-[var(--line)]"
											}`}
										>
											<div
												className={`p-2 rounded-lg shrink-0 mt-0.5 ${
													isActive
														? "bg-teal-500 text-white"
														: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
												}`}
											>
												<Icon size={16} />
											</div>

											<div className="min-w-0 flex-1">
												<div className="flex items-center justify-between gap-1 mb-0.5">
													<span
														className={`text-xs font-semibold truncate ${
															isActive ? "text-teal-700 dark:text-teal-300" : "text-[var(--ink)]"
														}`}
													>
														{guide.shortTitle}
													</span>
													<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] shrink-0 font-medium">
														{guide.badge}
													</span>
												</div>
												<p className="text-[11px] text-[var(--muted)] line-clamp-2 leading-relaxed">
													{guide.description}
												</p>

												{guide.hotkeys && guide.hotkeys.length > 0 && (
													<div className="mt-1.5 flex items-center gap-1 flex-wrap">
														{guide.hotkeys.slice(0, 2).map((key) => (
															<ClinicalHelpHotkeyBadge key={key} hotkey={key} />
														))}
													</div>
												)}
											</div>
										</button>
									);
								})
							)}
						</div>

						{/* Sidebar Footer */}
						<div className="p-3 border-t border-[var(--line)] bg-[var(--paper)] space-y-2 shrink-0">
							<button
								type="button"
								onClick={() => handleLaunchTour("solo_doctor")}
								className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs font-semibold hover:bg-teal-500/20 transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px]"
							>
								<Gamepad2 size={15} />
								<span>Интерактивный тур врача</span>
							</button>
						</div>
					</aside>

					{/* Right Pane: Active Guide Full Content */}
					<main
						className={`${
							mobileView === "list" ? "hidden" : "flex"
						} sm:flex flex-1 flex-col min-w-0 overflow-hidden bg-[var(--paper)]`}
					>
						{/* Mobile Back Button Bar */}
						<div className="sm:hidden px-4 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
							<button
								type="button"
								onClick={() => setMobileView("list")}
								className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 py-1.5 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] min-h-[44px]"
							>
								<ArrowLeft size={14} />
								<span>Все разделы руководства</span>
							</button>
						</div>

						{/* Guide Content Header */}
						{activeGuideMeta && (
							<div className="p-4 border-b border-[var(--line)] bg-[var(--paper-soft)]/50 shrink-0">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div>
										<div className="flex items-center gap-2 mb-1 flex-wrap">
											<span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
												{activeGuideMeta.badge}
											</span>
											{activeGuideMeta.hotkeys && activeGuideMeta.hotkeys.length > 0 && (
												<div className="flex items-center gap-1">
													{activeGuideMeta.hotkeys.map((h) => (
														<ClinicalHelpHotkeyBadge key={h} hotkey={h} />
													))}
												</div>
											)}
										</div>
										<h2 className="text-base font-bold text-[var(--ink)]">
											{activeGuideMeta.title}
										</h2>
										<p className="text-xs text-[var(--muted)] mt-0.5">
											{activeGuideMeta.description}
										</p>
									</div>

									<button
										type="button"
										onClick={() => handleLaunchTour(getTourTrackForGuide(activeTab))}
										className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 text-white text-xs font-semibold hover:bg-teal-600 transition-colors cursor-pointer shrink-0 self-start sm:self-auto min-h-[44px] sm:min-h-[32px]"
									>
										<Gamepad2 size={14} />
										<span>Тренажёр по разделу</span>
									</button>
								</div>
							</div>
						)}

						{/* Guide Scrollable Content Area */}
						<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 min-h-0 overscroll-contain">
							<ClinicalGuideRenderer activeTab={activeTab} onLaunchTour={handleLaunchTour} />

							{/* Bottom Navigation Link to Next Guide */}
							{nextGuide && (
								<div className="mt-8 pt-4 border-t border-[var(--line)] flex items-center justify-between">
									<span className="text-xs text-[var(--muted)]">Следующая тема:</span>
									<button
										type="button"
										onClick={() => setActiveTab(nextGuide.id)}
										className="inline-flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer min-h-[44px] sm:min-h-[32px]"
									>
										<span>{nextGuide.title}</span>
										<ArrowRight size={14} />
									</button>
								</div>
							)}
						</div>

						{/* Modal Bottom Status Bar */}
						<div className="px-4 sm:px-5 py-2.5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between text-[11px] text-[var(--muted)] shrink-0">
							<div className="flex items-center gap-3">
								<span>Система клинического обучения DENTE</span>
								<span>•</span>
								<span className="text-teal-600 dark:text-teal-400 font-medium">100% готовность к работе</span>
							</div>

							<div className="flex items-center gap-2">
								<kbd className="px-1.5 py-0.5 bg-[var(--paper)] border border-[var(--line)] rounded text-[10px] font-mono">
									Esc
								</kbd>
								<span>закрыть</span>
							</div>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
});

KnowledgeBaseHubModal.displayName = "KnowledgeBaseHubModal";
