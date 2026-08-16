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
			<div
				className="rounded-xl border text-xs"
				style={{
					padding: "12px 16px",
					borderColor: "var(--line)",
					background: "var(--paper-soft)",
					color: "var(--muted)",
				}}
			>
				Загрузка срочных обращений...
			</div>
		);
	}

	if (error) {
		return (
			<div
				className="rounded-xl border text-xs flex items-center justify-between gap-2"
				style={{
					padding: "12px 16px",
					borderColor: "var(--bad-border, rgba(239, 68, 68, 0.3))",
					background: "var(--bad-bg, rgba(239, 68, 68, 0.08))",
					color: "var(--bad-fg, var(--bad))",
				}}
			>
				<span>{error}</span>
				<button
					className="secondary-button"
					type="button"
					onClick={() => setReloadToken((t) => t + 1)}
					style={{ minHeight: "28px", padding: "2px 10px", fontSize: "11px" }}
				>
					Повторить
				</button>
			</div>
		);
	}

	if (requests.length === 0) {
		return (
			<div
				className="rounded-xl border text-xs text-center"
				style={{
					padding: "14px 16px",
					borderColor: "var(--line)",
					background: "var(--paper-soft)",
					color: "var(--muted)",
				}}
			>
				Срочных обращений нет. Окна резерва готовы к записи.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2.5">
			<h3
				className="text-sm font-bold m-0"
				style={{ color: "var(--ink)" }}
			>
				Срочные обращения
			</h3>
			{requests.map((r) => (
				<div
					key={r.id}
					className="rounded-xl border space-y-2"
					style={{
						padding: "12px 16px",
						borderColor: "var(--line)",
						background: "var(--surface)",
						color: "var(--ink)",
					}}
				>
					<div className="font-semibold text-xs flex items-center justify-between">
						<span>{r.patientName}</span>
						<span
							className="text-[11px] font-normal px-2 py-0.5 rounded border"
							style={{
								borderColor: "var(--bad-border, rgba(239, 68, 68, 0.3))",
								background: "var(--bad-bg, rgba(239, 68, 68, 0.08))",
								color: "var(--bad-fg, var(--bad))",
							}}
						>
							{r.requestType}
						</span>
					</div>
					<div
						className="text-[11px] space-y-0.5"
						style={{ color: "var(--muted)" }}
					>
						<div>
							Уровень срочности:{" "}
							<strong style={{ color: "var(--ink)" }}>{r.urgencyLevel}</strong>
						</div>
						<div>
							Врач:{" "}
							<span style={{ color: "var(--ink)" }}>
								{r.doctorName || "Любой свободный"}
							</span>
						</div>
						<div>
							Желаемое время:{" "}
							<span style={{ color: "var(--ink)" }}>
								{r.preferredSlotTime || "Не указано"}
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={() => handleResolve(r.id)}
						className="primary-button min-h-[40px] w-full text-xs font-semibold"
					>
						Отметить решённым
					</button>
				</div>
			))}
		</div>
	);
}
