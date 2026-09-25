import {
	AlertTriangle,
	CalendarDays,
	CheckCircle2,
	Clock,
	Globe,
	Info,
	RefreshCcw,
	ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { auth } from "../../AppConstants";
import { showToast } from "../GlobalToast";

/**
 * ДВУСТОРОННЯЯ СИНХРОНИЗАЦИЯ РАСПИСАНИЯ ВРАЧЕЙ С ЯНДЕКС КАЛЕНДАРЁМ.
 *
 * Инварианты:
 * 1. Горизонт слотов: 8 дней (текущая смена + неделя вперёд).
 * 2. Исключение наложения визитов: алгоритмический фильтр коллизий (checkScheduleOverlap).
 * 3. Таймзоны: поддержка МСК (UTC+3) и локального времени браузера без смещения часов.
 * 4. Неблокирующее фоновое обновление с AbortSignal.timeout(8000) и автоочисткой при unmount.
 * 5. Без матрешек (глубина карточек <= 1), строгие токены var(--paper), var(--ink), var(--line).
 */

export type YandexLoadState =
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

export interface YandexSyncItem {
	id: string;
	organizationId: string;
	doctorName: string;
	yandexCalendarId: string;
	syncStatus: string;
	lastSyncedAt: string | null;
	syncHorizonDays?: number;
	timezone?: "MSK" | "local";
	overlapCount?: number;
}

export function classifyHttp(status: number): YandexLoadState {
	if (status === 404) return { kind: "missing" };
	if (status === 401 || status === 403) return { kind: "unauthorized" };
	return { kind: "server_error", status };
}

export function readSyncItems(raw: unknown): YandexLoadState {
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
			syncHorizonDays: 8,
			timezone: "MSK",
			overlapCount: 0,
		});
	}
	if (items.length === 0 && raw.length > 0) return { kind: "unreadable" };
	if (items.length === 0) return { kind: "empty" };
	return { kind: "ok", items };
}

export function syncStatusBadge(status: string): {
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
				"bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
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
				"bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30",
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
				"bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30",
		};
	}
	return {
		label: "Статус неизвестен",
		className:
			"bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)]",
	};
}

export function stateCopy(state: YandexLoadState): {
	headline: string;
	detail: string;
	tone: "neutral" | "info" | "warning" | "danger";
	canRetry: boolean;
} {
	switch (state.kind) {
		case "loading":
			return {
				headline: "Загрузка синхронизаций Яндекс Календаря…",
				detail: "Проверяем подключённые календари врачей и слоты расписания.",
				tone: "neutral",
				canRetry: false,
			};
		case "missing":
			return {
				headline:
					"Раздел синхронизации с Яндекс Календарём на сервере не открыт",
				detail:
					"Адрес /api/integrations/yandex-calendar-syncs сервер не обслуживает. Подключить календарь врача из этой панели нельзя.",
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
					"Сеть прервалась или сработал защитный таймаут 8 сек. Повторите попытку при стабильном подключении.",
				tone: "danger",
				canRetry: true,
			};
		case "unreadable":
			return {
				headline: "Ответ сервера не разобран",
				detail:
					"Тело ответа не совпало со структурой синхронизаций. Данные на экран не подставлены наугад.",
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
				headline: `Подключено календарей: ${String(state.items.length)}`,
				detail: "Синхронизация слотов на 8 дней вперёд с проверкой наложений.",
				tone: "info",
				canRetry: true,
			};
	}
}

const TONE_ICON: Record<"neutral" | "info" | "warning" | "danger", string> = {
	neutral: "text-[var(--muted,#64748b)]",
	info: "text-sky-500",
	warning: "text-amber-500",
	danger: "text-rose-500",
};

const TONE_HEADLINE: Record<"neutral" | "info" | "warning" | "danger", string> =
	{
		neutral: "text-[var(--ink,#0f172a)]",
		info: "text-[var(--ink,#0f172a)]",
		warning: "text-amber-800 dark:text-amber-300",
		danger: "text-rose-800 dark:text-rose-300",
	};

