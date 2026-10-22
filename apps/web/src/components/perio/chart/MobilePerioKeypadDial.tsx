/**
 * apps/web/src/components/perio/chart/MobilePerioKeypadDial.tsx
 *
 * DENTE Dental CRM — Сенсорный клинический пульт пародонтологии для смартфонов и планшетов
 * Apple HIG Touch Ergonomics (Мандаты 8e, 8n, 8am):
 * - 1-тап фиксация физиологической нормы зуба («Норма 1–2 мм»)
 * - Быстрый ввод патологических карманов (4 мм, 5 мм, 6 мм, 7+ мм)
 * - 1-тап переключатели кровоточивости (Кровь / BOP), гноя (Гной / PUS), налёта и рецессии
 * - Тач-таргеты >= 44x44px (h-11..12), зона большого пальца (Natural Thumb Zone)
 * - Чистый клинический язык без канцелярита и без процедурной симуляции 192 точек
 */

import React, { memo } from "react";
import type { PerioSiteKey } from "@dental/shared";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Droplets, ShieldCheck } from "lucide-react";
import { triggerHaptic } from "../../../native/mobileBridge";
import { SITE_SHORT_RU } from "./PerioToothCard";

export const SITE_NAME_FULL_RU: Record<PerioSiteKey, string> = {
	distoBuccal: "Дистально-щечная (ДВ)",
	midBuccal: "Щечная (В)",
	mesioBuccal: "Медиально-щечная (МВ)",
	distoLingual: "Дистально-язычная (ДО)",
	midLingual: "Язычная (О)",
	mesioLingual: "Медиально-язычная (МО)",
};

export interface MobilePerioKeypadDialProps {
	readonly selectedToothNumber: number;
	readonly currentFocusedSiteKey: PerioSiteKey;
	readonly currentPd: number;
	readonly currentBop: boolean;
	readonly currentPlq: boolean;
	readonly currentPus: boolean;
	readonly readOnly?: boolean | undefined;
	readonly onKeypadDepth: (depth: number) => void;
	readonly onToggleBop: () => void;
	readonly onTogglePlaque: () => void;
	readonly onToggleSuppuration: () => void;
	readonly onPrevSite?: (() => void) | undefined;
	readonly onNextSite?: (() => void) | undefined;
	readonly onSetToothNorm?: (() => void) | undefined;
	readonly onSetToothPathology?: ((depth: number, hasBop: boolean) => void) | undefined;
}

