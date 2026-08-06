import { AlertTriangle, CalendarDays, Info, RefreshCcw } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

/**
 * ДВУСТОРОННЯЯ СИНХРОНИЗАЦИЯ РАСПИСАНИЯ ВРАЧЕЙ С ЯНДЕКС КАЛЕНДАРЁМ.
 *
 * ЧТО ЗДЕСЬ БЫЛО СЛОМАНО, И ПОЧЕМУ ЭТО ХУЖЕ ОБЫЧНОЙ ОШИБКИ.
 * Виджет звал GET /api/integrations/yandex-calendar-syncs, которого на сервере
 * нет — живой ответ 404 (зафиксировано в apps/api/src/tests/webCallsExistingRoutes.test.ts
 * как KNOWN_MISSING и живым curl в recon). Тело читалось без проверки res.ok
 * (`.then((res) => res.json())`), объект ошибки Fastify не проходил Array.isArray
 * и превращался в пустой список, а пустой список печатал
 * «Подключённые Яндекс Календари отсутствуют». Администратора отправляли
 * подключать календари в разделе, которого сервер не отдаёт: невыполнимая
 * работа уверенным тоном.
 *
 * Второй дефект: у каждой строки всегда рисовался бейдж «⚡ Синхронизировано»,
 * даже если бы сервер когда-нибудь вернул syncStatus=error/pending — статус
 * из данных игнорировался.
 *
 * Третий: запрос уходил без заголовков авторизации (`fetch(url, { })`), то есть
 * был бы отклонён и при существующем маршруте.
 *
 * Таблица yandex_calendar_syncs в схеме есть, но во всём apps/api/src нет ни
 * одного INSERT/UPDATE в неё (writer-census: 0). Маршрут и писатель этим
 * файлом не придумываются: клиника обязана видеть, что синхронизации нет,
 * а не что «календари не подключены, подключите».
 */

type LoadState =
	| { kind: "loading" }
	| { kind: "missing" }
	| { kind: "unauthorized" }
	| { kind: "server_error"; status: number }
	| { kind: "network" }
	| { kind: "unreadable" }
	| { kind: "empty" }
	| {
			kind: "ok";
			items: readonly YandexSyncItem[];
	  };

interface YandexSyncItem {
	id: string;
	organizationId: string;
	doctorName: string;
	yandexCalendarId: string;
	syncStatus: string;
	lastSyncedAt: string | null;
}

function classifyHttp(status: number): LoadState {
	if (status === 404) return { kind: "missing" };
	if (status === 401 || status === 403) return { kind: "unauthorized" };
	return { kind: "server_error", status };
}

function readSyncItems(raw: unknown): LoadState {
	if (!Array.isArray(raw)) return { kind: "unreadable" };
	const items: YandexSyncItem[] = [];
	for (const row of raw) {
		if (!row || typeof row !== "object") continue;
		const r = row as Record<string, unknown>;
		const id = typeof r.id === "string" ? r.id : null;
		const doctorName =
			typeof r.doctorName === "string"
				? r.doctorName
				: typeof r.doctor_name === "string"
					? r.doctor_name
					: null;
		const yandexCalendarId =
			typeof r.yandexCalendarId === "string"
				? r.yandexCalendarId
				: typeof r.yandex_calendar_id === "string"
					? r.yandex_calendar_id
					: null;
		const syncStatus =
			typeof r.syncStatus === "string"
				? r.syncStatus
				: typeof r.sync_status === "string"
					? r.sync_status
					: "unknown";
		if (!id || !doctorName || !yandexCalendarId) continue;
		const lastSyncedAt =
			typeof r.lastSyncedAt === "string"
				? r.lastSyncedAt
				: typeof r.last_synced_at === "string"
					? r.last_synced_at
					: typeof r.lastSyncAt === "string"
						? r.lastSyncAt
						: typeof r.last_sync_at === "string"
							? r.last_sync_at
							: null;
		items.push({
			id,
			organizationId:
				typeof r.organizationId === "string"
					? r.organizationId
					: typeof r.organization_id === "string"
						? r.organization_id
						: "",
			doctorName,
			yandexCalendarId,
			syncStatus,
			lastSyncedAt,
		});
	}
	// Массив был, но ни одна строка не разобралась — это несовпадение версий,
	// а не «календарей нет». Подстановка empty здесь и была источником лжи.
	if (items.length === 0 && raw.length > 0) return { kind: "unreadable" };
	if (items.length === 0) return { kind: "empty" };
	return { kind: "ok", items };
}

