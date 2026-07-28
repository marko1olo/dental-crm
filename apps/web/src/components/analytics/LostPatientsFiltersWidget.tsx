import React, { useEffect, useState } from "react";
import { countLabel } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	fetchWidgetList,
	numberOrNull,
	textOr,
	type WidgetListState,
} from "./analyticsWidgetData";

/**
 * Элемент после нормализации. `daysSinceLastVisit` объявлен `number | null`:
 * БЫЛО `countLabel(item.daysSinceLastVisit, …)`, и на отсутствующем поле в
 * интерфейс попадала строка «undefined дней» — `undefined % 100` даёт NaN, и ни
 * одна ветка склонения этого не ловит.
 */
interface LostPatientItem {
	readonly key: string;
	readonly patientName: string;
	readonly phone: string;
	readonly daysSinceLastVisit: number | null;
}

function toLostPatientItem(row: Record<string, unknown>): LostPatientItem {
	return {
		key: textOr(row.id, ""),
		patientName: textOr(row.patientName, "Имя пациента не указано"),
		phone: textOr(row.phone, "телефон не указан"),
		daysSinceLastVisit: numberOrNull(row.daysSinceLastVisit),
	};
}

export const LostPatientsFiltersWidget: React.FC = () => {
	const appLogic = (useAppLogicContext() || {}) as any;
	const authContext = appLogic?.auth;
	const [state, setState] = useState<WidgetListState<LostPatientItem>>({ status: "loading" });

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
			"/api/analytics/lost-patients-filters",
			headers,
			toLostPatientItem,
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
			data-testid="lost-patients-filters-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800"
		>
			{/*
				БЫЛО: «Маркетинговый Фильтр «Потерянные Пациенты» …» — заглавная буква
				в каждом слове, и плашка «Lost Patient Filter» по-английски.
			*/}
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800" title="Пациенты, которые давно не были на приёме: будущей записи у них нет и задачи на обзвон тоже нет">
				<div className="flex items-center space-x-2">
					<span className="text-xl">⚠️</span>
					<h3 className="font-semibold text-amber-600 dark:text-amber-400">
						Пациенты, которые перестали приходить
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
					Ни записи, ни задачи
				</span>
			</div>

			{/* Состояние 1 — загрузка. */}
			{state.status === "loading" && (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загружаем список пациентов...
				</div>
			)}

			{/*
				Состояние 2 — запрос не удался. БЫЛО: `res.json()` без проверки
				`res.ok`, поэтому 401 и 500 показывались как «Потерянных пациентов не
				обнаружено» — самый вредный вид вранья на этом экране: список
				обзвона выглядел пустым, потому что запрос провалился.
			*/}
			{state.status === "error" && (
				<div role="status" className="text-sm py-3 text-center text-amber-700 dark:text-amber-300">
					{state.message}
				</div>
			)}

			{/* Состояние 3 — запрос удался, данных нет. */}
			{state.status === "ready" && state.items.length === 0 && (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Таких пациентов нет: все, кто давно не приходил, уже записаны или взяты в работу.
				</div>
			)}

			{state.status === "ready" && state.items.length > 0 && (
				<div className="space-y-3">
					{state.items.map((item, idx) => (
						<div
							key={item.key || `lost-patient-${idx}`}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-white">{item.patientName}</div>
								<div className="text-xs mt-1 text-slate-600 dark:text-slate-300">
									Телефон: <span className="font-mono font-bold text-slate-900 dark:text-white">{item.phone}</span> · Нет визитов:{" "}
									<span className="text-amber-600 dark:text-amber-400 font-bold">
										{item.daysSinceLastVisit === null
											? "срок не определён"
											: countLabel(Math.round(item.daysSinceLastVisit), "день", "дня", "дней")}
									</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2.5 py-1 rounded border font-mono bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
									⚠️ Нет будущей записи и нет задачи на обзвон
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
