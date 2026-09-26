import type React from "react";
import { memo } from "react";
import { Zap, Sparkles } from "lucide-react";
import {
	type OdontogramQuadrantId,
	getAdjacentQuadrant,
	isQuadrantTop,
	getQuadrantTitle,
} from "./toothChartTypes";

export interface ToothChartToolbarProps {
	hideExpressActions?: boolean | undefined;
	hideQuadrantSwitcher?: boolean | undefined;
	currentQuadrant: OdontogramQuadrantId;
	isPediatricEffective: boolean;
	isMixedEffective: boolean;
	pediatricMode?: boolean | undefined;
	handleMarkIntactDentition: () => void;
	handleMarkProHygieneDone: () => void;
	handleApplyFastCariesK021: () => void;
	handleMarkWisdomTeethMissing: () => void;
	handleMarkMolarsMissing: () => void;
	handleMarkFrontIntact: () => void;
	handleSelectQuadrant: (q: OdontogramQuadrantId) => void;
}

export const ToothChartToolbar: React.FC<ToothChartToolbarProps> = memo(({
	hideExpressActions,
	hideQuadrantSwitcher,
	currentQuadrant,
	isPediatricEffective,
	isMixedEffective,
	pediatricMode,
	handleMarkIntactDentition,
	handleMarkProHygieneDone,
	handleApplyFastCariesK021,
	handleMarkWisdomTeethMissing,
	handleMarkMolarsMissing,
	handleMarkFrontIntact,
	handleSelectQuadrant,
}) => (
	<>
		{/* 1-Click Express Formula Actions (Mandates 8d, 8e, 8k: 32-36px toolbar) */}
		{!hideExpressActions && (
			<div
				className="odontogram-express-bar mb-1.5 sm:mb-2 select-none flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar min-h-[32px] sm:min-h-[34px] sm:max-h-[36px] sm:h-[36px] py-0.5"
				data-testid="tooth-chart-express-actions"
			>
				{/* Интактный зубной ряд / Санирован */}
				<button
					type="button"
					onClick={handleMarkIntactDentition}
					className="min-h-[32px] h-8 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
					title="1-клик Санирован / Интактный зубной ряд: вся формула отмечается здоровой без предупреждений и модалок"
					data-testid="mark-intact-dentition-btn"
					data-action="tooth-chart-mark-intact-btn"
				>
					<Zap size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Санирован / Интактный</span>
				</button>

				{/* Профгигиена */}
				<button
					type="button"
					onClick={handleMarkProHygieneDone}
					className="min-h-[32px] h-8 px-2.5 py-1 rounded-lg text-xs font-black bg-teal-500/15 hover:bg-teal-500/25 text-teal-800 dark:text-teal-200 border border-teal-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
					title="1-клик Профгигиена выполнена: снятие зубных отложений УЗ + Air-Flow + полировка (A16.07.051) + протокол 043/у"
					data-testid="tooth-chart-mark-pro-hygiene-btn"
					data-action="tooth-chart-mark-pro-hygiene-btn"
				>
					<Sparkles size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Профгигиена (A16.07.051)</span>
				</button>

				{/* Быстрая пломба K02.1 */}
				<button
					type="button"
					onClick={handleApplyFastCariesK021}
					className="min-h-[32px] h-8 px-2.5 py-1 rounded-lg text-xs font-black bg-blue-500/15 hover:bg-blue-500/25 text-blue-800 dark:text-blue-200 border border-blue-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
					title="1-клик Быстрая пломба/кариес K02.1 для выбранного зуба: протокол 043/у + световая пломба (A16.07.002.001)"
					data-testid="tooth-chart-apply-fast-caries-btn"
					data-action="tooth-chart-apply-fast-caries-btn"
				>
					<Zap size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
					<span>Быстрая пломба K02.1</span>
				</button>

				{/* Адентия 8-ок (Без 8-ок) */}
				{!isPediatricEffective && (
					<button
						type="button"
						onClick={handleMarkWisdomTeethMissing}
						className="min-h-[32px] h-8 px-2.5 py-1 rounded-lg text-xs font-black bg-zinc-500/15 hover:bg-zinc-500/25 text-zinc-800 dark:text-zinc-200 border border-zinc-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
						title="1-клик Адентия зубов мудрости: зубы 18, 28, 38, 48 моментально помечаются отсутствующими"
						data-testid="mark-wisdom-missing-btn"
						data-action="tooth-chart-mark-wisdom-missing-btn"
					>
						<Zap size={14} className="text-zinc-500 shrink-0" />
						<span>Без 8-ок (18, 28, 38, 48)</span>
					</button>
				)}

				{!isPediatricEffective && (
					<button
						type="button"
						onClick={handleMarkMolarsMissing}
						className="min-h-[32px] h-8 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
						title="1-клик Вторичная адентия моляров: зубы 16, 26, 36, 46 моментально помечаются удаленными"
						data-testid="mark-molars-missing-btn"
					>
						<Zap size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<span>Без моляров (16, 26, 36, 46)</span>
					</button>
				)}

				<button
					type="button"
					onClick={handleMarkFrontIntact}
					className="min-h-[32px] h-8 px-2.5 py-1 rounded-lg text-xs font-black bg-teal-500/15 hover:bg-teal-500/25 text-teal-800 dark:text-teal-200 border border-teal-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
					title="1-клик Интактный фронт: зубы 13–23, 33–43 моментально помечаются здоровыми"
					data-testid="mark-front-intact-btn"
				>
					<Zap size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Интактный фронт (13–23, 33–43)</span>
				</button>
			</div>
		)}

		{/* Responsive Mobile & Desktop Quadrant Adapter Bar (32-36px, Mandate 8d, 8e) */}
		{!hideQuadrantSwitcher && (
			<div className="odontogram-quadrant-bar mb-1 select-none min-h-[32px] h-8 sm:h-9 py-0" data-testid="odontogram-quadrant-bar">
				<div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar py-0 w-full h-full">
					<button
						type="button"
						onClick={() => handleSelectQuadrant("all")}
						className={`min-h-[32px] h-8 sm:h-8 px-2.5 sm:px-3 py-0 rounded-lg text-xs font-black border transition-all cursor-pointer select-none shrink-0 flex items-center justify-center whitespace-nowrap ${
							currentQuadrant === "all"
								? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] font-black border-[var(--teal-dark,var(--teal))] shadow-xs"
								: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink-muted)] hover:text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:bg-[var(--odontogram-surface-hover)]"
						}`}
						title="Показать полную зубную формулу"
						data-testid="quadrant-btn-all"
					>
						<span className="sm:hidden">Все ({isMixedEffective ? "24" : isPediatricEffective ? "20" : "32"})</span>
						<span className="hidden sm:inline">Все зубы ({isMixedEffective ? "24" : isPediatricEffective ? "20" : "32"})</span>
					</button>

					<div className="h-4 w-px bg-[var(--odontogram-border)] mx-0.5 shrink-0" />

					{/* Quadrant buttons */}
					<div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
						<button
							type="button"
							onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q5" : "Q1")}
							className={`quadrant-btn min-h-[32px] h-8 sm:h-8 px-2 sm:px-2.5 py-0 rounded-lg text-xs font-bold flex items-center justify-between gap-1 sm:gap-1.5 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
								currentQuadrant === (isPediatricEffective ? "Q5" : "Q1")
									? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-2 ring-indigo-400/40"
									: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
							}`}
							title={isPediatricEffective ? "Q5 55–51 (Верхняя челюсть, Правый)" : "Q1 18–11 (Верхняя челюсть, Правый)"}
							data-testid={isPediatricEffective ? "quadrant-btn-Q5" : "quadrant-btn-Q1"}
						>
							<span className="font-extrabold whitespace-nowrap">{isPediatricEffective ? "Q5 55–51" : "Q1 18–11"}</span>
							<span className="text-xs px-1.5 py-0.5 rounded bg-black/20 font-mono font-black uppercase shrink-0">ВЧ·П</span>
						</button>

						<button
							type="button"
							onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q6" : "Q2")}
							className={`quadrant-btn min-h-[32px] h-8 sm:h-8 px-2 sm:px-2.5 py-0 rounded-lg text-xs font-bold flex items-center justify-between gap-1 sm:gap-1.5 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
								currentQuadrant === (isPediatricEffective ? "Q6" : "Q2")
									? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-2 ring-indigo-400/40"
									: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
							}`}
							title={isPediatricEffective ? "Q6 61–65 (Верхняя челюсть, Левый)" : "Q2 21–28 (Верхняя челюсть, Левый)"}
							data-testid={isPediatricEffective ? "quadrant-btn-Q6" : "quadrant-btn-Q2"}
						>
							<span className="font-extrabold whitespace-nowrap">{isPediatricEffective ? "Q6 61–65" : "Q2 21–28"}</span>
							<span className="text-xs px-1.5 py-0.5 rounded bg-black/20 font-mono font-black uppercase shrink-0">ВЧ·Л</span>
						</button>

						<button
							type="button"
							onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q8" : "Q4")}
							className={`quadrant-btn min-h-[32px] h-8 sm:h-8 px-2 sm:px-2.5 py-0 rounded-lg text-xs font-bold flex items-center justify-between gap-1 sm:gap-1.5 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
								currentQuadrant === (isPediatricEffective ? "Q8" : "Q4")
									? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-2 ring-indigo-400/40"
									: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
							}`}
							title={isPediatricEffective ? "Q8 85–81 (Нижняя челюсть, Правый)" : "Q4 48–41 (Нижняя челюсть, Правый)"}
							data-testid={isPediatricEffective ? "quadrant-btn-Q8" : "quadrant-btn-Q4"}
						>
							<span className="font-extrabold whitespace-nowrap">{isPediatricEffective ? "Q8 85–81" : "Q4 48–41"}</span>
							<span className="text-xs px-1.5 py-0.5 rounded bg-black/20 font-mono font-black uppercase shrink-0">НЧ·П</span>
						</button>

						<button
							type="button"
							onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q7" : "Q3")}
							className={`quadrant-btn min-h-[32px] h-8 sm:h-8 px-2 sm:px-2.5 py-0 rounded-lg text-xs font-bold flex items-center justify-between gap-1 sm:gap-1.5 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
								currentQuadrant === (isPediatricEffective ? "Q7" : "Q3")
									? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-2 ring-indigo-400/40"
									: "bg-[var(--odontogram-surface)] text-[var(--odontogram-ink)] border-[var(--odontogram-border)] hover:border-indigo-400 hover:bg-[var(--odontogram-surface-hover)]"
							}`}
							title={isPediatricEffective ? "Q7 71–75 (Нижняя челюсть, Левый)" : "Q3 31–38 (Нижняя челюсть, Левый)"}
							data-testid={isPediatricEffective ? "quadrant-btn-Q7" : "quadrant-btn-Q3"}
						>
							<span className="font-extrabold whitespace-nowrap">{isPediatricEffective ? "Q7 71–75" : "Q3 31–38"}</span>
							<span className="text-xs px-1.5 py-0.5 rounded bg-black/20 font-mono font-black uppercase shrink-0">НЧ·Л</span>
						</button>
					</div>
				</div>
			</div>
		)}
	</>
));
ToothChartToolbar.displayName = "ToothChartToolbar";
