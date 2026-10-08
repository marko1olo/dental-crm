import type React from "react";
import { memo } from "react";
import {
	ToothMolar,
	ToothCaries,
	ToothExtractForceps,
	ToothIncisor,
	UltrasonicScaler,
} from "../../icons/DentalIcons";
import {
	type OdontogramQuadrantId,
	getAdjacentQuadrant,
	isQuadrantTop,
	getQuadrantTitle,
} from "./toothChartTypes";
import { MobileQuadrantTabs } from "../MobileQuadrantTabs";

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
	mobileDisplayMode?: "quadrant" | "carousel" | undefined;
	onToggleMobileDisplayMode?: ((mode: "quadrant" | "carousel") => void) | undefined;
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
	mobileDisplayMode,
	onToggleMobileDisplayMode,
}) => {
	return (
		<div className="tooth-chart-toolbar-wrapper w-full flex flex-col gap-1 mb-1">
			{/* Mobile 2x2 Quadrant Tabs per Apple HIG (< 768px) */}
			{!hideQuadrantSwitcher && (
				<div className="block sm:hidden w-full">
					<MobileQuadrantTabs
						currentQuadrant={currentQuadrant}
						onSelectQuadrant={handleSelectQuadrant}
						isPediatricEffective={isPediatricEffective}
						isMixedEffective={isMixedEffective}
						showAllOption={true}
						mobileDisplayMode={mobileDisplayMode}
						onToggleMobileDisplayMode={onToggleMobileDisplayMode}
					/>
				</div>
			)}

			<div
				className="odontogram-unified-toolbar mb-0.5 select-none flex items-center justify-between gap-1.5 flex-nowrap overflow-x-auto no-scrollbar min-h-[32px] sm:min-h-[36px] sm:h-9 py-0.5"
				data-testid="tooth-chart-express-actions"
			>
				{/* Desktop Quadrants on the left (hidden on mobile) */}
				{!hideQuadrantSwitcher && (
					<div className="odontogram-quadrant-bar mb-1 select-none min-h-[32px] h-8 sm:h-9 hidden sm:flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0" data-testid="odontogram-quadrant-bar">
					<button
						type="button"
						onClick={() => handleSelectQuadrant("all")}
						className={`min-h-[32px] h-8 px-2 sm:px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer select-none shrink-0 flex items-center justify-center whitespace-nowrap ${
							currentQuadrant === "all"
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-black border-[var(--teal-dark,var(--teal))] shadow-xs"
								: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:text-[var(--teal,#0d9488)] border-[var(--line-strong,#cbd5e1)] dark:border-white/20 hover:bg-[var(--paper-soft)]"
						}`}
						title="Показать полную зубную формулу"
						data-testid="quadrant-btn-all"
					>
						<span className="sm:hidden">Все ({isMixedEffective ? "24" : isPediatricEffective ? "20" : "32"})</span>
						<span className="hidden sm:inline">Все зубы ({isMixedEffective ? "24" : isPediatricEffective ? "20" : "32"})</span>
					</button>

					<button
						type="button"
						onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q5" : "Q1")}
						className={`quadrant-btn min-h-[32px] h-8 px-2 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							currentQuadrant === (isPediatricEffective ? "Q5" : "Q1")
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-1 ring-indigo-400/40"
								: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line-strong,#cbd5e1)] dark:border-white/20 hover:border-indigo-400 hover:bg-[var(--paper-soft)]"
						}`}
						title={isPediatricEffective ? "Q5 55–51 (Верхняя челюсть, Правый)" : "Q1 18–11 (Верхняя челюсть, Правый)"}
						data-testid={isPediatricEffective ? "quadrant-btn-Q5" : "quadrant-btn-Q1"}
					>
						<span className="font-extrabold">{isPediatricEffective ? "Q5" : "Q1"}</span>
						<span className="text-xs px-1 py-0.2 rounded bg-black/20 font-mono font-black shrink-0">ВЧ·П</span>
					</button>

					<button
						type="button"
						onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q6" : "Q2")}
						className={`quadrant-btn min-h-[32px] h-8 px-2 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							currentQuadrant === (isPediatricEffective ? "Q6" : "Q2")
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-1 ring-indigo-400/40"
								: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line-strong,#cbd5e1)] dark:border-white/20 hover:border-indigo-400 hover:bg-[var(--paper-soft)]"
						}`}
						title={isPediatricEffective ? "Q6 61–65 (Верхняя челюсть, Левый)" : "Q2 21–28 (Верхняя челюсть, Левый)"}
						data-testid={isPediatricEffective ? "quadrant-btn-Q6" : "quadrant-btn-Q2"}
					>
						<span className="font-extrabold">{isPediatricEffective ? "Q6" : "Q2"}</span>
						<span className="text-xs px-1 py-0.2 rounded bg-black/20 font-mono font-black shrink-0">ВЧ·Л</span>
					</button>

					<button
						type="button"
						onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q8" : "Q4")}
						className={`quadrant-btn min-h-[32px] h-8 px-2 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							currentQuadrant === (isPediatricEffective ? "Q8" : "Q4")
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-1 ring-indigo-400/40"
								: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line-strong,#cbd5e1)] dark:border-white/20 hover:border-indigo-400 hover:bg-[var(--paper-soft)]"
						}`}
						title={isPediatricEffective ? "Q8 85–81 (Нижняя челюсть, Правый)" : "Q4 48–41 (Нижняя челюсть, Правый)"}
						data-testid={isPediatricEffective ? "quadrant-btn-Q8" : "quadrant-btn-Q4"}
					>
						<span className="font-extrabold">{isPediatricEffective ? "Q8" : "Q4"}</span>
						<span className="text-xs px-1 py-0.2 rounded bg-black/20 font-mono font-black shrink-0">НЧ·П</span>
					</button>

					<button
						type="button"
						onClick={() => handleSelectQuadrant(isPediatricEffective ? "Q7" : "Q3")}
						className={`quadrant-btn min-h-[32px] h-8 px-2 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer select-none shrink-0 whitespace-nowrap ${
							currentQuadrant === (isPediatricEffective ? "Q7" : "Q3")
								? "bg-indigo-600 text-white font-black border-indigo-700 shadow-xs ring-1 ring-indigo-400/40"
								: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line-strong,#cbd5e1)] dark:border-white/20 hover:border-indigo-400 hover:bg-[var(--paper-soft)]"
						}`}
						title={isPediatricEffective ? "Q7 71–75 (Нижняя челюсть, Левый)" : "Q3 31–38 (Нижняя челюсть, Левый)"}
						data-testid={isPediatricEffective ? "quadrant-btn-Q7" : "quadrant-btn-Q3"}
					>
						<span className="font-extrabold">{isPediatricEffective ? "Q7" : "Q3"}</span>
						<span className="text-xs px-1 py-0.2 rounded bg-black/20 font-mono font-black shrink-0">НЧ·Л</span>
					</button>
				</div>
			)}

			{!hideQuadrantSwitcher && !hideExpressActions && (
				<div className="h-4 w-px bg-[var(--line-strong,#cbd5e1)] dark:bg-white/20 mx-0.5 shrink-0 hidden sm:block" />
			)}

			{/* Core Clinical Express Actions */}
			{!hideExpressActions && (
				<div className="flex items-center gap-1.5 flex-nowrap shrink-0 ml-auto sm:ml-0">
					<button
						type="button"
						onClick={handleMarkIntactDentition}
						className="min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-600/40 dark:border-emerald-400/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
						title="Физиологическая норма (зубные ряды интактны): вся формула отмечается здоровой"
						data-testid="mark-intact-dentition-btn"
						data-action="tooth-chart-mark-intact-btn"
					>
						<ToothMolar size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Санирован</span>
					</button>

					<button
						type="button"
						onClick={handleMarkProHygieneDone}
						className="min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-teal-500/15 hover:bg-teal-500/25 text-teal-800 dark:text-teal-200 border border-teal-600/40 dark:border-teal-400/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
						title="Профессиональная гигиена: снятие зубных отложений УЗ + Air-Flow + полировка + протокол в дневник"
						data-testid="tooth-chart-mark-pro-hygiene-btn"
						data-action="tooth-chart-mark-pro-hygiene-btn"
					>
						<UltrasonicScaler size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Профгигиена</span>
					</button>

					<button
						type="button"
						onClick={handleApplyFastCariesK021}
						className="min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-800 dark:text-blue-200 border border-blue-600/40 dark:border-blue-400/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
						title="Кариес дентина (K02.1) для выбранного зуба: протокол в дневник + пломбирование композитом"
						data-testid="tooth-chart-apply-fast-caries-btn"
						data-action="tooth-chart-apply-fast-caries-btn"
					>
						<ToothCaries size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
						<span>Пломба K02.1</span>
					</button>

					{!isPediatricEffective && (
						<button
							type="button"
							onClick={handleMarkWisdomTeethMissing}
							className="min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-zinc-500/15 hover:bg-zinc-500/25 text-zinc-800 dark:text-zinc-200 border border-zinc-500/40 dark:border-zinc-400/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
							title="Первичная адентия третьих моляров: зубы 18, 28, 38, 48 отмечаются отсутствующими"
							data-testid="mark-wisdom-missing-btn"
							data-action="tooth-chart-mark-wisdom-missing-btn"
						>
							<ToothExtractForceps size={13} className="text-zinc-500 shrink-0" />
							<span>Без 8-ок</span>
						</button>
					)}

					{!isPediatricEffective && (
						<button
							type="button"
							onClick={handleMarkMolarsMissing}
							className="min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-600/40 dark:border-amber-400/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
							title="Вторичная частичная адентия моляров: зубы 16, 26, 36, 46 отмечаются удаленными ранее"
							data-testid="mark-molars-missing-btn"
						>
							<ToothExtractForceps size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span>Без моляров</span>
						</button>
					)}

					<button
						type="button"
						onClick={handleMarkFrontIntact}
						className="min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-teal-500/15 hover:bg-teal-500/25 text-teal-800 dark:text-teal-200 border border-teal-600/40 dark:border-teal-400/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
						title="Физиологическая норма фронтальной группы: зубы 13–23, 33–43 отмечаются здоровыми"
						data-testid="mark-front-intact-btn"
					>
						<ToothIncisor size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Интактный фронт</span>
					</button>
				</div>
			)}
		</div>
	</div>
	);
});
ToothChartToolbar.displayName = "ToothChartToolbar";
