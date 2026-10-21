import React from "react";
import { ORTHOPEDIC_WORK_TYPES } from "../dentalLabWorkflowEngine";

export interface FilterBarDropdownsProps {
	selectedLab: string;
	setSelectedLab: (lab: string) => void;
	selectedWorkType: string;
	setSelectedWorkType: (wt: string) => void;
	selectedStage: string;
	setSelectedStage: (stage: string) => void;
	selectedDateRange: "ALL" | "today" | "week";
	setSelectedDateRange: (range: "ALL" | "today" | "week") => void;
	sampleLabs: readonly string[];
}

export function FilterBarDropdowns({
	selectedLab, setSelectedLab, selectedWorkType, setSelectedWorkType,
	selectedStage, setSelectedStage, selectedDateRange, setSelectedDateRange,
	sampleLabs,
}: FilterBarDropdownsProps): React.JSX.Element {
	return (
		<>
			<select
				className="ztl-select"
				value={selectedLab}
				onChange={(e) => setSelectedLab(e.target.value)}
				aria-label="Фильтр по лаборатории"
			>
				<option value="ALL">Все лаборатории</option>
				{sampleLabs.map((lab) => (
					<option key={lab} value={lab}>
						{lab}
					</option>
				))}
			</select>

			<select
				className="ztl-select"
				value={selectedWorkType}
				onChange={(e) => setSelectedWorkType(e.target.value)}
				aria-label="Фильтр по конструкции"
			>
				<option value="ALL">Все виды конструкций</option>
				{Object.values(ORTHOPEDIC_WORK_TYPES).map((type) => (
					<option key={type.id} value={type.id}>
						{type.nameRu}
					</option>
				))}
			</select>

			<select
				className="ztl-select"
				value={selectedStage}
				onChange={(e) => setSelectedStage(e.target.value)}
				aria-label="Фильтр по этапу"
				title="Фильтр заказов по статусу (Закон Хика)"
			>
				<option value="ALL">Все этапы</option>
				<option value="sent_to_lab">Отправлен</option>
				<option value="in_work">В работе</option>
				<option value="draft">Принят</option>
				<option value="fitting_scheduled">Готов</option>
				<option value="installed_completed">Припасован</option>
				<option value="warranty_rework">Рекламация (0 руб)</option>
			</select>

			<select
				className="ztl-select"
				value={selectedDateRange}
				onChange={(e) => setSelectedDateRange(e.target.value as "ALL" | "today" | "week")}
				aria-label="Фильтр по срокам"
			>
				<option value="ALL">Все сроки</option>
				<option value="today">Готовность сегодня</option>
				<option value="week">Ближайшие 7 дней</option>
			</select>
		</>
	);
}
