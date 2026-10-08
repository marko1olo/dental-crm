/**
 * DentalLabOrdersFilterBar.tsx — Панель фильтрации, поиска и чипов реестра нарядов ЗТЛ.
 * 
 * Соблюдение Mandate 8b (<=800 строк на файл) и Mandate 8d (Zero emojis).
 */

import React from "react";
import { Search, X, AlertTriangle, RefreshCw } from "lucide-react";
import { ORTHOPEDIC_WORK_TYPES } from "./dentalLabWorkflowEngine";

export interface DentalLabOrdersFilterBarProps {
	searchQuery: string;
	setSearchQuery: (q: string) => void;
	selectedLab: string;
	setSelectedLab: (lab: string) => void;
	selectedWorkType: string;
	setSelectedWorkType: (wt: string) => void;
	selectedStage: string;
	setSelectedStage: (stage: string) => void;
	selectedDateRange: "ALL" | "today" | "week";
	setSelectedDateRange: (range: "ALL" | "today" | "week") => void;
	onlyDelayedFilter: boolean;
	setOnlyDelayedFilter: React.Dispatch<React.SetStateAction<boolean>>;
	delayedCount: number;
	sampleLabs: readonly string[];
}

export const DentalLabOrdersFilterBar: React.FC<DentalLabOrdersFilterBarProps> = ({
	searchQuery,
	setSearchQuery,
	selectedLab,
	setSelectedLab,
	selectedWorkType,
	setSelectedWorkType,
	selectedStage,
	setSelectedStage,
	selectedDateRange,
	setSelectedDateRange,
	onlyDelayedFilter,
	setOnlyDelayedFilter,
	delayedCount,
	sampleLabs,
}) => {
	const hasActiveFilters = Boolean(
		searchQuery ||
		selectedLab !== "ALL" ||
		selectedWorkType !== "ALL" ||
		selectedStage !== "ALL" ||
		selectedDateRange !== "ALL" ||
		onlyDelayedFilter,
	);

	const handleReset = () => {
		setSearchQuery("");
		setSelectedLab("ALL");
		setSelectedWorkType("ALL");
		setSelectedStage("ALL");
		setSelectedDateRange("ALL");
		setOnlyDelayedFilter(false);
	};

	return (
		<section className="ztl-filter-bar" aria-label="Фильтры наряд-заказов">
			<div className="ztl-search-input-wrap">
				<Search size={14} className="ztl-search-icon" />
				<input
					type="text"
					className="ztl-search-input"
					placeholder="Поиск: номер наряда, пациент, врач, зуб, прием..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					style={{ paddingLeft: "38px" }}
				/>
				{searchQuery && (
					<button
						type="button"
						className="ztl-search-clear"
						onClick={() => setSearchQuery("")}
						aria-label="Очистить поиск"
					>
						<X size={12} />
					</button>
				)}
			</div>

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

			<div className="dente-segmented-bar ztl-stage-chips-group" role="tablist">
				{[
					{ id: "ALL", label: "Все" },
					{ id: "sent_to_lab", label: "Отправлен" },
					{ id: "in_work", label: "В работе" },
					{ id: "draft", label: "Принят" },
					{ id: "fitting_scheduled", label: "Готов" },
					{ id: "installed_completed", label: "Припасован" },
				].map((st) => (
					<button
						key={st.id}
						type="button"
						role="tab"
						aria-selected={selectedStage === st.id}
						className={`dente-segmented-item ${selectedStage === st.id ? "active" : ""}`}
						onClick={() => setSelectedStage(st.id)}
						data-testid={`ztl-filter-stage-${st.id}`}
						title={`Фильтр статуса: ${st.label}`}
					>
						<span>{st.label}</span>
					</button>
				))}
			</div>

			<div className="ztl-filter-chips">
				<button
					type="button"
					className={`ztl-chip alert-chip ${onlyDelayedFilter ? "active" : ""}`}
					onClick={() => setOnlyDelayedFilter((prev) => !prev)}
				>
					<AlertTriangle size={12} />
					<span>Задержки ({delayedCount})</span>
				</button>
				{hasActiveFilters && (
					<button
						type="button"
						className="ztl-chip"
						onClick={handleReset}
					>
						<RefreshCw size={11} />
						<span>Сброс</span>
					</button>
				)}
			</div>
		</section>
	);
};
