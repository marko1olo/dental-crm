/**
 * PerioKeypad.tsx — Унифицированная эргономичная клавиатура зондирования пародонта
 * Консолидация микро-шредера в единый Sweet Spot компонент (Мандаты 8b/8zi, Apple HIG, ~210 строк).
 * Объединяет десктопный и мобильный блоки ввода глубины карманов (1–12 мм), BOP и зубного камня.
 */

import React, { memo } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Droplets, ShieldCheck } from "lucide-react";
import {
	PERIO_SITES_CONFIG,
	type PerioSiteKey,
	type PerioSiteMeasurement,
	type PerioToothRecord,
} from "@dental/shared";
import { triggerHaptic } from "../../../native/mobileBridge";
import { PerioProbe } from "../../icons/DentalIcons";
import { probingDepthTone } from "../perioHeatmap";
import { SITE_SHORT_RU } from "./PerioToothCard";

export const SITE_NAME_FULL_RU: Record<PerioSiteKey, string> = {
	distoBuccal: "Дистально-щечная (ДВ)",
	midBuccal: "Щечная (В)",
	mesioBuccal: "Медиально-щечная (МВ)",
	distoLingual: "Дистально-язычная (ДО)",
	midLingual: "Язычная (О)",
	mesioLingual: "Медиально-язычная (МО)",
};

