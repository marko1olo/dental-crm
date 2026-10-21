import React from "react";

export interface FdiPickerDesktopGridProps {
	selectedTeeth: number[];
	toggleTooth: (tooth: number) => void;
}

export function FdiPickerDesktopGrid({
	selectedTeeth,
	toggleTooth,
}: FdiPickerDesktopGridProps): React.JSX.Element {
	return (
		<div className="hidden md:block space-y-3.5">
			{/* Upper Maxilla: Q1 (18-11) and Q2 (21-28) */}
			<div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 shadow-xs overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2 px-2 min-w-[560px]">
					<span>1-й квадрант (18–11) • Верхний правый</span>
					<span>2-й квадрант (21–28) • Верхний левый</span>
				</div>
				<div className="flex items-center gap-1.5 justify-center min-w-[560px]">
					<div className="flex items-center gap-1.5">
						{[18, 17, 16, 15, 14, 13, 12, 11].map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => toggleTooth(t)}
								className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
								title={`Зуб ${t} (Q1)`}
							>
								{t}
							</button>
						))}
					</div>

					{/* Vertical Midline Divider */}
					<div className="flex flex-col items-center justify-center px-2 shrink-0">
						<div className="w-0.5 h-10 bg-teal-500/60 dark:bg-teal-400/60 rounded-full" />
						<span className="text-[10px] font-mono font-black text-teal-600 dark:text-teal-400 mt-0.5">FDI</span>
					</div>

					<div className="flex items-center gap-1.5">
						{[21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => toggleTooth(t)}
								className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
								title={`Зуб ${t} (Q2)`}
							>
								{t}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Lower Mandible: Q4 (48-41) and Q3 (31-38) */}
			<div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 shadow-xs overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2 px-2 min-w-[560px]">
					<span>4-й квадрант (48–41) • Нижний правый</span>
					<span>3-й квадрант (31–38) • Нижний левый</span>
				</div>
				<div className="flex items-center gap-1.5 justify-center min-w-[560px]">
					<div className="flex items-center gap-1.5">
						{[48, 47, 46, 45, 44, 43, 42, 41].map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => toggleTooth(t)}
								className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
								title={`Зуб ${t} (Q4)`}
							>
								{t}
							</button>
						))}
					</div>

					{/* Vertical Midline Divider */}
					<div className="flex flex-col items-center justify-center px-2 shrink-0">
						<div className="w-0.5 h-10 bg-teal-500/60 dark:bg-teal-400/60 rounded-full" />
						<span className="text-[10px] font-mono font-black text-teal-600 dark:text-teal-400 mt-0.5">FDI</span>
					</div>

					<div className="flex items-center gap-1.5">
						{[31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => toggleTooth(t)}
								className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
								title={`Зуб ${t} (Q3)`}
							>
								{t}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
