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
	colorStyleClass: string;
	description: string;
}

const STAMP_OPTIONS: readonly StampOption[] = [
	{
		state: "Healthy",
		label: "Здоров",
		shortLabel: "Зд",
		abbr: "Зд",
		testId: "quick-trigger-healthy-btn",
		colorDotClass: "bg-[#10b981]",
		colorStyleClass: "odontogram-stamp-tool-btn--healthy",
		description: "Норма (Интактный)",
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
	},
	{
		state: "Periodontitis",
		label: "Периодонтит",
		shortLabel: "Pt",
		abbr: "Pt",
		testId: "quick-trigger-periodontitis-btn",
		colorDotClass: "bg-[#ea580c]",
		colorStyleClass: "odontogram-stamp-tool-btn--periodontitis",
		description: "Периодонтит (Pt)",
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
	},
	{
		state: "Missing",
		label: "Удален",
		shortLabel: "0",
		abbr: "0",
		testId: "quick-trigger-extracted-btn",
		colorDotClass: "bg-[#64748b]",
		colorStyleClass: "odontogram-stamp-tool-btn--missing",
		description: "Отсутствует / Адентия (0)",
	},
	{
		state: "Implant",
		label: "Имплант",
		shortLabel: "И",
		abbr: "И",
		testId: "quick-trigger-implant-btn",
		colorDotClass: "bg-[#7c3aed]",
		colorStyleClass: "odontogram-stamp-tool-btn--implant",
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
			className={`odontogram-stamp-palette w-full flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl border select-none ${className}`.trim()}
			role="toolbar"
			aria-label="Панель клинических штампов патологий одонтограммы"
			data-testid="odontogram-stamp-palette"
		>
			{/* Left section: Title & Pathology stamp buttons */}
			<div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
				<div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
					<Sparkles size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="font-extrabold text-[12px] text-slate-800 dark:text-slate-100">
						Штамп патологии:
					</span>
				</div>

				{/* 8 Clinical Pathology Triggers — Tactile 32px Delimited Tile Cards */}
				<div
					className="flex flex-wrap items-center gap-1.5"
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
								<span className="whitespace-nowrap font-bold">
									<span className="hidden md:inline">{opt.label}</span>
									<span className="md:hidden">{opt.shortLabel}</span>
								</span>
								{isActive && (
									<Check size={13} className="stroke-[3] shrink-0 ml-0.5 text-teal-700 dark:text-teal-300" />
								)}
							</button>
						);
					})}
				</div>
			</div>

			<div className="hidden sm:block h-5 w-px bg-[var(--line-strong,#cbd5e1)] dark:bg-white/15 mx-0.5 shrink-0" aria-hidden="true" />

			{/* Right section: Active Stamp Indicator & Inspection Mode Reset */}
			<div className="flex items-center gap-2 shrink-0">
				{activeStampTool ? (
					<div
						className="inline-flex items-center gap-1.5 px-3 h-8 min-h-[32px] rounded-lg bg-amber-500/15 border border-amber-600/50 dark:border-amber-500/60 text-amber-950 dark:text-amber-100 text-xs font-bold shrink-0 animate-in fade-in duration-150 whitespace-nowrap shadow-2xs"
						data-testid="odontogram-active-stamp-indicator"
					>
						<span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
						<span>
							Штамп:{" "}
							<strong className="font-black text-amber-950 dark:text-white">
								{TOOTH_STATE_LABELS[activeStampTool] || activeStampTool}
							</strong>
						</span>
						<button
							type="button"
							onClick={handleResetStamp}
							className="ml-1 px-2 py-0.5 rounded-md border border-amber-600/40 bg-amber-500/20 hover:bg-amber-500/35 text-amber-950 dark:text-amber-100 transition-all cursor-pointer flex items-center gap-1 font-bold shadow-2xs text-[11px]"
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
						<MousePointer size={14} className="shrink-0 text-teal-600 dark:text-teal-400 stroke-[2.5]" />
						<span className="whitespace-nowrap font-bold">Режим осмотра [Esc]</span>
					</button>
				)}

				{hasSelection && (
					<span className="text-[11px] font-bold px-2.5 h-8 inline-flex items-center rounded-lg bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/30 whitespace-nowrap shadow-2xs">
						Выбрано: {selectedTeeth.length}
					</span>
				)}
			</div>
		</div>
	);
});

OdontogramStampPalette.displayName = "OdontogramStampPalette";
