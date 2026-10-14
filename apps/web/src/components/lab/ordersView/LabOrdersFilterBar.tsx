import React from "react";
import {
	ChevronDown,
	Columns3,
	DollarSign,
	FlaskConical,
	Layers,
	MoreHorizontal,
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
	const [isActionsMenuOpen, setIsActionsMenuOpen] = React.useState(false);
	const menuRef = React.useRef<HTMLDivElement>(null);
	const triggerBtnRef = React.useRef<HTMLButtonElement>(null);

	React.useEffect(() => {
		if (!isActionsMenuOpen) return;
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			if (
				menuRef.current &&
				!menuRef.current.contains(target) &&
				triggerBtnRef.current &&
				!triggerBtnRef.current.contains(target)
			) {
				setIsActionsMenuOpen(false);
			}
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsActionsMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isActionsMenuOpen]);

	return (
		<header className="h-9 min-h-[36px] flex items-center justify-between gap-2 px-2.5 bg-[var(--paper)] rounded-xl border border-[var(--line)] shadow-2xs text-xs w-full max-w-full relative z-20">
			{/* Left: Brand + Inline Counters */}
			<div className="flex items-center gap-2 shrink-0">
				<FlaskConical className="w-4 h-4 text-[var(--primary)] shrink-0" />
				<span className="font-bold text-xs sm:text-sm text-[var(--ink)] whitespace-nowrap">
					ЗТЛ
				</span>
				<div className="hidden 2xl:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--paper-soft)] text-[11px] text-[var(--ink-muted)] border border-[var(--line)] font-mono">
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
						<strong className="text-emerald-600 dark:text-emerald-400">
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
						<option key={doc} value={doc}>
							{doc}
						</option>
					))}
				</select>
			</div>

			{/* Right: Actions */}
			<div className="flex items-center gap-1.5 shrink-0">
				{/* 1. Кнопка «Курьер» (активный toggle) */}
				<button
					type="button"
					onClick={onToggleCourierBar}
					className={`h-9 min-h-[36px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
						isCourierBarOpen
							? "border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--primary)]"
							: "border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-2xs"
					}`}
					data-testid="btn-toggle-courier-bar"
					title="Панель курьерской логистики ЗТЛ"
				>
					<Truck
						className={`w-3.5 h-3.5 ${
							isCourierBarOpen ? "text-[var(--primary)]" : "text-[var(--ink-muted)]"
						}`}
					/>
					<span>Курьер</span>
				</button>

				{/* 2. Выпадающее меню вторичных аналитических действий («Прейскурант», «Трекер», «Канбан-хаб») */}
				<div className="relative shrink-0">
					<button
						ref={triggerBtnRef}
						type="button"
						onClick={() => setIsActionsMenuOpen((prev) => !prev)}
						className="h-9 min-h-[36px] px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
						title="Дополнительные модули ЗТЛ"
						data-testid="lab-orders-more-actions-btn"
						aria-expanded={isActionsMenuOpen}
						aria-haspopup="menu"
					>
						<MoreHorizontal className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
						<span className="hidden xl:inline text-[var(--ink-muted)]">Ещё</span>
						<ChevronDown className="w-3 h-3 text-[var(--ink-muted)] hidden xl:inline" />
					</button>

					{isActionsMenuOpen && (
						<div
							ref={menuRef}
							className="absolute right-0 top-full mt-1.5 w-48 py-1 px-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg z-50 flex flex-col gap-0.5 text-left"
							role="menu"
						>
							<button
								type="button"
								onClick={() => {
									setIsActionsMenuOpen(false);
									onOpenPriceMatrix();
								}}
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors"
								role="menuitem"
								data-testid="btn-open-price-matrix"
								title="Прейскурант и себестоимость ЗТЛ"
							>
								<DollarSign className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
								<span>Прейскурант</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsActionsMenuOpen(false);
									onOpenTrackerModal();
								}}
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors"
								role="menuitem"
								data-testid="lab-orders-open-tracker-btn"
								title="Десктопный трекер нарядов ЗТЛ"
							>
								<Layers className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
								<span>Трекер нарядов</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsActionsMenuOpen(false);
									onOpenHubModal();
								}}
								className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors"
								role="menuitem"
								data-testid="lab-orders-open-hub-btn"
								title="Полноэкранный канбан-хаб ЗТЛ"
							>
								<Columns3 className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
								<span>Канбан-хаб</span>
							</button>
						</div>
					)}
				</div>

				{/* 3. Кнопка «Обновить» */}
				<button
					type="button"
					onClick={onRefresh}
					className="h-9 w-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors shadow-2xs flex items-center justify-center cursor-pointer shrink-0"
					title="Обновить список"
					data-testid="lab-orders-refresh-btn"
				>
					<RefreshCw
						className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[var(--primary)]" : "text-[var(--ink-muted)]"}`}
					/>
				</button>

				{/* 4. Primary CTA («+ Наряд») */}
				<button
					type="button"
					onClick={onOpenNewOrder}
					className="h-9 min-h-[36px] px-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition shrink-0"
					data-testid="lab-orders-new-order-btn"
				>
					<Plus className="w-3.5 h-3.5 text-white" />
					<span>Наряд</span>
				</button>
			</div>
		</header>
	);
}
