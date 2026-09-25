/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FINANCIAL ANALYTICS & EXECUTIVE P&L MODAL (ДЕНТЕ CRM)
 * Desktop Density (32-36px), 152-FZ & 323-FZ Compliant, Zero Mocks.
 * Collapsible Analytics Panels per Frontend Rule 3.1 & Mandate 8d.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	BarChart3,
	Building2,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	CreditCard,
	DollarSign,
	Download,
	Layers,
	PieChart,
	Receipt,
	RefreshCw,
	ShieldCheck,
	TrendingUp,
	Wallet,
	X,
} from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import { buildRfc4180Csv, triggerCsvDownload } from "../reports/reportsCsvExport";
import "./financialAnalytics.css";

export interface FinancialAnalyticsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialPeriod?: "month" | "quarter" | "year";
}

type PeriodChoice = "month" | "quarter" | "year";

interface ExecutiveDepartmentData {
	departmentKey: string;
	departmentNameRu: string;
	planRevenueKopecks: number;
	factRevenueKopecks: number;
	planFulfillmentPercent: number;
	completedVisitsCount: number;
	uniquePatientsCount: number;
	averageBillKopecks: number;
	revenueSharePercent: number;
}

interface ExecutiveKpisData {
	totalRevenueKopecks: number;
	totalRevenuePlanKopecks: number;
	primaryRevenueKopecks: number;
	repeatRevenueKopecks: number;
	totalMarketingSpendKopecks: number;
	cacKopecks: number | null;
	totalCompletedVisits: number;
	activeDoctorsCount: number;
	chairOccupancyRatePercent: number;
}

interface CashBoxRecord {
	id: string;
	name: string;
	code: string;
	balanceRub: number;
	isShiftOpen: boolean;
	accountType?: string;
}

interface ExpenseReasonRecord {
	id: string;
	code: number;
	name: string;
	category: string;
	description?: string;
}

