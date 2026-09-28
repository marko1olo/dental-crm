/**
 * DENTE CRM — Clinical Keyboard Shortcuts & Guidance Modal Overlay
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Rule 7 Universal 3-Tier Architecture
 *
 * Essential Speed Keys Covered:
 * - F1 / Ctrl+K / Cmd+K: Fast patient search & command palette
 * - Space / Enter: Start / complete visit
 * - Ctrl+S / Cmd+S: Save visit protocol to local draft & DB
 * - Esc: Close drawers and modal overlays
 * - 1..8: Tooth quadrant selector in Odontogram
 * - Shift+N: 1-Click Autonorm
 * - C, P, K, X: Tooth condition marking
 * - F9: Fast fiscal checkout tender (54-FZ)
 * - F7: RVG Visiograph capture
 * - F12: Print Form 043/u diary
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Command, ExternalLink, HelpCircle, Keyboard, Search, Sparkles, X } from "lucide-react";
import {
	CLINICAL_SHORTCUTS,
	type ClinicalShortcutItem,
	type ShortcutCategory,
	searchShortcuts,
	triggerClinicalShortcutEvent,
} from "../../lib/keyboardShortcuts";

export interface ClinicalGuidanceModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onOpenHelpDrawer?: (tab?: string) => void;
}

export const ClinicalGuidanceModal: React.FC<ClinicalGuidanceModalProps> = React.memo(({
	isOpen,
	onClose,
	onOpenHelpDrawer,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState<ShortcutCategory | "all">("all");
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Focus input on open and reset search
	useEffect(() => {
		if (isOpen) {
			setSearchQuery("");
			setActiveCategory("all");
			const timer = setTimeout(() => {
				searchInputRef.current?.focus();
			}, 50);
			return () => clearTimeout(timer);
		}
	}, [isOpen]);

	// Escape key dismiss listener
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

	// Filtered shortcuts calculation
	const filteredShortcuts = useMemo(() => {
		let list = searchShortcuts(searchQuery);
		if (activeCategory !== "all") {
			list = list.filter((item) => item.category === activeCategory);
		}
		return list;
	}, [searchQuery, activeCategory]);

	if (!isOpen) return null;

	const handleActionClick = (shortcut: ClinicalShortcutItem) => {
		if (shortcut.actionEvent) {
			triggerClinicalShortcutEvent(shortcut.actionEvent);
			onClose();
		}
	};

	const categoryTabs: { id: ShortcutCategory | "all"; label: string }[] = [
		{ id: "all", label: "Все клавиши" },
		{ id: "global", label: "Общие" },
		{ id: "visit", label: "Приём и карта" },
		{ id: "odontogram", label: "Зубная формула" },
		{ id: "cashier", label: "Касса и оплата" },
		{ id: "imaging", label: "Снимки" },
		{ id: "navigation", label: "Навигация" },
	];

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="shortcuts-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div className="relative w-full max-w-2xl bg-[var(--paper)] text-[var(--ink)] rounded-xl border border-[var(--line)] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
				{/* Modal Header */}
				<div className="p-4 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)]">
					<div className="flex items-center gap-2.5">
						<div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
							<Keyboard size={18} />
						</div>
						<div>
							<h2 id="shortcuts-modal-title" className="text-sm font-bold tracking-tight">
								Горячие клавиши и эргономика врача
							</h2>
							<p className="text-[11px] text-[var(--muted)]">
								Мгновенное управление клиническим приемом без 100-страничных инструкций
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
						aria-label="Закрыть шпаргалку"
					>
						<X size={18} />
					</button>
				</div>

				{/* Search & Category Filter Toolbar */}
				<div className="p-3 border-b border-[var(--line)] space-y-2.5 bg-[var(--paper)]">
					<div className="relative">
						<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
						<input
							ref={searchInputRef}
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по клавишам или действиям (например: Ctrl+S, касса, кариес)..."
							className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder-[var(--muted)] focus:outline-hidden focus:ring-1 focus:ring-teal-500"
						/>
					</div>

					{/* Category Tabs */}
					<div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
						{categoryTabs.map((tab) => {
							const isActive = activeCategory === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveCategory(tab.id)}
									className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
										isActive
											? "bg-teal-500 text-white font-semibold"
											: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50"
									}`}
								>
									{tab.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Shortcuts List Content */}
				<div className="p-4 overflow-y-auto space-y-2 text-xs flex-1 divide-y divide-[var(--line)]/50">
					{filteredShortcuts.length === 0 ? (
						<div className="py-8 text-center text-[var(--muted)] space-y-1">
							<HelpCircle size={24} className="mx-auto text-[var(--muted)]/50" />
							<p className="font-medium text-xs">Ничего не найдено по запросу «{searchQuery}»</p>
							<p className="text-[11px]">Попробуйте другой поисковый запрос или выберите другую категорию</p>
						</div>
					) : (
						filteredShortcuts.map((item) => (
							<div
								key={item.id}
								className="pt-2 first:pt-0 pb-1.5 flex items-start justify-between gap-3 group hover:bg-[var(--paper-soft)]/50 p-1.5 rounded-lg transition-colors"
							>
								<div className="space-y-0.5 flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="font-semibold text-xs text-[var(--ink)] truncate">
											{item.title}
										</span>
										{item.badge && (
											<span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
												{item.badge}
											</span>
										)}
										{item.context && (
											<span className="text-[10px] text-[var(--muted)] shrink-0 hidden sm:inline">
												• {item.context}
											</span>
										)}
									</div>
									<p className="text-[11px] text-[var(--muted)] leading-relaxed">
										{item.description}
									</p>
								</div>

								{/* Key Combination Display */}
								<div className="flex items-center gap-1.5 shrink-0 pt-0.5">
									<div className="flex items-center gap-1">
										{item.keys.map((k, idx) => (
											<React.Fragment key={k + idx}>
												<kbd className="px-2 py-0.5 bg-[var(--paper-soft)] border border-[var(--line)] rounded text-[11px] font-mono font-bold text-[var(--ink)] shadow-2xs">
													{k}
												</kbd>
												{idx < item.keys.length - 1 && (
													<span className="text-[10px] text-[var(--muted)]">+</span>
												)}
											</React.Fragment>
										))}
									</div>

									{item.actionEvent && (
										<button
											type="button"
											onClick={() => handleActionClick(item)}
											title="Выполнить действие прямо сейчас"
											className="p-1 rounded text-[var(--muted)] hover:text-teal-500 hover:bg-[var(--paper)] transition-colors cursor-pointer"
											aria-label={`Выполнить ${item.title}`}
										>
											<ExternalLink size={13} />
										</button>
									)}
								</div>
							</div>
						))
					)}
				</div>

				{/* Modal Footer */}
				<div className="p-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between text-[11px]">
					<div className="flex items-center gap-1.5 text-[var(--muted)]">
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] border border-[var(--line)] rounded text-[10px] font-mono">
							Esc
						</kbd>
						<span>для закрытия</span>
					</div>

					{onOpenHelpDrawer && (
						<button
							type="button"
							onClick={() => {
								onClose();
								onOpenHelpDrawer();
							}}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-teal-500 hover:text-teal-500 transition-colors cursor-pointer shadow-2xs"
						>
							<BookOpen size={13} />
							<span>Иллюстрированные руководства клиники</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
});

ClinicalGuidanceModal.displayName = "ClinicalGuidanceModal";
