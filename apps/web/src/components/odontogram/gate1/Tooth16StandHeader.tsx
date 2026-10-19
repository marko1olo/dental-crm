import type React from "react";
import type { Tooth16Number } from "./tooth16Types";

export interface Tooth16StandHeaderProps {
	toothNumber: Tooth16Number;
	onToothNumberChange: (n: Tooth16Number) => void;
	zoom: number;
	onZoomChange: (z: number) => void;
	isDark: boolean;
	onToggleTheme: () => void;
}

/**
 * DENTE Dental CRM — Header with Tooth 16/26 Switcher & Zoom Controls
 * Mandate 8b <= 120 lines.
 */
export const Tooth16StandHeader: React.FC<Tooth16StandHeaderProps> = ({
	toothNumber,
	onToothNumberChange,
	zoom,
	onZoomChange,
	isDark,
	onToggleTheme,
}) => (
	<header className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--line)]">
		<div className="min-w-0">
			<h1 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
				<span>Gate 1 Верхний моляр</span>
				<span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-300 font-mono">
					FDI {toothNumber}
				</span>
			</h1>
			<p className="text-xs opacity-60 truncate">
				Wheeler 11th Ed. · Crista Obliqua · Карабелли · 3 Корня · 4 Канала
			</p>
		</div>
		<div className="flex items-center gap-2">
			<div className="flex rounded-lg border border-[var(--line)] p-0.5 text-xs font-semibold">
				<button
					type="button"
					onClick={() => onToothNumberChange(16)}
					className={`px-2.5 py-1 min-h-[44px] sm:min-h-[28px] rounded transition-colors ${
						toothNumber === 16
							? "bg-teal-600 text-white"
							: "opacity-70 hover:opacity-100"
					}`}
				>
					16 (Правый)
				</button>
				<button
					type="button"
					onClick={() => onToothNumberChange(26)}
					className={`px-2.5 py-1 min-h-[44px] sm:min-h-[28px] rounded transition-colors ${
						toothNumber === 26
							? "bg-teal-600 text-white"
							: "opacity-70 hover:opacity-100"
					}`}
				>
					26 (Левый)
				</button>
			</div>
			<div className="flex rounded-lg border border-[var(--line)] p-0.5 text-xs font-semibold">
				{([1, 2, 4] as const).map((z) => (
					<button
						key={z}
						type="button"
						onClick={() => onZoomChange(z)}
						className={`px-2 py-1 min-h-[44px] sm:min-h-[28px] min-w-[32px] rounded transition-colors ${
							zoom === z
								? "bg-teal-600 text-white"
								: "opacity-70 hover:opacity-100"
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
