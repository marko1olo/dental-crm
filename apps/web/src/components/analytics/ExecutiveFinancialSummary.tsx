/**
 * apps/web/src/components/analytics/ExecutiveFinancialSummary.tsx
 *
 * Сводный финансовый пульт руководителя клиники (SSOT).
 *
 * ЧЕСТНЫЙ УЧЕТ ДЕНЕГ:
 * - Выручка кассы за выбранный период (день / неделя / месяц / квартал / год)
 * - Разбивка по 4 реальным типам оплат: Наличные, Банковские карты, QR СБП, Авансы/депозиты
 * - Средний чек и количество оформленных нарядов
 * - 100% токенизация темы: var(--paper), var(--ink), var(--line), var(--teal)
 * - Адаптивность: десктопная плотность и нативные Grouped Cards на смартфонах (390px)
 */

import React, { useCallback, useEffect, useState } from "react";
import {
	CreditCard,
	DollarSign,
	FileText,
	QrCode,
	Receipt,
	RefreshCw,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export interface PaymentBreakdownItem {
	readonly method: "cash" | "card" | "sbp" | "deposit";
	readonly label: string;
	readonly amountRub: number;
	readonly amountKopecks: number;
	readonly percent: number;
	readonly count: number;
}

export interface FinancialSummaryData {
	readonly totalRevenueRub: number;
	readonly totalRevenueKopecks: number;
	readonly invoicesCount: number;
	readonly totalInvoicedRub: number;
	readonly totalInvoicedKopecks: number;
	readonly averageCheckRub: number;
	readonly averageCheckKopecks: number;
	readonly paymentBreakdown: {
		readonly cash: PaymentBreakdownItem;
		readonly card: PaymentBreakdownItem;
		readonly sbp: PaymentBreakdownItem;
		readonly deposit: PaymentBreakdownItem;
	};
	readonly isEmpty: boolean;
}

export interface ExecutiveFinancialSummaryProps {
	readonly period?: string;
	readonly onPeriodChange?: (period: string) => void;
	readonly onPrint?: () => void;
}

function formatRub(val: number): string {
	const rounded = Math.round(val || 0);
	return `${rounded.toLocaleString("ru-RU")} ₽`;
}

const PERIOD_LABELS: Record<string, string> = {
	day: "Сегодня",
	week: "Неделя",
	month: "Месяц",
	quarter: "Квартал",
	year: "Год",
};

export const ExecutiveFinancialSummary: React.FC<ExecutiveFinancialSummaryProps> = ({
	period = "month",
	onPeriodChange,
	onPrint,
}) => {
	const [activePeriod, setActivePeriod] = useState<string>(period);
	const [loading, setLoading] = useState<boolean>(true);
	const [summary, setSummary] = useState<FinancialSummaryData | null>(null);

	const handlePeriodSelect = useCallback(
		(p: string) => {
			setActivePeriod(p);
			if (onPeriodChange) onPeriodChange(p);
		},
		[onPeriodChange],
	);

	const fetchSummary = useCallback(async (p: string) => {
		setLoading(true);
		try {
			const res = await fetch(`/api/reports/financial-summary?period=${p}`);
			if (res.ok) {
				const json = await res.json();
				setSummary(json);
				setLoading(false);
				return;
			}
		} catch {
			// fallback к демо-данным при оффлайне или демо-витрине
		}

		if (isDemoShowcaseMode()) {
			setSummary({
				totalRevenueRub: 1450000,
				totalRevenueKopecks: 145000000,
				invoicesCount: 184,
				totalInvoicedRub: 1520000,
				totalInvoicedKopecks: 152000000,
				averageCheckRub: 7880,
				averageCheckKopecks: 788000,
				paymentBreakdown: {
					cash: {
						method: "cash",
						label: "Наличные (Касса)",
						amountRub: 362500,
						amountKopecks: 36250000,
						percent: 25.0,
						count: 48,
					},
					card: {
						method: "card",
						label: "Банковские карты",
						amountRub: 797500,
						amountKopecks: 79750000,
						percent: 55.0,
						count: 98,
					},
					sbp: {
						method: "sbp",
						label: "Оплата по QR (СБП)",
						amountRub: 217500,
						amountKopecks: 21750000,
						percent: 15.0,
						count: 26,
					},
					deposit: {
						method: "deposit",
						label: "Списание с авансов/депозитов",
						amountRub: 72500,
						amountKopecks: 7250000,
						percent: 5.0,
						count: 12,
					},
				},
				isEmpty: false,
			});
		} else {
			setSummary({
				totalRevenueRub: 0,
				totalRevenueKopecks: 0,
				invoicesCount: 0,
				totalInvoicedRub: 0,
				totalInvoicedKopecks: 0,
				averageCheckRub: 0,
				averageCheckKopecks: 0,
				paymentBreakdown: {
					cash: { method: "cash", label: "Наличные (Касса)", amountRub: 0, amountKopecks: 0, percent: 0, count: 0 },
					card: { method: "card", label: "Банковские карты", amountRub: 0, amountKopecks: 0, percent: 0, count: 0 },
					sbp: { method: "sbp", label: "Оплата по QR (СБП)", amountRub: 0, amountKopecks: 0, percent: 0, count: 0 },
					deposit: { method: "deposit", label: "Списание с авансов/депозитов", amountRub: 0, amountKopecks: 0, percent: 0, count: 0 },
				},
				isEmpty: true,
			});
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		fetchSummary(activePeriod);
	}, [activePeriod, fetchSummary]);

	const data = summary;

	return (
		<div className="space-y-6" data-testid="executive-financial-summary">
			{/* Единая компактная строка тулбара (32-36px) по закону Хика */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
				<div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar flex-nowrap">
					{(["day", "week", "month", "quarter", "year"] as const).map((p) => (
						<button
							key={p}
							type="button"
							onClick={() => handlePeriodSelect(p)}
							className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
								activePeriod === p
									? "bg-[var(--teal)] text-white font-semibold shadow-sm"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]"
							}`}
						>
							{PERIOD_LABELS[p]}
						</button>
					))}
				</div>

				<div className="flex items-center justify-end gap-2 shrink-0">
					<button
						type="button"
						onClick={() => fetchSummary(activePeriod)}
						disabled={loading}
						className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--teal)] transition-colors cursor-pointer"
						title="Обновить данные"
					>
						<RefreshCw size={14} className={loading ? "animate-spin" : ""} />
					</button>

					<button
						type="button"
						onClick={onPrint || (() => window.print())}
						className="secondary-button h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium hover:border-[var(--teal)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
					>
						<Receipt size={14} aria-hidden="true" />
						<span>Распечатать сводку</span>
					</button>
				</div>
			</div>

			{/* Главные показатели клиники (3 карточки без матрешки) */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
					<div className="flex items-center justify-between text-xs font-medium text-[var(--muted)] mb-1">
						<span>Выручка кассы</span>
						<DollarSign size={16} className="text-[var(--teal)]" />
					</div>
					<div className="text-2xl sm:text-3xl font-bold text-[var(--ink)] tracking-tight">
						{loading ? "..." : formatRub(data?.totalRevenueRub || 0)}
					</div>
					<div className="text-[11px] text-[var(--muted)] mt-1">
						Фактически поступило за {PERIOD_LABELS[activePeriod]?.toLowerCase() || "период"}
					</div>
				</div>

				<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
					<div className="flex items-center justify-between text-xs font-medium text-[var(--muted)] mb-1">
						<span>Оформлено нарядов</span>
						<FileText size={16} className="text-[var(--teal)]" />
					</div>
					<div className="text-2xl sm:text-3xl font-bold text-[var(--ink)] tracking-tight">
						{loading ? "..." : (data?.invoicesCount || 0).toLocaleString("ru-RU")}
					</div>
					<div className="text-[11px] text-[var(--muted)] mt-1">
						Всего выставлено на сумму {formatRub(data?.totalInvoicedRub || 0)}
					</div>
				</div>

				<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
					<div className="flex items-center justify-between text-xs font-medium text-[var(--muted)] mb-1">
						<span>Средний чек</span>
						<TrendingUp size={16} className="text-[var(--teal)]" />
					</div>
					<div className="text-2xl sm:text-3xl font-bold text-[var(--ink)] tracking-tight">
						{loading ? "..." : formatRub(data?.averageCheckRub || 0)}
					</div>
					<div className="text-[11px] text-[var(--muted)] mt-1">
						Выручка на один завершённый наряд
					</div>
				</div>
			</div>

			{/* Разбивка по способам оплат */}
			<div className="p-5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
						<Wallet size={16} className="text-[var(--teal)]" />
						<span>Разбивка оплат по способам расчёта</span>
					</h3>
					<span className="text-xs font-medium text-[var(--muted)]">
						Итого: {formatRub(data?.totalRevenueRub || 0)}
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					{/* Наличные */}
					<div className="p-3.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)] space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-medium text-[var(--ink)] flex items-center gap-1.5">
								<Receipt size={14} className="text-[var(--teal)]" />
								<span>Наличные (Касса)</span>
							</span>
							<span className="text-xs font-bold text-[var(--ink)]">
								{data?.paymentBreakdown.cash.percent || 0}%
							</span>
						</div>
						<div className="text-lg font-bold text-[var(--ink)]">
							{formatRub(data?.paymentBreakdown.cash.amountRub || 0)}
						</div>
						<div className="w-full bg-[var(--line)] h-1.5 rounded-full overflow-hidden">
							<div
								className="bg-[var(--teal)] h-full transition-all duration-300"
								style={{ width: `${Math.min(100, data?.paymentBreakdown.cash.percent || 0)}%` }}
							/>
						</div>
						<div className="text-[11px] text-[var(--muted)]">
							Чеков: {data?.paymentBreakdown.cash.count || 0}
						</div>
					</div>

					{/* Карты */}
					<div className="p-3.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)] space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-medium text-[var(--ink)] flex items-center gap-1.5">
								<CreditCard size={14} className="text-[var(--teal)]" />
								<span>Банковские карты</span>
							</span>
							<span className="text-xs font-bold text-[var(--ink)]">
								{data?.paymentBreakdown.card.percent || 0}%
							</span>
						</div>
						<div className="text-lg font-bold text-[var(--ink)]">
							{formatRub(data?.paymentBreakdown.card.amountRub || 0)}
						</div>
						<div className="w-full bg-[var(--line)] h-1.5 rounded-full overflow-hidden">
							<div
								className="bg-[var(--teal)] h-full transition-all duration-300"
								style={{ width: `${Math.min(100, data?.paymentBreakdown.card.percent || 0)}%` }}
							/>
						</div>
						<div className="text-[11px] text-[var(--muted)]">
							Операций: {data?.paymentBreakdown.card.count || 0}
						</div>
					</div>

					{/* СБП */}
					<div className="p-3.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)] space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-medium text-[var(--ink)] flex items-center gap-1.5">
								<QrCode size={14} className="text-[var(--teal)]" />
								<span>Оплата по QR (СБП)</span>
							</span>
							<span className="text-xs font-bold text-[var(--ink)]">
								{data?.paymentBreakdown.sbp.percent || 0}%
							</span>
						</div>
						<div className="text-lg font-bold text-[var(--ink)]">
							{formatRub(data?.paymentBreakdown.sbp.amountRub || 0)}
						</div>
						<div className="w-full bg-[var(--line)] h-1.5 rounded-full overflow-hidden">
							<div
								className="bg-[var(--teal)] h-full transition-all duration-300"
								style={{ width: `${Math.min(100, data?.paymentBreakdown.sbp.percent || 0)}%` }}
							/>
						</div>
						<div className="text-[11px] text-[var(--muted)]">
							Транзакций: {data?.paymentBreakdown.sbp.count || 0}
						</div>
					</div>

					{/* Авансы и депозиты */}
					<div className="p-3.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)] space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-medium text-[var(--ink)] flex items-center gap-1.5">
								<Wallet size={14} className="text-[var(--teal)]" />
								<span>Авансы и депозиты</span>
							</span>
							<span className="text-xs font-bold text-[var(--ink)]">
								{data?.paymentBreakdown.deposit.percent || 0}%
							</span>
						</div>
						<div className="text-lg font-bold text-[var(--ink)]">
							{formatRub(data?.paymentBreakdown.deposit.amountRub || 0)}
						</div>
						<div className="w-full bg-[var(--line)] h-1.5 rounded-full overflow-hidden">
							<div
								className="bg-[var(--teal)] h-full transition-all duration-300"
								style={{ width: `${Math.min(100, data?.paymentBreakdown.deposit.percent || 0)}%` }}
							/>
						</div>
						<div className="text-[11px] text-[var(--muted)]">
							Списаний: {data?.paymentBreakdown.deposit.count || 0}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
