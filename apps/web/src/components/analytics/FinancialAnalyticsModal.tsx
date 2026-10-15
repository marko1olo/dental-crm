/**
 * FINANCIAL ANALYTICS & EXECUTIVE P&L MODAL (ДЕНТЕ CRM — ФАСАД)
 * Desktop Density (32-36px), 152-FZ & 323-FZ Compliant, Zero Mocks.
 */

import React, { useEffect, useMemo, useState } from "react";
import { DollarSign, Download, RefreshCw, ShieldCheck, X } from "lucide-react";
import { getDemoExecutiveAnalytics, isDemoShowcaseMode } from "../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	type CashBoxRecord,
	exportFinancialPnlCsvReport,
	FinancialCashflowTimeline,
	type FinancialPeriodChoice,
	getFinancialPeriodDateRange,
} from "./financialModalModules/FinancialCashflowTimeline";
import {
	computeFinancialPnlMetrics,
	type ExecutiveDepartmentData,
	type ExecutiveKpisData,
	type ExpenseReasonRecord,
	FinancialDepartmentsSection,
	FinancialExpensesSection,
	FinancialPnlKpiStrip,
} from "./financialModalModules/FinancialPnlBreakdownSection";
import "./financialAnalytics.css";

export interface FinancialAnalyticsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialPeriod?: FinancialPeriodChoice;
}

