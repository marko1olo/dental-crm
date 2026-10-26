import React from "react";
import {
	DollarSign,
	FlaskConical,
	Plus,
	RefreshCw,
	Search,
} from "lucide-react";
import type { LabOrdersFilterBarProps } from "./types";

export function LabOrdersFilterBar({
	metrics,
	searchQuery,
	onSearchChange,
	doctorFilter,
	onDoctorFilterChange,
	doctorsList,
	onOpenPriceMatrix,
	onRefresh,
	isLoading,
	onOpenNewOrder,
}: LabOrdersFilterBarProps): React.JSX.Element {
	return (
		<header className="h-9 min-h-[36px] flex items-center justify-between gap-2 px-2.5 bg-[var(--paper)] rounded-xl border border-[var(--line)] shadow-2xs text-xs w-full max-w-full relative z-20">
			{/* Left: Brand + Inline Counters */}
			<div className="flex items-center gap-2 shrink-0">
				<FlaskConical className="w-4 h-4 text-[var(--primary)] shrink-0" />
				<span className="font-bold text-xs sm:text-sm text-[var(--ink)] whitespace-nowrap">Лаборатория</span>
				<div className="hidden 2xl:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--paper-soft)] text-[11px] text-[var(--ink-muted)] border border-[var(--line)] font-mono">
					<span>Всего: <strong className="text-[var(--ink)]">{metrics.total}</strong></span>
					<span>•</span>
					<span>В работе: <strong className="text-blue-600 dark:text-blue-400">{metrics.inProgress}</strong></span>
					<span>•</span>
					<span>Готовы: <strong className="text-emerald-600 dark:text-emerald-400">{metrics.ready}</strong></span>
					{metrics.overdue > 0 && (
						<>
							<span>•</span>
							<span className="text-rose-600 dark:text-rose-400 font-bold">Просрочено: {metrics.overdue}</span>
						</>
					)}
				</div>
			</div>

			{/* Center: Search & Filter */}
			<div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-md">
				<div className="dente-search-wrap relative w-48 sm:w-64 shrink-0">
					<Search className="dente-search-icon w-3.5 h-3.5 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
					<input
						type="text"
						placeholder="Поиск по пациенту, наряду, зубу..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						className="w-full h-9 min-h-[36px] pl-[38px] pr-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none transition-colors"
					/>
				</div>
				<select
					value={doctorFilter}
					onChange={(e) => onDoctorFilterChange(e.target.value)}
					className="hidden lg:block h-9 min-h-[36px] px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none cursor-pointer shrink-0 max-w-[140px]"
					aria-label="Фильтр по врачу"
				>
					<option value="all">Все врачи</option>
					{doctorsList.map((doc: string) => (
						<option key={doc} value={doc}>{doc}</option>
					))}
				</select>
			</div>

			{/* Right: Actions (Прейскурант, Обновить, Новый наряд) */}
			<div className="flex items-center gap-1.5 shrink-0">
				<button
					type="button"
					onClick={onOpenPriceMatrix}
					className="h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
					data-testid="btn-open-price-matrix"
					title="Прейскурант и себестоимость лаборатории"
				>
					<DollarSign className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
					<span className="hidden sm:inline">Прейскурант</span>
				</button>

				<button
					type="button"
					onClick={onRefresh}
					className="h-9 w-9 min-h-[36px] min-w-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] shadow-2xs transition-colors flex items-center justify-center cursor-pointer"
					title="Обновить список"
					data-testid="lab-orders-refresh-btn"
				>
					<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[var(--primary)]" : ""}`} />
				</button>

				<button
					type="button"
					onClick={onOpenNewOrder}
					className="h-9 min-h-[36px] px-3.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white font-medium text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
					data-testid="lab-orders-new-order-btn"
					title="Новый наряд в лабораторию"
				>
					<Plus className="w-3.5 h-3.5" />
					<span>Новый наряд в лабораторию</span>
				</button>
			</div>
		</header>
	);
}