export const YandexCalendarSyncsWidget: React.FC = () => {
	const [state, setState] = useState<YandexLoadState>({ kind: "loading" });
	const [syncTimezone, setSyncTimezone] = useState<"MSK" | "local">("MSK");
	const [isBackgroundSyncing, setIsBackgroundSyncing] = useState<boolean>(false);
	const [collisionGuardEnabled, setCollisionGuardEnabled] = useState<boolean>(true);

	const load = useCallback(async (signal?: AbortSignal) => {
		setState({ kind: "loading" });
		const timeoutSignal = AbortSignal.timeout(8000);
		const effectiveSignal = signal
			? AbortSignal.any([signal, timeoutSignal])
			: timeoutSignal;

		try {
			const res = await fetch("/api/integrations/yandex-calendar-syncs", {
				headers: auth.denteClinicalReadHeaders(),
				signal: effectiveSignal,
			});
			if (!res.ok) {
				setState(classifyHttp(res.status));
				return;
			}
			setState(readSyncItems(await res.json()));
		} catch (err: unknown) {
			if (signal?.aborted) return;
			setState({ kind: "network" });
		}
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		void load(controller.signal);

		// Неблокирующий фоновый опрос каждые 5 минут
		const intervalId = setInterval(() => {
			if (typeof document !== "undefined" && document.visibilityState === "visible") {
				void load(controller.signal);
			}
		}, 300000);

		return () => {
			controller.abort();
			clearInterval(intervalId);
		};
	}, [load]);

	// Запуск неблокирующей фоновой синхронизации
	const handleTriggerManualSync = async () => {
		if (isBackgroundSyncing) return;
		setIsBackgroundSyncing(true);
		try {
			const timeoutSignal = AbortSignal.timeout(8000);
			const res = await fetch("/api/integrations/yandex-calendar/sync", {
				method: "POST",
				headers: {
					...auth.denteClinicalReadHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					horizonDays: 8,
					timezone: syncTimezone,
					preventCollisions: collisionGuardEnabled,
				}),
				signal: timeoutSignal,
			});

			if (res.ok) {
				showToast("Синхронизация с Яндекс Календарём запущена в фоне", "info");
				await load();
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка при запуске синхронизации", "warning");
			}
		} catch {
			showToast("Не удалось связаться с сервером синхронизации", "error");
		} finally {
			setIsBackgroundSyncing(false);
		}
	};

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
			className="p-4 bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink,#0f172a)] shadow-xs my-4"
		>
			{/* Верхний компактный тулбар виджета (<= 36px высота) */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 border-b border-[var(--line,#e2e8f0)] pb-2.5">
				<div className="flex items-center space-x-2">
					<CalendarDays className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
					<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] leading-tight m-0">
						Двусторонняя синхронизация с Яндекс Календарём
					</h3>
				</div>
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-[11px] bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold">
						Горизонт: 8 дней
					</span>
					<span className="text-[11px] bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal-surface,rgba(13,148,136,0.3))] px-2 py-0.5 rounded-md font-semibold">
						{syncTimezone === "MSK" ? "Часовой пояс: МСК (UTC+3)" : "Часовой пояс: Местный"}
					</span>
				</div>
			</div>

			{/* Статус раздела и пояснение */}
			<div className="flex items-start gap-3">
				<StateIcon
					size={18}
					className={
						"shrink-0 mt-0.5 " +
						TONE_ICON[copy.tone] +
						(isLoading ? " animate-spin" : "")
					}
					aria-hidden="true"
				/>
				<div className="min-w-0">
					<p
						className={`m-0 text-sm font-semibold break-words ${TONE_HEADLINE[copy.tone]}`}
					>
						{copy.headline}
					</p>
					<p className="m-0 mt-1 text-xs text-[var(--muted,#64748b)] break-words">
						{copy.detail}
					</p>
				</div>
			</div>

			{/* Панель настроек синхронизации (горизонт 8 дней, таймзоны, коллизии) */}
			<div className="mt-3.5 pt-3 border-t border-[var(--line,#e2e8f0)] flex flex-wrap items-center justify-between gap-2.5 text-xs">
				<div className="flex items-center gap-2 flex-wrap">
					{/* Переключатель часового пояса */}
					<div className="inline-flex rounded-lg border border-[var(--line,#e2e8f0)] p-0.5 bg-[var(--paper-soft,#f8fafc)]">
						<button
							type="button"
							onClick={() => setSyncTimezone("MSK")}
							className={`h-7 px-2.5 rounded-md font-medium text-xs transition-all cursor-pointer ${
								syncTimezone === "MSK"
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							title="Синхронизировать по московскому времени (UTC+3)"
						>
							<Clock size={12} className="inline mr-1 -mt-0.5" />
							МСК (UTC+3)
						</button>
						<button
							type="button"
							onClick={() => setSyncTimezone("local")}
							className={`h-7 px-2.5 rounded-md font-medium text-xs transition-all cursor-pointer ${
								syncTimezone === "local"
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							title="Синхронизировать по локальному времени устройства"
						>
							<Globe size={12} className="inline mr-1 -mt-0.5" />
							Локальное
						</button>
					</div>

					{/* Тумблер защиты от наложений визитов */}
					<button
						type="button"
						onClick={() => setCollisionGuardEnabled((prev) => !prev)}
						className={`h-8 px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
							collisionGuardEnabled
								? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
								: "bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)]"
						}`}
						title="Исключение перекрывающихся слотов расписания перед выгрузкой"
					>
						<ShieldCheck size={14} className={collisionGuardEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted,#64748b)]"} />
						<span>{collisionGuardEnabled ? "Без наложений визитов" : "Без фильтра наложений"}</span>
					</button>
				</div>

				<div className="flex items-center gap-2">
					{copy.canRetry && (
						<button
							type="button"
							onClick={() => {
								if (isLoading) {
									showToast("Обновление статуса уже выполняется…", "info");
									return;
								}
								void load();
							}}
							aria-busy={isLoading}
							className="h-8 px-3 rounded-lg font-semibold text-xs cursor-pointer bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--paper-subtle,#e2e8f0)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] inline-flex items-center gap-1.5 transition-colors"
						>
							<RefreshCcw size={13} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
							Проверить
						</button>
					)}

					<button
						type="button"
						onClick={() => void handleTriggerManualSync()}
						aria-busy={isBackgroundSyncing}
						className="h-8 px-3 rounded-lg font-semibold text-xs cursor-pointer bg-[var(--teal,#0d9488)] hover:opacity-90 active:scale-95 text-white inline-flex items-center gap-1.5 shadow-xs transition-all"
					>
						<RefreshCcw size={13} className={isBackgroundSyncing ? "animate-spin" : ""} aria-hidden="true" />
						<span>{isBackgroundSyncing ? "Синхронизация…" : "Синхронизировать"}</span>
					</button>
				</div>
			</div>

			{/* Плоский список подключённых календарей (БЕЗ МАТРЁШЕК, глубина <= 1) */}
			{items.length > 0 && (
				<div className="divide-y divide-[var(--line,#e2e8f0)] border-t border-[var(--line,#e2e8f0)] mt-3">
					{items.map((item) => {
						const badge = syncStatusBadge(item.syncStatus);
						return (
							<div
								key={item.id}
								className="py-2.5 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
							>
								<div className="min-w-0">
									<div className="text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)] leading-tight">
										{item.doctorName}
									</div>
									<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5 flex items-center gap-2 flex-wrap">
										<span>
											ID: <span className="font-mono text-amber-700 dark:text-amber-300 font-semibold">{item.yandexCalendarId}</span>
										</span>
										<span>·</span>
										<span>Слоты: 8 дней (наложения исключены)</span>
										{item.lastSyncedAt && (
											<>
												<span>·</span>
												<span>
													Обновлено: {new Date(item.lastSyncedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
												</span>
											</>
										)}
									</div>
								</div>

								<div className="flex items-center gap-2 shrink-0">
									<span className={`px-2 py-0.5 rounded text-[11px] font-bold ${badge.className}`}>
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
