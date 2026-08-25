import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
	Activity,
	AlertTriangle,
	Coins,
	Eye,
	EyeOff,
	FileText,
	Mic,
	Paintbrush,
	Radio,
	Sparkles,
	Stethoscope,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import type { OdontogramViewMode } from "@dental/shared";
import {
	loadUiPreferences,
	saveUiPreferences,
} from "../../utils/preferencesUtils";
import { useAppStore } from "../../store/appStore";
import { AnatomicalSvgOdontogram } from "./AnatomicalSvgOdontogram";
import {
	ToothChart,
	type ToothData,
	type ToothState,
	TOP_TEETH,
	BOTTOM_TEETH,
	ALL_ADULT_TEETH_NUMBERS,
	ADULT_MOLARS,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	PEDIATRIC_MOLARS,
} from "./ToothChart";
import { ClassicGostOdontogram } from "./ClassicGostOdontogram";
import { RadialToothMenu } from "./RadialToothMenu";
import { OdontogramLiveInvoice } from "./OdontogramLiveInvoice";
import { ToothContextDrawer } from "../diagnostic/ToothContextDrawer";

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
		icon: <FileText size={14} className="text-[var(--teal)] shrink-0" />,
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
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	hideModeSwitcher?: boolean | undefined;
	className?: string | undefined;
	initialViewMode?: OdontogramViewMode | undefined;
	onViewModeChange?: ((mode: OdontogramViewMode) => void) | undefined;
	onOpenVoiceDictation?: (() => void) | undefined;
	onOpenPediatricModal?: (() => void) | undefined;
	onTogglePerio?: (() => void) | undefined;
	isPerioOpen?: boolean | undefined;
	onToggleEstimator?: (() => void) | undefined;
	isEstimatorOpen?: boolean | undefined;
	onLoadDiagnocat?: (() => void) | undefined;
	diagnocatLoading?: boolean | undefined;
	isMultiSelectMode?: boolean | undefined;
	onToggleMultiSelect?: ((enabled: boolean) => void) | undefined;
	onSelectTeethGroup?: ((teeth: number[]) => void) | undefined;
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
	useSurfaces: initialUseSurfaces = false,
	hideHeader = false,
	hideLegend = false,
	hideModeSwitcher = false,
	className = "",
	initialViewMode,
	onViewModeChange,
	onOpenVoiceDictation,
	onOpenPediatricModal,
	onTogglePerio,
	isPerioOpen,
	onToggleEstimator,
	isEstimatorOpen,
	onLoadDiagnocat,
	diagnocatLoading,
	isMultiSelectMode,
	onToggleMultiSelect,
	onSelectTeethGroup,
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
	const [activeStampTool, setActiveStampTool] = useState<ToothState | null>(null);
	const [isConfirmSanitationModalOpen, setIsConfirmSanitationModalOpen] = useState<boolean>(false);
	const [contextDrawerTooth, setContextDrawerTooth] = useState<number | null>(null);

	// 3. Radial Menu Active Anchor
	const [radialMenuData, setRadialMenuData] = useState<{
		toothNumber: number;
		rect: { x: number; y: number; width: number; height: number };
		currentState?: ToothState | undefined;
		surfaces?: string[] | undefined;
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

	// Intercept tooth click: in Stamp mode -> instant State change; in Fast Extract mode -> instant Missing; else call onToothClick or fallback to radial
	const handleToothClickIntercept = useCallback(
		(num: number, rect?: DOMRect | null, surface?: string) => {
			const safeRect: DOMRect =
				rect && typeof rect.left === "number" && typeof rect.top === "number"
					? rect
					: typeof DOMRect !== "undefined"
						? new DOMRect(0, 0, 0, 0)
						: ({
								x: 0,
								y: 0,
								width: 0,
								height: 0,
								top: 0,
								right: 0,
								bottom: 0,
								left: 0,
								toJSON: () => ({}),
							} as DOMRect);

			if (activeStampTool) {
				onQuickStateChange?.([num], activeStampTool);
				return;
			}

			if (isFastExtractMode) {
				onQuickStateChange?.([num], "Missing");
				return;
			}

			if (onToothClick) {
				onToothClick(num, safeRect, surface);
				return;
			}

			const currentTooth = teethData.find((t) => t.toothNumber === num);
			setRadialMenuData({
				toothNumber: num,
				rect: {
					x: safeRect.left,
					y: safeRect.top,
					width: safeRect.width,
					height: safeRect.height,
				},
				currentState: currentTooth?.state,
				surfaces: currentTooth?.surfaces ? [...currentTooth.surfaces] : undefined,
			});
		},
		[activeStampTool, isFastExtractMode, onQuickStateChange, teethData, onToothClick],
	);

	// Global Escape hotkey to exit Stamp tool
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && activeStampTool) {
				setActiveStampTool(null);
			}
		};
		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [activeStampTool]);

	const handleRadialSelectState = useCallback(
		(state: ToothState, surfaces?: readonly string[]) => {
			if (!radialMenuData) return;
			const finalSurfaces =
				surfaces !== undefined
					? surfaces
					: state !== "Healthy" && state !== "Missing"
						? radialMenuData.surfaces
						: undefined;
			onQuickStateChange?.([radialMenuData.toothNumber], state, finalSurfaces ? [...finalSurfaces] : undefined);
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
		onQuickStateChange,
		useSurfaces,
		hideHeader,
		hideLegend,
		showWisdomTeeth,
		showPulpAndCanals,
		className: "",
	};

	return (
		<div
			className={`odontogram-view-container flex flex-col gap-1.5 w-full relative ${className}`.trim()}
			data-testid="odontogram-view-container"
			data-view-mode={activeMode}
		>
			{/* Unified Clinical Toolbar - Sleek Single Horizontal Scroll Track */}
			{!hideModeSwitcher && (
				<div
					className="odontogram-toolbar flex items-center gap-2 py-1 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] w-full overflow-x-auto flex-nowrap scrollbar-none select-none"
					role="toolbar"
					aria-label="Панель управления зубной формулой"
				>
					{/* Left Group: View Mode Radios */}
					<div className="flex items-center gap-1.5 shrink-0">
						<div
							className="inline-flex items-center p-0.5 rounded-xl bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)] shrink-0"
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
										className={`min-h-[48px] flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 cursor-pointer select-none shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
											isActive
												? "bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] shadow-xs font-black border border-[var(--odontogram-border,#cbd5e1)]"
												: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-paper,#ffffff)]/60"
										}`}
									>
										{option.icon}
										<span>{option.shortLabel}</span>
										{option.badge && (
											<span
												className={`text-xs px-1.5 py-0.5 rounded font-black tracking-tight ${
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

						{/* Shift Multi-Select Checkbox */}
						{onToggleMultiSelect && (
							<label
								className={`flex items-center gap-1.5 min-h-[48px] text-xs sm:text-sm font-bold cursor-pointer select-none px-3.5 py-2 rounded-xl border transition-colors shrink-0 ${
									isMultiSelectMode
										? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-black"
										: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)]"
								}`}
							>
								<input
									type="checkbox"
									checked={isMultiSelectMode ?? false}
									onChange={(e) => onToggleMultiSelect(e.target.checked)}
									className="accent-indigo-500 rounded cursor-pointer shrink-0"
								/>
								<span className="whitespace-nowrap">Группа</span>
							</label>
						)}

						{/* 1-Click Group Selection Buttons */}
						<div
							className="flex items-center gap-1 shrink-0 p-1 rounded-xl bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)]"
							role="group"
							aria-label="Быстрый выбор группы зубов"
						>
							<button
								type="button"
								onClick={() => {
									const targetUpper = pediatricMode ? PEDIATRIC_TOP_TEETH : TOP_TEETH;
									if (onSelectTeethGroup) onSelectTeethGroup(targetUpper);
								}}
								className="min-h-[44px] min-w-[48px] px-3 py-1.5 rounded-lg text-[13px] font-black bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] hover:bg-indigo-500/15 hover:text-indigo-700 dark:hover:text-indigo-300 border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer shrink-0"
								title="Выбрать все зубы верхней челюсти (18–28)"
								data-testid="select-upper-jaw-btn"
							>
								Вся ВЧ
							</button>
							<button
								type="button"
								onClick={() => {
									const targetLower = pediatricMode ? PEDIATRIC_BOTTOM_TEETH : BOTTOM_TEETH;
									if (onSelectTeethGroup) onSelectTeethGroup(targetLower);
								}}
								className="min-h-[44px] min-w-[48px] px-3 py-1.5 rounded-lg text-[13px] font-black bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] hover:bg-indigo-500/15 hover:text-indigo-700 dark:hover:text-indigo-300 border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer shrink-0"
								title="Выбрать все зубы нижней челюсти (38–48)"
								data-testid="select-lower-jaw-btn"
							>
								Вся НЧ
							</button>
							<button
								type="button"
								onClick={() => {
									const targetMolars = pediatricMode ? PEDIATRIC_MOLARS : ADULT_MOLARS;
									if (onSelectTeethGroup) onSelectTeethGroup([...targetMolars]);
								}}
								className="min-h-[44px] min-w-[48px] px-3 py-1.5 rounded-lg text-[13px] font-black bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] hover:bg-indigo-500/15 hover:text-indigo-700 dark:hover:text-indigo-300 border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer shrink-0"
								title="Выбрать все моляры (18–16, 26–28, 48–46, 36–38)"
								data-testid="select-molars-btn"
							>
								Все моляры
							</button>
							<button
								type="button"
								onClick={() => {
									const allTeeth = pediatricMode
										? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH]
										: ALL_ADULT_TEETH_NUMBERS;
									const inverted = allTeeth.filter(
										(t) => !selectedTeeth.includes(t),
									);
									if (onSelectTeethGroup) onSelectTeethGroup(inverted);
								}}
								className="min-h-[44px] min-w-[48px] px-3 py-1.5 rounded-lg text-[13px] font-black bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] hover:bg-indigo-500/15 hover:text-indigo-700 dark:hover:text-indigo-300 border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer shrink-0"
								title="Инвертировать текущий выбор зубов"
								data-testid="invert-selection-btn"
							>
								Инверсия
							</button>
							{onQuickStateChange && (
								<button
									type="button"
									onClick={() => setIsConfirmSanitationModalOpen(true)}
									className="min-h-[44px] px-3 py-1.5 rounded-lg text-[13px] font-black bg-[var(--ok-bg,rgba(16,185,129,0.15))] text-[var(--ok-fg,#10b981)] hover:opacity-90 border border-[var(--ok-fg,rgba(16,185,129,0.3))] transition-all cursor-pointer shrink-0"
									title="Тотальная санация: пометить все зубы здоровыми (Healthy) в 1 клик с подтверждением"
									data-testid="total-sanitation-btn"
								>
									Санация
								</button>
							)}
						</div>
					</div>

					<div className="h-6 w-[1px] bg-[var(--odontogram-border-subtle,#e2e8f0)] shrink-0 mx-0.5 hidden sm:block" />

					{/* Center Group: Batch Stamp / Brush Mode Selector */}
					<div
						className="flex items-center gap-1.5 shrink-0 p-1 rounded-xl bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)]"
						role="group"
						aria-label="Режим штампа патологий"
					>
						<div className="flex items-center gap-1.5 px-2 text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] shrink-0">
							<Paintbrush size={16} className={activeStampTool ? "text-indigo-600 dark:text-indigo-400 animate-pulse" : ""} />
							<span className="hidden md:inline font-black">Штамп:</span>
						</div>
						<button
							type="button"
							onClick={() => setActiveStampTool((prev) => (prev === "Caries" ? null : "Caries"))}
							className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none shrink-0 ${
								activeStampTool === "Caries"
									? "bg-amber-500 text-white font-black shadow-xs ring-2 ring-amber-400"
									: "bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 border border-amber-500/20"
							}`}
							title="Штамп: Кариес (Клик по зубу без меню)"
							data-testid="stamp-caries-btn"
						>
							Кариес (К)
						</button>
						<button
							type="button"
							onClick={() => setActiveStampTool((prev) => (prev === "Filled" ? null : "Filled"))}
							className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none shrink-0 ${
								activeStampTool === "Filled"
									? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] font-black shadow-xs ring-2 ring-[var(--teal)]/60"
									: "bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal)] hover:opacity-90 border border-[var(--teal)]/30"
							}`}
							title="Штамп: Пломба (Клик по зубу без меню)"
							data-testid="stamp-filled-btn"
						>
							Пломба (П)
						</button>
						<button
							type="button"
							onClick={() => setActiveStampTool((prev) => (prev === "Pulpitis" ? null : "Pulpitis"))}
							className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none shrink-0 ${
								activeStampTool === "Pulpitis"
									? "bg-rose-600 text-white font-black shadow-xs ring-2 ring-rose-400"
									: "bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 border border-rose-500/20"
							}`}
							title="Штамп: Пульпит (Клик по зубу без меню)"
							data-testid="stamp-pulpitis-btn"
						>
							Пульпит (Ф)
						</button>
						<button
							type="button"
							onClick={() => setActiveStampTool((prev) => (prev === "Crown" ? null : "Crown"))}
							className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none shrink-0 ${
								activeStampTool === "Crown"
									? "bg-[var(--brand-500,#3b82f6)] text-white font-black shadow-xs ring-2 ring-[var(--brand-500,#3b82f6)]/60"
									: "bg-[var(--brand-500,#3b82f6)]/10 text-[var(--brand-500,#3b82f6)] hover:bg-[var(--brand-500,#3b82f6)]/20 border border-[var(--brand-500,#3b82f6)]/30"
							}`}
							title="Штамп: Коронка (Клик по зубу без меню)"
							data-testid="stamp-crown-btn"
						>
							Коронка (Ц)
						</button>
						<button
							type="button"
							onClick={() => setActiveStampTool((prev) => (prev === "Missing" ? null : "Missing"))}
							className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none shrink-0 ${
								activeStampTool === "Missing"
									? "bg-rose-700 text-white font-black shadow-xs ring-2 ring-rose-500"
									: "bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 border border-rose-500/20"
							}`}
							title="Штамп: Удален (Клик по зубу без меню)"
							data-testid="stamp-missing-btn"
						>
							Удален (0)
						</button>
						<button
							type="button"
							onClick={() => setActiveStampTool((prev) => (prev === "Healthy" ? null : "Healthy"))}
							className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none shrink-0 ${
								activeStampTool === "Healthy"
									? "bg-[var(--ok-fg,#10b981)] text-white font-black shadow-xs ring-2 ring-[var(--ok-fg,#10b981)]/60"
									: "bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)] hover:opacity-90 border border-[var(--ok-fg,rgba(16,185,129,0.3))]"
							}`}
							title="Штамп: Здоров / Интактный (Клик по зубу без меню)"
							data-testid="stamp-healthy-btn"
						>
							Здоров (З)
						</button>
						{activeStampTool && (
							<button
								type="button"
								onClick={() => setActiveStampTool(null)}
								className="min-h-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-all cursor-pointer shrink-0 border border-[var(--odontogram-border-subtle,#e2e8f0)]"
								title="Сбросить режим штампа (Esc)"
								data-testid="stamp-reset-btn"
							>
								Сброс
							</button>
						)}
					</div>

					<div className="h-6 w-[1px] bg-[var(--odontogram-border-subtle,#e2e8f0)] shrink-0 mx-0.5 hidden sm:block" />

					{/* Clinical Actions & Modules in Single Sleek Horizontal Scroll Line */}
					<div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
						{/* Pediatric Mixed Dentition Modal */}
						{onOpenPediatricModal && (
							<button
								type="button"
								onClick={onOpenPediatricModal}
								className="min-h-[48px] flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 rounded-xl transition-colors shrink-0 whitespace-nowrap cursor-pointer select-none"
								title="Сменный прикус: сроки прорезывания, стадии резорбции корней и Кариограмма Браттхолла"
							>
								<Sparkles size={16} className="text-amber-500 shrink-0" />
								<span>Сменный прикус</span>
							</button>
						)}

						{/* Periodontal Charting Module */}
						{onTogglePerio && (
							<button
								type="button"
								onClick={onTogglePerio}
								className={`min-h-[48px] flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl border transition-all shrink-0 whitespace-nowrap cursor-pointer select-none ${
									isPerioOpen
										? "bg-[var(--teal-soft,rgba(13,148,136,0.2))] text-[var(--teal)] border-[var(--teal)]/50 shadow-xs font-black"
										: "bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal)] border-[var(--teal)]/30 hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))]"
								}`}
								title="Открыть / скрыть пародонтологическую карту PSR / 6 точек зондирования"
							>
								<Activity size={16} className="text-[var(--teal)] shrink-0" />
								<span>Пародонтограмма</span>
							</button>
						)}

						{/* Diagnocat AI Report */}
						{onLoadDiagnocat && (
							<button
								type="button"
								onClick={onLoadDiagnocat}
								disabled={diagnocatLoading}
								className="min-h-[48px] flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold bg-[var(--brand-500,#3b82f6)]/10 text-[var(--brand-500,#3b82f6)] border border-[var(--brand-500,#3b82f6)]/30 hover:bg-[var(--brand-500,#3b82f6)]/20 rounded-xl transition-colors shrink-0 whitespace-nowrap cursor-pointer select-none"
								title="Загрузить отчёт Diagnocat AI"
							>
								<Stethoscope size={16} className="text-[var(--brand-500,#3b82f6)] shrink-0" />
								<span>{diagnocatLoading ? "Загрузка..." : "Diagnocat"}</span>
							</button>
						)}

						{/* Wisdom Teeth Toggle */}
						<button
							type="button"
							onClick={() => setShowWisdomTeeth((prev) => !prev)}
							className={`min-h-[48px] flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
								showWisdomTeeth
									? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-400/40 shadow-xs font-black"
									: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] opacity-80"
							}`}
							title="Показать или скрыть зубы мудрости (18, 28, 38, 48)"
						>
							{showWisdomTeeth ? <Eye size={16} /> : <EyeOff size={16} />}
							<span>8-ки</span>
						</button>

						{/* Pulp & Root Canals X-Ray Toggle */}
						{activeMode === "anatomical_svg" && (
							<button
								type="button"
								onClick={() => setShowPulpAndCanals((prev) => !prev)}
								className={`min-h-[48px] flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
									showPulpAndCanals
										? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/40 shadow-xs font-black"
										: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] opacity-80"
								}`}
								title="Рентген-прозрачность эмали для просмотра корневых каналов и пульпы"
							>
								<Activity size={16} />
								<span>Каналы</span>
							</button>
						)}

						{/* Fast Extraction Mode */}
						<button
							type="button"
							onClick={() => setIsFastExtractMode((prev) => !prev)}
							className={`min-h-[48px] flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
								isFastExtractMode
									? "bg-rose-600 text-white border-rose-700 shadow-md animate-pulse font-black"
									: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:text-rose-600 dark:hover:text-rose-400"
							}`}
							title="Режим быстрого удаления зубов в 1 клик"
						>
							<Trash2 size={16} />
							<span>{isFastExtractMode ? "Удаление ВКЛ" : "Удаление"}</span>
						</button>

						{/* Live Invoice Toggle */}
						<button
							type="button"
							onClick={() => {
								if (onToggleEstimator) {
									onToggleEstimator();
								} else {
									setIsLiveInvoiceOpen((prev) => !prev);
								}
							}}
							className={`min-h-[48px] flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
								(isEstimatorOpen ?? isLiveInvoiceOpen)
									? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] border-[var(--teal-dark,var(--teal))] shadow-sm font-black"
									: "bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal)] border-[var(--teal)]/30 hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))]"
							}`}
							title="Открыть живой калькулятор сметы лечения"
						>
							<Coins size={16} />
							<span>Смета</span>
						</button>

						{/* Voice Dictation Trigger */}
						{onOpenVoiceDictation && (
							<button
								type="button"
								onClick={onOpenVoiceDictation}
								className="min-h-[48px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs shrink-0 cursor-pointer transition-all active:scale-95"
								title="Голосовая диктовка зубной формулы («16 кариес, 24 пломба, 36 отсутствует»)"
							>
								<Mic size={16} />
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
					surfaces={radialMenuData.surfaces}
					onSelectState={handleRadialSelectState}
					onAddToInvoice={() => setIsLiveInvoiceOpen(true)}
					onClose={() => setRadialMenuData(null)}
				/>
			)}

			{/* Confirmation Modal for Total Sanitation / Bulk Reset */}
			{isConfirmSanitationModalOpen && (
				<div
					className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
					role="dialog"
					aria-modal="true"
					aria-labelledby="confirm-sanitation-title"
				>
					<div className="bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--line,#e2e8f0)] dark:border-zinc-800 text-[var(--ink,#0f172a)] w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
						<div className="flex items-start gap-3">
							<div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
								<AlertTriangle size={22} />
							</div>
							<div className="space-y-1">
								<h3 id="confirm-sanitation-title" className="text-base font-extrabold text-[var(--ink,#0f172a)] dark:text-zinc-100 m-0">
									Подтверждение тотальной санации всех зубов
								</h3>
								<p className="text-xs text-[var(--muted,#64748b)] m-0 leading-relaxed">
									Вы собираетесь пометить ВСЕ зубы интактными (здоровыми). Все текущие отметки кариеса, пульпита и пломб на схеме будут сброшены.
								</p>
							</div>
						</div>

						<div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 font-medium">
							⚠️ Это действие изменит статус всех зубов в зубной формуле пациента.
						</div>

						<div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-zinc-800">
							<button
								type="button"
								onClick={() => setIsConfirmSanitationModalOpen(false)}
								className="flex-1 min-h-[52px] px-6 py-3 rounded-2xl text-base font-black bg-[var(--teal)] hover:opacity-90 text-[var(--on-teal,#ffffff)] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]"
								data-testid="btn-cancel-sanitation"
							>
								<X size={20} />
								<span>❌ Отмена (Оставить всё как есть)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									const allTeeth = pediatricMode
										? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH]
										: [...ALL_ADULT_TEETH_NUMBERS];
									onQuickStateChange?.(allTeeth, "Healthy");
									setIsConfirmSanitationModalOpen(false);
								}}
								className="flex-1 min-h-[52px] px-6 py-3 rounded-2xl text-base font-black bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]"
								data-testid="btn-confirm-sanitation"
							>
								<Trash2 size={20} />
								<span>🗑️ Да, удалить данные</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Tier 2 Context Drawer for Selected Tooth */}
			{contextDrawerTooth !== null && (
				<ToothContextDrawer
					isOpen={contextDrawerTooth !== null}
					onClose={() => setContextDrawerTooth(null)}
					toothNumber={contextDrawerTooth}
					toothData={teethData?.find((t) => t.toothNumber === contextDrawerTooth)}
					onUpdateTooth={(num, updates) => {
						if (updates.state) {
							onQuickStateChange?.([num], updates.state, updates.surfaces);
						}
					}}
				/>
			)}
		</div>
	);
};
