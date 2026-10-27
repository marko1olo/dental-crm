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
				className="dente-btn dente-btn-secondary min-h-[32px] sm:min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-2xs shrink-0 whitespace-nowrap"
				title="Физиологическая норма (Мандат 8e): вся зубная формула отмечается здоровой в 1 клик"
				data-testid="mark-intact-dentition-btn"
				data-action="tooth-chart-mark-intact-btn"
			>
				<ToothMolar size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span>Все интактны / норма</span>
			</button>

			<button
				type="button"
				onClick={handleMarkProHygieneDone}
				className="dente-btn dente-btn-secondary min-h-[32px] sm:min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-2xs shrink-0 whitespace-nowrap"
				title="Профессиональная гигиена: снятие зубных отложений УЗ + Air-Flow + полировка + протокол в дневник"
				data-testid="tooth-chart-mark-pro-hygiene-btn"
				data-action="tooth-chart-mark-pro-hygiene-btn"
			>
				<UltrasonicScaler size={13} className="text-[var(--teal)] shrink-0" />
				<span>Профгигиена</span>
			</button>

			<button
				type="button"
				onClick={handleApplyFastCariesK021}
				className="dente-btn dente-btn-secondary min-h-[32px] sm:min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-2xs shrink-0 whitespace-nowrap"
				title="Кариес дентина (K02.1) для выбранного зуба: протокол в дневник + пломбирование композитом"
				data-testid="tooth-chart-apply-fast-caries-btn"
				data-action="tooth-chart-apply-fast-caries-btn"
			>
				<ToothCaries size={13} className="text-[var(--ink-muted)] shrink-0" />
				<span>Пломба K02.1</span>
			</button>

			{!isPediatricEffective && (
				<button
					type="button"
					onClick={handleMarkWisdomTeethMissing}
					className="dente-btn dente-btn-secondary min-h-[32px] sm:min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-2xs shrink-0 whitespace-nowrap"
					title="Первичная адентия третьих моляров: зубы 18, 28, 38, 48 отмечаются отсутствующими"
					data-testid="mark-wisdom-missing-btn"
					data-action="tooth-chart-mark-wisdom-missing-btn"
				>
					<ToothExtractForceps size={13} className="text-[var(--ink-muted)] shrink-0" />
					<span>Без 8-ок</span>
				</button>
			)}

			{!isPediatricEffective && (
				<button
					type="button"
					onClick={handleMarkMolarsMissing}
					className="dente-btn dente-btn-secondary min-h-[32px] sm:min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-2xs shrink-0 whitespace-nowrap"
					title="Вторичная частичная адентия моляров: зубы 16, 26, 36, 46 отмечаются удаленными ранее"
					data-testid="mark-molars-missing-btn"
				>
					<ToothExtractForceps size={13} className="text-[var(--ink-muted)] shrink-0" />
					<span>Без моляров</span>
				</button>
			)}

			<button
				type="button"
				onClick={handleMarkFrontIntact}
				className="dente-btn dente-btn-secondary min-h-[32px] sm:min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)] flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-2xs shrink-0 whitespace-nowrap"
				title="Физиологическая норма фронтальной группы: зубы 13–23, 33–43 отмечаются здоровыми"
				data-testid="mark-front-intact-btn"
			>
				<ToothIncisor size={13} className="text-[var(--teal)] shrink-0" />
				<span>Интактный фронт</span>
			</button>
		</div>
	);
});
ToothChartExpressActions.displayName = "ToothChartExpressActions";