function syncStatusBadge(status: string): {
	label: string;
	className: string;
} {
	const normalized = status.trim().toLowerCase();
	if (
		normalized === "synced" ||
		normalized === "ok" ||
		normalized === "success" ||
		normalized === "active"
	) {
		return {
			label: "Синхронизировано",
			className:
				"bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
		};
	}
	if (
		normalized === "error" ||
		normalized === "failed" ||
		normalized === "fail"
	) {
		return {
			label: "Ошибка синхронизации",
			className:
				"bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
		};
	}
	if (
		normalized === "pending" ||
		normalized === "syncing" ||
		normalized === "in_progress"
	) {
		return {
			label: "Ожидает синхронизации",
			className:
				"bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
		};
	}
	return {
		label: "Статус неизвестен",
		className:
			"bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
	};
}

function stateCopy(state: LoadState): {
	headline: string;
	detail: string;
	tone: "neutral" | "info" | "warning" | "danger";
	canRetry: boolean;
} {
	switch (state.kind) {
		case "loading":
			return {
				headline: "Загрузка синхронизаций Яндекс Календаря…",
				detail: "Проверяем, отдаёт ли сервер список подключённых календарей.",
				tone: "neutral",
				canRetry: false,
			};
		case "missing":
			return {
				headline:
					"Раздел синхронизации с Яндекс Календарём на сервере не открыт",
				detail:
					"Адрес /api/integrations/yandex-calendar-syncs сервер не обслуживает. Подключить календарь врача из этой панели нельзя: маршрута и записи в базу из приложения нет. Повторная проверка не создаст раздел.",
				tone: "warning",
				canRetry: false,
			};
		case "unauthorized":
			return {
				headline: "Нет доступа к разделу синхронизации календарей",
				detail:
					"Сервер отклонил запрос (нет права или сессия истекла). Войдите снова под сотрудником с доступом к настройкам.",
				tone: "danger",
				canRetry: true,
			};
		case "server_error":
			return {
				headline: "Сервер не отдал список синхронизаций",
				detail:
					"Ответ " +
					String(state.status) +
					". Список календарей сейчас неизвестен — это не «календарей нет».",
				tone: "danger",
				canRetry: true,
			};
		case "network":
			return {
				headline: "Не удалось связаться с сервером",
				detail:
					"Сеть прервалась до ответа. Список календарей неизвестен — повторите, когда связь восстановится.",
				tone: "danger",
				canRetry: true,
			};
		case "unreadable":
			return {
				headline: "Ответ сервера не разобран",
				detail:
					"Тело ответа не совпало с ожидаемым списком синхронизаций. Это не «календарей нет» — данные на экран не подставлены наугад.",
				tone: "warning",
				canRetry: true,
			};
		case "empty":
			return {
				headline: "Подключённые Яндекс Календари отсутствуют",
				detail:
					"Сервер честно вернул пустой список. Двусторонней синхронизации расписания врачей сейчас нет.",
				tone: "info",
				canRetry: true,
			};
		case "ok":
			return {
				headline: "Подключено календарей: " + String(state.items.length),
				detail: "Статус каждой строки — из ответа сервера, не подставлен.",
				tone: "info",
				canRetry: true,
			};
	}
}

const TONE_ICON: Record<"neutral" | "info" | "warning" | "danger", string> = {
	neutral: "text-slate-400 dark:text-slate-500",
	info: "text-sky-500",
	warning: "text-amber-500",
	danger: "text-rose-500",
};

