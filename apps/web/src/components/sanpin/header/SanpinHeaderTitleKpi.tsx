import React from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export interface SanpinHeaderTitleKpiProps {
	readonly summary: any;
	readonly onToggleExpandedKpi: () => void;
}

export const SanpinHeaderTitleKpi: React.FC<SanpinHeaderTitleKpiProps> = ({
	summary,
	onToggleExpandedKpi,
}) => {
	const hasTempDeviations = (summary?.temperature?.deviationsToday ?? 0) > 0;
	const psoToday = summary?.pso?.approvedToday ?? 0;
	const akToday = summary?.sterilization?.passedToday ?? 0;
	// Честный статус: при нулевых записях за сегодня нет оснований писать
	// «Норма 100%» — это выставочная похвальба без данных.
	const complianceLabel = psoToday === 0 && akToday === 0 ? "Журналы за сегодня не заполнялись" : "Норма 100%";

	return (
		<div className="sanpin-title-block">
			<h1 className="sanpin-main-title">
				<ShieldCheck size={18} color="var(--teal, #0d9488)" className="shrink-0" />
				<span className="hidden sm:inline">Журнал стерилизации и автоклава</span>
				<span className="sm:hidden">Стерилизация</span>
			</h1>

			<button
				type="button"
				onClick={onToggleExpandedKpi}
				className="sanpin-kpi-summary-chip h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] px-3 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation"
				title="Сводка контроля стерильности за смену (нажмите для деталей)"
				data-testid="sanpin-kpi-consolidated-chip"
			>
				<CheckCircle2 size={13} color="var(--teal, #0d9488)" className="shrink-0" />
				<span className={psoToday === 0 && akToday === 0 ? "" : "sanpin-kpi-status-ok"}>
					<span className="sanpin-desktop-only-label">{complianceLabel}</span>
					<span className="sanpin-mobile-only">{psoToday === 0 && akToday === 0 ? "Нет записей" : "Норма"}</span>
				</span>
				<span className="sanpin-kpi-desktop-detail sanpin-kpi-sep">·</span>
				<span className="sanpin-kpi-desktop-detail sanpin-kpi-metric">
					Очистка {psoToday}
				</span>
				<span className="sanpin-kpi-desktop-detail sanpin-kpi-sep">·</span>
				<span className="sanpin-kpi-desktop-detail sanpin-kpi-metric">
					АК {akToday}
				</span>
				<span className="sanpin-kpi-desktop-detail sanpin-kpi-sep">·</span>
				<span className={`sanpin-kpi-desktop-detail ${hasTempDeviations ? "sanpin-kpi-status-bad" : "sanpin-kpi-status-ok"}`}>
					T° {hasTempDeviations ? `${summary.temperature.deviationsToday} откл.` : "Норма"}
				</span>
			</button>
		</div>
	);
};
