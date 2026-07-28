import React, { useEffect, useState } from "react";
import { countLabel, isoDateLabel } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	fetchWidgetList,
	numberOrNull,
	roleLabel,
	textOr,
	UNKNOWN_VALUE_TEXT,
	type WidgetListState,
} from "./analyticsWidgetData";

/**
 * Элемент после нормализации. Полей `string | undefined` здесь нет намеренно:
 * ответ сервера приводится к этому виду один раз, на границе, и дальше разметка
 * обращается только к тому, что заведомо существует.
 *
 * БЫЛО: `rule.creditedRole.toUpperCase()` — на строке без роли это TypeError во
 * время отрисовки, и падал не виджет, а весь раздел «Аналитика», уходя в
 * заглушку «Раздел временно не открылся». Таблицу `rebooking_conversion_rules`
 * в проекте никто не заполняет, поэтому её содержимое ничем не гарантировано.
 */
interface RebookingItem {
	readonly key: string;
	readonly patientName: string;
	/** null — задержку зафиксировать не удалось. Ноль означал бы «сразу». */
	readonly timeDeltaMinutes: number | null;
	readonly creditedRoleLabel: string;
	readonly appointmentDate: string;
}

function toRebookingItem(row: Record<string, unknown>): RebookingItem {
	return {
		key: textOr(row.id, ""),
		patientName: textOr(row.patientName, "Имя пациента не указано"),
		timeDeltaMinutes: numberOrNull(row.timeDeltaMinutes),
		creditedRoleLabel: roleLabel(row.creditedRole),
		appointmentDate: isoDateLabel(row.appointmentDate) || UNKNOWN_VALUE_TEXT,
	};
}

export const RebookingConversionRulesWidget: React.FC = () => {
	const appLogic = (useAppLogicContext() || {}) as any;
	const authContext = appLogic?.auth;
	const [state, setState] = useState<WidgetListState<RebookingItem>>({ status: "loading" });

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
			"/api/hr/rebooking-conversion-rules",
			headers,
			toRebookingItem,
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
			data-testid="rebooking-conversion-rules-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800" title="Правило зачисления конверсии повторной записи: если запись создана в течение 15 минут от приема — бонус засчитывается врачу, иначе — куратору или администратору">
				<div className="flex items-center space-x-2">
					<span className="text-xl">⚖️</span>
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Справедливое Распределение Конверсии Повторной Записи (Порог 15 Минут)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					Врач vs Администратор KPI
				</span>
			</div>

			{/* Состояние 1 — загрузка. */}
			{state.status === "loading" && (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка правил зачисления конверсии...
				</div>
			)}

			{/*
				Состояние 2 — запрос не удался. БЫЛО: этой ветки не существовало, и
				ответ 401 или 500 показывался как «Правила повторной записи пусты» —
				провал запроса выдавался за достоверное «данных нет».
			*/}
			{state.status === "error" && (
				<div role="status" className="text-sm py-3 text-center text-amber-700 dark:text-amber-300">
					{state.message}
				</div>
			)}

			{/* Состояние 3 — запрос удался, данных нет. */}
			{state.status === "ready" && state.items.length === 0 && (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Правила повторной записи пусты.
				</div>
			)}

			{state.status === "ready" && state.items.length > 0 && (
				<div className="space-y-3">
					{state.items.map((rule, idx) => (
						<div
							key={rule.key || `rebooking-${idx}`}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-white">{rule.patientName}</div>
								<div className="text-xs mt-0.5 text-slate-600 dark:text-slate-300">
									{rule.timeDeltaMinutes === null ? (
										<>Время создания записи не зафиксировано</>
									) : (
										<>
											Создано через{" "}
											<strong className="text-slate-900 dark:text-white">
												{countLabel(Math.round(rule.timeDeltaMinutes), "минуту", "минуты", "минут")}
											</strong>{" "}
											после приёма
										</>
									)}{" "}
									| Дата визита: {rule.appointmentDate}
								</div>
							</div>
							<div className="flex items-center space-x-2">
								<span className="text-xs px-2 py-0.5 rounded border font-bold bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									Конверсия: {rule.creditedRoleLabel}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
