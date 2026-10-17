import type React from "react";
import { memo } from "react";
import {
	ToothMolar,
	ToothCaries,
	ToothExtractForceps,
	ToothIncisor,
	UltrasonicScaler,
} from "../../../icons/DentalIcons";

export interface ToothChartExpressActionsProps {
	isPediatricEffective: boolean;
	handleMarkIntactDentition: () => void;
	handleMarkProHygieneDone: () => void;
	handleApplyFastCariesK021: () => void;
	handleMarkWisdomTeethMissing: () => void;
	handleMarkMolarsMissing: () => void;
	handleMarkFrontIntact: () => void;
}

export const ToothChartExpressActions: React.FC<ToothChartExpressActionsProps> = memo(({
	isPediatricEffective,
	handleMarkIntactDentition,
	handleMarkProHygieneDone,
	handleApplyFastCariesK021,
	handleMarkWisdomTeethMissing,
	handleMarkMolarsMissing,
	handleMarkFrontIntact,
}) => {
	return (
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
				className="min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-600/40 dark:border-amber-400/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs shrink-0 whitespace-nowrap"
				title="Кариес дентина (K02.1) для выбранного зуба: протокол в дневник + пломбирование композитом"
				data-testid="tooth-chart-apply-fast-caries-btn"
				data-action="tooth-chart-apply-fast-caries-btn"
			>
				<ToothCaries size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
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
	);
});
ToothChartExpressActions.displayName = "ToothChartExpressActions";
