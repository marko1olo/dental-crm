import React from "react";
import { ChevronDown, ChevronUp, Target, X } from "lucide-react";
import { FDI_LOWER_TEETH, FDI_UPPER_TEETH } from "./completedServicesPlan";

export interface ChairsideToothSelectorProps {
	selectedTooth: string | null;
	onSelectTooth: (tooth: string | null) => void;
	isToothGridOpen: boolean;
	onToggleToothGrid: () => void;
}

export const ChairsideToothSelector: React.FC<ChairsideToothSelectorProps> = ({
	selectedTooth,
	onSelectTooth,
	isToothGridOpen,
	onToggleToothGrid,
}) => {
	return (
		<div className="mb-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
						<Target className="w-3.5 h-3.5 text-indigo-500" />
						Привязка к зубу:
					</span>
					{selectedTooth ? (
						<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
							Зуб {selectedTooth}
							<button
								type="button"
								onClick={() => onSelectTooth(null)}
								className="hover:text-indigo-950 dark:hover:text-white p-0.5 rounded-full focus:outline-none"
								title="Сбросить (Без зуба)"
								aria-label="Сбросить привязку к зубу"
							>
								<X className="w-3 h-3" />
							</button>
						</span>
					) : (
						<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
							Без зуба (общая услуга)
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={onToggleToothGrid}
					className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center gap-1 min-h-[36px] py-1 px-2 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
				>
					{isToothGridOpen ? (
						<>
							Скрыть формулу <ChevronUp className="w-3.5 h-3.5" />
						</>
					) : (
						<>
							Все 32 зуба (11–48) <ChevronDown className="w-3.5 h-3.5" />
						</>
					)}
				</button>
			</div>

			{/* 1-tap quick tooth chips */}
			<div className="flex flex-wrap items-center gap-1.5">
				<button
					type="button"
					onClick={() => onSelectTooth(null)}
					className={`min-h-[44px] px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
						!selectedTooth
							? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
							: "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
					}`}
				>
					Без зуба
				</button>
				{[11, 16, 21, 26, 31, 36, 41, 46].map((t) => {
					const active = selectedTooth === String(t);
					return (
						<button
							key={t}
							type="button"
							onClick={() => onSelectTooth(active ? null : String(t))}
							className={`min-w-[44px] min-h-[44px] px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold border transition-colors ${
								active
									? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
									: "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
							}`}
						>
							{t}
						</button>
					);
				})}
			</div>

			{/* Разворачиваемая зубная формула FDI */}
			{isToothGridOpen && (
				<div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/80 space-y-2">
					<div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
						Верхняя челюсть (18–11, 21–28):
					</div>
					<div className="flex flex-wrap gap-1">
						{FDI_UPPER_TEETH.map((t) => {
							const active = selectedTooth === String(t);
							return (
								<button
									key={t}
									type="button"
									onClick={() => onSelectTooth(active ? null : String(t))}
									className={`min-w-[44px] min-h-[44px] p-1 rounded text-xs font-mono font-bold border transition-colors ${
										active
											? "bg-indigo-600 text-white border-indigo-600"
											: "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
									}`}
								>
									{t}
								</button>
							);
						})}
					</div>
					<div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1">
						Нижняя челюсть (48–41, 31–38):
					</div>
					<div className="flex flex-wrap gap-1">
						{FDI_LOWER_TEETH.map((t) => {
							const active = selectedTooth === String(t);
							return (
								<button
									key={t}
									type="button"
									onClick={() => onSelectTooth(active ? null : String(t))}
									className={`min-w-[44px] min-h-[44px] p-1 rounded text-xs font-mono font-bold border transition-colors ${
										active
											? "bg-indigo-600 text-white border-indigo-600"
											: "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
									}`}
								>
									{t}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
};
