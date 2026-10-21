import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ToothState } from "./ToothChart";
import {
	GOST_TOOTH_STATES,
	getNextFocusedTooth,
} from "./classicGostTypes";

export interface ClassicGostTouchKeypadProps {
	readonly selectedTeeth: number[];
	readonly onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	readonly pediatricMode?: boolean | undefined;
	readonly defaultToothFallback?: number | undefined;
}

export const ClassicGostTouchKeypad: React.FC<ClassicGostTouchKeypadProps> = ({
	selectedTeeth,
	onQuickStateChange,
	pediatricMode,
	defaultToothFallback = 18,
}) => {
	if (selectedTeeth.length === 0) return null;

	const handlePrev = () => {
		const firstSelected = selectedTeeth[0] ?? defaultToothFallback;
		const prevTooth = getNextFocusedTooth(firstSelected, "left", pediatricMode);
		const el = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${prevTooth}"]`);
		el?.focus();
		el?.click();
	};

	const handleNext = () => {
		const firstSelected = selectedTeeth[0] ?? defaultToothFallback;
		const nextTooth = getNextFocusedTooth(firstSelected, "right", pediatricMode);
		const el = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${nextTooth}"]`);
		el?.focus();
		el?.click();
	};

	return (
		<div className="gost-touch-keypad w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] rounded-xl animate-in fade-in duration-150">
			<div className="flex items-center gap-2">
				<span className="text-xs font-bold text-[var(--odontogram-ink-muted)]">
					{`Выбрано: ${selectedTeeth.length === 1 ? `Зуб ${selectedTeeth[0]}` : `${selectedTeeth.length} зубов`}`}
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-1.5">
				{Object.entries(GOST_TOOTH_STATES).map(([stateKey, meta]) => (
					<button
						key={stateKey}
						type="button"
						data-testid={`gost-keypad-btn-${stateKey}`}
						onClick={() => onQuickStateChange?.(selectedTeeth, stateKey as ToothState, undefined)}
						title={`Установить: ${meta.nameRu} (${meta.abbr})`}
						className={`gost-keypad-btn ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder} hover:shadow-sm cursor-pointer`}
					>
						<span className="font-black text-sm">{meta.abbr}</span>
						<span className="hidden md:inline text-xs font-medium">{meta.nameRu}</span>
					</button>
				))}

				<div className="flex items-center gap-1 ml-auto">
					<button
						type="button"
						data-testid="gost-keypad-nav-prev"
						onClick={handlePrev}
						title="Предыдущий зуб (влево)"
						className="gost-keypad-btn px-2 text-xs flex items-center justify-center cursor-pointer"
					>
						<ChevronLeft size={13} aria-hidden="true" />
					</button>
					<button
						type="button"
						data-testid="gost-keypad-nav-next"
						onClick={handleNext}
						title="Следующий зуб (вправо)"
						className="gost-keypad-btn px-2 text-xs flex items-center justify-center cursor-pointer"
					>
						<ChevronRight size={13} aria-hidden="true" />
					</button>
				</div>
			</div>
		</div>
	);
};