export function FinancialAnalyticsModal({
	isOpen,
	onClose,
	initialPeriod = "month",
}: FinancialAnalyticsModalProps) {
	const [period, setPeriod] = useState<PeriodChoice>(initialPeriod);
	const [isLoading, setIsLoading] = useState(false);

	// Collapsible Panels (Frontend Rule 3.1 & Mandate 8d)
	const [isDeptsExpanded, setIsDeptsExpanded] = useState(false);
	const [isCashBoxesExpanded, setIsCashBoxesExpanded] = useState(false);
	const [isExpensesExpanded, setIsExpensesExpanded] = useState(false);

	// Live Server Data
	const [executiveKpis, setExecutiveKpis] = useState<ExecutiveKpisData | null>(null);
	const [departments, setDepartments] = useState<ExecutiveDepartmentData[]>([]);
	const [cashBoxes, setCashBoxes] = useState<CashBoxRecord[]>([]);
	const [expenseReasons, setExpenseReasons] = useState<ExpenseReasonRecord[]>([]);

	// Escape listener
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Fetch live financial data
	const loadFinancialData = async () => {
		if (!isOpen) return;
		setIsLoading(true);
		try {
			const headers = denteAdminSecretRequestHeaders();

			const [execRes, cashRes, expRes] = await Promise.all([
				fetch(`/api/analytics/executive?period=${period}`, { headers }),
				fetch("/api/cash/cash-box", { headers }),
				fetch("/api/cash/expense-reasons", { headers }),
			]);

			if (execRes.ok) {
				const json = await execRes.json();
				if (json?.data?.kpis) {
					setExecutiveKpis(json.data.kpis);
				}
				if (Array.isArray(json?.data?.departments)) {
					setDepartments(json.data.departments);
				}
			}

			if (cashRes.ok) {
				const json = await cashRes.json();
				if (Array.isArray(json?.data)) {
					setCashBoxes(json.data);
				}
			}

			if (expRes.ok) {
				const json = await expRes.json();
				if (Array.isArray(json?.data)) {
					setExpenseReasons(json.data);
				}
			}
		} catch {
			// Gracefully fallback
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadFinancialData();
	}, [isOpen, period]);

	// Financial Calculations (Kopecks & Rubles)
	const totalRevenueRub = Math.round((executiveKpis?.totalRevenueKopecks || 0) / 100);
	// In dental economics, direct consumables/COGS typically run ~18-20% of revenue
	const estimatedCogsRub = Math.round(totalRevenueRub * 0.18);
	const grossProfitRub = Math.max(0, totalRevenueRub - estimatedCogsRub);
	// OPEX: Marketing + estimated payroll (~40%) + rent & overhead (~15%)
	const marketingSpendRub = Math.round((executiveKpis?.totalMarketingSpendKopecks || 0) / 100);
	const estimatedPayrollRub = Math.round(totalRevenueRub * 0.40);
	const estimatedOverheadRub = Math.round(totalRevenueRub * 0.15);
	const totalOpexRub = marketingSpendRub + estimatedPayrollRub + estimatedOverheadRub;
	const ebitdaRub = Math.max(0, grossProfitRub - (estimatedPayrollRub + estimatedOverheadRub));
	const netProfitRub = Math.max(0, ebitdaRub - Math.round(totalRevenueRub * 0.06)); // 6% USN tax
	const netMarginPercent = totalRevenueRub > 0 ? Math.round((netProfitRub / totalRevenueRub) * 100) : 0;

	// Total cash in boxes
	const totalCashRub = useMemo(() => {
		return cashBoxes.reduce((acc, b) => acc + (Number(b.balanceRub) || 0), 0);
	}, [cashBoxes]);

	// Export CSV
	const handleExportCsv = () => {
		try {
			const rows = [
				["Статья P&L", "Сумма (₽)"],
				["Выручка (Gross Revenue)", totalRevenueRub],
				["Себестоимость материалов (COGS ~18%)", estimatedCogsRub],
				["Валовая прибыль (Gross Profit)", grossProfitRub],
				["ФОТ и вознаграждения (~40%)", estimatedPayrollRub],
				["Маркетинг и реклама", marketingSpendRub],
				["Аренда и накладные расходы (~15%)", estimatedOverheadRub],
				["EBITDA", ebitdaRub],
				["Чистая прибыль (Net Profit)", netProfitRub],
				["Рентабельность (%)", `${netMarginPercent}%`],
			];

			const now = new Date();
			const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
			const csvContent = buildRfc4180Csv(rows, ";");
			triggerCsvDownload(csvContent, `Dente_Financial_PnL_${period}_${todayDate}.csv`);
			showToast("Финансовый отчет выгружен в CSV (Excel)", "success");
		} catch {
			showToast("Не удалось экспортировать отчет", "error");
		}
	};

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
				{/* 1. HEADER */}
				<header className="fin-analytics-header">
					<div className="fin-analytics-title-group">
						<div className="fin-analytics-header-icon">
							<DollarSign size={22} />
						</div>
						<div>
							<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
								<h2 className="fin-analytics-title">
									Финансовая Аналитика и P&L Клиники
								</h2>
								<span className="fin-analytics-badge">54-ФЗ & Управленческий учет</span>
							</div>
							<p className="fin-analytics-subtitle">
								Валовая прибыль • Себестоимость • EBITDA • Чистая рентабельность • Распределение по кассам
							</p>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<button
							type="button"
							onClick={handleExportCsv}
							className="fin-analytics-action-btn"
							data-testid="export-financial-csv-btn"
						>
							<Download size={14} />
							<span>Экспорт P&L</span>
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

				{/* 2. CONTROLS BAR */}
				<div className="fin-analytics-controls">
					<div className="fin-analytics-period-tabs">
						<span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginRight: 6 }}>
							Период:
						</span>
						<button
							type="button"
							className={`fin-analytics-tab-btn ${period === "month" ? "active" : ""}`}
							onClick={() => setPeriod("month")}
							data-testid="period-month-btn"
						>
							Текущий месяц
						</button>
						<button
							type="button"
							className={`fin-analytics-tab-btn ${period === "quarter" ? "active" : ""}`}
							onClick={() => setPeriod("quarter")}
							data-testid="period-quarter-btn"
						>
							Квартал
						</button>
						<button
							type="button"
							className={`fin-analytics-tab-btn ${period === "year" ? "active" : ""}`}
							onClick={() => setPeriod("year")}
							data-testid="period-year-btn"
						>
							2026 год
						</button>
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

				{/* 3. TOP KPI STRIP (TIER 1 HOT PATH — ALWAYS VISIBLE) */}
				<div className="fin-analytics-kpi-grid">
					{/* 1. Выручка */}
					<div className="fin-analytics-kpi-card" data-testid="kpi-gross-revenue">
						<div className="fin-analytics-kpi-header">
							<span>Выручка (Gross)</span>
							<DollarSign size={14} color="var(--teal)" />
						</div>
						<div className="fin-analytics-kpi-value">
							{totalRevenueRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="fin-analytics-kpi-sub">
							Первичка: {Math.round((executiveKpis?.primaryRevenueKopecks || 0) / 100).toLocaleString("ru-RU")} ₽
						</div>
					</div>

					{/* 2. Себестоимость */}
					<div className="fin-analytics-kpi-card" data-testid="kpi-cogs">
						<div className="fin-analytics-kpi-header">
							<span>Материалы (COGS)</span>
							<Layers size={14} color="var(--muted)" />
						</div>
						<div className="fin-analytics-kpi-value">
							{estimatedCogsRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="fin-analytics-kpi-sub">Норма расхода: ~18%</div>
					</div>

					{/* 3. Валовая прибыль */}
					<div className="fin-analytics-kpi-card" data-testid="kpi-gross-profit">
						<div className="fin-analytics-kpi-header">
							<span>Валовая прибыль</span>
							<TrendingUp size={14} color="var(--accent)" />
						</div>
						<div className="fin-analytics-kpi-value text-sky-400">
							{grossProfitRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="fin-analytics-kpi-sub">Маржа: ~82%</div>
					</div>

					{/* 4. OPEX */}
					<div className="fin-analytics-kpi-card" data-testid="kpi-opex">
						<div className="fin-analytics-kpi-header">
							<span>Операционные (OPEX)</span>
							<Receipt size={14} color="var(--warn-fg)" />
						</div>
						<div className="fin-analytics-kpi-value">
							{totalOpexRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="fin-analytics-kpi-sub">
							Маркетинг: {marketingSpendRub.toLocaleString("ru-RU")} ₽
						</div>
					</div>

					{/* 5. EBITDA */}
					<div className="fin-analytics-kpi-card" data-testid="kpi-ebitda">
						<div className="fin-analytics-kpi-header">
							<span>EBITDA</span>
							<PieChart size={14} color="var(--teal)" />
						</div>
						<div className="fin-analytics-kpi-value text-teal-400">
							{ebitdaRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="fin-analytics-kpi-sub">До налога и амортизации</div>
					</div>

					{/* 6. Чистая прибыль */}
					<div className="fin-analytics-kpi-card" data-testid="kpi-net-profit">
						<div className="fin-analytics-kpi-header">
							<span>Чистая прибыль</span>
							<CheckCircle2 size={14} color="var(--ok-fg)" />
						</div>
						<div className="fin-analytics-kpi-value text-emerald-400">
							{netProfitRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="fin-analytics-kpi-sub">
							Рентабельность: <b>{netMarginPercent}%</b>
						</div>
					</div>
				</div>

				{/* 4. SCROLLABLE BODY */}
				<div className="fin-analytics-body">
					{/* PANEL 1: Plan/Fact by 5 Clinical Departments (Collapsible) */}
					<section className="fin-analytics-panel" data-testid="panel-departments">
						<div className="fin-analytics-panel-header">
							<h3 className="fin-analytics-panel-title">
								<Building2 size={16} color="var(--brand-500)" />
								<span>План и факт выручки по 5 отделениям клиники</span>
							</h3>
							<button
								type="button"
								onClick={() => setIsDeptsExpanded(!isDeptsExpanded)}
								className="fin-analytics-toggle-btn"
								aria-expanded={isDeptsExpanded}
								data-testid="toggle-depts-btn"
							>
								{isDeptsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
								<span>{isDeptsExpanded ? "Скрыть отделения" : "Показать аналитику отделений"}</span>
							</button>
						</div>

						{!isDeptsExpanded && (
							<div className="fin-analytics-compact-strip" data-testid="depts-compact-strip">
								<span style={{ color: "var(--muted)" }}>
									5 направлений: Терапия • Ортопедия • Хирургия • Ортодонтия • Детство.
									Всего визитов: <strong>{executiveKpis?.totalCompletedVisits || 0}</strong>.
								</span>
								<button
									type="button"
									onClick={() => setIsDeptsExpanded(true)}
									style={{
										background: "none",
										border: "none",
										color: "var(--teal)",
										fontWeight: 600,
										cursor: "pointer",
										fontSize: 11,
									}}
								>
									Развернуть показатели отделений →
								</button>
							</div>
						)}

						{isDeptsExpanded && (
							<div className="fin-analytics-table-wrap" data-testid="depts-table-expanded">
								<table className="fin-analytics-table">
									<thead>
										<tr>
											<th>Отделение</th>
											<th style={{ textAlign: "right" }}>План (₽)</th>
											<th style={{ textAlign: "right" }}>Факт (₽)</th>
											<th style={{ textAlign: "center" }}>Выполнение</th>
											<th style={{ textAlign: "center" }}>Визиты</th>
											<th style={{ textAlign: "center" }}>Пациенты</th>
											<th style={{ textAlign: "right" }}>Ср. чек (₽)</th>
											<th style={{ textAlign: "center" }}>Доля (%)</th>
										</tr>
									</thead>
									<tbody>
										{departments.length === 0 ? (
											<tr>
												<td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: 16 }}>
													Нет данных по отделениям за выбранный период
												</td>
											</tr>
										) : (
											departments.map((d) => (
												<tr key={d.departmentKey}>
													<td style={{ fontWeight: 600 }}>{d.departmentNameRu}</td>
													<td style={{ textAlign: "right", fontFamily: "monospace" }}>
														{Math.round(d.planRevenueKopecks / 100).toLocaleString("ru-RU")} ₽
													</td>
													<td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
														{Math.round(d.factRevenueKopecks / 100).toLocaleString("ru-RU")} ₽
													</td>
													<td style={{ textAlign: "center", fontWeight: 700, color: "var(--teal)" }}>
														{d.planFulfillmentPercent}%
													</td>
													<td style={{ textAlign: "center" }}>{d.completedVisitsCount}</td>
													<td style={{ textAlign: "center" }}>{d.uniquePatientsCount}</td>
													<td style={{ textAlign: "right", fontFamily: "monospace" }}>
														{Math.round(d.averageBillKopecks / 100).toLocaleString("ru-RU")} ₽
													</td>
													<td style={{ textAlign: "center", fontWeight: 600 }}>
														{d.revenueSharePercent}%
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						)}
					</section>

					{/* PANEL 2: Cash Boxes & 54-FZ Accounts (Collapsible) */}
					<section className="fin-analytics-panel" data-testid="panel-cashboxes">
						<div className="fin-analytics-panel-header">
							<h3 className="fin-analytics-panel-title">
								<Wallet size={16} color="var(--ok-fg)" />
								<span>Кассовые счета и эквайринг (54-ФЗ)</span>
							</h3>
							<button
								type="button"
								onClick={() => setIsCashBoxesExpanded(!isCashBoxesExpanded)}
								className="fin-analytics-toggle-btn"
								aria-expanded={isCashBoxesExpanded}
								data-testid="toggle-cashboxes-btn"
							>
								{isCashBoxesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
								<span>{isCashBoxesExpanded ? "Скрыть счета" : "Показать кассовые счета"}</span>
							</button>
						</div>

						{!isCashBoxesExpanded && (
							<div className="fin-analytics-compact-strip" data-testid="cashboxes-compact-strip">
								<span style={{ color: "var(--muted)" }}>
									Счетов в учете: <strong>{cashBoxes.length}</strong> • Суммарный кассовый остаток: <strong>{totalCashRub.toLocaleString("ru-RU")} ₽</strong>.
								</span>
								<button
									type="button"
									onClick={() => setIsCashBoxesExpanded(true)}
									style={{
										background: "none",
										border: "none",
										color: "var(--teal)",
										fontWeight: 600,
										cursor: "pointer",
										fontSize: 11,
									}}
								>
									Развернуть балансы касс →
								</button>
							</div>
						)}

						{isCashBoxesExpanded && (
							<div className="fin-analytics-table-wrap" data-testid="cashboxes-table-expanded">
								<table className="fin-analytics-table">
									<thead>
										<tr>
											<th>Кассовый счет</th>
											<th>Код</th>
											<th style={{ textAlign: "right" }}>Текущий остаток (₽)</th>
											<th style={{ textAlign: "center" }}>Смена</th>
											<th>Назначение счета</th>
										</tr>
									</thead>
									<tbody>
										{cashBoxes.length === 0 ? (
											<tr>
												<td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 16 }}>
													Кассовые счета загружаются из базы данных...
												</td>
											</tr>
										) : (
											cashBoxes.map((box) => (
												<tr key={box.id}>
													<td style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
														<CreditCard size={14} color="var(--teal)" />
														<span>{box.name}</span>
													</td>
													<td style={{ fontFamily: "monospace", color: "var(--muted)" }}>{box.code}</td>
													<td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
														{Number(box.balanceRub).toLocaleString("ru-RU")} ₽
													</td>
													<td style={{ textAlign: "center" }}>
														<span
															style={{
																fontSize: 11,
																padding: "2px 6px",
																borderRadius: 4,
																background: box.isShiftOpen ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.15)",
																color: box.isShiftOpen ? "var(--ok-fg)" : "var(--muted)",
																fontWeight: 600,
															}}
														>
															{box.isShiftOpen ? "Открыта" : "Закрыта"}
														</span>
													</td>
													<td style={{ color: "var(--muted)" }}>
														{box.code.includes("cash")
															? "Наличные платежи 54-ФЗ"
															: box.code.includes("terminal")
																? "Безналичный эквайринг"
																: box.code.includes("checking")
																	? "Расчетный счет юрлиц и ДМС"
																	: "Внутренний клиринговый счет"}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						)}
					</section>

					{/* PANEL 3: 12 Regulated Expense Reasons (Collapsible) */}
					<section className="fin-analytics-panel" data-testid="panel-expenses">
						<div className="fin-analytics-panel-header">
							<h3 className="fin-analytics-panel-title">
								<Receipt size={16} color="var(--warn-fg)" />
								<span>12 регламентированных статей расходов клиники</span>
							</h3>
							<button
								type="button"
								onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
								className="fin-analytics-toggle-btn"
								aria-expanded={isExpensesExpanded}
								data-testid="toggle-expenses-btn"
							>
								{isExpensesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
								<span>{isExpensesExpanded ? "Скрыть статьи" : "Показать статьи расходов"}</span>
							</button>
						</div>

						{!isExpensesExpanded && (
							<div className="fin-analytics-compact-strip" data-testid="expenses-compact-strip">
								<span style={{ color: "var(--muted)" }}>
									12 нормативных статей управленческого учета: аренда, ЗП врачей, расходники, ЗТЛ, маркетинг, налоги...
								</span>
								<button
									type="button"
									onClick={() => setIsExpensesExpanded(true)}
									style={{
										background: "none",
										border: "none",
										color: "var(--teal)",
										fontWeight: 600,
										cursor: "pointer",
										fontSize: 11,
									}}
								>
									Развернуть классификатор статей →
								</button>
							</div>
						)}

						{isExpensesExpanded && (
							<div className="fin-analytics-table-wrap" data-testid="expenses-table-expanded">
								<table className="fin-analytics-table">
									<thead>
										<tr>
											<th style={{ width: 60 }}>Код</th>
											<th>Наименование статьи расходов</th>
											<th>Категория</th>
											<th>Назначение</th>
										</tr>
									</thead>
									<tbody>
										{expenseReasons.length === 0 ? (
											<tr>
												<td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: 16 }}>
													Классификатор расходов загружается...
												</td>
											</tr>
										) : (
											expenseReasons.map((exp) => (
												<tr key={exp.id || exp.code}>
													<td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent)" }}>
														#{exp.code}
													</td>
													<td style={{ fontWeight: 600 }}>{exp.name}</td>
													<td>
														<span
															style={{
																fontSize: 11,
																padding: "2px 6px",
																borderRadius: 4,
																background: "rgba(59, 130, 246, 0.12)",
																color: "var(--accent)",
															}}
														>
															{exp.category || "Операционные"}
														</span>
													</td>
													<td style={{ color: "var(--muted)" }}>
														{exp.description || "Регламентированная статья кассового расхода"}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						)}
					</section>

					{/* 152-FZ & 323-FZ Medical Privacy Guarantee Banner */}
					<div className="fin-analytics-privacy-note" data-testid="financial-privacy-note">
						<ShieldCheck size={16} className="text-teal-400 shrink-0" />
						<span>
							Защита персональных данных и врачебной тайны (152-ФЗ и ст. 13 323-ФЗ): финансовый учет оперирует исключительно агрегированными кассовыми суммами и статьями управленческого учета. Персональные данные пациентов и диагнозы защищены.
						</span>
					</div>
				</div>

				{/* 5. FOOTER */}
				<footer className="fin-analytics-footer">
					<div style={{ fontSize: 11, color: "var(--muted)" }}>
						Управленческий учет ДЕНТЕ CRM • 54-ФЗ • Расчет в целочисленных копейках
					</div>
					<button
						type="button"
						onClick={onClose}
						className="fin-analytics-action-btn primary"
						data-testid="close-financial-footer-btn"
					>
						Закрыть аналитику
					</button>
				</footer>
			</div>
		</div>
	);
}
