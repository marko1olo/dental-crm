/**
 * PatientNoShowRisk.tsx — Дисциплина визитов и аналитика неявок пациента (Фича №35, Мандат 8b).
 * Монолитный модуль в Sweet Spot (200-300 строк), консолидирующий типы, статистику и хуки загрузки.
 */

import {
	AlertTriangle,
	CalendarCheck,
	CalendarClock,
	CheckCircle,
	ShieldAlert,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import type { PanelSubject } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { PanelLoadFailure } from "../PanelLoadFailure";

// ─── 1. КОНСТАНТЫ И УТИЛИТЫ ОЦЕНКИ РИСКА ──────────────────────────────────────

export const NO_SHOW_SUBJECT: PanelSubject = {
	notLoadedTitle: "Риск неявки не рассчитан",
	accusative: "оценку риска неявки",
	emptyTitle: "Риск неявки не рассчитан",
	emptyHint: "Расчёт опирается на историю записей пациента: сколько раз приходил, сколько отменял.",
	failureConsequence:
		"Расчёт не выполнен, поэтому пациента нельзя считать ни надёжным, ни рискованным. Позвоните и подтвердите запись обычным порядком.",
};

export function getRiskClass(level: string): string {
	switch (level) {
		case "high":
			return "text-red-600 dark:text-red-400";
		case "medium":
			return "text-amber-600 dark:text-amber-400";
		case "low":
			return "text-emerald-600 dark:text-emerald-400";
		default:
			return "text-slate-600 dark:text-slate-400";
	}
}

export function getRiskLabel(level: string, noShows = 0): string {
	if (noShows === 0) return "Надёжный пациент: визиты без пропусков";
	switch (level) {
		case "high":
			return "Повышенное внимание: были неявки в истории";
		case "medium":
			return "Умеренная дисциплина: единичные пропуски";
		case "low":
			return "Надёжный пациент: регулярная явка";
		default:
			return "История визитов формируется";
	}
}

export function getRiskIcon(level: string, noShows = 0): React.ReactElement {
	if (noShows === 0) return React.createElement(CheckCircle, { size: 16, className: "text-emerald-500" });
	switch (level) {
		case "high":
			return React.createElement(ShieldAlert, { size: 16, className: "text-red-500" });
		case "medium":
			return React.createElement(AlertTriangle, { size: 16, className: "text-amber-500" });
		case "low":
			return React.createElement(CheckCircle, { size: 16, className: "text-emerald-500" });
		default:
			return React.createElement(CalendarClock, { size: 16, className: "text-slate-400" });
	}
}

export type PatientNoShowRiskProps = {
	readonly patientId: string | null;
};

export function createNewPatientFallbackRisk(considered = 0) {
	return {
		history: {
			consideredAppointments: considered,
			attended: considered,
			noShows: 0,
			cancellations: 0,
		},
		riskLevel: "low",
		factors: ["Новый пациент: формируется история посещений"],
		recommendedAction: "Подтвердить запись за 24 часа телефонным звонком или сообщением",
	};
}

// ─── 2. ПРЕДСТАВЛЕНИЕ СТАТИСТИКИ ──────────────────────────────────────────────

export interface PatientNoShowRiskStatsProps {
	readonly riskData: any;
}

export function PatientNoShowRiskStats({ riskData }: PatientNoShowRiskStatsProps) {
	if (!riskData) return null;
	const { history, riskLevel, factors, recommendedAction } = riskData;

	return (
		<div>
			{history && (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="text-[10px] uppercase font-bold text-[var(--muted)]">Визитов</div>
						<div className="text-base font-black text-emerald-600 dark:text-emerald-400">{history.attended}</div>
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="text-[10px] uppercase font-bold text-[var(--muted)]">Неявок</div>
						<div
							className={`text-base font-black ${
								history.noShows > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
							}`}
						>
							{history.noShows}
						</div>
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="text-[10px] uppercase font-bold text-[var(--muted)]">Отмен</div>
						<div className="text-base font-black text-[var(--ink)]">{history.cancellations}</div>
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="text-[10px] uppercase font-bold text-[var(--muted)]">Дисциплина</div>
						<div className="text-base font-black text-[var(--teal,var(--brand-primary))]">
							{history.consideredAppointments > 0
								? `${Math.round((history.attended / history.consideredAppointments) * 100)}%`
								: "100%"}
						</div>
					</div>
				</div>
			)}

			<div className="flex justify-between items-center mb-3 p-3 rounded-lg border bg-[var(--paper-soft)] border-[var(--line)]">
				<div className="flex items-center gap-2">
					{getRiskIcon(riskLevel ?? "", history?.noShows ?? 0)}
					<span className={`text-sm font-semibold ${getRiskClass(riskLevel ?? "")}`}>
						{getRiskLabel(riskLevel ?? "", history?.noShows ?? 0)}
					</span>
				</div>
				<div className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)]">
					{`Визитов: ${history?.attended ?? 0}, неявок: ${history?.noShows ?? 0}, отмен: ${history?.cancellations ?? 0}`}
				</div>
			</div>

			{(factors ?? []).length > 0 && (
				<div className="mt-3">
					<span className="text-xs font-bold text-[var(--ink)]">Факторы надёжности расписания:</span>
					<ul className="mt-1 space-y-1 text-xs text-[var(--muted)] pl-4 list-disc">
						{(factors ?? []).map((factor: string) => (
							<li key={factor}>{factor}</li>
						))}
					</ul>
				</div>
			)}

			{recommendedAction && (
				<div className="mt-3 p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-800 dark:text-emerald-200">
					<strong>Рекомендуемое действие администратора:</strong> {recommendedAction}
				</div>
			)}
		</div>
	);
}