const TONE_HEADLINE: Record<"neutral" | "info" | "warning" | "danger", string> =
	{
		neutral: "text-slate-900 dark:text-white",
		info: "text-slate-900 dark:text-white",
		warning: "text-amber-800 dark:text-amber-300",
		danger: "text-rose-800 dark:text-rose-300",
	};

export const YandexCalendarSyncsWidget: React.FC = () => {
	const [state, setState] = useState<LoadState>({ kind: "loading" });

	const load = useCallback(async () => {
		setState({ kind: "loading" });
		try {
			const res = await fetch("/api/integrations/yandex-calendar-syncs", {
				headers: auth.denteClinicalReadHeaders(),
			});
			// res.ok проверяется ДО чтения тела. Чтение тела раньше проверки
			// превращало 404 в «календари отсутствуют».
			if (!res.ok) {
				setState(classifyHttp(res.status));
				return;
			}
			setState(readSyncItems(await res.json()));
		} catch {
			setState({ kind: "network" });
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const copy = stateCopy(state);
	const items = state.kind === "ok" ? state.items : [];
	const isLoading = state.kind === "loading";
	const StateIcon =
		state.kind === "missing"
			? CalendarDays
			: copy.tone === "danger" || copy.tone === "warning"
				? AlertTriangle
				: isLoading
					? RefreshCcw
					: Info;

	return (
		<div
			data-testid="yandex-calendar-syncs-widget"
			data-yandex-sync-state={state.kind}
			className="p-4 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/30 rounded-xl text-slate-900 dark:text-slate-100 shadow-sm my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl" aria-hidden="true">
						📅
					</span>
					<h3 className="font-semibold text-amber-700 dark:text-amber-400">
						Двусторонняя синхронизация врачей с Яндекс Календарём
					</h3>
				</div>
				<span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 px-2 py-0.5 rounded font-medium">
					Синхронизация Яндекс
				</span>
			</div>

			{/*
			  Состояние раздела всегда написано словами на экране. Прежняя версия
			  при 404 показывала «календари отсутствуют» — как будто раздел жив,
			  просто пуст.
			*/}
			<div className="flex items-start gap-3">
				<StateIcon
					size={20}
					className={
						"shrink-0 mt-0.5 " +
						TONE_ICON[copy.tone] +
						(isLoading ? " animate-spin" : "")
					}
					aria-hidden="true"
				/>
				<div className="min-w-0">
					<p
						className={
							"m-0 text-sm font-medium break-words " + TONE_HEADLINE[copy.tone]
						}
					>
						{copy.headline}
					</p>
					<p className="m-0 mt-1 text-xs text-slate-600 dark:text-slate-400 break-words">
						{copy.detail}
					</p>
				</div>
			</div>

			{copy.canRetry && (
				<button
					type="button"
					onClick={() => void load()}
					disabled={isLoading}
					className="mt-3 flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700"
				>
					<RefreshCcw size={14} aria-hidden="true" />
					Проверить снова
				</button>
			)}

			{items.length > 0 && (
				<div className="space-y-3 mt-3">
					{items.map((item) => {
						const badge = syncStatusBadge(item.syncStatus);
						return (
							<div
								key={item.id}
								className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							>
								<div>
									<div className="text-sm font-bold text-slate-900 dark:text-slate-200">
										{item.doctorName}
									</div>
									<div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
										ID Календаря:{" "}
										<span className="font-mono text-amber-700 dark:text-amber-300 font-semibold">
											{item.yandexCalendarId}
										</span>
									</div>
								</div>
								<div className="flex items-center space-x-2 text-xs">
									{/*
									  БЫЛО: всегда «⚡ Синхронизировано», syncStatus игнорировался.
									  СТАЛО: бейдж из фактического syncStatus ответа.
									*/}
									<span
										className={
											"px-2.5 py-1 rounded font-bold " + badge.className
										}
									>
										{badge.label}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