export const MobilePerioKeypadDial: React.FC<MobilePerioKeypadDialProps> = memo(({
	selectedToothNumber,
	currentFocusedSiteKey,
	currentPd,
	currentBop,
	currentPlq,
	currentPus,
	readOnly = false,
	onKeypadDepth,
	onToggleBop,
	onTogglePlaque,
	onToggleSuppuration,
	onPrevSite,
	onNextSite,
	onSetToothNorm,
	onSetToothPathology,
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

	const handleFastPathology = (depth: number) => {
		triggerHaptic("impact");
		if (onSetToothPathology) {
			onSetToothPathology(depth, true);
		} else {
			onKeypadDepth(depth);
		}
	};

	return (
		<div
			className="sticky bottom-0 z-20 w-full p-2.5 sm:p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] rounded-2xl bg-[var(--paper)]/95 backdrop-blur-md border border-[var(--line)] shadow-xl flex flex-col gap-2 select-none"
			data-testid="mobile-perio-keypad-dial"
		>
			{/* Информационная строка активного зуба и поверхности */}
			<div className="flex items-center justify-between text-xs font-semibold px-1 pb-1 border-b border-[var(--line-subtle)]">
				<div className="flex items-center gap-1.5 min-w-0">
					<span className="text-[var(--muted)]">Зуб:</span>
					<strong className="text-[var(--ink)] font-mono text-sm truncate">
						#{selectedToothNumber} ({SITE_SHORT_RU[currentFocusedSiteKey] ?? "В"})
					</strong>
					<span
						className={`font-black text-xs px-2 py-0.5 rounded-full shrink-0 ${
							currentPd <= 3
								? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
								: currentPd <= 5
									? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
									: "bg-rose-500/20 text-rose-700 dark:text-rose-300"
						}`}
					>
						{currentPd <= 3 ? `${currentPd} мм (Норма)` : `Карман ${currentPd} мм`}
					</span>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					{/* Быстрая норма зуба */}
					<button
						type="button"
						disabled={readOnly}
						onClick={handleToothNorm}
						className="min-h-[44px] px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
						title="Зуб в норме: карманы 1–2 мм, кровоточивости нет"
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
							title="Предыдущая поверхность"
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
							title="Следующая поверхность"
							data-testid="perio-next-site-btn"
						>
							<ChevronRight size={18} />
						</button>
					)}
				</div>
			</div>

			{/* Быстрый выбор глубины кармана зуба: 2, 3, 4, 5, 6, 7+ мм */}
			<div className="grid grid-cols-6 gap-1.5 w-full">
				{[
					{ val: 2, label: "2 мм", sub: "Норма", cls: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" },
					{ val: 3, label: "3 мм", sub: "Норма", cls: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" },
					{ val: 4, label: "4 мм", sub: "Карман", cls: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40" },
					{ val: 5, label: "5 мм", sub: "Карман", cls: "bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/40 font-bold" },
					{ val: 6, label: "6 мм", sub: "Глубокий", cls: "bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40 font-bold" },
					{ val: 7, label: "7+ мм", sub: "Тяжелый", cls: "bg-red-600/25 text-red-900 dark:text-red-200 border-red-500/50 font-black ring-1 ring-red-500/30" },
				].map((item) => (
					<button
						key={item.val}
						type="button"
						disabled={readOnly}
						onClick={() => handleDepthTap(item.val)}
						className={`min-h-[48px] h-12 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95 cursor-pointer touch-manipulation shadow-xs ${item.cls}`}
						data-testid={`perio-keypad-depth-${item.val}`}
						title={`Глубина ${item.label} (${item.sub})`}
					>
						<span className="text-sm font-black leading-none">{item.label}</span>
						<span className="text-[10px] opacity-75">{item.sub}</span>
					</button>
				))}
			</div>

			{/* Клинические маркеры десны в 1 тап: Кровоточивость (BOP), Нагноение (PUS), Налёт (PLQ) */}
			<div className="grid grid-cols-3 gap-1.5 w-full">
				{/* 1-Tap Кровоточивость (BOP) */}
				<button
					type="button"
					disabled={readOnly}
					onClick={() => {
						triggerHaptic("impact");
						onToggleBop();
					}}
					className={`min-h-[44px] h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border shadow-xs ${
						currentBop
							? "bg-rose-600 text-white border-rose-400 font-black shadow-sm"
							: "bg-[var(--paper-soft)] text-rose-600 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/15"
					}`}
					title="Кровоточивость десны при зондировании"
					data-testid="perio-mobile-bop-btn"
				>
					<Droplets size={16} className={currentBop ? "text-white" : "text-rose-500"} />
					<span>{currentBop ? "Кровоточивость: Да" : "Кровоточивость"}</span>
				</button>

				{/* 1-Tap Нагноение (Suppuration) */}
				<button
					type="button"
					disabled={readOnly}
					onClick={() => {
						triggerHaptic("impact");
						onToggleSuppuration();
					}}
					className={`min-h-[44px] h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border shadow-xs ${
						currentPus
							? "bg-indigo-600 text-white border-indigo-400 font-black shadow-sm"
							: "bg-[var(--paper-soft)] text-indigo-600 dark:text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/15"
					}`}
					title="Гноетечение из кармана"
					data-testid="perio-mobile-pus-btn"
				>
					<AlertCircle size={16} className={currentPus ? "text-white" : "text-indigo-500"} />
					<span>{currentPus ? "Гной: Есть" : "Гноетечение"}</span>
				</button>

				{/* 1-Tap Зубной налёт (Plaque) */}
				<button
					type="button"
					disabled={readOnly}
					onClick={() => {
						triggerHaptic("selection");
						onTogglePlaque();
					}}
					className={`min-h-[44px] h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border shadow-xs ${
						currentPlq
							? "bg-amber-500 text-slate-950 font-black border-amber-400 shadow-sm"
							: "bg-[var(--paper-soft)] text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/15"
					}`}
					title="Зубной налёт на поверхности зуба"
					data-testid="perio-mobile-plaque-btn"
				>
					<span>{currentPlq ? "Налёт: Есть" : "Зубной налёт"}</span>
				</button>
			</div>
		</div>
	);
});

MobilePerioKeypadDial.displayName = "MobilePerioKeypadDial";
