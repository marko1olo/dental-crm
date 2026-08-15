import type { UrgentScheduleRequest } from "@dental/shared";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

export function UrgentScheduleRequestsWidget() {
	const [requests, setRequests] = useState<UrgentScheduleRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [reloadToken, setReloadToken] = useState(0);

	useEffect(() => {
		let active = true;
		setLoading(true);
		setError(null);
		fetch("/api/schedule/urgent-schedule-requests", {
			credentials: "include",
			headers: denteAdminSecretRequestHeaders(),
		})
			.then(async (res) => {
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}`);
				}
				return res.json();
			})
			.then((data: unknown) => {
				if (!active) return;
				if (!Array.isArray(data)) {
					throw new Error("Ответ сервера не является списком обращений");
				}
				setRequests(data as UrgentScheduleRequest[]);
				setLoading(false);
			})
			.catch((err) => {
				if (!active) return;
				logger.error("Failed to fetch urgent requests", err);
				setError("Не удалось загрузить срочные обращения");
				setLoading(false);
			});

		return () => {
			active = false;
		};
	}, [reloadToken]);

	const handleResolve = async (id: string) => {
		try {
			const res = await fetch(
				`/api/schedule/urgent-schedule-requests/${id}/resolve`,
				{
					method: "PATCH",
					credentials: "include",
					headers: denteAdminSecretRequestHeaders(),
				},
			);
			if (res.ok) {
				setRequests((prev) => prev.filter((r) => r.id !== id));
			} else {
				showToast(
					actionFailureToast("Ошибка отметки обращения", res.status),
					"error",
				);
			}
		} catch (err) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error("Failed to resolve urgent request", err);
		}
	};

	if (loading) {
		return (
			<div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
				Загрузка срочных обращений...
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
				<span>{error}</span>
				<button
					type="button"
					onClick={() => setReloadToken((t) => t + 1)}
					className="px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-medium text-xs hover:opacity-90"
				>
					Повторить
				</button>
			</div>
		);
	}

	if (requests.length === 0) {
		return (
			<div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 text-xs text-slate-500 dark:text-slate-400 text-center">
				Срочных обращений нет. Окна резерва готовы к записи.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2.5">
			<h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 m-0">
				Срочные обращения
			</h3>
			{requests.map((r) => (
				<div
					key={r.id}
					className="p-3 rounded-xl border shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 space-y-2"
				>
					<div className="font-semibold text-xs flex items-center justify-between">
						<span>{r.patientName}</span>
						<span className="text-[11px] font-normal text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
							{r.requestType}
						</span>
					</div>
					<div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
						<div>Уровень срочности: <strong className="text-slate-700 dark:text-slate-300">{r.urgencyLevel}</strong></div>
						<div>Врач: <span className="text-slate-700 dark:text-slate-300">{r.doctorName || "Любой свободный"}</span></div>
						<div>Желаемое время: <span className="text-slate-700 dark:text-slate-300">{r.preferredSlotTime || "Не указано"}</span></div>
					</div>
					<button
						type="button"
						onClick={() => handleResolve(r.id)}
						className="primary-button min-h-[44px] w-full text-xs font-semibold"
					>
						Отметить решённым
					</button>
				</div>
			))}
		</div>
	);
}