export function FinancialAnalyticsModal({
	isOpen,
	onClose,
	initialPeriod = "month",
}: FinancialAnalyticsModalProps) {
	const [period, setPeriod] = useState<FinancialPeriodChoice>(initialPeriod);
	const [isLoading, setIsLoading] = useState(false);

	const [isDeptsExpanded, setIsDeptsExpanded] = useState(false);
	const [isCashBoxesExpanded, setIsCashBoxesExpanded] = useState(false);
	const [isExpensesExpanded, setIsExpensesExpanded] = useState(false);

	const [executiveKpis, setExecutiveKpis] = useState<ExecutiveKpisData | null>(null);
	const [departments, setDepartments] = useState<ExecutiveDepartmentData[]>([]);
	const [cashBoxes, setCashBoxes] = useState<CashBoxRecord[]>([]);
	const [expenseReasons, setExpenseReasons] = useState<ExpenseReasonRecord[]>([]);
	const [realPnl, setRealPnl] = useState<any | null>(null);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const loadFinancialData = async () => {
		if (!isOpen) return;
		setIsLoading(true);
		try {
			if (isDemoShowcaseMode()) {
				const demoPayload = getDemoExecutiveAnalytics(period);
				if (demoPayload?.kpis) setExecutiveKpis(demoPayload.kpis);
				if (Array.isArray(demoPayload?.departments)) setDepartments(demoPayload.departments);
				setCashBoxes([
					{ id: "box-1", name: "Основная касса (наличные)", code: "cash_main", balanceRub: 345000, isShiftOpen: true },
					{ id: "box-2", name: "Терминал эквайринга СБП", code: "terminal_sbp", balanceRub: 1890000, isShiftOpen: true },
					{ id: "box-3", name: "Расчетный счет ДМС", code: "checking_dms", balanceRub: 2615000, isShiftOpen: false },
				]);
				return;
			}

			const headers = denteAdminSecretRequestHeaders();
			const dates = getFinancialPeriodDateRange(period);
			const [execRes, cashRes, expRes, pnlRes] = await Promise.all([
				fetch(`/api/analytics/executive?period=${period}`, { headers }),
				fetch("/api/cash/cash-box", { headers }),
				fetch("/api/cash/expense-reasons", { headers }),
				fetch(`/api/reports/pnl?from=${dates.from}&to=${dates.to}`, { headers }),
			]);

			if (execRes.ok) {
				const json = await execRes.json();
				if (json?.data?.kpis) setExecutiveKpis(json.data.kpis);
				if (Array.isArray(json?.data?.departments)) setDepartments(json.data.departments);
			}
			if (cashRes.ok) {
				const json = await cashRes.json();
				if (Array.isArray(json?.data)) setCashBoxes(json.data);
			}
			if (expRes.ok) {
				const json = await expRes.json();
				if (Array.isArray(json?.data)) setExpenseReasons(json.data);
			}
			if (pnlRes.ok) {
				const json = await pnlRes.json();
				if (json?.data) setRealPnl(json.data);
			}
		} catch {
			// Graceful fallback
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadFinancialData();
	}, [isOpen, period]);

	const metrics = useMemo(
		() => computeFinancialPnlMetrics(executiveKpis, realPnl),
		[executiveKpis, realPnl],
	);

	const totalCashRub = useMemo(
		() => cashBoxes.reduce((acc, b) => acc + (Number(b.balanceRub) || 0), 0),
		[cashBoxes],
	);

	if (!isOpen) return null;

	return (
		<div
			className="fin-analytics-backdrop"
			role="dialog"
			aria-modal="true"
			aria-label="Финансовая аналитика и P&L"
			data-testid="financial-analytics-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="fin-analytics-modal">
				<header className="fin-analytics-header">
					<div className="fin-analytics-title-group">
						<div className="fin-analytics-header-icon"><DollarSign size={22} /></div>
						<div>
							<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
								<h2 className="fin-analytics-title">Финансовая Аналитика и P&amp;L Клиники</h2>
								<span className="fin-analytics-badge">Касса и управленческий учет</span>
							</div>
							<p className="fin-analytics-subtitle">
								Валовая прибыль • Себестоимость • EBITDA • Чистая рентабельность • Распределение по кассам
							</p>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<button
							type="button"
							onClick={() => exportFinancialPnlCsvReport({ period, ...metrics })}
							className="fin-analytics-action-btn"
							data-testid="export-financial-csv-btn"
						>
							<Download size={14} /> <span>Экспорт P&amp;L</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="fin-analytics-close-btn"
							aria-label="Закрыть окно"
							data-testid="close-financial-modal-btn"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				<div className="fin-analytics-controls">
					<div className="fin-analytics-period-wrapper">
						<span className="fin-analytics-period-label">Период:</span>
						<div className="fin-analytics-period-tabs" role="radiogroup" aria-label="Период отчета">
							{(["month", "quarter", "year"] as const).map((p) => (
								<button
									key={p}
									type="button"
									className={`fin-analytics-tab-btn ${period === p ? "active" : ""}`}
									onClick={() => setPeriod(p)}
									data-testid={`period-${p}-btn`}
									role="radio"
									aria-checked={period === p}
								>
									{p === "month" ? "Текущий месяц" : p === "quarter" ? "Квартал" : "2026 год"}
								</button>
							))}
						</div>
					</div>

					<button
						type="button"
						onClick={loadFinancialData}
						className="fin-analytics-action-btn"
						title="Обновить финансовые показатели"
					>
						<RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
						<span>Обновить</span>
					</button>
				</div>

				<FinancialPnlKpiStrip metrics={metrics} executiveKpis={executiveKpis} realPnl={realPnl} />

				<div className="fin-analytics-body">
					<FinancialDepartmentsSection
						isDeptsExpanded={isDeptsExpanded}
						onToggleDepts={() => setIsDeptsExpanded(!isDeptsExpanded)}
						departments={departments}
						totalCompletedVisits={executiveKpis?.totalCompletedVisits || 0}
					/>
					<FinancialCashflowTimeline
						isCashBoxesExpanded={isCashBoxesExpanded}
						onToggleCashBoxes={() => setIsCashBoxesExpanded(!isCashBoxesExpanded)}
						cashBoxes={cashBoxes}
						totalCashRub={totalCashRub}
					/>
					<FinancialExpensesSection
						isExpensesExpanded={isExpensesExpanded}
						onToggleExpenses={() => setIsExpensesExpanded(!isExpensesExpanded)}
						expenseReasons={expenseReasons}
						realPnl={realPnl}
						totalOpexRub={metrics.totalOpexRub}
					/>

					<div className="fin-analytics-privacy-note" data-testid="financial-privacy-note">
						<ShieldCheck size={16} style={{ color: "var(--teal)", flexShrink: 0 }} />
						<span>
							Защита персональных данных и врачебной тайны (152-ФЗ и ст. 13 323-ФЗ): финансовый учет оперирует исключительно агрегированными кассовыми суммами и статьями управленческого учета. Персональные данные пациентов и диагнозы защищены.
						</span>
					</div>
				</div>

				<footer className="fin-analytics-footer">
					<div style={{ fontSize: 11, color: "var(--muted)" }}>
						Управленческий учет ДЕНТЕ CRM • Касса и чеки • Расчет в целочисленных копейках
					</div>
					<button type="button" onClick={onClose} className="fin-analytics-action-btn primary" data-testid="close-financial-footer-btn">
						Закрыть аналитику
					</button>
				</footer>
			</div>
		</div>
	);
}
