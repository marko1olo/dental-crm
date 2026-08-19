import React, { useCallback, useState } from "react";
import {
	Activity,
	Coins,
	Eye,
	EyeOff,
	FileText,
	Mic,
	Radio,
	Sparkles,
	Trash2,
	Zap,
} from "lucide-react";
import type { OdontogramViewMode } from "@dental/shared";
import {
	loadUiPreferences,
	saveUiPreferences,
} from "../../utils/preferencesUtils";
import { useAppStore } from "../../store/appStore";
import { AnatomicalSvgOdontogram } from "./AnatomicalSvgOdontogram";
import { ToothChart, type ToothData, type ToothState } from "./ToothChart";
import { ClassicGostOdontogram } from "./ClassicGostOdontogram";
import { RadialToothMenu } from "./RadialToothMenu";
import { OdontogramLiveInvoice } from "./OdontogramLiveInvoice";

export interface OdontogramViewOption {
	mode: OdontogramViewMode;
	label: string;
	shortLabel: string;
	icon: React.ReactNode;
	tooltip: string;
	badge?: string;
}

export const ODONTOGRAM_VIEW_MODES: readonly OdontogramViewOption[] = [
	{
		mode: "anatomical_svg",
		label: "3D Анатомический",
		shortLabel: "3D Анатомия",
		icon: <Sparkles size={14} className="text-indigo-500 shrink-0" />,
		tooltip: "Векторная анатомическая визуализация коронок, корней и каналов",
		badge: "3D",
	},
	{
		mode: "compact_clinical",
		label: "Клинический 5-поверхностный",
		shortLabel: "5-Поверхностный",
		icon: <Zap size={14} className="text-amber-500 shrink-0" />,
		tooltip: "Быстрая разметка патологий по 5 граням зуба (V, L/P, M, D, O)",
		badge: "FDI",
	},
	{
		mode: "classic_gost",
		label: "ГОСТ 043/у",
		shortLabel: "ГОСТ 043/у",
		icon: <FileText size={14} className="text-emerald-500 shrink-0" />,
		tooltip: "Табличная форма карты стоматологического больного (Минздрав РФ)",
		badge: "МЗ РФ",
	},
] as const;

