/**
 * apps/web/src/components/perio/chart/MobilePerioKeypadDial.tsx
 *
 * DENTE Dental CRM — Glove-Friendly Clinical Keypad Dial for Periodontal Probing
 * Apple HIG Thumb Zone & Florida Probe Workflow (Mandates 8b, 8d, 8e)
 *
 * - 3x3 Telephone / Calculator Keypad Dial (1..9 mm)
 * - Glove-friendly touch targets >= 48x48px
 * - Tactile auto-advance upon depth entry
 * - 0 mm physiological norm entry
 * - 1-tap bleeding (BOP), suppuration (PUS), and plaque (PLQ) toggles
 * - Zero bird language & zero cartoon emojis (Mandate 8d)
 */

import React, { memo, useState } from "react";
import type { PerioSiteKey } from "@dental/shared";
import { AlertCircle, ChevronLeft, ChevronRight, Droplets, ShieldCheck } from "lucide-react";
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
	readonly onPrevSite: () => void;
	readonly onNextSite: () => void;
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
}) => {
	const [showExtendedKeypad, setShowExtendedKeypad] = useState(false);

	const handleDepthTap = (depth: number) => {
		triggerHaptic("selection");
		onKeypadDepth(depth);
		onNextSite();
	};

	return (
		<div
			className="sticky bottom-0 z-20 w-full p-2.5 sm:p-3 rounded-2xl bg-[var(--paper)]/95 backdrop-blur-md border border-teal-500/40 shadow-xl flex flex-col gap-2 select-none"
			data-testid="mobile-perio-keypad-dial"
		>
			{/* Active Probing Site Banner */}
			<div className="flex items-center justify-between text-xs font-semibold px-1 pb-1 border-b border-[var(--line-subtle)]">
				<div className="flex items-center gap-1.5 text-teal-300 min-w-0">
					<span className="text-[var(--muted)]">Точка:</span>
					<strong className="text-[var(--ink)] font-mono text-sm truncate">
						#{selectedToothNumber} {SITE_NAME_FULL_RU[currentFocusedSiteKey] ?? SITE_SHORT_RU[currentFocusedSiteKey]}
					</strong>
					<span className="text-[var(--teal,#0d9488)] font-black text-xs shrink-0">
						({currentPd} мм)
					</span>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					{/* Prev / Next Site buttons */}
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
						<ChevronLeft size={20} />
					</button>
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
						<ChevronRight size={20} />
					</button>
				</div>
			</div>

			{/* Clinical Phone/Calculator 3x3 Keypad Dial with Auto-Advance */}
			<div className="grid grid-cols-3 gap-1.5 w-full">
				{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((numVal) => {
					const isNorm = numVal <= 3;
					const isModerate = numVal <= 5;
					return (
						<button
							key={numVal}
							type="button"
							disabled={readOnly}
							onClick={() => handleDepthTap(numVal)}
							className={`min-h-[48px] h-12 rounded-xl font-black text-base font-mono flex items-center justify-center gap-1 border transition-all active:scale-95 cursor-pointer touch-manipulation shadow-xs ${
								isNorm
									? "bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border-emerald-500/40"
									: isModerate
										? "bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 border-amber-500/40"
										: "bg-rose-600/25 hover:bg-rose-600/45 text-rose-200 border-rose-500/50"
							}`}
							data-testid={`perio-keypad-depth-${numVal}`}
							title={`${numVal} мм (ввод и автопереход к следующей точке)`}
						>
							<span className="text-lg leading-none">{numVal}</span>
							<span className="text-[11px] font-normal opacity-80">мм</span>
						</button>
					);
				})}
			</div>

			{/* Primary Clinical Actions: 0 mm Norm / Blood (BOP) / Pus (Suppuration) */}
			<div className="grid grid-cols-3 gap-1.5 w-full">
				{/* 0 mm Norm / Sulcus */}
				<button
					type="button"
					disabled={readOnly}
					onClick={() => handleDepthTap(0)}
					className="min-h-[48px] h-12 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 active:scale-95 cursor-pointer shadow-xs"
					title="0 мм (физиологическая норма, автопереход)"
					data-testid="perio-keypad-depth-0"
				>
					<ShieldCheck size={16} />
					<span>0 мм (Норма)</span>
				</button>

				{/* 1-Tap Bleeding on Probing (BOP) */}
				<button
					type="button"
					disabled={readOnly}
					onClick={() => {
						triggerHaptic("impact");
						onToggleBop();
					}}
					className={`min-h-[48px] h-12 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border shadow-xs ${
						currentBop
							? "bg-rose-600 text-white border-rose-400 font-black shadow-sm"
							: "bg-[var(--paper-soft)] text-rose-300 border-rose-500/40 hover:bg-rose-500/15"
					}`}
					title="Кровоточивость десны при зондировании (BOP)"
					data-testid="perio-mobile-bop-btn"
				>
					<Droplets size={16} className={currentBop ? "text-white" : "text-rose-400"} />
					<span>{currentBop ? "Кровь: Да" : "Кровь"}</span>
				</button>

				{/* 1-Tap Pus (Suppuration) */}
				<button
					type="button"
					disabled={readOnly}
					onClick={() => {
						triggerHaptic("impact");
						onToggleSuppuration();
					}}
					className={`min-h-[48px] h-12 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border shadow-xs ${
						currentPus
							? "bg-indigo-600 text-white border-indigo-400 font-black shadow-sm"
							: "bg-[var(--paper-soft)] text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/15"
					}`}
					title="Нагноение из пародонтального кармана (PUS)"
					data-testid="perio-mobile-pus-btn"
				>
					<AlertCircle size={16} className={currentPus ? "text-white" : "text-indigo-400"} />
					<span>{currentPus ? "Гной: Да" : "Гной"}</span>
				</button>
			</div>

			{/* Secondary Clinical Row: Plaque / Extended 10-12 mm */}
			<div className="grid grid-cols-2 gap-1.5 w-full">
				{/* 1-Tap Plaque (PLQ) */}
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
							: "bg-[var(--paper-soft)] text-amber-300 border-amber-500/40 hover:bg-amber-500/15"
					}`}
					title="Зубной налет на активной точке (Plaque)"
					data-testid="perio-mobile-plaque-btn"
				>
					<span>{currentPlq ? "Налёт: Есть" : "Зубной налёт"}</span>
				</button>

				{/* Toggle 10..12 mm deep pockets */}
				<button
					type="button"
					onClick={() => setShowExtendedKeypad((prev) => !prev)}
					className="min-h-[44px] h-11 rounded-xl font-bold text-xs flex items-center justify-center bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)] active:scale-95 cursor-pointer shadow-xs"
					title="Показать глубокие карманы (10–12 мм)"
				>
					{showExtendedKeypad ? "Скрыть 10–12 мм" : "Глубокие 10–12 мм"}
				</button>
			</div>

			{/* Extra Extended Depth Keys (10..12 mm) */}
			{showExtendedKeypad && (
				<div className="grid grid-cols-3 gap-1 w-full pt-1 border-t border-[var(--line-subtle)] animate-in fade-in">
					{[10, 11, 12].map((numVal) => (
						<button
							key={numVal}
							type="button"
							disabled={readOnly}
							onClick={() => handleDepthTap(numVal)}
							className="min-h-[44px] rounded-xl font-black text-xs flex items-center justify-center bg-rose-700/30 text-rose-200 border border-rose-600/50 active:scale-95 cursor-pointer shadow-xs"
							data-testid={`perio-keypad-depth-${numVal}`}
						>
							{numVal} мм
						</button>
					))}
				</div>
			)}
		</div>
	);
});

MobilePerioKeypadDial.displayName = "MobilePerioKeypadDial";