const DEPTH_BUTTONS_DESKTOP = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const DEPTH_TILES_MOBILE = [
	{ val: 1, label: "1 мм", sub: "Норма", cls: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" },
	{ val: 2, label: "2 мм", sub: "Норма", cls: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" },
	{ val: 3, label: "3 мм", sub: "Норма", cls: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" },
	{ val: 4, label: "4 мм", sub: "Карман", cls: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40" },
	{ val: 5, label: "5 мм", sub: "Карман", cls: "bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/40 font-bold" },
	{ val: 6, label: "6 мм", sub: "Глубокий", cls: "bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40 font-bold" },
	{ val: 7, label: "7 мм", sub: "Глубокий", cls: "bg-rose-600/25 text-rose-900 dark:text-rose-200 border-rose-500/50 font-bold" },
	{ val: 8, label: "8 мм", sub: "Тяжелый", cls: "bg-red-600/25 text-red-900 dark:text-red-200 border-red-500/50 font-black" },
	{ val: 9, label: "9 мм", sub: "Тяжелый", cls: "bg-red-700/30 text-red-900 dark:text-red-200 border-red-600/50 font-black" },
	{ val: 10, label: "10+ мм", sub: "Крит.", cls: "bg-red-800/35 text-red-950 dark:text-red-100 border-red-700/60 font-black ring-1 ring-red-500/40" },
] as const;

export interface PerioKeypadDrawerProps {
	readonly focusedSite: { toothNumber: number; siteKey: PerioSiteKey } | null;
	readonly toothMap: Map<number, PerioToothRecord>;
	readonly isProbeKeyboardEnabled: boolean;
	readonly onToggleProbeKeyboard: (enabled: boolean) => void;
	readonly readOnly?: boolean | undefined;
	readonly onKeypadDepth: (depth: number) => void;
	readonly onToggleBop: () => void;
	readonly onTogglePlaque: () => void;
	readonly onToggleSuppuration: () => void;
	readonly onToggleCalculus?: (() => void) | undefined;
	readonly onPrevSite: () => void;
	readonly onNextSite: () => void;
}

/** Десктопная панель быстрого ввода глубины карманов и маркеров воспаления */
export const PerioKeypadDrawer: React.FC<PerioKeypadDrawerProps> = memo(({
	focusedSite,
	toothMap,
	isProbeKeyboardEnabled,
	onToggleProbeKeyboard,
	readOnly = false,
	onKeypadDepth,
	onToggleBop,
	onTogglePlaque,
	onToggleSuppuration,
	onToggleCalculus,
	onPrevSite,
	onNextSite,
}) => {
	const currentTooth = focusedSite ? toothMap.get(focusedSite.toothNumber) : null;
	const currentSite: PerioSiteMeasurement | null = focusedSite && currentTooth ? (currentTooth[focusedSite.siteKey] ?? null) : null;
	const currentDepth = currentSite?.probingDepthMm ?? 0;
	const tone = probingDepthTone(currentDepth);
	const toneColor = tone === "success" ? "text-emerald-400" : tone === "warning-low" ? "text-amber-400" : tone === "warning-high" ? "text-orange-400" : "text-rose-400";
	const siteLabel = focusedSite ? PERIO_SITES_CONFIG.find((s) => s.key === focusedSite.siteKey)?.shortKey : "";

	return (
		<div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-teal-500/30 shadow-xs">
			<div className="flex items-center gap-2 flex-wrap">
				<div className="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 font-mono text-xs font-bold flex items-center gap-1.5">
					<PerioProbe size={14} className="text-teal-400 shrink-0" />
					<span>
						{focusedSite ? (
							<>Зуб <strong className="text-[var(--ink)] text-sm">{focusedSite.toothNumber}</strong> • {siteLabel}</>
						) : (
							"Пародонтограмма: выберите точку"
						)}
					</span>
				</div>
				{focusedSite && (
					<span className="text-xs font-mono font-bold text-[var(--ink)]">
						Глубина кармана: <strong className={`text-sm ${toneColor}`}>{currentDepth} мм</strong>
					</span>
				)}
				<label className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line)] cursor-pointer text-xs select-none">
					<input
						type="checkbox"
						data-testid="perio-probe-keyboard-toggle-tier3"
						checked={isProbeKeyboardEnabled}
						onChange={(e) => onToggleProbeKeyboard(e.target.checked)}
						className="accent-teal-500 w-3.5 h-3.5 rounded cursor-pointer"
					/>
					<span className="text-[var(--ink-soft)] font-medium">Клавиатура Numpad</span>
				</label>
			</div>

			<div className="flex items-center gap-1 flex-wrap">
				<span className="text-[11px] font-bold text-[var(--muted)] mr-1 hidden sm:inline">Глубина кармана (1–12 мм):</span>
				{DEPTH_BUTTONS_DESKTOP.map((numVal) => {
					const isNorm = numVal <= 3;
					const isBorderline = numVal === 4;
					return (
						<button
							key={numVal}
							type="button"
							aria-disabled={readOnly}
							onClick={() => !readOnly && onKeypadDepth(numVal)}
							className={`min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-0 sm:h-9 rounded-lg font-black text-xs sm:text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center border ${
								isNorm
									? "bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
									: isBorderline
										? "bg-amber-500/20 hover:bg-amber-500/35 text-amber-800 dark:text-amber-300 border-amber-500/40"
										: "bg-red-600/25 hover:bg-red-600/40 text-red-800 dark:text-red-200 border-red-500/50 shadow-xs ring-1 ring-red-500/30 font-black"
							}`}
							title={`Глубина ${numVal} мм (хоткей: ${numVal <= 9 ? numVal : numVal === 10 ? "0" : `Shift+${numVal - 10}`})`}
							data-testid={`perio-keypad-depth-${numVal}`}
						>
							{numVal}
						</button>
					);
				})}

				<div className="h-6 w-[1px] bg-[var(--line)] mx-1 hidden sm:block" />

				{/* Кровоточивость десны (BOP) */}
				<button
					type="button"
					aria-disabled={readOnly}
					onClick={() => !readOnly && onToggleBop()}
					className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
						currentSite?.bleedingOnProbing
							? "bg-rose-500 text-white border-rose-400 shadow-xs"
							: "bg-[var(--paper)] hover:bg-rose-500/20 text-rose-300 border-[var(--line)]"
					}`}
					title="Кровоточивость десны (BOP, хоткей: B)"
				>
					<Droplets size={14} />
					<span>BOP</span>
				</button>

				{/* Зубной камень */}
				<button
					type="button"
					aria-disabled={readOnly}
					onClick={() => !readOnly && (onToggleCalculus ? onToggleCalculus() : onTogglePlaque())}
					className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
						currentSite?.calculus
							? "bg-sky-500 text-white border-sky-400 shadow-xs"
							: "bg-[var(--paper)] hover:bg-sky-500/20 text-sky-300 border-[var(--line)]"
					}`}
					title="Зубной камень"
				>
					<span>Камень</span>
				</button>

				{/* Зубной налёт (PLQ) */}
				<button
					type="button"
					aria-disabled={readOnly}
					onClick={() => !readOnly && onTogglePlaque()}
					className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
						currentSite?.plaque
							? "bg-amber-500 text-slate-950 font-black border-amber-500 shadow-xs"
							: "bg-[var(--paper)] hover:bg-amber-500/20 text-amber-300 border-[var(--line)]"
					}`}
					title="Зубной налёт (PLQ, хоткей: P)"
				>
					<span>PLQ</span>
				</button>

				{/* Нагноение (PUS) */}
				<button
					type="button"
					aria-disabled={readOnly}
					onClick={() => !readOnly && onToggleSuppuration()}
					className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
						currentSite?.suppuration
							? "bg-indigo-500 text-white border-indigo-400 shadow-xs"
							: "bg-[var(--paper)] hover:bg-indigo-500/20 text-indigo-300 border-[var(--line)]"
					}`}
					title="Нагноение (PUS, хоткей: S)"
				>
					<span>PUS</span>
				</button>

				<div className="h-6 w-[1px] bg-[var(--line)] mx-1 hidden sm:block" />

				<button
					type="button"
					onClick={onPrevSite}
					className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-9 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] font-bold text-xs flex items-center justify-center cursor-pointer"
					title="Предыдущая точка (Стрелка влево)"
				>
					&larr;
				</button>
				<button
					type="button"
					onClick={onNextSite}
					className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-9 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-teal-300 border border-[var(--line)] font-bold text-xs flex items-center justify-center cursor-pointer"
					title="Следующая точка (Стрелка вправо)"
				>
					&rarr;
				</button>
			</div>
		</div>
	);
});
PerioKeypadDrawer.displayName = "PerioKeypadDrawer";

