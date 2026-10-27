import type React from "react";
import type { ReactElement } from "react";
import { QuickAddChairModal } from "../QuickAddChairModal";
import { ScheduleToolbarActionsIsland } from "./ScheduleToolbarActionsIsland";
import { ScheduleToolbarCenterIsland } from "./ScheduleToolbarCenterIsland";
import { ScheduleToolbarNavIsland } from "./ScheduleToolbarNavIsland";
import type { ScheduleFilterStripProps } from "./types";
import { useScheduleFilters } from "./useScheduleFilters";

export function ScheduleFilterStripContent(props: ScheduleFilterStripProps): ReactElement {
	const filters = useScheduleFilters(props);
	const {
		todayIso,
		currentDateIso,
		formattedCurrentDate,
		displayChairs,
		isAddChairModalOpen,
		setIsAddChairModalOpen,
	} = filters;

	return (
		<>
			<section
				className="schedule-filter-strip min-h-[48px] h-12 max-h-12 sm:min-h-[36px] sm:h-9 sm:max-h-9 flex flex-nowrap items-center justify-start sm:justify-between gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 border-b border-[var(--line)] bg-[var(--paper)] max-w-full overflow-hidden shrink-0 select-none"
				aria-label="Сохраненные фильтры расписания"
				data-testid="schedule-toolbar"
				role="toolbar"
			>
				{/* 1. Левый остров (Навигация): Заголовок «Расписание» + Степер даты (< ДД.ММ.ГГГГ >) + кнопка «Сегодня» */}
				<ScheduleToolbarNavIsland
					currentDateIso={currentDateIso}
					formattedCurrentDate={formattedCurrentDate}
					todayIso={todayIso}
					stepScheduleDay={props.stepScheduleDay}
					setScheduleDateFilter={props.setScheduleDateFilter}
				/>

				{/* 2. Центральный остров (Оперативный фильтр смены): Очередь дня + фильтры кабинетов/врачей/кресел */}
				<ScheduleToolbarCenterIsland
					{...props}
					activeBranches={filters.activeBranches}
					hasMultipleBranches={filters.hasMultipleBranches}
					activeDoctors={filters.activeDoctors}
					hasMultipleDoctors={filters.hasMultipleDoctors}
					hasMultipleChairs={filters.hasMultipleChairs}
					myChair={filters.myChair}
					isMyChairActive={filters.isMyChairActive}
					handleSelectMyChair={filters.handleSelectMyChair}
					displayChairs={filters.displayChairs}
					handleOpenAddChair={filters.handleOpenAddChair}
				/>

				{/* 3. Правый остров (Действия и режимы): Переключатель режимов, ровно 1 Primary CTA «+ Запись» и меню «Опции» */}
				<ScheduleToolbarActionsIsland props={props} filters={filters} />
			</section>

			{!props.onOpenAddChair && isAddChairModalOpen && (
				<QuickAddChairModal
					isOpen={isAddChairModalOpen}
					onClose={() => setIsAddChairModalOpen(false)}
					existingChairsCount={props.chairs.length || displayChairs.length}
					{...(props.onAddChair ? { onAddChair: props.onAddChair } : {})}
				/>
			)}
		</>
	);
}
