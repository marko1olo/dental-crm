/**
 * DENTE CRM — Contextual Clinical Help Drawer (Slide-Over)
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Rule 7 Universal 3-Tier Architecture
 * Tier 2 Warm Context: 1-click on-demand slide-over drawer, 0 blocking popups on load.
 * Mandate 8l: Red Team Knowledge Base Hub & Component Wiki
 *
 * Features:
 * - 12 Core Clinical Guides (Schedule, Odontogram, Diary, Cashier, 3D CT, Treatment Plans, Lab, Warehouse, SanPiN, Leads, LAN Mesh, Analytics)
 * - Category filter chips & Real-time search across all guides
 * - 1-Click Game Quest Tour trigger (dente:start-doctor-tour)
 * - 1-Click access to Keyboard Shortcuts overlay (? / F1)
 * - 1-Click expand to Fullscreen Knowledge Base Hub
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	BarChart3,
	BookOpen,
	Boxes,
	Calendar,
	CreditCard,
	Expand,
	FileSpreadsheet,
	FileText,
	Flame,
	Gamepad2,
	HelpCircle,
	Keyboard,
	Maximize2,
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
	GUIDE_CATEGORIES,
	AnalyticsReportsGuide,
	CashierGuide,
	type ClinicalGuideCategory,
	type ClinicalGuideTab,
	DentalLabGuide,
	Imaging3DGuide,
	InventoryWarehouseGuide,
	LanMeshGuide,
	LeadsTelephonyGuide,
	MedicalRecordGuide,
	OdontogramGuide,
	SanPiNAutoclaveGuide,
	ScheduleGuide,
	TreatmentPlansGuide,
	searchClinicalGuides,
} from "../help";
import { GuidanceCheatSheet } from "../guidance/GuidanceCheatSheet";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";

export interface HelpDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: ClinicalGuideTab;
	readonly onOpenShortcutsModal?: () => void;
	readonly onOpenKnowledgeHub?: () => void;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = React.memo(({
	isOpen,
	onClose,
	initialTab = "schedule",
	onOpenShortcutsModal,
	onOpenKnowledgeHub,
}) => {
	const [activeTab, setActiveTab] = useState<ClinicalGuideTab>(initialTab);
	const [selectedCategory, setSelectedCategory] = useState<ClinicalGuideCategory | "all">("all");
	const [searchQuery, setSearchQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Sync activeTab when initialTab changes or drawer opens
	useEffect(() => {
		if (isOpen) {
			if (initialTab) {
				setActiveTab(initialTab);
			}
			setSearchQuery("");
			setSelectedCategory("all");
		}
	}, [isOpen, initialTab]);

	// Escape key dismissal
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

	// Filter guides based on search query and category
	const filteredGuides = useMemo(() => {
		let list = searchQuery.trim() ? searchClinicalGuides(searchQuery) : CLINICAL_GUIDES;

		if (selectedCategory !== "all") {
			list = list.filter((g) => g.category === selectedCategory);
		}

		return list;
	}, [searchQuery, selectedCategory]);

	// Auto-select tab if activeTab is not in filtered list
	useEffect(() => {
		if (filteredGuides.length > 0 && !filteredGuides.some((g) => g.id === activeTab)) {
			const first = filteredGuides[0];
			if (first) {
				setActiveTab(first.id);
			}
		}
	}, [filteredGuides, activeTab]);

	const isFullScreenStudioActive = useUiSurfaceStore(
		(s) => s.isFullScreenStudioActive,
	);
	const hasPrimaryModal = useUiSurfaceStore((s) => s.hasPrimaryModal);

	useEffect(() => {
		if (isOpen && !isFullScreenStudioActive && !hasPrimaryModal) {
			useUiSurfaceStore.getState().openDrawer("help");
		} else if (useUiSurfaceStore.getState().activeDrawer === "help") {
			useUiSurfaceStore.getState().closeDrawer("help");
		}
	}, [isOpen, isFullScreenStudioActive, hasPrimaryModal]);

	if (!isOpen || isFullScreenStudioActive) return null;

	const handlePrint = () => {
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	const handleOpenHub = () => {
		onClose();
		if (onOpenKnowledgeHub) {
			onOpenKnowledgeHub();
		} else {
			window.dispatchEvent(new CustomEvent("dente:open-knowledge-hub"));
		}
	};

	const getGuideIcon = (id: ClinicalGuideTab) => {
		switch (id) {
			case "schedule":
				return Calendar;
			case "odontogram":
				return Sparkles;
			case "medical_record":
				return FileText;
			case "cashier":
				return CreditCard;
			case "imaging":
				return Zap;
			case "treatment_plans":
				return FileSpreadsheet;
			case "dental_lab":
				return Wrench;
			case "inventory":
				return Boxes;
			case "sanpin":
				return Flame;
			case "leads":
				return PhoneCall;
			case "lan_mesh":
				return Network;
			case "analytics":
				return BarChart3;
			default:
				return BookOpen;
		}
	};

	return (
		<div
			className="fixed inset-0 z-[1000] flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-labelledby="help-drawer-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				className="w-full max-w-2xl bg-[var(--paper)] text-[var(--ink)] border-l border-[var(--line)] shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200 z-[1001] overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Drawer Header */}
				<div className="p-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2.5">
						<div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
							<BookOpen size={18} />
						</div>
						<div>
							<h2 id="help-drawer-title" className="text-sm font-bold tracking-tight">
								База знаний и клинические руководства DENTE
							</h2>
							<p className="text-[11px] text-[var(--muted)]">
								Человеческий гид по всем 12 модулям программы без канцелярита
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={handleOpenHub}
							title="Развернуть Базу знаний на весь экран"
							className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
							aria-label="Развернуть на весь экран"
						>
							<Expand size={16} />
						</button>
						<button
							type="button"
							onClick={handlePrint}
							title="Печать текущей шпаргалки"
							className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
							aria-label="Печать шпаргалки"
						>
							<Printer size={16} />
						</button>
						<button
							type="button"
							onClick={onClose}
							className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
							aria-label="Закрыть шторку справки"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Search Bar & Action Buttons */}
				<div className="p-3 border-b border-[var(--line)] bg-[var(--paper)] space-y-2.5 shrink-0">
					<div className="flex items-center gap-2">
						<div className="relative flex-1">
							<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
							<input
								ref={searchInputRef}
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск по руководствам (например: сплит, кариес, КТ, автоклав, наряд)..."
								className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder-[var(--muted)] focus:outline-hidden focus:ring-1 focus:ring-teal-500"
							/>
						</div>

						{/* Interactive Game Tour Button */}
						<button
							type="button"
							onClick={() => {
								onClose();
								window.dispatchEvent(new CustomEvent("dente:start-doctor-tour"));
							}}
							className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-teal-500 hover:text-teal-500 transition-colors cursor-pointer shrink-0"
							title="Запустить интерактивное обучение с подсветкой кнопок"
						>
							<Gamepad2 size={13} className="text-teal-500" />
							<span className="hidden sm:inline">Обучение</span>
						</button>

						{onOpenShortcutsModal && (
							<button
								type="button"
								onClick={() => {
									onClose();
									onOpenShortcutsModal();
								}}
								className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-teal-500 hover:text-teal-500 transition-colors cursor-pointer shrink-0"
								title="Открыть шпаргалку горячих клавиш (?)"
							>
								<Keyboard size={14} className="text-teal-500" />
								<span className="hidden sm:inline">Клавиши</span>
								<kbd className="px-1.5 py-0.2 bg-[var(--paper)] rounded border border-[var(--line)] text-[10px] font-mono font-bold">
									?
								</kbd>
							</button>
						)}
					</div>

					{/* Category Filter Chips */}
					<div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
						<button
							type="button"
							onClick={() => setSelectedCategory("all")}
							className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
								selectedCategory === "all"
									? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							Все разделы ({CLINICAL_GUIDES.length})
						</button>
						{GUIDE_CATEGORIES.map((cat) => (
							<button
								key={cat.id}
								type="button"
								onClick={() => setSelectedCategory(cat.id)}
								className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
									selectedCategory === cat.id
										? "bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold"
										: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								{cat.label}
							</button>
						))}
					</div>

					{/* Navigation Tabs */}
					<div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
						{filteredGuides.map((guide) => {
							const isActive = activeTab === guide.id;
							const Icon = getGuideIcon(guide.id);

							return (
								<button
									key={guide.id}
									type="button"
									onClick={() => setActiveTab(guide.id)}
									className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
										isActive
											? "bg-teal-500 text-white font-semibold shadow-xs"
											: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50"
									}`}
								>
									<Icon size={13} />
									<span>{guide.shortTitle}</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Drawer Body — Active Guide Content */}
				<div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
					{filteredGuides.length === 0 ? (
						<div className="py-12 text-center text-[var(--muted)] space-y-1.5">
							<HelpCircle size={28} className="mx-auto text-[var(--muted)]/50" />
							<p className="font-semibold text-xs text-[var(--ink)]">Ничего не найдено</p>
							<p className="text-[11px]">По запросу «{searchQuery}» руководств не обнаружено.</p>
						</div>
					) : (
						<>
							{activeTab === "schedule" && <ScheduleGuide />}
							{activeTab === "odontogram" && <OdontogramGuide />}
							{activeTab === "medical_record" && <MedicalRecordGuide />}
							{activeTab === "cashier" && <CashierGuide />}
							{activeTab === "imaging" && <Imaging3DGuide />}
							{activeTab === "treatment_plans" && <TreatmentPlansGuide />}
							{activeTab === "dental_lab" && <DentalLabGuide />}
							{activeTab === "inventory" && <InventoryWarehouseGuide />}
							{activeTab === "sanpin" && <SanPiNAutoclaveGuide />}
							{activeTab === "leads" && <LeadsTelephonyGuide />}
							{activeTab === "lan_mesh" && <LanMeshGuide />}
							{activeTab === "analytics" && <AnalyticsReportsGuide />}
						</>
					)}
					<div className="pt-2">
						<GuidanceCheatSheet onOpenFullModal={onOpenShortcutsModal} />
					</div>
				</div>

				{/* Drawer Footer */}
				<div className="p-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between text-[11px] shrink-0">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handleOpenHub}
							className="text-[var(--teal,#0d9488)] hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
						>
							<BookOpen size={12} />
							<span>Открыть Базу знаний (Хаб)</span>
						</button>
						<span className="text-[var(--line)]">•</span>
						<button
							type="button"
							onClick={() => {
								onClose();
								window.dispatchEvent(new CustomEvent("dente:start-doctor-tour"));
							}}
							className="text-[var(--teal,#0d9488)] hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
						>
							<Gamepad2 size={12} />
							<span>Интерактивный тур</span>
						</button>
					</div>
					<div className="flex items-center gap-1.5 text-[var(--muted)]">
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] border border-[var(--line)] rounded text-[10px] font-mono">
							Esc
						</kbd>
						<span>закрыть</span>
					</div>
				</div>
			</div>
		</div>
	);
});

HelpDrawer.displayName = "HelpDrawer";
