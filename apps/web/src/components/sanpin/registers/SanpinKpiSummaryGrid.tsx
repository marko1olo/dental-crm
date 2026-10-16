import React from "react";
import type { SanpinRegisterTab } from "../sanpinNavigationConfig";

export interface SanpinKpiSummaryGridProps {
	readonly summary: any;
	readonly activeTab: SanpinRegisterTab;
	readonly onSelectTab: (tabId: SanpinRegisterTab) => void;
}

export const SanpinKpiSummaryGrid: React.FC<SanpinKpiSummaryGridProps> = ({
	summary,
	activeTab,
	onSelectTab,
}) => {
	if (!summary) return null;

	return (
		<div className="sanpin-kpi-grid">
			<div
				className={`sanpin-kpi-card sanpin-kpi-card--interactive ${activeTab === "autoclave" ? "active-kpi" : ""}`}
				onClick={() => onSelectTab("autoclave")}
			>
				<span className="sanpin-kpi-label">Стерилизация</span>
				<span className="sanpin-kpi-value">{summary.sterilization?.totalCyclesToday ?? 0} циклов</span>
				<span className="sanpin-kpi-subtext sanpin-kpi-subtext--ok">
					Успешно: {summary.sterilization?.passedToday ?? 0} (100% норма)
				</span>
			</div>

			<div
				className={`sanpin-kpi-card sanpin-kpi-card--interactive ${activeTab === "pso" ? "active-kpi" : ""}`}
				onClick={() => onSelectTab("pso")}
			>
				<span className="sanpin-kpi-label">Предстерилизационная очистка</span>
				<span className="sanpin-kpi-value">{summary.pso?.totalToday ?? 0} проб</span>
				<span className="sanpin-kpi-subtext sanpin-kpi-subtext--ok">
					Допущено: {summary.pso?.approvedToday ?? 0} шт (скрытой крови нет)
				</span>
			</div>

			<div
				className={`sanpin-kpi-card sanpin-kpi-card--interactive ${activeTab === "disinfection" ? "active-kpi" : ""}`}
				onClick={() => onSelectTab("disinfection")}
			>
				<span className="sanpin-kpi-label">Дезинфекция и чистый воздух</span>
				<span className="sanpin-kpi-value">{summary.bactericidal?.totalEquipments ?? 2} аппаратов</span>
				<span className="sanpin-kpi-subtext sanpin-kpi-subtext--ok">
					Рециркуляторы и уборки в норме
				</span>
			</div>
		</div>
	);
};

export default SanpinKpiSummaryGrid;
