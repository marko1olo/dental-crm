/**
 * DENTE CRM — Contextual Clinical Help Drawer (Slide-Over)
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Rule 7 Universal 3-Tier Architecture
 * Tier 2 Warm Context: 1-click on-demand slide-over drawer, 0 blocking popups on load.
 *
 * Features:
 * - Odontogram 2-Click Guide
 * - Cashier & 54-FZ Fast Guide (3-click split payment)
 * - SanPiN 3.3686-21 Autoclave & Kraft Pouch Guide
 * - LAN Zero-Conf Mesh Guide (6-digit PIN & QR pairing)
 * - Real-time search filtering across all clinical cheat sheets
 * - 1-Click access to Keyboard Shortcuts overlay (? / F1)
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	BookOpen,
	CreditCard,
	Flame,
	HelpCircle,
	Keyboard,
	Network,
	Printer,
	Search,
	Sparkles,
	X,
} from "lucide-react";
import {
	CLINICAL_GUIDES,
	CashierGuide,
	type ClinicalGuideTab,
	LanMeshGuide,
	OdontogramGuide,
	SanPiNAutoclaveGuide,
} from "../help";

export interface HelpDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: ClinicalGuideTab;
	readonly onOpenShortcutsModal?: () => void;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = React.memo(({
	isOpen,
	onClose,
	initialTab = "odontogram",
	onOpenShortcutsModal,
}) => {
	const [activeTab, setActiveTab] = useState<ClinicalGuideTab>(initialTab);
	const [searchQuery, setSearchQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Sync activeTab when initialTab changes or drawer opens
	useEffect(() => {
		if (isOpen) {
			if (initialTab) {
				setActiveTab(initialTab);
			}
			setSearchQuery("");
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

	// Filter guides based on search query
	const filteredGuides = useMemo(() => {
		const clean = searchQuery.trim().toLowerCase();
		if (!clean) return CLINICAL_GUIDES;

		return CLINICAL_GUIDES.filter(
			(g) =>
				g.title.toLowerCase().includes(clean) ||
				g.description.toLowerCase().includes(clean) ||
				g.badge.toLowerCase().includes(clean),
		);
	}, [searchQuery]);

	// Auto-select tab if activeTab is not in filtered list
	useEffect(() => {
		if (filteredGuides.length > 0 && !filteredGuides.some((g) => g.id === activeTab)) {
			const first = filteredGuides[0];
			if (first) {
				setActiveTab(first.id);
			}
		}
	}, [filteredGuides, activeTab]);

	if (!isOpen) return null;

	const handlePrint = () => {
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	return (
		<div
			className="fixed inset-0 z-[90] flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
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
				className="w-full max-w-2xl bg-[var(--paper)] text-[var(--ink)] border-l border-[var(--line)] shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Drawer Header */}
				<div className="p-4 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2.5">
						<div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
							<BookOpen size={18} />
						</div>
						<div>
							<h2 id="help-drawer-title" className="text-sm font-bold tracking-tight">
								Клинические руководства и шпаргалки DENTE
							</h2>
							<p className="text-[11px] text-[var(--muted)]">
								Одностраничные наглядные правила без чтения 100-страничных инструкций
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1">
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

				{/* Search Bar & Quick Key Button */}
				<div className="p-3 border-b border-[var(--line)] bg-[var(--paper)] space-y-2.5 shrink-0">
					<div className="flex items-center gap-2">
						<div className="relative flex-1">
							<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
							<input
								ref={searchInputRef}
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск по руководствам (например: сплит, кариес, автоклав, PIN)..."
								className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder-[var(--muted)] focus:outline-hidden focus:ring-1 focus:ring-teal-500"
							/>
						</div>

						{onOpenShortcutsModal && (
							<button
								type="button"
								onClick={() => {
									onClose();
									onOpenShortcutsModal();
								}}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-teal-500 hover:text-teal-500 transition-colors cursor-pointer shrink-0"
								title="Открыть шпаргалку горячих клавиш"
							>
								<Keyboard size={14} className="text-teal-500" />
								<span className="hidden sm:inline">Клавиши</span>
								<kbd className="px-1.5 py-0.2 bg-[var(--paper)] rounded border border-[var(--line)] text-[10px] font-mono font-bold">
									?
								</kbd>
							</button>
						)}
					</div>

					{/* Navigation Tabs */}
					<div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
						{filteredGuides.map((guide) => {
							const isActive = activeTab === guide.id;
							let Icon = Sparkles;
							if (guide.id === "cashier") Icon = CreditCard;
							if (guide.id === "sanpin") Icon = Flame;
							if (guide.id === "lan_mesh") Icon = Network;

							return (
								<button
									key={guide.id}
									type="button"
									onClick={() => setActiveTab(guide.id)}
									className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
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
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{filteredGuides.length === 0 ? (
						<div className="py-12 text-center text-[var(--muted)] space-y-1.5">
							<HelpCircle size={28} className="mx-auto text-[var(--muted)]/50" />
							<p className="font-semibold text-xs text-[var(--ink)]">Ничего не найдено</p>
							<p className="text-[11px]">По запросу «{searchQuery}» руководств не обнаружено.</p>
						</div>
					) : (
						<>
							{activeTab === "odontogram" && <OdontogramGuide />}
							{activeTab === "cashier" && <CashierGuide />}
							{activeTab === "sanpin" && <SanPiNAutoclaveGuide />}
							{activeTab === "lan_mesh" && <LanMeshGuide />}
						</>
					)}
				</div>

				{/* Drawer Footer */}
				<div className="p-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between text-[11px] shrink-0">
					<div className="text-[var(--muted)]">
						DENTE Clinical HIG • Tier 2 Контекстная помощь
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
