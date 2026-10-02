/**
 * DENTE Dental CRM — Odontogram Stamp Palette (Clinical Fast Markup Console)
 *
 * Dedicated spacious toolbar positioned beneath the dental chart for rapid,
 * uncompressed pathology and restoration stamping without cluttering the top navigation.
 *
 * Invariants:
 * - ZERO CARTOON EMOJIS: strictly pure CSS/SVG color indicators (w-2.5 h-2.5 rounded-full).
 * - Full pathology coverage: Healthy, Caries, Pulpitis, Periodontitis, Filled, Crown, Missing, Implant.
 * - Prominent active stamp indicator with 1-click reset and Escape dismissal.
 * - Test IDs preserved for seamless E2E automation.
 */

import React, { useEffect, useCallback } from "react";
import { MousePointer, Sparkles, X, Check } from "lucide-react";
import type { ToothState } from "./ToothChart";
import { TOOTH_STATE_LABELS } from "./chart/toothChartTypes";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";

export interface OdontogramStampPaletteProps {
	activeStampTool: ToothState | null;
	setActiveStampTool: React.Dispatch<React.SetStateAction<ToothState | null>>;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	handleQuickTriggerState: (state: ToothState) => void;
	selectedTeeth?: number[] | undefined;
	className?: string;
}

interface StampOption {
	state: ToothState;
	label: string;
	shortLabel: string;
	abbr: string;
	testId: string;
	colorDotClass: string;
	activeBgClass: string;
	inactiveHoverClass: string;
	description: string;
}

const STAMP_OPTIONS: readonly StampOption[] = [
	{
		state: "Healthy",
		label: "Здоров",
		shortLabel: "Зд",
		abbr: "Зд",
		testId: "quick-trigger-healthy-btn",
		colorDotClass: "bg-emerald-500",
		activeBgClass: "bg-emerald-600 text-white font-bold shadow-xs border-emerald-700",
		inactiveHoverClass: "text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/15 border-emerald-500/30",
		description: "Норма (Интактный)",
	},
	{
		state: "Caries",
		label: "Кариес",
		shortLabel: "К",
		abbr: "К",
		testId: "quick-trigger-caries-btn",
		colorDotClass: "bg-amber-500",
		activeBgClass: "bg-amber-600 text-white font-bold shadow-xs border-amber-700",
		inactiveHoverClass: "text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 border-amber-500/30",
		description: "Кариозное поражение (C)",
	},
	{
		state: "Pulpitis",
		label: "Пульпит",
		shortLabel: "Пт",
		abbr: "Пт",
		testId: "quick-trigger-pulpitis-btn",
		colorDotClass: "bg-rose-600",
		activeBgClass: "bg-rose-600 text-white font-bold shadow-xs border-rose-700",
		inactiveHoverClass: "text-rose-800 dark:text-rose-300 hover:bg-rose-500/15 border-rose-500/30",
		description: "Воспаление пульпы (P)",
	},
	{
		state: "Periodontitis",
		label: "Периодонтит",
		shortLabel: "Pt",
		abbr: "Pt",
		testId: "quick-trigger-periodontitis-btn",
		colorDotClass: "bg-orange-600",
		activeBgClass: "bg-orange-600 text-white font-bold shadow-xs border-orange-700",
		inactiveHoverClass: "text-orange-800 dark:text-orange-300 hover:bg-orange-500/15 border-orange-500/30",
		description: "Периодонтит (Pt)",
	},
	{
		state: "Filled",
		label: "Пломба",
		shortLabel: "П",
		abbr: "П",
		testId: "quick-trigger-filling-btn",
		colorDotClass: "bg-teal-500",
		activeBgClass: "bg-teal-600 text-white font-bold shadow-xs border-teal-700",
		inactiveHoverClass: "text-teal-800 dark:text-teal-300 hover:bg-teal-500/15 border-teal-500/30",
		description: "Пломбированный зуб (Pl)",
	},
	{
		state: "Crown",
		label: "Коронка",
		shortLabel: "Кр",
		abbr: "Кр",
		testId: "quick-trigger-crown-btn",
		colorDotClass: "bg-blue-600",
		activeBgClass: "bg-blue-600 text-white font-bold shadow-xs border-blue-700",
		inactiveHoverClass: "text-blue-800 dark:text-blue-300 hover:bg-blue-500/15 border-blue-500/30",
		description: "Ортопедическая коронка (K)",
	},
	{
		state: "Missing",
		label: "Удален",
		shortLabel: "0",
		abbr: "0",
		testId: "quick-trigger-extracted-btn",
		colorDotClass: "bg-slate-500 dark:bg-slate-400",
		activeBgClass: "bg-slate-700 text-white font-bold shadow-xs border-slate-800",
		inactiveHoverClass: "text-slate-800 dark:text-slate-200 hover:bg-slate-500/20 border-slate-400/40",
		description: "Отсутствует / Адентия (0)",
	},
	{
		state: "Implant",
		label: "Имплант",
		shortLabel: "И",
		abbr: "И",
		testId: "quick-trigger-implant-btn",
		colorDotClass: "bg-violet-600",
		activeBgClass: "bg-violet-600 text-white font-bold shadow-xs border-violet-700",
		inactiveHoverClass: "text-violet-800 dark:text-violet-300 hover:bg-violet-500/15 border-violet-500/30",
		description: "Дентальный имплантат (I)",
	},
];

