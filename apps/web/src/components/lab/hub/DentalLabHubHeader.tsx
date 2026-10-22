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
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer text-xs"
					onClick={onExportCsv}
					title="Экспорт реестра в CSV (Excel)"
				>
					<Download size={14} />
					<span>Экспорт CSV</span>
				</button>

				<button
					type="button"
					data-testid="btn-open-create-lab-order"
					className="border border-teal-600 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold rounded-lg px-3 py-1.5 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer text-xs transition"
					onClick={onOpenCreateModal}
					title="Создать новый наряд в лабораторию"
				>
					<Plus size={14} />
					<span>+ Новый наряд в ЗТЛ</span>
				</button>

				<button
					type="button"
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] font-bold rounded-lg p-1.5 shadow-2xs inline-flex items-center justify-center cursor-pointer transition"
					onClick={onClose}
					title="Закрыть окно"
				>
					<X size={18} />
				</button>
			</div>
		</header>
	);
};
