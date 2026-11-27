import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, Download, RefreshCw, Users, Wallet } from "lucide-react";
import { z } from "zod";
import { formatKopecksToRub, rublesToKopecks } from "@dental/shared";
import { denteClinicalReadHeaders } from "../../lib/denteRequestHeaders";
import { clientLogger } from "../../services/logging/clientLogger";
import { showToast } from "../GlobalToast";
import {
	generateManagerReportsCsv,
	type ManagerReportsDataBundle,
	triggerCsvDownload,
} from "./analyticsCsvUtils";

interface ReceivableRow {
	readonly patientId?: string | undefined;
	readonly patientName: string;
	readonly debtRub: number;
	readonly bucket: string;
	readonly oldestChargeAt?: string | null;
}

interface PrepaymentRow {
	readonly patientId?: string | undefined;
	readonly patientName: string;
	readonly prepaidRub: number;
}

interface ReceivablesResponseDto {
	readonly rows?: readonly ReceivableRow[] | undefined;
	readonly totalDebtRub?: number | undefined;
	readonly byBucket?: Readonly<Record<string, number>> | undefined;
	readonly prepayments?: readonly PrepaymentRow[] | undefined;
	readonly totalPrepaidRub?: number | undefined;
}

export interface ExecutiveReceivablesPanelProps {
	readonly period?: string | undefined;
}

const BUCKET_LABELS_RU: Readonly<Record<string, string>> = {
	current: "Текущая (в срок)",
	up_to_30: "Просрочка до 30 дней",
	up_to_90: "Просрочка 31–90 дней",
	over_90: "Просрочка свыше 90 дней",
	undated: "Без даты визита",
	"0-30": "До 30 дней",
	"31-60": "31–60 дней",
	"61-90": "61–90 дней",
	"90+": "Свыше 90 дней",
};

const managerSummarySchema = z.object({
	revenue: z
		.object({
			totalRub: z.number().optional(),
			points: z
				.array(
					z.object({
						bucket: z.string(),
						revenueRub: z.number(),
						paymentCount: z.number(),
						payingPatients: z.number(),
					}),
				)
				.optional(),
		})
		.optional(),
	appointments: z
		.object({
			total: z.number().optional(),
			completionRate: z.number().nullable().optional(),
			noShowRate: z.number().nullable().optional(),
		})
		.optional(),
	doctors: z
		.object({
			rows: z
				.array(
					z.object({
						doctorName: z.string(),
						revenueRub: z.number(),
						appointmentsTotal: z.number(),
						appointmentsCompleted: z.number(),
						appointmentsCancelled: z.number(),
						appointmentsNoShow: z.number(),
						completionRate: z.number().nullable().optional(),
						averageTicketRub: z.number().nullable().optional(),
					}),
				)
				.optional(),
			unattributedRevenueRub: z.number().optional(),
		})
		.optional(),
	chairs: z
		.object({
			rows: z
				.array(
					z.object({
						chairName: z.string(),
						appointments: z.number(),
						bookedMinutes: z.number(),
						utilization: z.number().nullable().optional(),
					}),
				)
				.optional(),
		})
		.optional(),
});

function formatRubMoney(rub: number | undefined): string {
	return formatKopecksToRub(rublesToKopecks(Number(rub) || 0));
}

