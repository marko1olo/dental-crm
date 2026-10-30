import React from "react";
import { FlaskConical, Download, Plus, X } from "lucide-react";

export interface DentalLabHubHeaderProps {
	readonly totalOrdersCount: number;
	readonly delayedCount: number;
	readonly totalLabCostRub: number;
	readonly totalPatientPriceRub: number;
	readonly onExportCsv: () => void;
	readonly onOpenCreateModal: () => void;
	readonly onClose: () => void;
}

/**
 * Шапка модального хаба зуботехнической лаборатории (Мандаты 8b, 8am, 8ze <= 120 строк).
 * На мобильном: адаптивная 2x2 сетка KPI без слипшихся цифр и ровно 1 Primary CTA.
 */
export const DentalLabHubHeader: React.FC<DentalLabHubHeaderProps> = ({
	totalOrdersCount,
	delayedCount,
	totalLabCostRub,
	totalPatientPriceRub,
	onExportCsv,
	onOpenCreateModal,
	onClose,
}) => {
	return (
		<header className="p-3 sm:p-4 bg-[var(--paper-strong)] border-b border-[var(--line)] flex flex-col gap-3 shrink-0">
			{/* Верхняя строка: Заголовок и десктоп-действия */}
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/25 flex items-center justify-center shrink-0">
						<FlaskConical className="w-5 h-5" />
					</div>
					<div className="min-w-0">
						<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] leading-snug">
							<span className="sm:hidden">Наряды в ЗТЛ</span>
							<span className="hidden sm:inline">Наряды в зуботехническую лабораторию (ЗТЛ)</span>
						</h2>
						<p className="text-[11px] text-[var(--muted)] hidden sm:block truncate">
							Клинический протокол • Сверка дедлайнов • Контроль себестоимости и ЗП
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{/* Десктопная кнопка экспорта */}
					<button
						type="button"
						className="ztl-desktop-only-btn hidden sm:inline-flex h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium text-xs shadow-2xs items-center gap-1.5 cursor-pointer transition-colors"
						onClick={onExportCsv}
						title="Экспорт реестра в CSV (Excel)"
					>
						<Download size={14} />
						<span>Экспорт CSV</span>
					</button>

					{/* Десктопная кнопка (Secondary, Mandate 8am) */}
					<button
						type="button"
						data-testid="btn-open-create-lab-order"
						className="ztl-desktop-only-btn hidden sm:inline-flex h-9 min-h-[36px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs shadow-2xs items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
						onClick={onOpenCreateModal}
						title="Создать новый наряд в лабораторию"
					>
						<Plus size={14} />
						<span>Новый наряд ЗТЛ</span>
					</button>

					<button
						type="button"
						className="h-9 w-9 min-h-[36px] min-w-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium shadow-2xs inline-flex items-center justify-center cursor-pointer transition-colors"
						onClick={onClose}
						title="Закрыть окно"
					>
						<X size={18} />
					</button>
				</div>
			</div>

			{/* Мобильная 2x2 и десктопная 4x1 сетка карточек KPI с четким разделением лейбла и чисел */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
				<div className="p-2 sm:p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
					<span className="text-[12px] sm:text-[13px] text-[var(--muted)] font-medium">Всего нарядов</span>
					<span className="text-[16px] sm:text-[18px] font-bold text-[var(--ink)] leading-tight mt-1">{totalOrdersCount}</span>
				</div>
				<div className={`p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between ${
					delayedCount > 0 ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800" : "bg-[var(--paper)] border-[var(--line)]"
				}`}>
					<span className="text-[12px] sm:text-[13px] text-[var(--muted)] font-medium">Задержки ЗТЛ</span>
					<span className={`text-[16px] sm:text-[18px] font-bold leading-tight mt-1 ${
						delayedCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--ink)]"
					}`}>{delayedCount}</span>
				</div>
				<div className="p-2 sm:p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
					<span className="text-[12px] sm:text-[13px] text-[var(--muted)] font-medium">Затраты ЗТЛ</span>
					<span className="text-[16px] sm:text-[18px] font-bold text-[var(--ink)] leading-tight mt-1">{totalLabCostRub.toLocaleString("ru-RU")} ₽</span>
				</div>
				<div className="p-2 sm:p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between">
					<span className="text-[12px] sm:text-[13px] text-[var(--muted)] font-medium">Выручка клиники</span>
					<span className="text-[16px] sm:text-[18px] font-bold text-[var(--teal,#0d9488)] leading-tight mt-1">{totalPatientPriceRub.toLocaleString("ru-RU")} ₽</span>
				</div>
			</div>

			{/* Мобильная кнопка нового наряда (Secondary, Mandate 8am) */}
			<div className="sm:hidden w-full">
				<button
					type="button"
					data-testid="btn-open-create-lab-order-mobile"
					className="w-full h-11 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-sm shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
					onClick={onOpenCreateModal}
					title="Создать новый наряд в лабораторию"
				>
					<Plus size={16} />
					<span>Новый наряд ЗТЛ</span>
				</button>
			</div>
		</header>
	);
};
