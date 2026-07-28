import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	fetchWidgetList,
	numberOrNull,
	textOr,
	UNKNOWN_VALUE_TEXT,
	type WidgetListState,
} from "./analyticsWidgetData";

/**
 * Элемент после нормализации. Числа объявлены `number | null`: сервер отдаёт
 * `conversionRatePercent` строкой (numeric из базы), а остальные счётчики могут
 * отсутствовать вовсе. Прочерк вместо неизвестного числа, ноль — не замена
 * неизвестному.
 */
interface ReportItem {
	readonly key: string;
	readonly staffName: string;
	readonly totalCallsMade: number | null;
	readonly confirmedAppointmentsCount: number | null;
	readonly rescheduledCount: number | null;
	readonly conversionRatePercent: number | null;
}

function toReportItem(row: Record<string, unknown>): ReportItem {
	return {
		key: textOr(row.id, ""),
		staffName: textOr(row.staffName, "Сотрудник не указан"),
		totalCallsMade: numberOrNull(row.totalCallsMade),
		confirmedAppointmentsCount: numberOrNull(row.confirmedAppointmentsCount),
		rescheduledCount: numberOrNull(row.rescheduledCount),
		conversionRatePercent: numberOrNull(row.conversionRatePercent),
	};
}

/** Целое число или прочерк. Без этого в разметку попадало «undefined». */
function countText(value: number | null): string {
	return value === null ? UNKNOWN_VALUE_TEXT : Math.round(value).toLocaleString("ru-RU");
}

export const ConfirmationPerformanceReportsWidget: React.FC = () => {
	const appLogic = (useAppLogicContext() || {}) as any;
	const authContext = appLogic?.auth;
	const [state, setState] = useState<WidgetListState<ReportItem>>({ status: "loading" });

	useEffect(() => {
		let mounted = true;
		const controller = new AbortController();
		const headers = authContext
			? authContext.denteClinicalReadHeaders()
			// Без контекста авторизации заголовок организации не подставляем:
			// глобальная обёртка fetch (lib/apiAuthFetch.ts) добавит токен кабинета,
			// а без него сервер обязан ответить 401, а не выдать чужую клинику.
			: {};
		setState({ status: "loading" });
		void fetchWidgetList(
			"/api/analytics/confirmation-performance-reports",
			headers,
			toReportItem,
			controller.signal,
		).then((result) => {
			if (!mounted || controller.signal.aborted) return;
			setState(
				result.ok
					? { status: "ready", items: result.items }
					: { status: "error", message: result.message },
			);
		});
		return () => {
			mounted = false;
			controller.abort();
		};
	}, [authContext]);

	return (
		<div
			data-testid="confirmation-performance-reports-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800"
		>
			{/*
				БЫЛО: «Отчет «Эффективность Подтверждения Приемов» по Сотрудникам» —
				заглавная буква в каждом слове, и рядом плашка «Call Confirmation
				Performance» английским языком в интерфейсе русской клиники.
			*/}
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800" title="Сколько звонков сделал сотрудник и сколько приёмов после этого пациенты подтвердили">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📊</span>
					<h3 className="font-semibold text-blue-600 dark:text-blue-400">
						Как сотрудники подтверждают приёмы
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
					Обзвон перед приёмом
				</span>
			</div>

			{/* Состояние 1 — загрузка. */}
			{state.status === "loading" && (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загружаем данные по звонкам...
				</div>
			)}

			{/*
				Состояние 2 — запрос не удался. БЫЛО: `res.json()` без проверки
				`res.ok`, поэтому 401 и 500 показывались как «Данные отчета
				отсутствуют» — то есть провал выдавался за пустой отчёт.
			*/}
			{state.status === "error" && (
				<div role="status" className="text-sm py-3 text-center text-amber-700 dark:text-amber-300">
					{state.message}
				</div>
			)}

			{/* Состояние 3 — запрос удался, данных нет. */}
			{state.status === "ready" && state.items.length === 0 && (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Звонков с подтверждением приёма пока не было.
				</div>
			)}

			{state.status === "ready" && state.items.length > 0 && (
				<div className="space-y-3">
					{state.items.map((item, idx) => (
						<div
							key={item.key || `confirmation-${idx}`}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-white">{item.staffName}</div>
								<div className="text-xs mt-1 text-slate-600 dark:text-slate-300">
									Звонков: <span className="font-mono font-bold text-slate-900 dark:text-white">{countText(item.totalCallsMade)}</span> · Подтверждено: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{countText(item.confirmedAppointmentsCount)}</span> · Перенесено: {countText(item.rescheduledCount)}
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2.5 py-1 rounded border font-bold bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
									Подтвердили приём:{" "}
									{item.conversionRatePercent === null
										? UNKNOWN_VALUE_TEXT
										: `${Math.round(item.conversionRatePercent)} %`}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