export const ExecutiveReceivablesPanel: React.FC<ExecutiveReceivablesPanelProps> = ({
	period = "month",
}) => {
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [receivables, setReceivables] = useState<ReceivablesResponseDto | null>(null);
	const [summary, setSummary] = useState<ManagerReportsDataBundle["summary"]>(null);
	const [periodBounds, setPeriodBounds] = useState<{ from: string; to: string }>({
		from: new Date().toISOString().slice(0, 10),
		to: new Date().toISOString().slice(0, 10),
	});

	const loadData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [recRes, sumRes] = await Promise.all([
				fetch("/api/reports/receivables", { headers: denteClinicalReadHeaders() }),
				fetch(`/api/reports/summary?period=${encodeURIComponent(period)}`, {
					headers: denteClinicalReadHeaders(),
				}),
			]);

			if (!recRes.ok) {
				throw new Error(`Ошибка загрузки дебиторской задолженности (HTTP ${recRes.status})`);
			}

			const recJson = (await recRes.json()) as unknown;
			const recPayload =
				recJson && typeof recJson === "object" && "data" in recJson
					? ((recJson as { data?: unknown }).data ?? recJson)
					: recJson;
			setReceivables((recPayload as ReceivablesResponseDto) ?? null);

			if (sumRes.ok) {
				const sumJson = (await sumRes.json()) as unknown;
				const sumPayload =
					sumJson && typeof sumJson === "object" && "data" in sumJson
						? ((sumJson as { data?: unknown }).data ?? sumJson)
						: sumJson;
				const parsedSummary = managerSummarySchema.safeParse(sumPayload);
				if (parsedSummary.success) {
					setSummary(parsedSummary.data as ManagerReportsDataBundle["summary"]);
				} else {
					clientLogger.warn("[ExecutiveReceivablesPanel] Invalid summary payload shape", parsedSummary.error.flatten(), {
						module: "Analytics",
					});
				}
				const sumObj = (sumPayload && typeof sumPayload === "object" ? sumPayload : null) as Record<string, unknown> | null;
				if (sumObj) {
					const p = sumObj.period as { from?: string; to?: string } | undefined;
					if (p?.from && p?.to) {
						setPeriodBounds({ from: String(p.from).slice(0, 10), to: String(p.to).slice(0, 10) });
					}
				}
			}
		} catch (err: unknown) {
			clientLogger.warn("[ExecutiveReceivablesPanel] Failed to fetch receivables/summary", err, {
				module: "Analytics",
			});
			setError(err instanceof Error ? err.message : "Не удалось загрузить данные по дебиторке");
		} finally {
			setLoading(false);
		}
	}, [period]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	const handleDownloadCsv = useCallback(async () => {
		try {
			let servicesPayload: ManagerReportsDataBundle["services"] = null;
			try {
				const svcRes = await fetch(`/api/reports/services?period=${encodeURIComponent(period)}`, {
					headers: denteClinicalReadHeaders(),
				});
				if (svcRes.ok) {
					const svcJson = (await svcRes.json()) as unknown;
					const unwrapped =
						svcJson && typeof svcJson === "object" && "data" in svcJson
							? ((svcJson as { data?: unknown }).data ?? svcJson)
							: svcJson;
					servicesPayload = (unwrapped as ManagerReportsDataBundle["services"]) ?? null;
				}
			} catch (svcErr) {
				clientLogger.warn("[ExecutiveReceivablesPanel] Optional services CSV fetch failed", svcErr, {
					module: "Analytics",
				});
			}

			const bundle: ManagerReportsDataBundle = {
				period: periodBounds,
				summary,
				services: servicesPayload,
				receivables: receivables
					? {
							rows: receivables.rows ?? [],
							totalDebtRub: receivables.totalDebtRub ?? 0,
							prepayments: receivables.prepayments ?? [],
							totalPrepaidRub: receivables.totalPrepaidRub ?? 0,
						}
					: null,
				scheduleLoad: null,
			};

			const csv = generateManagerReportsCsv(bundle);
			const filename = `DENTE_Manager_Report_${periodBounds.from}_${periodBounds.to}.csv`;
			triggerCsvDownload(csv, filename);
			showToast(`Отчёт CSV (${filename}) сформирован и скачан`, "success");
		} catch (err: unknown) {
			clientLogger.error("[ExecutiveReceivablesPanel] CSV export failed", err);
			showToast("Не удалось сформировать CSV-файл отчёта", "error");
		}
	}, [period, periodBounds, receivables, summary]);

	const [showAllDebtors, setShowAllDebtors] = useState(false);
	const [showAllPrepayments, setShowAllPrepayments] = useState(false);
	const rows = receivables?.rows ?? [];
	const prepayments = receivables?.prepayments ?? [];
	const visibleDebtors = showAllDebtors ? rows : rows.slice(0, 35);
	const visiblePrepayments = showAllPrepayments ? prepayments : prepayments.slice(0, 35);
	const totalDebtRub = receivables?.totalDebtRub ?? 0;
	const totalPrepaidRub = receivables?.totalPrepaidRub ?? 0;
	const summaryRevenueRub = summary?.revenue?.totalRub ?? 0;

	return (
		<div className="space-y-4" data-testid="executive-receivables-panel">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)]">
				<div>
					<h3 className="text-base font-semibold text-[var(--ink)]">
						Дебиторская задолженность и авансы пациентов
					</h3>
					<p className="text-xs text-[var(--ink-muted)]">
						Сводка по открытым долгам клиники, авансовым депозитам и выгрузка отчётности руководителя в CSV
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={() => void loadData()}
						className="h-9 px-3.5 rounded-lg text-sm font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] inline-flex items-center gap-2 cursor-pointer"
					>
						<RefreshCw className={`w-4 h-4 shrink-0 ${loading ? "animate-spin" : ""}`} />
						<span>Обновить</span>
					</button>
					<button
						type="button"
						onClick={() => void handleDownloadCsv()}
						data-testid="btn-export-manager-csv"
						className="h-9 px-3.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm inline-flex items-center gap-2 cursor-pointer"
					>
						<Download className="w-4 h-4 shrink-0" />
						<span>Выгрузить CSV</span>
					</button>
				</div>
			</div>

			{error && (
				<div
					className="p-4 rounded-xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-between gap-3 text-sm"
					role="alert"
				>
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 shrink-0" />
						<span>{error}</span>
					</div>
					<button
						type="button"
						onClick={() => void loadData()}
						className="h-8 px-2.5 rounded-md text-xs font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] cursor-pointer shrink-0"
					>
						Повторить
					</button>
				</div>
			)}

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
					<div className="text-xs text-[var(--ink-muted)]">Общий долг клинике</div>
					<div className="mt-1 text-lg font-semibold font-mono tracking-tight tabular-nums text-[var(--danger)]">
						{loading ? "..." : formatRubMoney(totalDebtRub)}
					</div>
				</div>
				<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
					<div className="text-xs text-[var(--ink-muted)]">Должников</div>
					<div className="mt-1 text-lg font-semibold font-mono tracking-tight tabular-nums text-[var(--ink)]">
						{loading ? "..." : rows.length}
					</div>
				</div>
				<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
					<div className="text-xs text-[var(--ink-muted)]">Авансы пациентов</div>
					<div className="mt-1 text-lg font-semibold font-mono tracking-tight tabular-nums text-[var(--primary)]">
						{loading ? "..." : formatRubMoney(totalPrepaidRub)}
					</div>
				</div>
				<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
					<div className="text-xs text-[var(--ink-muted)]">Выручка сводки за период</div>
					<div className="mt-1 text-lg font-semibold font-mono tracking-tight tabular-nums text-[var(--ink)]">
						{loading ? "..." : formatRubMoney(summaryRevenueRub)}
					</div>
				</div>
			</div>

			{!loading && rows.length === 0 && prepayments.length === 0 ? (
				<div className="py-12 rounded-2xl border border-[var(--line)] bg-[var(--paper)] flex flex-col items-center text-center gap-2.5">
					<Wallet className="w-10 h-10 text-[var(--ink-muted)]" />
					<p className="text-sm font-medium text-[var(--ink)]">
						Непогашенной дебиторской задолженности и авансов не найдено
					</p>
					<p className="text-xs text-[var(--ink-muted)]">
						Все закрытые визиты и счета оплачены в полном объёме
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden">
						<div className="h-12 px-4 border-b border-[var(--line)] flex items-center justify-between">
							<span className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
								<Users className="w-4 h-4 text-[var(--primary)]" />
								Пациенты с задолженностью ({rows.length})
							</span>
						</div>
						{rows.length === 0 ? (
							<div className="p-6 text-center text-xs text-[var(--ink-muted)]">
								Задолженности отсутствуют
							</div>
						) : (
							<>
								<div className="divide-y divide-[var(--line)]">
									{visibleDebtors.map((r, idx) => (
										<div
											key={r.patientId || `${r.patientName}-${idx}`}
											className="px-4 py-3 flex items-center justify-between gap-3"
										>
											<div className="min-w-0">
												<div className="text-sm font-medium text-[var(--ink)] truncate">
													{r.patientName}
												</div>
												<div className="text-xs text-[var(--ink-muted)]">
													{BUCKET_LABELS_RU[r.bucket] ?? r.bucket}
													{r.oldestChargeAt ? ` • с ${String(r.oldestChargeAt).slice(0, 10)}` : ""}
												</div>
											</div>
											<span className="text-sm font-semibold font-mono tracking-tight text-right tabular-nums text-[var(--danger)] shrink-0">
												{formatRubMoney(r.debtRub)}
											</span>
										</div>
									))}
								</div>
								{!showAllDebtors && rows.length > 35 && (
									<div className="p-3 border-t border-[var(--line)] flex justify-center">
										<button
											type="button"
											onClick={() => setShowAllDebtors(true)}
											className="h-8 px-3 rounded-md text-xs font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer"
										>
											Показать всех ({rows.length})
										</button>
									</div>
								)}
							</>
						)}
					</div>

					<div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden">
						<div className="h-12 px-4 border-b border-[var(--line)] flex items-center justify-between">
							<span className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
								<Wallet className="w-4 h-4 text-[var(--primary)]" />
								Авансовые депозиты ({prepayments.length})
							</span>
						</div>
						{prepayments.length === 0 ? (
							<div className="p-6 text-center text-xs text-[var(--ink-muted)]">
								Активных авансов нет
							</div>
						) : (
							<>
								<div className="divide-y divide-[var(--line)]">
									{visiblePrepayments.map((p, idx) => (
										<div
											key={p.patientId || `${p.patientName}-${idx}`}
											className="px-4 py-3 flex items-center justify-between gap-3"
										>
											<div className="text-sm font-medium text-[var(--ink)] truncate">
												{p.patientName}
											</div>
											<span className="text-sm font-semibold font-mono tracking-tight text-right tabular-nums text-[var(--primary)] shrink-0">
												{formatRubMoney(p.prepaidRub)}
											</span>
										</div>
									))}
								</div>
								{!showAllPrepayments && prepayments.length > 35 && (
									<div className="p-3 border-t border-[var(--line)] flex justify-center">
										<button
											type="button"
											onClick={() => setShowAllPrepayments(true)}
											className="h-8 px-3 rounded-md text-xs font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer"
										>
											Показать все ({prepayments.length})
										</button>
									</div>
								)}
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
