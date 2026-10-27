import React from "react";

export interface Tooth46StandHeaderProps {
	zoom: number;
	isDark: boolean;
	onZoomChange: (zoom: number) => void;
	onToggleTheme: () => void;
	standMode?: "single" | "arch32" | "mandible";
	onSelectStandMode?: (mode: "single" | "arch32" | "mandible") => void;
}

export const Tooth46StandHeader: React.FC<Tooth46StandHeaderProps> = ({
	zoom,
	isDark,
	onZoomChange,
	onToggleTheme,
	standMode = "single",
	onSelectStandMode,
}) => {
	return (
		<header className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-2 sm:gap-3 pb-2 sm:pb-3 border-b border-current/10">
			<div className="min-w-0">
				<h1 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
					<span>DENTE Gate 0 First Article</span>
					<span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-300 font-mono shrink-0">
						{standMode === "arch32" ? "Мокап 32 зубов" : "Зуб 46 (Моляр 1)"}
					</span>
				</h1>
				<p className="text-[11px] sm:text-xs opacity-70">
					{standMode === "arch32"
						? "Лаборатория размеров маркировочных кружков (S, M, L, XL, XXL) на челюсти"
						: "FDI 46 · 2.5D Wheeler · 6 материалов · Эндо · Патология"}
				</p>
			</div>

			{/* Mode Switcher */}
			{onSelectStandMode && (
				<div className="flex rounded-xl border border-current/15 p-0.5 text-xs font-semibold">
					<button
						type="button"
						onClick={() => onSelectStandMode("single")}
						className={`h-9 sm:h-8 px-3 rounded-lg transition-colors flex items-center gap-1.5 ${
							standMode === "single"
								? "bg-teal-500 text-white shadow-xs"
								: "hover:bg-black/5 dark:hover:bg-white/5 opacity-80"
						}`}
					>
						<span>🦷</span>
						<span>Детальный зуб 4.6</span>
					</button>
					<button
						type="button"
						onClick={() => onSelectStandMode("arch32")}
						className={`h-9 sm:h-8 px-3 rounded-lg transition-colors flex items-center gap-1.5 ${
							standMode === "arch32"
								? "bg-teal-500 text-white shadow-xs"
								: "hover:bg-black/5 dark:hover:bg-white/5 opacity-80"
						}`}
					>
						<span>🏛️</span>
						<span>Мокап 32</span>
					</button>
					<button
						type="button"
						onClick={() => onSelectStandMode("mandible")}
						className={`h-9 sm:h-8 px-3 rounded-lg transition-colors flex items-center gap-1.5 ${
							standMode === "mandible"
								? "bg-teal-500 text-white shadow-xs"
								: "hover:bg-black/5 dark:hover:bg-white/5 opacity-80"
						}`}
					>
						<span>🦴</span>
						<span>Челюсть 16</span>
					</button>
				</div>
			)}

			<div className="flex items-center gap-2">
				{standMode === "single" && (
					<div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-xs font-semibold">
						{([1, 2, 4] as const).map((z) => (
							<button
								key={z}
								type="button"
								onClick={() => onZoomChange(z)}
								className={`h-11 sm:h-8 px-3.5 sm:px-2.5 min-w-[44px] sm:min-w-[32px] rounded transition-colors flex items-center justify-center ${
									zoom === z
										? "bg-teal-500 text-white font-medium shadow-sm"
										: "dark:bg-slate-800/80 dark:text-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
								}`}
							>
								{z}x
							</button>
						))}
					</div>
				)}
				<button
					type="button"
					onClick={onToggleTheme}
					aria-label="Переключить тему оформления"
					className="h-11 sm:h-8 px-4 sm:px-3 min-w-[44px] text-xs font-medium rounded-lg border dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
				>
					{isDark ? "Тёмная" : "Светлая"}
				</button>
			</div>
		</header>
	);
};
