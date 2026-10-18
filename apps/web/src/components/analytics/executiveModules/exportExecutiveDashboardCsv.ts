import type { ExecutiveDashboardPayload, ExecutivePeriod } from "@dental/shared";
import { formatRubles } from "../../../utils/formatters.js";
import { showToast } from "../../GlobalToast";
import { buildRfc4180Csv, triggerCsvDownload } from "../../reports/reportsCsvExport";
import type { ChairsUtilizationApiResponse } from "./useExecutiveDashboardData";
import type { ExecutivePeriodComputedMetrics } from "./executiveAnalyticsTypes";

export function exportExecutiveDashboardCsv(
	payload: ExecutiveDashboardPayload | null,
	period: ExecutivePeriod,
	chairsData: ChairsUtilizationApiResponse | null,
	periodMetrics: ExecutivePeriodComputedMetrics,
): void {
	if (!payload) return;
	const { kpis } = payload;
	const csvRows: (string | number)[][] = [
		["Показатель", "Значение", "Период"],
		["Выручка факт (касса)", kpis.totalRevenueFormatted, period],
		["Выручка план", kpis.totalRevenuePlanFormatted, period],
		["Выполнение плана (%)", `${kpis.overallPlanFulfillmentPercent}%`, period],
		["Чистая прибыль P&L", kpis.netProfitFormatted || "0 ₽", period],
		["Рентабельность (%)", `${kpis.netMarginPercent ?? 0}%`, period],
		["Загрузка кресел (%)", `${kpis.chairOccupancyRatePercent ?? 0}%`, period],
		["Стоимость часа простоя кресла", `${chairsData?.chairHourlyCostRub ?? 1850} ₽/ч`, period],
		["Средний чек", kpis.averageCheckFormatted, period],
		["Первичные пациенты", kpis.primaryPatientsCount, period],
		["Повторные пациенты", kpis.repeatPatientsCount, period],
		["LTV", kpis.patientLtvFormatted, period],
		["CAC", kpis.cacFormatted, period],
	];

	if (periodMetrics.doctorPayrollFormatted) {
		csvRows.push(["ФОТ врача к выплате", periodMetrics.doctorPayrollFormatted, period]);
	}
	if (periodMetrics.materialsCostFormatted) {
		csvRows.push(["Расходные материалы", periodMetrics.materialsCostFormatted, period]);
	}
	if (periodMetrics.labCostFormatted) {
		csvRows.push(["Зуботехническая лаборатория (ЗТЛ)", periodMetrics.labCostFormatted, period]);
	}
	if (periodMetrics.directCogsFormatted) {
		csvRows.push(["Прямые клинические расходы (COGS)", periodMetrics.directCogsFormatted, period]);
	}

	if (kpis.paymentBreakdown) {
		const pb = kpis.paymentBreakdown;
		csvRows.push(["Оплата наличными (касса)", `${formatRubles(pb.cashRub)} (${pb.cashPercent}%)`, period]);
		csvRows.push(["Оплата картой / ДМС", `${formatRubles(pb.cardDmsRub)} (${pb.cardDmsPercent}%)`, period]);
		csvRows.push(["Оплата СБП QR", `${formatRubles(pb.sbpRub)} (${pb.sbpPercent}%)`, period]);
	}

	if (payload.topDoctors && payload.topDoctors.length > 0) {
		csvRows.push([]);
		csvRows.push(["Топ врачей", "Специальность", "Выручка", "Визиты", "Доходимость", "Ср. чек"]);
		for (const d of payload.topDoctors) {
			csvRows.push([
				d.name,
				d.specialty,
				d.revenueFormatted,
				d.visitsCount,
				`${d.attendancePercent}%`,
				d.averageCheckFormatted,
			]);
		}
	}

	if (payload.topProcedures && payload.topProcedures.length > 0) {
		csvRows.push([]);
		csvRows.push(["Топ процедур", "Категория", "Количество", "Выручка", "Доля %"]);
		for (const p of payload.topProcedures) {
			csvRows.push([p.name, p.category, p.count, p.revenueFormatted, `${p.sharePercent}%`]);
		}
	}

	const csvContent = buildRfc4180Csv(csvRows);
	triggerCsvDownload(
		csvContent,
		`dente_executive_pnl_${period}_${new Date().toISOString().slice(0, 10)}.csv`,
	);
	showToast(`Директорский P&L отчет за «${period}» экспортирован в CSV`, "success");
}
