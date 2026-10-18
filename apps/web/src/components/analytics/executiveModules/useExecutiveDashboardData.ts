import { useCallback, useEffect, useMemo, useState } from "react";
import type { ExecutiveDashboardPayload, ExecutivePeriod } from "@dental/shared";
import {
	buildEmptyExecutivePayload,
	computePeriodMetricsFromPayload,
	type DirectorExecutiveDashboardProps,
	type ExecutivePeriodComputedMetrics,
} from "./executiveAnalyticsTypes";
import { exportExecutiveDashboardCsv } from "./exportExecutiveDashboardCsv";
import { fetchExecutiveDashboardData } from "./fetchExecutiveDashboardData";

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
			if (onPeriodChange) onPeriodChange(p);
			else setInternalPeriod(p);
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
			const res = await fetchExecutiveDashboardData(period);
			setPayload(res.payload);
			if (res.chairsData) setChairsData(res.chairsData);
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

	const periodMetrics = useMemo(() => computePeriodMetricsFromPayload(payload), [payload]);

	const handleExportCsv = useCallback(() => {
		exportExecutiveDashboardCsv(payload, period, chairsData, periodMetrics);
	}, [payload, period, chairsData, periodMetrics]);

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