export interface MobilePerioKeypadDialProps {
	readonly selectedToothNumber: number;
	readonly currentFocusedSiteKey: PerioSiteKey;
	readonly currentPd: number;
	readonly currentBop: boolean;
	readonly currentPlq: boolean;
	readonly currentPus: boolean;
	readonly currentCalculus?: boolean | undefined;
	readonly readOnly?: boolean | undefined;
	readonly onKeypadDepth: (depth: number) => void;
	readonly onToggleBop: () => void;
	readonly onTogglePlaque: () => void;
	readonly onToggleSuppuration: () => void;
	readonly onToggleCalculus?: (() => void) | undefined;
	readonly onPrevSite?: (() => void) | undefined;
	readonly onNextSite?: (() => void) | undefined;
	readonly onSetToothNorm?: (() => void) | undefined;
	readonly onSetToothPathology?: ((depth: number, hasBop: boolean) => void) | undefined;
}

/** Мобильный сенсорный пульт ввода параметров пародонта (Apple HIG >= 44x44px) */
export const MobilePerioKeypadDial: React.FC<MobilePerioKeypadDialProps> = memo(({
	selectedToothNumber,
	currentFocusedSiteKey,
	currentPd,
	currentBop,
	currentPlq,
	currentPus,
	currentCalculus = false,
	readOnly = false,
	onKeypadDepth,
	onToggleBop,
	onTogglePlaque,
	onToggleSuppuration,
	onToggleCalculus,
	onPrevSite,
	onNextSite,
	onSetToothNorm,
}) => {
	const handleDepthTap = (depth: number) => {
		triggerHaptic("selection");
		onKeypadDepth(depth);
	};

	const handleToothNorm = () => {
		triggerHaptic("selection");
		if (onSetToothNorm) {
			onSetToothNorm();
		} else {
			onKeypadDepth(2);
		}
	};

	return (
		<div
			className="sticky bottom-0 z-20 w-full p-2.5 sm:p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] rounded-2xl bg-[var(--paper)]/95 backdrop-blur-md border border-[var(--line)] shadow-xl flex flex-col gap-2 select-none"
			data-testid="mobile-perio-keypad-dial"
		>
			{/* Верхняя строка мобильного пульта: номер зуба, статус и переходы */}
			<div className="flex items-center justify-between text-xs font-semibold px-1 pb-1 border-b border-[var(--line-subtle)] gap-2">
				<div className="flex items-center gap-1.5 min-w-0 shrink-0">
					<strong className="text-[var(--ink)] font-mono text-sm shrink-0 whitespace-nowrap">
						Зуб #{selectedToothNumber}
					</strong>
					<span className="text-[11px] text-[var(--muted)] shrink-0 font-medium">
						({SITE_SHORT_RU[currentFocusedSiteKey] ?? "В"})
					</span>
					<span
						className={`font-black text-xs px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
							currentPd <= 3
								? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
								: currentPd <= 5
									? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
									: "bg-rose-500/20 text-rose-700 dark:text-rose-300"
						}`}
					>
						{currentPd <= 3 ? `${currentPd} мм` : `Глубина ${currentPd} мм`}
					</span>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						aria-disabled={readOnly}
						onClick={() => !readOnly && handleToothNorm()}
						className="min-h-[44px] px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
						title="Зуб в норме: глубина кармана 1–2 мм, кровоточивости нет"
						data-testid="perio-keypad-depth-0"
					>
						<ShieldCheck size={16} />
						<span>Норма</span>
					</button>

					{onPrevSite && (
						<button
							type="button"
							onClick={() => {
								triggerHaptic("selection");
								onPrevSite();
							}}
							className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] active:scale-95 cursor-pointer shadow-2xs"
							title="Предыдущая точка зондирования"
							data-testid="perio-prev-site-btn"
						>
							<ChevronLeft size={18} />
						</button>
					)}
					{onNextSite && (
						<button
							type="button"
							onClick={() => {
								triggerHaptic("selection");
								onNextSite();
							}}
							className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] active:scale-95 cursor-pointer shadow-2xs"
							title="Следующая точка зондирования"
							data-testid="perio-next-site-btn"
						>
							<ChevronRight size={18} />
						</button>
					)}
				</div>
			</div>

			{/* Быстрый ввод глубины кармана: 1–10+ мм (Apple HIG >= 44x44px) */}
			<div className="grid grid-cols-5 gap-1.5 w-full">
				{DEPTH_TILES_MOBILE.map((item) => (
					<button
						key={item.val}
						type="button"
						aria-disabled={readOnly}
						onClick={() => !readOnly && handleDepthTap(item.val)}
						className={`min-h-[48px] h-12 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95 cursor-pointer touch-manipulation shadow-xs ${item.cls}`}
						data-testid={`perio-keypad-depth-${item.val}`}
						title={`Глубина кармана ${item.label} (${item.sub})`}
					>
						<span className="text-sm font-black leading-none">{item.label}</span>
						<span className="text-[10px] opacity-75">{item.sub}</span>
					</button>
				))}
			</div>

			{/* Маркеры воспаления: Кровоточивость (BOP), Зубной камень, Зубной налёт, Нагноение */}
			<div className="grid grid-cols-4 gap-1.5 w-full">
				<button
					type="button"
					aria-disabled={readOnly}
					onClick={() => {
						if (readOnly) return;
						triggerHaptic("impact");
						onToggleBop();
					}}
					className={`min-h-[44px] h-11 px-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border shadow-xs whitespace-nowrap ${
						currentBop
							? "bg-rose-600 text-white border-rose-400 font-black shadow-sm"
							: "bg-[var(--paper-soft)] text-rose-600 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/15"
					}`}
					data-testid="perio-mobile-bop-btn"
				>
					<Droplets size={15} className={`shrink-0 ${currentBop ? "text-white" : "text-rose-500"}`} />
					<span className="truncate">{currentBop ? "BOP: Да" : "Кровь"}</span>
				</button>

				<button
					type="button"
					aria-disabled={readOnly}
					onClick={() => {
						if (readOnly) return;
						triggerHaptic("selection");
						if (onToggleCalculus) onToggleCalculus();
						else onTogglePlaque();
					}}
					className={`min-h-[44px] h-11 px-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border shadow-xs whitespace-nowrap ${
						currentCalculus
							? "bg-sky-600 text-white font-black border-sky-400 shadow-sm"
							: "bg-[var(--paper-soft)] text-sky-700 dark:text-sky-300 border-sky-500/40 hover:bg-sky-500/15"
					}`}
					data-testid="perio-mobile-calculus-btn"
				>
					<span className="truncate">{currentCalculus ? "Камень: Есть" : "Камень"}</span>
				</button>

				<button
					type="button"
					aria-disabled={readOnly}
					onClick={() => {
						if (readOnly) return;
						triggerHaptic("selection");
						onTogglePlaque();
					}}
					className={`min-h-[44px] h-11 px-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border shadow-xs whitespace-nowrap ${
						currentPlq
							? "bg-amber-500 text-slate-950 font-black border-amber-500 shadow-sm"
							: "bg-[var(--paper-soft)] text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/15"
					}`}
					data-testid="perio-mobile-plaque-btn"
				>
					<span className="truncate">{currentPlq ? "Налёт: Есть" : "Налёт"}</span>
				</button>

				<button
					type="button"
					aria-disabled={readOnly}
					onClick={() => {
						if (readOnly) return;
						triggerHaptic("impact");
						onToggleSuppuration();
					}}
					className={`min-h-[44px] h-11 px-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border shadow-xs whitespace-nowrap ${
						currentPus
							? "bg-indigo-600 text-white border-indigo-400 font-black shadow-sm"
							: "bg-[var(--paper-soft)] text-indigo-600 dark:text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/15"
					}`}
					data-testid="perio-mobile-pus-btn"
				>
					<AlertCircle size={15} className={`shrink-0 ${currentPus ? "text-white" : "text-indigo-500"}`} />
					<span className="truncate">{currentPus ? "Гной: Есть" : "Гной"}</span>
				</button>
			</div>
		</div>
	);
});
MobilePerioKeypadDial.displayName = "MobilePerioKeypadDial";

export const PerioKeypad = {
	Drawer: PerioKeypadDrawer,
	Dial: MobilePerioKeypadDial,
};
export default PerioKeypad;
