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
		<header className="ztl-modal-header">
			<div className="ztl-header-left">
				<div className="ztl-header-icon-badge">
					<FlaskConical size={20} />
				</div>
				<div>
					<h2 className="ztl-modal-title">Наряды в зуботехническую лабораторию (ЗТЛ)</h2>
					<p className="ztl-modal-subtitle">
						Клинический ортопедический протокол • Сверка дедлайнов • Контроль себестоимости и ЗП
					</p>
				</div>
			</div>

			<div className="ztl-header-kpi-strip">
				<div className="ztl-kpi-item">
					<span className="ztl-kpi-label">Всего нарядов</span>
					<span className="ztl-kpi-value">{totalOrdersCount}</span>
				</div>
				<div className="ztl-kpi-item">
					<span className="ztl-kpi-label">Задержки ЗТЛ</span>
					<span className={`ztl-kpi-value ${delayedCount > 0 ? "has-alerts" : ""}`}>{delayedCount}</span>
				</div>
				<div className="ztl-kpi-item">
					<span className="ztl-kpi-label">Затраты ЗТЛ</span>
					<span className="ztl-kpi-value">{totalLabCostRub.toLocaleString("ru-RU")} ₽</span>
				</div>
				<div className="ztl-kpi-item">
					<span className="ztl-kpi-label">Выручка клиники</span>
					<span className="ztl-kpi-value highlighted">{totalPatientPriceRub.toLocaleString("ru-RU")} ₽</span>
				</div>
			</div>

			<div className="ztl-header-actions">
				<button
					type="button"
					className="h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
					onClick={onExportCsv}
					title="Экспорт реестра в CSV (Excel)"
				>
					<Download size={14} />
					<span>Экспорт CSV</span>
				</button>

				<button
					type="button"
					data-testid="btn-open-create-lab-order"
					className="h-9 min-h-[36px] px-3.5 rounded-xl border border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white font-medium text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
					onClick={onOpenCreateModal}
					title="Создать новый наряд в лабораторию"
				>
					<Plus size={14} />
					<span>Новый наряд в ЗТЛ</span>
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
		</header>
	);
};
