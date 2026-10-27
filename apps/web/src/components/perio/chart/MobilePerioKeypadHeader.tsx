/**
 * MobilePerioKeypadHeader.tsx — Верхняя панель мобильного пульта: номер зуба, статус и переходы.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import React from "react";
import type { PerioSiteKey } from "@dental/shared";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { triggerHaptic } from "../../../native/mobileBridge";
import { SITE_SHORT_RU } from "./PerioToothCard";

export interface MobilePerioKeypadHeaderProps {
	readonly selectedToothNumber: number;
	readonly currentFocusedSiteKey: PerioSiteKey;
	readonly currentPd: number;
	readonly readOnly?: boolean | undefined;
	readonly onToothNorm: () => void;
	readonly onPrevSite?: (() => void) | undefined;
	readonly onNextSite?: (() => void) | undefined;
}

export const MobilePerioKeypadHeader: React.FC<MobilePerioKeypadHeaderProps> = React.memo(({
	selectedToothNumber,
	currentFocusedSiteKey,
	currentPd,
	readOnly = false,
	onToothNorm,
	onPrevSite,
	onNextSite,
}) => {
	return (
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
				<button
					type="button"
					aria-disabled={readOnly}
					onClick={() => !readOnly && onToothNorm()}
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
	);
});

MobilePerioKeypadHeader.displayName = "MobilePerioKeypadHeader";
