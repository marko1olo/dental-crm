import type { UrgentScheduleRequest } from "@dental/shared";
import { AlertTriangle, Check, Clock, Flame, RotateCw, Stethoscope, User } from "lucide-react";
import React, { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

export interface UrgentScheduleRequestsWidgetProps {
	readonly onBookUrgentRequest?: ((request: UrgentScheduleRequest) => void) | undefined;
}

export function UrgentScheduleRequestsWidget({
	onBookUrgentRequest,
}: UrgentScheduleRequestsWidgetProps = {}) {
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
					className="secondary-button min-h-[44px]"
					type="button"
					onClick={() => setReloadToken((t) => t + 1)}
					style={{ padding: "4px 12px", fontSize: "12px" }}
				>
					Повторить
				</button>
			</div>
		);
	}

	if (requests.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-2.5" data-testid="urgent-schedule-requests-widget">
			<div className="flex items-center justify-between">
				<h3
					className="text-sm font-bold m-0 flex items-center gap-1.5"
					style={{ color: "var(--ink)" }}
				>
					<Flame size={16} className="text-rose-600 animate-bounce" />
					<span>Срочные обращения (CITO!)</span>
				</h3>
				<span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
					{requests.length}
				</span>
			</div>
			{requests.map((r) => (
				<div
					key={r.id}
					className="rounded-xl border space-y-2.5 transition-all"
					style={{
						padding: "12px 16px",
						borderColor: "var(--line)",
						background: "var(--surface)",
						color: "var(--ink)",
					}}
					data-testid={`urgent-request-card-${r.id}`}
				>
					<div className="font-semibold text-xs flex items-center justify-between gap-2">
						<div className="flex items-center gap-1.5 min-w-0">
							<User size={14} className="text-[var(--teal)] shrink-0" />
							<span className="truncate font-bold text-sm text-[var(--ink)]">{r.patientName}</span>
						</div>
						<span
							className="text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0"
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
						className="text-xs space-y-1"
						style={{ color: "var(--muted)" }}
					>
						<div className="flex items-center gap-1">
							<AlertTriangle size={13} className="text-amber-500 shrink-0" />
							<span>Уровень срочности: </span>
							<strong style={{ color: "var(--ink)" }}>{r.urgencyLevel}</strong>
						</div>
						<div className="flex items-center gap-1">
							<Stethoscope size={13} className="text-[var(--teal)] shrink-0" />
							<span>Врач: </span>
							<span style={{ color: "var(--ink)" }}>
								{r.doctorName || "Любой свободный дежурный врач"}
							</span>
						</div>
						<div className="flex items-center gap-1">
							<Clock size={13} className="text-blue-500 shrink-0" />
							<span>Желаемое время: </span>
							<span style={{ color: "var(--ink)" }}>
								{r.preferredSlotTime || "Ближайшее свободное (CITO)"}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2 pt-1">
						<button
							type="button"
							onClick={() => {
								if (onBookUrgentRequest) {
									onBookUrgentRequest(r);
								} else {
									showToast(`Запись CITO для «${r.patientName}»`, "info");
								}
							}}
							className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:brightness-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
							data-testid={`urgent-request-book-btn-${r.id}`}
							title="Назначить в расписание в 1 клик (CITO / острая боль)"
						>
							<Flame size={15} className="animate-pulse shrink-0" />
							<span>Записать CITO в 1 клик</span>
						</button>
						<button
							type="button"
							onClick={() => handleResolve(r.id)}
							className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
							data-testid={`urgent-request-resolve-btn-${r.id}`}
							title="Отметить обращение решенным"
						>
							<Check size={14} className="text-[var(--teal)] shrink-0" />
							<span>Решено</span>
						</button>
					</div>
				</div>
			))}
		</div>
	);
}
