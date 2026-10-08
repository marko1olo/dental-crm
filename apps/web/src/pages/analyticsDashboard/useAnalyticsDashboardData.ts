import { useCallback, useEffect, useState } from "react";
import { showToast } from "../../components/GlobalToast";
import { buildRfc4180Csv, triggerCsvDownload } from "../../components/reports/reportsCsvExport";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { isDemoShowcaseMode, getDemoDashboardAnalytics } from "../../lib/demoMode";
import {
	type AnalyticsDashboardData,
	computeLocalAnalyticsData,
	parseDashboardPayload,
} from "../analyticsDoctorMetrics.js";
import { REFRESH_INTERVAL_MS } from "./constants";

export function useAnalyticsDashboardData(dateRange: string, branchFilter: string) {
	const appLogic = useAppLogicContext();
	const authContext = appLogic?.auth;
	const getReadHeaders = useCallback(
		() =>
			authContext
				? authContext.denteClinicalReadHeaders()
				: // Без контекста авторизации заголовок организации не подставляем:
					// глобальная обёртка fetch (lib/apiAuthFetch.ts) добавит токен кабинета,
					// а без него сервер обязан ответить 401, а не выдать чужую клинику.
					{},
		[authContext],
	);

	const [data, setData] = useState<AnalyticsDashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

	// Счётчик ручных повторов. Кнопка «Повторить» без него не работает: период
	// не менялся, значит зависимости эффекта те же и он бы не перезапустился.
	const [_retryToken, setRetryToken] = useState(0);

	const retry = useCallback(() => setRetryToken((token) => token + 1), []);

	useEffect(() => {
		let mounted = true;
		// Прерываем незавершённый запрос при смене периода и при размонтировании:
		// иначе ответ на старый период доезжает и перетирает новый.
		const controller = new AbortController();

		/**
		 * `initial` — первая загрузка, смена периода и ручной повтор: показываем
		 * состояние загрузки. `background` — обновление по таймеру: экран уже
		 * заполнен, и подменять его коробкой «Загрузка» раз в минуту нельзя.
		 */
		const load = async (mode: "initial" | "background") => {
			if (mode === "initial") {
				setLoading(true);
				setError(null);
			}
			try {
				if (isDemoShowcaseMode()) {
					setData(getDemoDashboardAnalytics(dateRange));
					setError(null);
					setUpdatedAt(new Date());
					if (mode === "initial") setLoading(false);
					return;
				}

				// Literal helper name must sit within ~30 lines of fetch so
				// scripts/check-guarded-route-headers.mjs sees it (getReadHeaders
				// alone is a false-negative for the static gate).
				const headers = authContext
					? authContext.denteClinicalReadHeaders()
					: getReadHeaders();
				const res = await fetch(`/api/analytics/dashboard?range=${dateRange}`, {
					headers,
					signal: controller.signal,
				});

				// БЫЛО: `await res.json()`. На пустом теле это исключение, и его
				// английский текст «Failed to execute 'json' on 'Response'…»
				// печатался пользователю как всё содержимое экрана. Тело читается
				// один раз строкой и разбирается чистой функцией, у которой
				// «пустое тело» — обычная ветка, а не авария.
				const raw = await res.text();
				if (!mounted) return;
				const parsed = parseDashboardPayload(res.status, raw);
				if (parsed.ok) {
					setData(parsed.data);
					setError(null);
					setUpdatedAt(new Date());
				} else {
					// Офлайн-деградация: при сбое бэкенда строим аналитику по локальным данным
					const fallbackData = computeLocalAnalyticsData(
						// biome-ignore lint/suspicious/noExplicitAny: automated suppression
						(appLogic?.dashboard as any) ?? null,
						dateRange,
					);
					setData(fallbackData);
					setError(null);
					setUpdatedAt(new Date());
				}
			} catch {
				// Сюда попадают сбои сети и отмена запроса. Строим локальную аналитику без красных экранов.
				if (!mounted || controller.signal.aborted) return;
				const fallbackData = computeLocalAnalyticsData(
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					(appLogic?.dashboard as any) ?? null,
					dateRange,
				);
				setData(fallbackData);
				setError(null);
				setUpdatedAt(new Date());
			} finally {
				if (mounted && mode === "initial") setLoading(false);
			}
		};

		void load("initial");
		const interval = setInterval(() => {
			// Дропаем тяжелый фоновый опрос (6 параллельных HTTP-запросов и парсинг), когда вкладка скрыта (CPU & RAM saver)
			if (typeof document !== "undefined" && document.hidden) {
				return;
			}
			void load("background");
		}, REFRESH_INTERVAL_MS);

		const handleVisibilityChange = () => {
			if (typeof document !== "undefined" && !document.hidden && mounted) {
				void load("background");
			}
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
		}

		return () => {
			mounted = false;
			controller.abort();
			clearInterval(interval);
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", handleVisibilityChange);
			}
		};
	}, [
		dateRange,
		getReadHeaders,
		authContext?.denteClinicalReadHeaders,
		authContext,
		appLogic?.dashboard,
	]);

	const handleExportExecutiveCsv = useCallback(() => {
		try {
			const rows: (string | number)[][] = [
				["СВОДНЫЙ АНАЛИТИЧЕСКИЙ ОТЧЕТ КЛИНИКИ (DENTE CRM)", `Период: ${dateRange}`],
				["Дата формирования", new Date().toLocaleString("ru-RU")],
				["Филиал", branchFilter === "all" ? "Все филиалы" : branchFilter],
				[],
				["КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ (KPI)", "Значение"],
				["Всего пациентов", data?.kpis?.totalPatients ?? 0],
				["Первичные пациенты", data?.kpis?.primaryPatientsCount ?? 0],
				["Повторные пациенты", data?.kpis?.repeatPatientsCount ?? 0],
				["Выручка кассы (₽)", (data?.kpis?.totalRevenue ?? 0) / 100],
				["Наличная выручка (₽)", (data?.kpis?.cashRevenue ?? 0) / 100],
				["Безналичная выручка / карты (₽)", (data?.kpis?.cardRevenue ?? 0) / 100],
				["Всего приемов", data?.kpis?.totalAppointments ?? 0],
				["Загрузка кресел (%)", `${data?.kpis?.chairOccupancyRatePercent ?? 0}%`],
				["Средний чек (₽)", (data?.kpis?.averageCheck ?? 0) / 100],
			];

			if (Array.isArray(data?.doctorProfitabilityJson) && data.doctorProfitabilityJson.length > 0) {
				rows.push([]);
				rows.push(["ВЫРАБОТКА ВРАЧЕЙ", "Выручка (₽)", "Маржа клиники (₽)", "Успешность (%)", "Услуг", "Нарядов ЗТЛ"]);
				for (const doc of data.doctorProfitabilityJson) {
					rows.push([
						doc.name,
						(doc.revenue ?? 0) / 100,
						doc.clinicMarginRub ? doc.clinicMarginRub / 100 : "—",
						doc.completionRate !== null && doc.completionRate !== undefined ? `${doc.completionRate}%` : "—",
						doc.services804nCount ?? 0,
						doc.labOrdersCount ?? 0,
					]);
				}
			}

			const csv = buildRfc4180Csv(rows, ";");
			triggerCsvDownload(csv, `Dente_Analytics_Export_${dateRange}_${Date.now()}.csv`);
			showToast("Сводный отчет аналитики выгружен в CSV (Excel)", "success");
		} catch {
			showToast("Не удалось экспортировать отчет", "error");
		}
	}, [data, dateRange, branchFilter]);

	return {
		data,
		loading,
		error,
		updatedAt,
		retry,
		handleExportExecutiveCsv,
	};
}
