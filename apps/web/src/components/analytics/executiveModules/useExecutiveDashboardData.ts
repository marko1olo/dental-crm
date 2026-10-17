/**
 * apps/web/src/components/analytics/executiveModules/useExecutiveDashboardData.ts
 *
 * Канонический хук данных для Директорского P&L Кокпита (Фича #29).
 * Интегрирует SSOT эндпоинты Fastify:
 *   - /api/analytics/executive-summary (выручка кассы, P&L, воронка, топ врачей, топ услуг прейскуранта)
 *   - /api/analytics/chairs-utilization (утилизация кресел, расчетная стоимость простоя)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
	ExecutiveDashboardPayload,
	ExecutivePeriod,
	ExecutiveTopDoctorItem,
	ExecutiveTopProcedureItem,
} from "@dental/shared";
import { getDemoExecutiveAnalytics, isDemoShowcaseMode } from "../../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import { buildRfc4180Csv, triggerCsvDownload } from "../../reports/reportsCsvExport";
import {
	buildEmptyExecutivePayload,
	computePeriodMetricsFromPayload,
	type DirectorExecutiveDashboardProps,
	type ExecutivePeriodComputedMetrics,
} from "./executiveAnalyticsTypes.js";

export interface ChairUtilizationApiItem {
	readonly chairId: string | null;
	readonly name: string;
	readonly value: number;
	readonly occupiedMinutes: number;
	readonly availableMinutes: number;
	readonly utilizationPercent: number;
	readonly fill: string;
}

export interface ChairsUtilizationApiResponse {
	readonly chairUtilizationJson: readonly ChairUtilizationApiItem[];
	readonly chairOccupancyRatePercent: number;
	readonly chairHourlyCostRub?: number;
	readonly chairHourlyNominalCostRub?: number;
	readonly chairHourlyCostKopecks?: number;
}

export interface UseExecutiveDashboardDataResult {
	readonly period: ExecutivePeriod;
	readonly setPeriod: (p: ExecutivePeriod) => void;
	readonly loading: boolean;
	readonly error: string | null;
	readonly payload: ExecutiveDashboardPayload | null;
	readonly chairsData: ChairsUtilizationApiResponse | null;
	readonly periodMetrics: ExecutivePeriodComputedMetrics;
	readonly reload: () => Promise<void>;
	readonly handleExportCsv: () => void;
}

export function useExecutiveDashboardData(
	props: DirectorExecutiveDashboardProps = {},
): UseExecutiveDashboardDataResult {
	const { initialPeriod = "month", period: controlledPeriod, onPeriodChange } = props;

	const [internalPeriod, setInternalPeriod] = useState<ExecutivePeriod>(initialPeriod);
	const period = controlledPeriod ?? internalPeriod;

	const setPeriod = useCallback(
		(p: ExecutivePeriod) => {
			if (onPeriodChange) {
				onPeriodChange(p);
			} else {
				setInternalPeriod(p);
			}
		},
		[onPeriodChange],
	);

	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [payload, setPayload] = useState<ExecutiveDashboardPayload | null>(null);
	const [chairsData, setChairsData] = useState<ChairsUtilizationApiResponse | null>(null);

	const reload = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			if (isDemoShowcaseMode()) {
				const demoPayload = getDemoExecutiveAnalytics(period);
				setPayload(demoPayload);
				setChairsData({
					chairUtilizationJson: [
						{
							chairId: "chair-1",
							name: "Кабинет 1 (Терапия)",
							value: 42,
							occupiedMinutes: 12600,
							availableMinutes: 18000,
							utilizationPercent: 70.0,
							fill: "#0d9488",
						},
						{
							chairId: "chair-2",
							name: "Кабинет 2 (Ортопедия / Хирургия)",
							value: 38,
							occupiedMinutes: 14400,
							availableMinutes: 18000,
							utilizationPercent: 80.0,
							fill: "#6366f1",
						},
						{
							chairId: "chair-3",
							name: "Кабинет 3 (Ортодонтия / Детство)",
							value: 29,
							occupiedMinutes: 9900,
							availableMinutes: 18000,
							utilizationPercent: 55.0,
							fill: "#38bdf8",
						},
					],
					chairOccupancyRatePercent: 68.3,
					chairHourlyCostRub: 1850,
					chairHourlyNominalCostRub: 1200,
				});
				setLoading(false);
				return;
			}

			const headers = {
				...denteAdminSecretRequestHeaders(),
				Accept: "application/json",
			};

			const [summaryRes, chairsRes] = await Promise.all([
				fetch(`/api/analytics/executive-summary?period=${period}`, { headers }).catch(
					() => null,
				),
				fetch(`/api/analytics/chairs-utilization?range=${period}`, { headers }).catch(
					() => null,
				),
			]);

			if (summaryRes && summaryRes.ok) {
				const json = await summaryRes.json();
				if (json.success && json.data) {
					setPayload(json.data);
				} else {
					setPayload(buildEmptyExecutivePayload(period));
				}
			} else {
				// Пробуем старый алиас при необходимости
				const fallbackRes = await fetch(`/api/analytics/executive?period=${period}`, {
					headers,
				}).catch(() => null);
				if (fallbackRes && fallbackRes.ok) {
					const json = await fallbackRes.json();
					if (json.success && json.data) {
						setPayload(json.data);
					} else {
						setPayload(buildEmptyExecutivePayload(period));
					}
				} else {
					setPayload(buildEmptyExecutivePayload(period));
				}
			}

			if (chairsRes && chairsRes.ok) {
				const chairsJson = await chairsRes.json();
				if (chairsJson.success && chairsJson.data) {
					setChairsData(chairsJson.data);
				}
			}
		} catch (err) {
			console.error("Ошибка загрузки директорского дашборда:", err);
			setError("Не удалось загрузить показатели. Проверьте сетевое подключение.");
			setPayload(buildEmptyExecutivePayload(period));
		} finally {
			setLoading(false);
		}
	}, [period]);

	useEffect(() => {
		reload();
	}, [reload]);

	const periodMetrics = useMemo(
		() => computePeriodMetricsFromPayload(payload),
		[payload],
	);

	const handleExportCsv = useCallback(() => {
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

		if (kpis.paymentBreakdown) {
			const pb = kpis.paymentBreakdown;
			csvRows.push(["Оплата наличными (касса)", `${pb.cashFormatted} (${pb.cashPercent}%)`, period]);
			csvRows.push(["Оплата картой / ДМС", `${pb.cardFormatted} (${pb.cardPercent}%)`, period]);
			csvRows.push(["Оплата СБП QR", `${pb.sbpFormatted} (${pb.sbpPercent}%)`, period]);
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
	}, [payload, period, chairsData]);

	return {
		period,
		setPeriod,
		loading,
		error,
		payload,
		chairsData,
		periodMetrics,
		reload,
		handleExportCsv,
	};
}
