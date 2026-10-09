import React from "react";
import {
	Columns3,
	DollarSign,
	FlaskConical,
	Layers,
	Plus,
	RefreshCw,
	Search,
	Truck,
} from "lucide-react";
import type { LabOrdersFilterBarProps } from "./types";

export function LabOrdersFilterBar({
	metrics,
	searchQuery,
	onSearchChange,
	doctorFilter,
	onDoctorFilterChange,
	doctorsList,
	isCourierBarOpen,
	onToggleCourierBar,
	onOpenPriceMatrix,
	onOpenTrackerModal,
	onOpenHubModal,
	onRefresh,
	isLoading,
	onOpenNewOrder,
}: LabOrdersFilterBarProps): React.JSX.Element {
	return (
		<header className="h-9 min-h-[36px] flex items-center justify-between gap-2 px-2.5 bg-[var(--paper)] rounded-xl border border-[var(--line)] shadow-2xs text-xs w-full max-w-full overflow-hidden">
			{/* Left: Brand + Inline Counters */}
			<div className="flex items-center gap-2 shrink-0">
				<FlaskConical className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
				<span className="font-bold text-xs sm:text-sm text-[var(--ink)] whitespace-nowrap">
					ЗТЛ
				</span>
				<div className="hidden 2xl:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--paper-soft)] text-[11px] text-[var(--muted)] border border-[var(--line)] font-mono">
					<span>
						Всего: <strong className="text-[var(--ink)]">{metrics.total}</strong>
					</span>
					<span>•</span>
					<span>
						В работе:{" "}
						<strong className="text-blue-600 dark:text-blue-400">
							{metrics.inProgress}
						</strong>
					</span>
					<span>•</span>
					<span>
						Готовы:{" "}
						<strong className="text-teal-600 dark:text-teal-400">
							{metrics.ready}
						</strong>
					</span>
					{metrics.overdue > 0 && (
						<>
							<span>•</span>
							<span className="text-rose-600 dark:text-rose-400 font-bold">
								Просрочено: {metrics.overdue}
							</span>
						</>
					)}
				</div>
			</div>

			{/* Center: Search & Filter */}
			<div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-md">
				<div className="relative w-48 sm:w-64 shrink-0">
					<Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
					<input
						type="text"
						placeholder="Поиск по пациенту, наряду, зубу..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						style={{ paddingLeft: "38px" }}
						className="w-full h-8 min-h-[32px] pr-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[13px] text-[var(--ink)] focus:ring-1 focus:ring-teal-500 focus:outline-none"
					/>
				</div>
				<select
					value={doctorFilter}
					onChange={(e) => onDoctorFilterChange(e.target.value)}
					className="hidden lg:block h-8 min-h-[32px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[12.5px] text-[var(--ink)] focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer shrink-0 max-w-[140px]"
					aria-label="Фильтр по врачу"
				>
					<option value="all">Все врачи</option>
					{doctorsList.map((doc: string) => (
						<option key={doc} value={doc}>
							{doc}
						</option>
					))}
				</select>
			</div>

			{/* Right: Actions */}
			<div className="flex items-center gap-1.5 shrink-0">
				<button
					type="button"
					onClick={onToggleCourierBar}
					className={`h-8 min-h-[32px] px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
						isCourierBarOpen
							? "border-teal-500/40 bg-teal-500/15 text-teal-800 dark:text-teal-200"
							: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)]"
					}`}
					data-testid="btn-toggle-courier-bar"
					title="Панель курьерской логистики ЗТЛ"
				>
					<Truck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>Курьер</span>
				</button>

				<button
					type="button"
					onClick={onOpenPriceMatrix}
					className="secondary-button h-8 min-h-[32px] px-2.5 text-xs font-semibold inline-flex items-center gap-1.5"
					data-testid="btn-open-price-matrix"
					title="Прейскурант и себестоимость ЗТЛ"
				>
					<DollarSign className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>Прейскурант</span>
				</button>

				<button
					type="button"
					onClick={onOpenTrackerModal}
					className="secondary-button h-8 min-h-[32px] px-2.5 text-xs font-semibold inline-flex items-center gap-1.5"
					title="Десктопный трекер нарядов ЗТЛ"
					data-testid="lab-orders-open-tracker-btn"
				>
					<Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>Трекер</span>
				</button>

				<button
					type="button"
					onClick={onOpenHubModal}
					className="secondary-button h-8 min-h-[32px] px-2.5 text-xs font-semibold inline-flex items-center gap-1.5"
					title="Полноэкранный канбан-хаб ЗТЛ"
					data-testid="lab-orders-open-hub-btn"
				>
					<Columns3 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>Канбан-хаб</span>
				</button>

				<button
					type="button"
					onClick={onRefresh}
					className="icon-button h-8 w-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] transition-colors shadow-2xs flex items-center justify-center cursor-pointer shrink-0"
					title="Обновить список"
				>
					<RefreshCw
						className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-teal-600" : ""}`}
					/>
				</button>

				<button
					type="button"
					onClick={onOpenNewOrder}
					className="primary-button h-8 min-h-[32px] px-3 text-xs font-semibold inline-flex items-center gap-1.5"
					data-testid="lab-orders-new-order-btn"
				>
					<Plus className="w-3.5 h-3.5" />
					<span>+ Наряд</span>
				</button>
			</div>
		</header>
	);
}
