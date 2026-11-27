/**
 * DENTE Dental CRM — Odontogram Stamp Palette (Clinical Fast Markup Console)
 *
 * Dedicated spacious toolbar positioned beneath the dental chart for rapid,
 * uncompressed pathology and restoration stamping without cluttering the top navigation.
 *
 * Invariants:
 * - ZERO CARTOON EMOJIS: strictly pure CSS/SVG color indicators (w-2.5 h-2.5 rounded-full).
 * - Full pathology coverage: 15 clinical stamps organized by category tabs.
 * - Prominent active stamp indicator with 1-click reset and Escape dismissal.
 * - Test IDs preserved for seamless E2E automation.
 * - Mandate 8b compliant (Sweet spot ~300L).
 */

import React, { useEffect, useCallback, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { MousePointer, Sparkles, X, Check, ChevronDown, Search } from "lucide-react";
import { findClinicalDefectByAlias, CLINICAL_TOOTH_DEFECTS } from "@dental/shared";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import type { ToothState } from "./ToothChart";
import { TOOTH_STATE_LABELS } from "./chart/toothChartTypes";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { logger } from "../../utils/logger";

export interface CatalogDefectOption {
	readonly id: number;
	readonly name: string;
	readonly alias: string;
	readonly type: string;
	readonly key: string;
	readonly color: string | null;
	readonly mappedState: ToothState;
}

export interface OdontogramStampPaletteProps {
	activeStampTool: ToothState | null;
	setActiveStampTool: React.Dispatch<React.SetStateAction<ToothState | null>>;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	handleQuickTriggerState: (state: ToothState) => void;
	onApplyCatalogDefect?: ((defect: CatalogDefectOption) => void) | undefined;
	selectedTeeth?: number[] | undefined;
	className?: string;
}

export type StampCategory = "all" | "therapy" | "endo_surgery" | "ortho_perio";

export interface StampCategoryTab {
	readonly id: StampCategory;
	readonly label: string;
	readonly testId: string;
}

export const STAMP_CATEGORIES: readonly StampCategoryTab[] = [
	{ id: "all", label: "Все", testId: "stamp-category-all" },
	{ id: "therapy", label: "Терапия", testId: "stamp-category-therapy" },
	{ id: "endo_surgery", label: "Эндо / Хирургия", testId: "stamp-category-endo-surgery" },
	{ id: "ortho_perio", label: "Ортопедия / Паро", testId: "stamp-category-ortho-perio" },
];

export interface StampOption {
	readonly state: ToothState;
	readonly label: string;
	readonly shortLabel: string;
	readonly abbr: string;
	readonly testId: string;
	readonly colorDotClass: string;
	readonly colorStyleClass: string;
	readonly description: string;
	readonly categories: readonly ("therapy" | "endo_surgery" | "ortho_perio")[];
}

export const STAMP_OPTIONS: readonly StampOption[] = [
	{
		state: "Healthy",
		label: "Здоров",
		shortLabel: "Зд",
		abbr: "Зд",
		testId: "quick-trigger-healthy-btn",
		colorDotClass: "bg-[#10b981]",
		colorStyleClass: "odontogram-stamp-tool-btn--healthy",
		description: "Норма (Интактный)",
		categories: ["therapy"],
	},
	{
		state: "Caries",
		label: "Кариес",
		shortLabel: "К",
		abbr: "К",
		testId: "quick-trigger-caries-btn",
		colorDotClass: "bg-[#f59e0b]",
		colorStyleClass: "odontogram-stamp-tool-btn--caries",
		description: "Кариозное поражение (C)",
		categories: ["therapy"],
	},
	{
		state: "Defective_Restoration",
		label: "Дефект пломбы",
		shortLabel: "Дп",
		abbr: "Дп",
		testId: "quick-trigger-defective-btn",
		colorDotClass: "bg-[#f43f5e]",
		colorStyleClass: "odontogram-stamp-tool-btn--defective",
		description: "Дефект пломбы / краевое прилегание (Дп)",
		categories: ["therapy"],
	},
	{
		state: "Filled",
		label: "Пломба",
		shortLabel: "П",
		abbr: "П",
		testId: "quick-trigger-filling-btn",
		colorDotClass: "bg-[#0d9488]",
		colorStyleClass: "odontogram-stamp-tool-btn--filled",
		description: "Пломбированный зуб (Pl)",
		categories: ["therapy"],
	},
	{
		state: "Pulpitis",
		label: "Пульпит",
		shortLabel: "Пт",
		abbr: "Пт",
		testId: "quick-trigger-pulpitis-btn",
		colorDotClass: "bg-[#ef4444]",
		colorStyleClass: "odontogram-stamp-tool-btn--pulpitis",
		description: "Воспаление пульпы (P)",
		categories: ["endo_surgery"],
	},
	{
		state: "Periodontitis",
		label: "Периодонтит",
		shortLabel: "Пе",
		abbr: "Пе",
		testId: "quick-trigger-periodontitis-btn",
		colorDotClass: "bg-[#ea580c]",
		colorStyleClass: "odontogram-stamp-tool-btn--periodontitis",
		description: "Периодонтит (Pt)",
		categories: ["endo_surgery"],
	},
	{
		state: "Root_Canal_Treated",
		label: "Каналы лечены",
		shortLabel: "Кл",
		abbr: "Кл",
		testId: "quick-trigger-root-canal-btn",
		colorDotClass: "bg-[#06b6d4]",
		colorStyleClass: "odontogram-stamp-tool-btn--root-canal",
		description: "Лечены каналы (Endo)",
		categories: ["endo_surgery"],
	},
	{
		state: "Root",
		label: "Корень",
		shortLabel: "Кн",
		abbr: "Кн",
		testId: "quick-trigger-root-btn",
		colorDotClass: "bg-[#dc2626]",
		colorStyleClass: "odontogram-stamp-tool-btn--root",
		description: "Разрушенный корень (R)",
		categories: ["endo_surgery"],
	},
	{
		state: "Crown",
		label: "Коронка",
		shortLabel: "Кр",
		abbr: "Кр",
		testId: "quick-trigger-crown-btn",
		colorDotClass: "bg-[#2563eb]",
		colorStyleClass: "odontogram-stamp-tool-btn--crown",
		description: "Ортопедическая коронка (K)",
		categories: ["ortho_perio"],
	},
	{
		state: "Bridge",
		label: "Мост",
		shortLabel: "И",
		abbr: "И",
		testId: "quick-trigger-bridge-btn",
		colorDotClass: "bg-[#3b82f6]",
		colorStyleClass: "odontogram-stamp-tool-btn--bridge",
		description: "Мостовидный протез / Искусственный (И)",
		categories: ["ortho_perio"],
	},
	{
		state: "Veneer",
		label: "Винир",
		shortLabel: "В",
		abbr: "В",
		testId: "quick-trigger-veneer-btn",
		colorDotClass: "bg-[#8b5cf6]",
		colorStyleClass: "odontogram-stamp-tool-btn--veneer",
		description: "Керамический винир (В)",
		categories: ["ortho_perio"],
	},
	{
		state: "Inlay",
		label: "Вкладка",
		shortLabel: "ВК",
		abbr: "ВК",
		testId: "quick-trigger-inlay-btn",
		colorDotClass: "bg-[#6366f1]",
		colorStyleClass: "odontogram-stamp-tool-btn--inlay",
		description: "Культевая / керамическая вкладка (ВК)",
		categories: ["ortho_perio"],
	},
	{
		state: "Implant",
		label: "Имплант",
		shortLabel: "Им",
		abbr: "Им",
		testId: "quick-trigger-implant-btn",
		colorDotClass: "bg-[#7c3aed]",
		colorStyleClass: "odontogram-stamp-tool-btn--implant",
		description: "Дентальный имплантат (I)",
		categories: ["endo_surgery", "ortho_perio"],
	},
	{
		state: "Missing",
		label: "Удален",
		shortLabel: "✕",
		abbr: "✕",
		testId: "quick-trigger-extracted-btn",
		colorDotClass: "bg-[#64748b]",
		colorStyleClass: "odontogram-stamp-tool-btn--missing",
		description: "Отсутствует / Адентия (✕)",
		categories: ["endo_surgery"],
	},
	{
		state: "Calculus",
		label: "Зубной камень",
		shortLabel: "Зк",
		abbr: "Зк",
		testId: "quick-trigger-calculus-btn",
		colorDotClass: "bg-[#d97706]",
		colorStyleClass: "odontogram-stamp-tool-btn--calculus",
		description: "Минерализованные зубные отложения (Зк)",
		categories: ["therapy", "ortho_perio"],
	},
];

function mapDefectToToothState(raw: {
	alias?: string | undefined;
	name?: string | undefined;
	key?: string | null | undefined;
	crmToothState?: ToothState | undefined;
}): ToothState {
	if (raw.crmToothState) return raw.crmToothState;
	if (raw.alias) {
		const matched = findClinicalDefectByAlias(raw.alias);
		if (matched?.crmToothState) return matched.crmToothState as ToothState;
	}
	const probe = `${raw.alias ?? ""} ${raw.name ?? ""}`.toLowerCase();
	if (probe.includes("пульп")) return "Pulpitis";
	if (probe.includes("периодонт") || probe.includes("пародонт") || probe.includes("кист")) return "Periodontitis";
	if (probe.includes("пломб") || probe.includes("реставрац")) return "Filled";
	if (probe.includes("корон")) return "Crown";
	if (probe.includes("имплант")) return "Implant";
	if (probe.includes("отсутств") || probe.includes("удален") || probe.includes("аденти")) return "Missing";
	if (probe.includes("корен")) return "Root";
	if (probe.includes("ретен") || probe.includes("полуретен")) return "Retained";
	if (probe.includes("камен")) return "Calculus";
	if (probe.includes("здоров") || probe.includes("норма")) return "Healthy";
	return "Caries";
}

const FALLBACK_CATALOG_DEFECTS: readonly CatalogDefectOption[] = CLINICAL_TOOTH_DEFECTS.map((d) => ({
	id: d.id,
	name: d.name,
	alias: d.alias,
	type: d.type,
	key: d.key ?? "common",
	color: d.color,
	mappedState: mapDefectToToothState({ alias: d.alias, name: d.name, crmToothState: d.crmToothState as ToothState | undefined }),
}));

export const OdontogramStampPalette: React.FC<OdontogramStampPaletteProps> = React.memo(({
	activeStampTool,
	setActiveStampTool,
	onQuickStateChange,
	handleQuickTriggerState,
	onApplyCatalogDefect,
	selectedTeeth = [],
	className = "",
}) => {
	const [activeCategory, setActiveCategory] = useState<StampCategory>("all");
	const [catalogDefects, setCatalogDefects] = useState<readonly CatalogDefectOption[]>(FALLBACK_CATALOG_DEFECTS);
	const [isCatalogOpen, setIsCatalogOpen] = useState(false);
	const [catalogSearch, setCatalogSearch] = useState("");
	const [selectedCatalogDefect, setSelectedCatalogDefect] = useState<CatalogDefectOption | null>(null);
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const popoverRef = useRef<HTMLDivElement | null>(null);
	const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number; width: number }>({
		top: 0,
		left: 0,
		width: 320,
	});

	useEffect(() => {
		if (typeof fetch !== "function") return;
		const controller = new AbortController();
		void fetch("/api/catalogs/tooth-defects?activeOnly=true", {
			headers: getDenteAuthHeaders(),
			signal: controller.signal,
		})
			.then(async (res) => {
				if (!res.ok) return;
				const rawJson = (await res.json().catch((parseErr: unknown) => {
					logger.warn("[OdontogramStampPalette] Failed to parse tooth defects JSON:", parseErr);
					return null;
				})) as {
					defects?: unknown;
					data?: { defects?: unknown };
				} | null;
				if (!rawJson || typeof rawJson !== "object") return;
				const payload = rawJson.data ?? rawJson;
				if (!Array.isArray(payload?.defects) || payload.defects.length === 0) return;
				const mapped: CatalogDefectOption[] = payload.defects
					.filter((item): item is { id: number; name: string; alias: string; type?: string; key?: string | null; color?: string | null } =>
						typeof item === "object" &&
						item !== null &&
						typeof (item as { name?: unknown }).name === "string" &&
						typeof (item as { alias?: unknown }).alias === "string",
					)
					.map((item) => ({
						id: item.id,
						name: item.name,
						alias: item.alias,
						type: item.type ?? "outpatient",
						key: item.key ?? "common",
						color: item.color ?? null,
						mappedState: mapDefectToToothState({ alias: item.alias, name: item.name, key: item.key }),
					}));
				if (mapped.length > 0) {
					setCatalogDefects(mapped);
				}
			})
			.catch(() => {
				/* Fallback to FALLBACK_CATALOG_DEFECTS / STAMP_OPTIONS when offline or unseeded */
			});
		return () => controller.abort();
	}, []);

	const updatePopoverPosition = useCallback(() => {
		if (typeof window === "undefined" || !triggerRef.current) return;
		const rect = triggerRef.current.getBoundingClientRect();
		const width = Math.min(340, Math.max(288, window.innerWidth - 16));
		const maxLeft = Math.max(8, window.innerWidth - width - 8);
		const left = Math.min(Math.max(8, rect.left), maxLeft);
		const estimatedHeight = 320;
		const fitsBelow = rect.bottom + 6 + estimatedHeight <= window.innerHeight - 8;
		const top = fitsBelow
			? rect.bottom + 6
			: Math.max(8, rect.top - estimatedHeight - 6);
		setPopoverPosition({ top, left, width });
	}, []);

	useEffect(() => {
		if (!isCatalogOpen || typeof window === "undefined") return;
		updatePopoverPosition();
		const handleReposition = () => updatePopoverPosition();
		const handleOutsideClick = (e: MouseEvent) => {
			const target = e.target as Node | null;
			if (!target) return;
			if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
			setIsCatalogOpen(false);
		};
		window.addEventListener("resize", handleReposition);
		window.addEventListener("scroll", handleReposition, true);
		window.addEventListener("mousedown", handleOutsideClick);
		return () => {
			window.removeEventListener("resize", handleReposition);
			window.removeEventListener("scroll", handleReposition, true);
			window.removeEventListener("mousedown", handleOutsideClick);
		};
	}, [isCatalogOpen, updatePopoverPosition]);

	// Dismiss active stamp tool and catalog popover on Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (isCatalogOpen) {
					setIsCatalogOpen(false);
					return;
				}
				if (activeStampTool) {
					setActiveStampTool(null);
					setSelectedCatalogDefect(null);
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeStampTool, isCatalogOpen, setActiveStampTool]);

	const handleResetStamp = useCallback(() => {
		if (activeStampTool) {
			setActiveStampTool(null);
			setSelectedCatalogDefect(null);
			SoundFeedbackService.getInstance().playActionSuccess();
		}
	}, [activeStampTool, setActiveStampTool]);

	const visibleStamps = useMemo(() => {
		if (activeCategory === "all") return STAMP_OPTIONS;
		return STAMP_OPTIONS.filter((opt) => opt.categories.includes(activeCategory));
	}, [activeCategory]);

	const filteredCatalogDefects = useMemo(() => {
		const q = catalogSearch.trim().toLowerCase();
		if (!q) return catalogDefects;
		return catalogDefects.filter(
			(d) =>
				d.name.toLowerCase().includes(q) ||
				d.alias.toLowerCase().includes(q),
		);
	}, [catalogDefects, catalogSearch]);

	const hasSelection = selectedTeeth.length > 0;

	return (
		<div
			className={`odontogram-stamp-palette w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl border select-none ${className}`.trim()}
			role="toolbar"
			aria-label="Панель клинических штампов патологий одонтограммы"
			data-testid="odontogram-stamp-palette"
		>
			{/* Left section: Title + Category Segmented Tabs + Stamp Buttons */}
			<div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
				<div className="flex items-center gap-1.5 text-xs font-semibold shrink-0">
					<Sparkles size={14} className="text-[var(--primary)] shrink-0" />
					<span className="font-semibold text-xs text-[var(--ink)] hidden sm:inline">
						Штамп:
					</span>
				</div>

				{/* Segmented Category Filter Tabs */}
				<div
					className="inline-flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] max-w-full overflow-x-auto scrollbar-none shrink-0"
					role="tablist"
					aria-label="Категории клинических штампов"
				>
					{STAMP_CATEGORIES.map((cat) => {
						const isSelected = activeCategory === cat.id;
						return (
							<button
								key={cat.id}
								type="button"
								role="tab"
								aria-selected={isSelected}
								onClick={() => setActiveCategory(cat.id)}
								data-testid={cat.testId}
								className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
									isSelected
										? "bg-[var(--paper)] text-[var(--primary)] shadow-xs border border-[var(--line-subtle)]"
										: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
								}`}
							>
								{cat.label}
							</button>
						);
					})}
				</div>

				<div className="hidden lg:block h-4 w-px bg-[var(--line)] shrink-0" aria-hidden="true" />

				{/* Clinical Pathology Triggers — Tactile 32px Delimited Tile Cards */}
				<div
					className="flex flex-wrap items-center gap-1.5"
					role="group"
					aria-label="Штампы патологий и состояний зубов"
				>
					{visibleStamps.map((opt) => {
						const isActive = activeStampTool === opt.state;
						return (
							<button
								key={opt.state}
								type="button"
								onClick={() => {
									setSelectedCatalogDefect(null);
									handleQuickTriggerState(opt.state);
								}}
								className={`odontogram-stamp-tool-btn ${opt.colorStyleClass} ${
									isActive ? "odontogram-stamp-tool-btn--active" : ""
								}`}
								title={`${opt.label}: ${opt.description}${
									hasSelection
										? ` (Применить к выделенным зубам: ${selectedTeeth.length} шт.)`
										: " (Включить штамп для клика по зубам)"
								}`}
								data-testid={opt.testId}
								aria-pressed={isActive}
							>
								{/* Strict Pure CSS Circle Indicator with crisp border — Zero Cartoon Emojis */}
								<span
									className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs ring-1 ring-black/10 dark:ring-white/20 ${opt.colorDotClass}`}
								/>
								<span className="text-[10px] font-mono font-bold opacity-60 shrink-0 hidden md:inline">
									{opt.abbr}
								</span>
								<span className="whitespace-nowrap font-bold">
									<span className="hidden md:inline">{opt.label}</span>
									<span className="md:hidden">{opt.shortLabel}</span>
								</span>
								{isActive && (
									<Check size={13} className="stroke-[3] shrink-0 ml-0.5 text-white" />
								)}
							</button>
						);
					})}

					{/* Full catalog defects selector (loaded from /api/catalogs/tooth-defects with shared fallback) */}
					<div className="relative">
						<button
							ref={triggerRef}
							type="button"
							data-testid="odontogram-all-defects-trigger"
							aria-expanded={isCatalogOpen}
							onClick={() => setIsCatalogOpen((prev) => !prev)}
							className="h-8 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer shrink-0 whitespace-nowrap"
							title="Полный клинический классификатор дефектов зубного ряда"
						>
							<span>Классификатор ({catalogDefects.length})</span>
							<ChevronDown className="w-3.5 h-3.5 shrink-0" />
						</button>

						{isCatalogOpen && (() => {
							const popoverNode = (
								<div
									ref={popoverRef}
									data-testid="odontogram-all-defects-popover"
									style={{
										position: "fixed",
										top: `${popoverPosition.top}px`,
										left: `${popoverPosition.left}px`,
										width: `${popoverPosition.width}px`,
									}}
									className="z-40 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl p-2.5 space-y-2"
								>
									<div className="relative flex items-center">
										<Search className="w-3.5 h-3.5 text-[var(--ink-muted)] absolute left-2.5 pointer-events-none" />
										<input
											type="text"
											value={catalogSearch}
											onChange={(e) => setCatalogSearch(e.target.value)}
											placeholder="Поиск патологии или аномалии..."
											className="w-full h-9 pl-8 pr-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none"
										/>
									</div>
									<div className="max-h-60 overflow-y-auto divide-y divide-[var(--line-subtle)]">
										{filteredCatalogDefects.map((defect) => (
											<button
												key={`${defect.id}-${defect.alias}`}
												type="button"
												data-testid={`catalog-defect-item-${defect.alias}`}
												onClick={() => {
													setSelectedCatalogDefect(defect);
													if (onApplyCatalogDefect) {
														onApplyCatalogDefect(defect);
													}
													if (hasSelection && onQuickStateChange) {
														onQuickStateChange(selectedTeeth, defect.mappedState, []);
													} else {
														handleQuickTriggerState(defect.mappedState);
													}
													setIsCatalogOpen(false);
													setCatalogSearch("");
												}}
												className="w-full px-2.5 py-2 text-left text-xs flex items-center justify-between gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer rounded-md"
											>
												<span className="font-medium truncate">{defect.name}</span>
												<span className="text-[11px] font-mono text-[var(--ink-muted)] shrink-0">
													{TOOTH_STATE_LABELS[defect.mappedState] || defect.mappedState}
												</span>
											</button>
										))}
										{filteredCatalogDefects.length === 0 && (
											<div className="py-4 text-center text-xs text-[var(--ink-muted)]">
												Дефекты не найдены
											</div>
										)}
									</div>
								</div>
							);
							return typeof document !== "undefined"
								? createPortal(popoverNode, document.body)
								: popoverNode;
						})()}
					</div>
				</div>
			</div>

			{/* Right section: Active Stamp Indicator & Inspection Mode Reset */}
			<div className="flex items-center gap-2 shrink-0">
				{activeStampTool ? (
					<div
						className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-[var(--warning-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold shrink-0 whitespace-nowrap"
						data-testid="odontogram-active-stamp-indicator"
					>
						<span className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" />
						<span>
							Штамп:{" "}
							<strong className="font-semibold text-[var(--ink)]">
								{selectedCatalogDefect && selectedCatalogDefect.mappedState === activeStampTool
									? `${selectedCatalogDefect.name} (${selectedCatalogDefect.alias})`
									: TOOTH_STATE_LABELS[activeStampTool] || activeStampTool}
							</strong>
						</span>
						<button
							type="button"
							onClick={handleResetStamp}
							className="ml-1 px-2 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-all cursor-pointer flex items-center gap-1 font-medium text-xs"
							title="Сбросить штамп (Режим осмотра) [Esc]"
							aria-label="Сбросить активный штамп"
							data-testid="clear-active-stamp-btn"
						>
							<X size={12} className="shrink-0 stroke-[2.5]" />
							<span className="hidden sm:inline">Сброс (Esc)</span>
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={handleResetStamp}
						className="odontogram-stamp-inspection-btn"
						title="Режим стандартного осмотра и выделения зубов (без штампа) [Esc]"
						data-testid="clear-active-stamp-btn"
					>
						<MousePointer size={14} className="shrink-0 text-[var(--primary)] stroke-[2.5]" />
						<span className="whitespace-nowrap font-medium">Режим осмотра [Esc]</span>
					</button>
				)}
			</div>
		</div>
	);
});

OdontogramStampPalette.displayName = "OdontogramStampPalette";
