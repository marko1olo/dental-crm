/**
 * DENTE Dental CRM — 32-Tooth Mockup Interactive Toolbar
 * Mandate 8b <= 120 lines.
 */

import React from "react";
import { BADGE_SIZE_CONFIGS, type BadgePlacement, type BadgeSizeOption } from "./archMockupTypes";

export interface ArchMockupToolbarProps {
	readonly sizeOption: BadgeSizeOption;
	readonly onSelectSize: (opt: BadgeSizeOption) => void;
	readonly placement: BadgePlacement;
	readonly onTogglePlacement: () => void;
	readonly onShuffle: () => void;
	readonly onResetIntact: () => void;
	readonly showMacro: boolean;
	readonly onToggleMacro: () => void;
}

export const ArchMockupToolbar: React.FC<ArchMockupToolbarProps> = ({
	sizeOption,
	onSelectSize,
	placement,
	onTogglePlacement,
	onShuffle,
	onResetIntact,
	showMacro,
	onToggleMacro,
}) => {
	const sizes: BadgeSizeOption[] = ["s", "m", "l", "xl", "xxl", "compare"];

	return (
		<div
			data-testid="arch-mockup-toolbar"
			className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-2.5 p-2 sm:p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-current/10"
		>
			<div className="flex items-center gap-1.5 flex-wrap">
				<span className="text-[11px] font-semibold opacity-70 mr-1">Размер кружка:</span>
				<div className="flex rounded-lg border border-current/15 p-0.5 text-xs font-semibold">
					{sizes.map((s) => {
						const isSelected = sizeOption === s;
						const label = s === "compare" ? "🔲 Сравнение" : BADGE_SIZE_CONFIGS[s].label;
						return (
							<button
								key={s}
								type="button"
								onClick={() => onSelectSize(s)}
								className={`h-8 px-2 sm:px-2.5 rounded transition-colors flex items-center justify-center ${
									isSelected
										? "bg-teal-500 text-white font-medium shadow-sm"
										: "hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100"
								}`}
							>
								{label}
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={onShuffle}
					className="h-8 px-3 text-xs font-semibold rounded-lg border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
					title="Случайно распределить 32 разных клинических состояния"
				>
					<span>🎲</span>
					<span>Перемешать</span>
				</button>
				<button
					type="button"
					onClick={onResetIntact}
					className="h-8 px-2.5 text-xs font-medium rounded-lg border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
					title="Сбросить все 32 зуба в норму (интактные)"
				>
					✓ Норма
				</button>
				<button
					type="button"
					onClick={onTogglePlacement}
					className="h-8 px-2.5 text-xs font-medium rounded-lg border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
					title="Переключить положение кружков"
				>
					{placement === "root_apex" ? "📍 У корней" : "📍 У коронок"}
				</button>
				<button
					type="button"
					onClick={onToggleMacro}
					className={`h-8 px-3 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 ${
						showMacro
							? "bg-amber-500 text-white border-amber-500 shadow-sm"
							: "border-current/15 hover:bg-black/5 dark:hover:bg-white/5"
					}`}
				>
					<span>🔬</span>
					<span>Крупный план</span>
				</button>
			</div>
		</div>
	);
};