export const OdontogramStampPalette: React.FC<OdontogramStampPaletteProps> = React.memo(({
	activeStampTool,
	setActiveStampTool,
	onQuickStateChange,
	handleQuickTriggerState,
	selectedTeeth = [],
	className = "",
}) => {
	// Dismiss active stamp tool on Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && activeStampTool) {
				setActiveStampTool(null);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeStampTool, setActiveStampTool]);

	const handleResetStamp = useCallback(() => {
		if (activeStampTool) {
			setActiveStampTool(null);
			SoundFeedbackService.getInstance().playActionSuccess();
		}
	}, [activeStampTool, setActiveStampTool]);

	const hasSelection = selectedTeeth.length > 0;

	return (
		<div
			className={`odontogram-stamp-palette w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border,#cbd5e1)] shadow-xs select-none ${className}`.trim()}
			role="toolbar"
			aria-label="Панель быстрой клинической разметки одонтограммы"
			data-testid="odontogram-stamp-palette"
		>
			{/* Left section: Title & Pathology buttons */}
			<div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--odontogram-ink,#0f172a)] mr-1 shrink-0">
					<Sparkles size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
					<span className="hidden sm:inline">Быстрая разметка:</span>
					<span className="sm:hidden">Разметка:</span>
				</div>

				{/* 8 Clinical Pathology Triggers */}
				<div
					className="flex flex-wrap items-center gap-1 sm:gap-1.5"
					role="group"
					aria-label="Штампы патологий и состояний зубов"
				>
					{STAMP_OPTIONS.map((opt) => {
						const isActive = activeStampTool === opt.state;
						return (
							<button
								key={opt.state}
								type="button"
								onClick={() => handleQuickTriggerState(opt.state)}
								className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none shrink-0 flex items-center gap-1.5 border ${
									isActive
										? `${opt.activeBgClass} ring-2 ring-indigo-500/40`
										: `bg-[var(--odontogram-paper,#ffffff)] ${opt.inactiveHoverClass}`
								}`}
								title={`${opt.label}: ${opt.description}${
									hasSelection
										? ` (Применить к выделенным зубам: ${selectedTeeth.length} шт.)`
										: " (Включить штамп для клика по зубам)"
								}`}
								data-testid={opt.testId}
								aria-pressed={isActive}
							>
								{/* Strict Pure CSS Circle Indicator — Zero Cartoon Emojis */}
								<span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.colorDotClass}`} />
								<span className="font-bold whitespace-nowrap">
									<span className="hidden md:inline">{opt.label}</span>
									<span className="md:hidden">{opt.shortLabel}</span>
								</span>
								{isActive && <Check size={12} className="stroke-[3] shrink-0 ml-0.5" />}
							</button>
						);
					})}
				</div>
			</div>

			{/* Right section: Active Stamp Indicator & Inspection Mode Reset */}
			<div className="flex items-center gap-2 shrink-0 justify-end mt-1 sm:mt-0">
				{activeStampTool ? (
					<div
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-950 dark:text-amber-100 text-xs font-bold shrink-0 animate-in fade-in duration-150 whitespace-nowrap shadow-2xs"
						data-testid="odontogram-active-stamp-indicator"
					>
						<span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
						<span>
							Штамп:{" "}
							<strong className="font-black text-amber-950 dark:text-white">
								{TOOTH_STATE_LABELS[activeStampTool] || activeStampTool}
							</strong>
							<span className="hidden lg:inline font-normal text-amber-900/80 dark:text-amber-200/80 ml-1">
								(клик по зубу красит зуб)
							</span>
						</span>
						<button
							type="button"
							onClick={handleResetStamp}
							className="ml-1.5 p-0.5 rounded hover:bg-amber-500/25 text-amber-900 dark:text-amber-100 transition-all cursor-pointer flex items-center gap-1"
							title="Сбросить штамп (Режим осмотра) [Esc]"
							aria-label="Сбросить активный штамп"
							data-testid="clear-active-stamp-btn"
						>
							<X size={13} className="shrink-0 stroke-[2.5]" />
							<span className="hidden sm:inline text-[11px] font-bold">Сброс</span>
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={handleResetStamp}
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--odontogram-ink-muted,#64748b)] bg-[var(--odontogram-paper,#ffffff)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-colors cursor-pointer"
						title="Режим стандартного осмотра и выделения зубов (без штампа)"
						data-testid="clear-active-stamp-btn"
					>
						<MousePointer size={13} className="shrink-0 text-indigo-500" />
						<span className="whitespace-nowrap">Осмотр</span>
					</button>
				)}

				{hasSelection && (
					<span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
						Выбрано: {selectedTeeth.length}
					</span>
				)}
			</div>
		</div>
	);
});

OdontogramStampPalette.displayName = "OdontogramStampPalette";