export interface OdontogramViewContainerProps {
	teethData: ToothData[];
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	onToothClick: (num: number, rect: DOMRect, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	hideModeSwitcher?: boolean | undefined;
	className?: string | undefined;
	initialViewMode?: OdontogramViewMode | undefined;
	onViewModeChange?: ((mode: OdontogramViewMode) => void) | undefined;
	onOpenVoiceDictation?: (() => void) | undefined;
}

export const OdontogramViewContainer: React.FC<OdontogramViewContainerProps> = ({
	teethData,
	pediatricMode,
	mixedDentition,
	topTeeth,
	bottomTeeth,
	selectedTeeth = [],
	onToothClick,
	onQuickStateChange,
	useSurfaces: initialUseSurfaces = true,
	hideHeader = false,
	hideLegend = false,
	hideModeSwitcher = false,
	className = "",
	initialViewMode,
	onViewModeChange,
	onOpenVoiceDictation,
}) => {
	// 1. Read mode from zustand app store or initialViewMode or localStorage preferences
	const storeMode = useAppStore((state) => state.odontogramViewMode);
	const setStoreMode = useAppStore((state) => state.setOdontogramViewMode);

	const [localMode, setLocalMode] = useState<OdontogramViewMode>(() => {
		if (initialViewMode) return initialViewMode;
		if (storeMode) return storeMode;
		const prefs = loadUiPreferences();
		return prefs.odontogramViewMode ?? "anatomical_svg";
	});

	const activeMode = storeMode || localMode || "anatomical_svg";

	// 2. Custom toggles for clinical productivity
	const [showWisdomTeeth, setShowWisdomTeeth] = useState<boolean>(true);
	const [showPulpAndCanals, setShowPulpAndCanals] = useState<boolean>(false);
	const [useSurfaces, setUseSurfaces] = useState<boolean>(initialUseSurfaces);
	const [isLiveInvoiceOpen, setIsLiveInvoiceOpen] = useState<boolean>(false);
	const [isFastExtractMode, setIsFastExtractMode] = useState<boolean>(false);

	// 3. Radial Menu Active Anchor
	const [radialMenuData, setRadialMenuData] = useState<{
		toothNumber: number;
		rect: { x: number; y: number; width: number; height: number };
		currentState?: ToothState | undefined;
	} | null>(null);

	const handleModeSwitch = useCallback(
		(newMode: OdontogramViewMode) => {
			setLocalMode(newMode);
			try {
				if (typeof setStoreMode === "function") {
					setStoreMode(newMode);
				}
				const currentPrefs = loadUiPreferences();
				saveUiPreferences({
					...currentPrefs,
					odontogramViewMode: newMode,
				});
			} catch {
				// local storage safe fallback
			}
			onViewModeChange?.(newMode);
		},
		[setStoreMode, onViewModeChange],
	);

	// Intercept tooth click: in Fast Extract mode -> instant Missing, else open Radial Menu
	const handleToothClickIntercept = useCallback(
		(num: number, rect: DOMRect, surface?: string) => {
			if (isFastExtractMode) {
				onQuickStateChange?.([num], "Missing");
				return;
			}

			const currentTooth = teethData.find((t) => t.toothNumber === num);
			setRadialMenuData({
				toothNumber: num,
				rect: {
					x: rect.left,
					y: rect.top,
					width: rect.width,
					height: rect.height,
				},
				currentState: currentTooth?.state,
			});

			onToothClick(num, rect, surface);
		},
		[isFastExtractMode, onQuickStateChange, teethData, onToothClick],
	);

	const handleRadialSelectState = useCallback(
		(state: ToothState) => {
			if (!radialMenuData) return;
			onQuickStateChange?.([radialMenuData.toothNumber], state);
			setRadialMenuData(null);
		},
		[radialMenuData, onQuickStateChange],
	);

	const sharedViewProps = {
		teethData,
		pediatricMode,
		mixedDentition,
		topTeeth,
		bottomTeeth,
		selectedTeeth,
		onToothClick: handleToothClickIntercept,
		useSurfaces,
		hideHeader,
		hideLegend,
		showWisdomTeeth,
		showPulpAndCanals,
		className: "",
	};

	return (
		<div
			className={`odontogram-view-container flex flex-col gap-3 w-full relative ${className}`.trim()}
			data-testid="odontogram-view-container"
			data-view-mode={activeMode}
		>
			{/* Mode Switcher & Quick Action Toolbar */}
			{!hideModeSwitcher && (
				<div
					className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-2.5 bg-[var(--odontogram-surface,#f8fafc)] backdrop-blur-md rounded-2xl border border-[var(--odontogram-border,#cbd5e1)] shadow-sm"
					role="toolbar"
					aria-label="Панель управления зубной формулой"
				>
					{/* Left Group: View Mode Radios */}
					<div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
						<div
							className="inline-flex items-center p-1 rounded-xl bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)] shrink-0"
							role="radiogroup"
							aria-label="Режимы схемы"
						>
							{ODONTOGRAM_VIEW_MODES.map((option) => {
								const isActive = activeMode === option.mode;
								return (
									<button
										key={option.mode}
										type="button"
										role="radio"
										aria-checked={isActive}
										title={option.tooltip}
										data-testid={`odontogram-mode-btn-${option.mode}`}
										onClick={() => handleModeSwitch(option.mode)}
										className={`min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
											isActive
												? "bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] shadow-sm font-bold border border-[var(--odontogram-border,#cbd5e1)]"
												: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-paper,#ffffff)]/60"
										}`}
									>
										{option.icon}
										<span>{option.shortLabel}</span>
										{option.badge && (
											<span
												className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-tight ${
													isActive
														? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 font-mono"
														: "bg-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink-muted,#64748b)]"
												}`}
											>
												{option.badge}
											</span>
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* Right Group: Fast Clinical Toggles */}
					<div className="flex flex-wrap items-center gap-2 overflow-x-auto">
						{/* Wisdom Teeth Toggle */}
						<button
							type="button"
							onClick={() => setShowWisdomTeeth((prev) => !prev)}
							className={`min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
								showWisdomTeeth
									? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-400/40 shadow-xs"
									: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] opacity-80"
							}`}
							title="Показать или скрыть зубы мудрости (18, 28, 38, 48)"
						>
							{showWisdomTeeth ? <Eye size={14} /> : <EyeOff size={14} />}
							<span>8-ки</span>
						</button>

						{/* Pulp & Root Canals X-Ray Toggle */}
						{activeMode === "anatomical_svg" && (
							<button
								type="button"
								onClick={() => setShowPulpAndCanals((prev) => !prev)}
								className={`min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
									showPulpAndCanals
										? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-400/40 shadow-xs"
										: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] opacity-80"
								}`}
								title="Рентген-прозрачность эмали для просмотра корневых каналов и пульпы"
							>
								<Activity size={14} />
								<span>Каналы (Рентген)</span>
							</button>
						)}

						{/* Fast Extraction Mode */}
						<button
							type="button"
							onClick={() => setIsFastExtractMode((prev) => !prev)}
							className={`min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
								isFastExtractMode
									? "bg-rose-600 text-white border-rose-700 shadow-md animate-pulse font-extrabold"
									: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:text-rose-600 dark:hover:text-rose-400"
							}`}
							title="Режим быстрого удаления зубов в 1 клик"
						>
							<Trash2 size={14} />
							<span>{isFastExtractMode ? "Удаление ВКЛ" : "Удаление (0)"}</span>
						</button>

						{/* Live Invoice Toggle */}
						<button
							type="button"
							onClick={() => setIsLiveInvoiceOpen((prev) => !prev)}
							className={`min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
								isLiveInvoiceOpen
									? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
									: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
							}`}
							title="Открыть живой калькулятор сметы лечения"
						>
							<Coins size={14} />
							<span>Смета</span>
						</button>

						{/* Voice Dictation Trigger */}
						{onOpenVoiceDictation && (
							<button
								type="button"
								onClick={onOpenVoiceDictation}
								className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm cursor-pointer transition-all active:scale-95"
								title="Голосовая диктовка зубной формулы («16 кариес, 24 пломба, 36 отсутствует»)"
							>
								<Mic size={14} />
								<span>Голос</span>
							</button>
						)}
					</div>
				</div>
			)}

			{/* Main Layout Area: Chart + Optional Live Invoice Sidebar */}
			<div className="flex flex-col lg:flex-row gap-3 w-full items-start">
				<div className="odontogram-active-view-slot w-full flex-1 min-w-0">
					{activeMode === "anatomical_svg" && (
						<AnatomicalSvgOdontogram {...sharedViewProps} />
					)}
					{activeMode === "compact_clinical" && (
						<ToothChart {...sharedViewProps} />
					)}
					{activeMode === "classic_gost" && (
						<ClassicGostOdontogram {...sharedViewProps} />
					)}
				</div>

				{/* Live Invoice Panel */}
				{isLiveInvoiceOpen && (
					<OdontogramLiveInvoice
						teethData={teethData}
						isOpen={isLiveInvoiceOpen}
						onClose={() => setIsLiveInvoiceOpen(false)}
						className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
					/>
				)}
			</div>

			{/* Radial Context Menu Modal */}
			{radialMenuData && (
				<RadialToothMenu
					toothNumber={radialMenuData.toothNumber}
					anchorRect={radialMenuData.rect}
					currentState={radialMenuData.currentState}
					onSelectState={handleRadialSelectState}
					onAddToInvoice={() => setIsLiveInvoiceOpen(true)}
					onClose={() => setRadialMenuData(null)}
				/>
			)}
		</div>
	);
};