// ─── 3. ОСНОВНОЙ ВИДЖЕТ ПАНЕЛИ ────────────────────────────────────────────────

export const PatientNoShowRisk: React.FC<PatientNoShowRiskProps> = ({ patientId }) => {
	const [loading, setLoading] = useState(false);
	const [riskData, setRiskData] = useState<any>(null);
	const [reloadToken, setReloadToken] = useState(0);
	const [failure, setFailure] = useState<{ status: number | null } | null>(null);

	useEffect(() => {
		if (!patientId) {
			setRiskData(null);
			setFailure(null);
			setLoading(false);
			return;
		}
		setRiskData(null);
		setFailure(null);
		setLoading(true);

		const controller = new AbortController();
		let cancelled = false;

		(async () => {
			try {
				const res = await fetch("/api/ai/predict-no-show", {
					method: "POST",
					headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
					body: JSON.stringify({ patientId }),
					signal: controller.signal,
				});
				if (cancelled) return;
				if (res.ok) {
					const data = await res.json().catch((err: any) => {
						logger.error(err);
						return null;
					});
					if (cancelled) return;
					if (data) setRiskData(data);
					else setFailure({ status: res.status });
				} else if (res.status === 422) {
					const data = await res.json().catch(() => null);
					if (cancelled) return;
					setRiskData(createNewPatientFallbackRisk(data?.consideredAppointments ?? 0));
				} else {
					setFailure({ status: res.status });
				}
			} catch (e) {
				if (cancelled || (e as Error)?.name === "AbortError") return;
				logger.error("Failed to fetch no-show discipline statistics", e);
				setFailure({ status: null });
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [patientId, reloadToken]);

	if (!patientId) return null;

	return (
		<div data-testid="patient-no-show-risk" className="panel p-3.5 rounded-xl border bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] shadow-2xs">
			<h3 className="panel-heading compact-heading flex items-center gap-2 mb-3 pb-2 border-b border-[var(--line)]" title="Дисциплина визитов и статистика неявок пациента">
				<CalendarClock size={16} className="text-emerald-600 dark:text-emerald-400" />
				<span className="text-sm font-semibold">Дисциплина визитов и статистика неявок</span>
			</h3>

			{loading ? (
				<div className="text-xs text-[var(--muted)] py-3">Загрузка статистики визитов пациента…</div>
			) : failure ? (
				<PanelLoadFailure subject={NO_SHOW_SUBJECT} status={failure.status} onRetry={() => setReloadToken((t) => t + 1)} />
			) : riskData ? (
				<PatientNoShowRiskStats riskData={riskData} />
			) : (
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 py-2">
					<span className="text-xs text-[var(--muted)]">Статистика посещаемости по журналу приёмов</span>
					<button
						type="button"
						onClick={() => setReloadToken((t) => t + 1)}
						disabled={loading}
						className="px-3.5 py-1.5 min-h-[34px] text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors shadow-2xs cursor-pointer"
					>
						{loading ? "Загрузка…" : "Обновить статистику"}
					</button>
				</div>
			)}
		</div>
	);
};

export default PatientNoShowRisk;
