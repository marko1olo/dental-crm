/**
 * apps/web/src/components/analytics/useAnalyticsDashboardData.ts
 *
 * ЕДИНЫЙ SSOT АНАЛИТИКИ КЛИНИКИ DENTE CRM (Мандат 8ap, Мандат 8n & [ANL-05]).
 * Консолидирует доступ к аналитическим данным дашборда и связывает
 * хук страницы с каноническим методом загрузки fetchClinicAnalyticsSSOT.
 */

import { useCallback, useEffect, useState } from "react";
import {
	type AnalyticsPeriod,
	type ClinicAnalyticsSSOT,
	createEmptyAnalyticsState,
	exportAnalyticsToCsv,
	fetchClinicAnalyticsSSOT,
} from "./analyticsCatalogData.js";

// Реэкспорт канонического хука дашборда для страницы аналитики
export { useAnalyticsDashboardData } from "../../pages/analyticsDashboard/useAnalyticsDashboardData.js";

/**
 * Хук реактивной загрузки единого SSOT управленческой аналитики клиники.
 */
export function useClinicAnalyticsSSOT(
	initialPeriod: AnalyticsPeriod = "month",
	customRange?: { from: string; to: string },
) {
	const [period, setPeriod] = useState<AnalyticsPeriod>(initialPeriod);
	const [data, setData] = useState<ClinicAnalyticsSSOT>(() =>
		createEmptyAnalyticsState(initialPeriod),
	);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [retryToken, setRetryToken] = useState(0);

	const retry = useCallback(() => setRetryToken((t) => t + 1), []);

	useEffect(() => {
		let isMounted = true;
		const controller = new AbortController();

		setLoading(true);
		setError(null);

		fetchClinicAnalyticsSSOT(period, controller.signal, customRange)
			.then((res) => {
				if (isMounted) {
					setData(res);
					setLoading(false);
					setError(null);
				}
			})
			.catch((err: unknown) => {
				if (isMounted) {
					const msg = err instanceof Error ? err.message : "Не удалось загрузить аналитику";
					console.error("[useClinicAnalyticsSSOT] Error fetching SSOT:", err);
					setData(createEmptyAnalyticsState(period));
					setError(msg);
					setLoading(false);
				}
			});

		return () => {
			isMounted = false;
			controller.abort();
		};
	}, [period, retryToken, customRange?.from, customRange?.to]);

	const handleExportCsv = useCallback(
		(clinicName?: string) => {
			exportAnalyticsToCsv(data, clinicName);
		},
		[data],
	);

	return {
		data,
		loading,
		error,
		period,
		setPeriod,
		retry,
		handleExportCsv,
	};
}
