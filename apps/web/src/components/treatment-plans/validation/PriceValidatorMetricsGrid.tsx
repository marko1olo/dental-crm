/**
 * PriceValidatorMetricsGrid.tsx — Сетка карточек финансовых метрик валидатора цен (DENTE CRM).
 */

import type React from "react";
import { DollarSign, FileCheck, FileText, Lock } from "lucide-react";
import type { PlanPriceValidationReport } from "./planPriceValidationEngine";

export interface PriceValidatorMetricsGridProps {
	readonly report: PlanPriceValidationReport;
}

export const PriceValidatorMetricsGrid: React.FC<PriceValidatorMetricsGridProps> = ({
	report,
}) => {
	return (
		<section className="price-validator-metrics-grid">
			<div className="price-validator-metric-card">
				<div className="price-validator-metric-label">
					<FileText size={14} /> Сумма в плане
				</div>
				<div className="price-validator-metric-value">
					{report.originalPlanNetRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="price-validator-metric-sub">
					Скидка: {report.originalPlanDiscountRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>

			<div className="price-validator-metric-card">
				<div className="price-validator-metric-label">
					<DollarSign size={14} /> Текущий каталог
				</div>
				<div className="price-validator-metric-value">
					{report.currentCatalogGrossRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="price-validator-metric-sub">
					{report.increasedItemsCount > 0 ? (
						<span style={{ color: "var(--pv-warn)" }}>
							Подорожало: +{report.increasedItemsCount} поз.
						</span>
					) : (
						"Прайс актуален"
					)}
				</div>
			</div>

			<div
				className={`price-validator-metric-card ${
					report.canGenerateWorkOrder ? "highlight-ok" : "highlight-danger"
				}`}
			>
				<div className="price-validator-metric-label">
					<FileCheck size={14} /> Итог к наряду / акту
				</div>
				<div className="price-validator-metric-value">
					{report.resolvedNetRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="price-validator-metric-sub">
					{report.adminOverride.isAuthorized
						? "Согласовано управляющим"
						: report.overallStatus === "APPROVED_PRICE_LOCKED"
							? "Зафиксировано по гарантии"
							: "По прайсу клиники"}
				</div>
			</div>

			<div
				className={`price-validator-metric-card ${
					report.totalClinicAbsorptionRub > 0 ? "highlight-warn" : ""
				}`}
			>
				<div className="price-validator-metric-label">
					<Lock size={14} /> Экономия пациента
				</div>
				<div className="price-validator-metric-value">
					{report.totalClinicAbsorptionRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="price-validator-metric-sub">
					{report.totalDeltaRub !== 0
						? `Дельта: ${report.totalDeltaRub > 0 ? "+" : ""}${report.totalDeltaRub.toLocaleString("ru-RU")} ₽ (${report.totalDeltaPercent}%)`
						: "0% отклонения от плана"}
				</div>
			</div>
		</section>
	);
};

export default PriceValidatorMetricsGrid;
