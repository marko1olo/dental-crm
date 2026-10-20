import type React from "react";
import type { IncisorToothNumber, ToothIncisorStandHeaderProps } from "./incisorStandTypes";

const UPPER_TEETH: readonly IncisorToothNumber[] = [11, 21, 12, 22];
const LOWER_TEETH: readonly IncisorToothNumber[] = [31, 41, 32, 42];
const ZOOM_LEVELS = [1, 2, 4] as const;

export const ToothIncisorStandHeader: React.FC<ToothIncisorStandHeaderProps> = ({
	toothNumber,
	onToothNumberChange,
	zoom,
	onZoomChange,
	isDark,
	onToggleTheme,
}) => (
	<header className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-[var(--line)]">
		<div className="min-w-0">
			<h1 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
				<span>Gate 2 Резцовая группа</span>
				<span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-300 font-mono">
					FDI {toothNumber}
				</span>
			</h1>
			<p className="text-xs opacity-60 truncate">
				Wheeler 11th Ed. · Ch. 8 (Верхние) & Ch. 9 (Нижние) · 2.5D Анатомия
			</p>
		</div>
		<div className="flex flex-wrap items-center gap-2">
			<div className="flex items-center rounded-lg border border-[var(--line)] p-0.5 text-xs font-semibold overflow-x-auto">
				<span className="text-[10px] uppercase opacity-50 px-1.5 hidden lg:inline">Верх:</span>
				{UPPER_TEETH.map((n) => (
					<button
						key={n}
						type="button"
						onClick={() => onToothNumberChange(n)}
						className={`px-2 py-1 min-h-[44px] sm:min-h-[28px] min-w-[32px] rounded transition-colors ${
							toothNumber === n ? "bg-teal-600 text-white font-bold" : "opacity-75 hover:opacity-100"
						}`}
					>
						{n}
					</button>
				))}
				<span className="text-[10px] uppercase opacity-50 px-1.5 ml-1 hidden lg:inline">Низ:</span>
				{LOWER_TEETH.map((n) => (
					<button
						key={n}
						type="button"
						onClick={() => onToothNumberChange(n)}
						className={`px-2 py-1 min-h-[44px] sm:min-h-[28px] min-w-[32px] rounded transition-colors ${
							toothNumber === n ? "bg-teal-600 text-white font-bold" : "opacity-75 hover:opacity-100"
						}`}
					>
						{n}
					</button>
				))}
			</div>
			<div className="flex rounded-lg border border-[var(--line)] p-0.5 text-xs font-semibold">
				{ZOOM_LEVELS.map((z) => (
					<button
						key={z}
						type="button"
						onClick={() => onZoomChange(z)}
						className={`px-2 py-1 min-h-[44px] sm:min-h-[28px] min-w-[32px] rounded transition-colors ${
							zoom === z ? "bg-teal-600 text-white font-bold" : "opacity-75 hover:opacity-100"
						}`}
					>
						{z}x
					</button>
				))}
			</div>
			<button
				type="button"
				onClick={onToggleTheme}
				className="px-2.5 py-1 min-h-[44px] sm:min-h-[28px] text-xs font-medium rounded-lg border border-[var(--line)] hover:opacity-80"
			>
				{isDark ? "Темная" : "Светлая"}
			</button>
		</div>
	</header>
);
