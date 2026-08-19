import React, { useCallback, useState } from "react";
import { Sparkles, Zap, FileText } from "lucide-react";
import type { OdontogramViewMode } from "@dental/shared";
import {
	loadUiPreferences,
	saveUiPreferences,
} from "../../utils/preferencesUtils";
import { useAppStore } from "../../store/appStore";
import { AnatomicalSvgOdontogram } from "./AnatomicalSvgOdontogram";
import { ToothChart, type ToothData, type ToothState } from "./ToothChart";
import { ClassicGostOdontogram } from "./ClassicGostOdontogram";

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
}

export const OdontogramViewContainer: React.FC<OdontogramViewContainerProps> = ({
	teethData,
	pediatricMode,
	mixedDentition,
	topTeeth,
	bottomTeeth,
	selectedTeeth = [],
	onToothClick,
	useSurfaces,
	hideHeader = false,
	hideLegend = false,
	hideModeSwitcher = false,
	className = "",
	initialViewMode,
	onViewModeChange,
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

	const sharedViewProps = {
		teethData,
		pediatricMode,
		mixedDentition,
		topTeeth,
		bottomTeeth,
		selectedTeeth,
		onToothClick,
		useSurfaces,
		hideHeader,
		hideLegend,
		className: "",
	};

	return (
		<div
			className={`odontogram-view-container flex flex-col gap-3 w-full ${className}`.trim()}
			data-testid="odontogram-view-container"
			data-view-mode={activeMode}
		>
			{/* Mode Switcher Toolbar */}
			{!hideModeSwitcher && (
				<div
					className="flex flex-wrap items-center justify-between gap-2 p-1.5 sm:p-2 bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 shadow-sm"
					role="toolbar"
					aria-label="Переключение режима отображения зубной формулы"
				>
					<div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 pl-1">
						<span>Вид формулы:</span>
					</div>

					<div
						className="inline-flex items-center p-0.5 rounded-lg bg-zinc-200/60 dark:bg-zinc-800/60 border border-zinc-300/40 dark:border-zinc-700/50"
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
									className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
										isActive
											? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm font-bold border border-zinc-200/80 dark:border-zinc-700/80"
											: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-zinc-800/50"
									}`}
								>
									{option.icon}
									<span>{option.label}</span>
									{option.badge && (
										<span
											className={`text-[9px] px-1 py-0.2 rounded font-black tracking-tight ${
												isActive
													? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
													: "bg-zinc-300/40 dark:bg-zinc-700/40 text-zinc-500 dark:text-zinc-400"
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
			)}

			{/* Active View Dispatcher */}
			<div className="odontogram-active-view-slot w-full">
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
		</div>
	);
};
