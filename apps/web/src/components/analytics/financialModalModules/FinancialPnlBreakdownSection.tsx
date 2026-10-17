import React from "react";
import {
	Building2,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	DollarSign,
	Layers,
	PieChart,
	Receipt,
	TrendingUp,
} from "lucide-react";

export interface ExecutiveDepartmentData {
	departmentKey: string;
	departmentNameRu?: string;
	titleRu?: string;
	shortTitleRu?: string;
	planRevenueKopecks: number;
	factRevenueKopecks: number;
	planFulfillmentPercent: number;
	completedVisitsCount: number;
	uniquePatientsCount: number;
	averageBillKopecks?: number;
	averageCheckKopecks?: number;
	averageCheckRub?: number;
	averageCheckFormatted?: string;
	revenueSharePercent?: number;
	shareOfTotalRevenuePercent?: number;
}

export interface ExecutiveKpisData {
	totalRevenueKopecks: number;
	totalRevenuePlanKopecks: number;
	primaryRevenueKopecks?: number;
	repeatRevenueKopecks?: number;
	totalMarketingSpendKopecks: number;
	cacKopecks: number | null;
	totalCompletedVisits: number;
	activeDoctorsCount: number;
	chairOccupancyRatePercent: number;
	cogsKopecks?: number;
	opexKopecks?: number;
	netProfitKopecks?: number;
	netMarginPercent?: number;
}

export interface ExpenseReasonRecord {
	id: string;
	code: number;
	name: string;
	category: string;
	description?: string;
}

export interface ComputedPnlMetrics {
	totalRevenueRub: number;
	estimatedCogsRub: number;
	grossProfitRub: number;
	marketingSpendRub: number;
	estimatedPayrollRub: number;
	totalOpexRub: number;
	estimatedOverheadRub: number;
	ebitdaRub: number;
	netProfitRub: number;
	netMarginPercent: number;
}

export function computeFinancialPnlMetrics(
	executiveKpis: ExecutiveKpisData | null,
	realPnl: any | null,
): ComputedPnlMetrics {
	const totalRevenueRub =
		realPnl?.grossRevenueRub ?? Math.round((executiveKpis?.totalRevenueKopecks || 0) / 100);
	const estimatedCogsRub =
		realPnl?.totalCogsRub ?? Math.round((executiveKpis?.cogsKopecks || 0) / 100);
	const grossProfitRub = realPnl?.grossProfitRub ?? totalRevenueRub - estimatedCogsRub;
	const marketingSpendRub =
		realPnl?.statutoryExpenses?.find((e: any) => e.reasonId === 6)?.amountRub ??
		Math.round((executiveKpis?.totalMarketingSpendKopecks || 0) / 100);
	const estimatedPayrollRub = realPnl?.directDoctorPieceRateRub ?? 0;
	const totalOpexRub =
		realPnl?.totalOpexRub ?? Math.round((executiveKpis?.opexKopecks || 0) / 100);
	const estimatedOverheadRub = Math.max(0, totalOpexRub - marketingSpendRub);
	const ebitdaRub = realPnl?.ebitdaRub ?? grossProfitRub - totalOpexRub;
	const netProfitRub =
		realPnl?.netProfitRub ??
		(executiveKpis?.netProfitKopecks !== undefined
			? Math.round(executiveKpis.netProfitKopecks / 100)
			: ebitdaRub);
	const netMarginPercent =
		realPnl?.netMarginPct ??
		(executiveKpis?.netMarginPercent ??
			(totalRevenueRub > 0 ? Math.round((netProfitRub / totalRevenueRub) * 100) : 0));

	return {
		totalRevenueRub,
		estimatedCogsRub,
		grossProfitRub,
		marketingSpendRub,
		estimatedPayrollRub,
		totalOpexRub,
		estimatedOverheadRub,
		ebitdaRub,
		netProfitRub,
		netMarginPercent,
	};
}

export interface FinancialPnlKpiStripProps {
	readonly metrics: ComputedPnlMetrics;
	readonly executiveKpis: ExecutiveKpisData | null;
	readonly realPnl: any | null;
}

export const FinancialPnlKpiStrip: React.FC<FinancialPnlKpiStripProps> = ({
	metrics,
	executiveKpis,
	realPnl,
}) => {
	const {
		totalRevenueRub,
		estimatedCogsRub,
		grossProfitRub,
		totalOpexRub,
		marketingSpendRub,
		ebitdaRub,
		netProfitRub,
		netMarginPercent,
	} = metrics;

	return (
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
					<span>Себестоимость (COGS)</span>
					<Layers size={14} color="var(--muted)" />
				</div>
				<div className="fin-analytics-kpi-value">
					{estimatedCogsRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="fin-analytics-kpi-sub">
					{realPnl
						? `ЗТЛ: ${(realPnl.directLabCostRub || 0).toLocaleString("ru-RU")} ₽ • Мат: ${(realPnl.directMaterialsCostRub || 0).toLocaleString("ru-RU")} ₽`
						: "ЗТЛ, материалы и ФОТ"}
				</div>
			</div>

			{/* 3. Валовая прибыль */}
			<div className="fin-analytics-kpi-card" data-testid="kpi-gross-profit">
				<div className="fin-analytics-kpi-header">
					<span>Валовая прибыль</span>
					<TrendingUp size={14} color="var(--teal)" />
				</div>
				<div className="fin-analytics-kpi-value" style={{ color: "var(--teal)" }}>
					{grossProfitRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="fin-analytics-kpi-sub">
					{realPnl
						? `Маржинальность: ${realPnl.grossMarginPct}%`
						: `Маржа: ${totalRevenueRub > 0 ? Math.round((grossProfitRub / totalRevenueRub) * 100) : 0}%`}
				</div>
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
				<div className="fin-analytics-kpi-value" style={{ color: "var(--teal)" }}>
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
				<div className="fin-analytics-kpi-value" style={{ color: "var(--ok-fg)" }}>
					{netProfitRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="fin-analytics-kpi-sub">
					Рентабельность: <b>{netMarginPercent}%</b>
				</div>
			</div>
		</div>
	);
};

export interface FinancialDepartmentsSectionProps {
	readonly isDeptsExpanded: boolean;
	readonly onToggleDepts: () => void;
	readonly departments: ExecutiveDepartmentData[];
	readonly totalCompletedVisits: number;
}

export const FinancialDepartmentsSection: React.FC<FinancialDepartmentsSectionProps> = ({
	isDeptsExpanded,
	onToggleDepts,
	departments,
	totalCompletedVisits,
}) => {
	return (
		<section className="fin-analytics-panel" data-testid="panel-departments">
			<div className="fin-analytics-panel-header">
				<h3 className="fin-analytics-panel-title">
					<Building2 size={16} color="var(--teal)" />
					<span>План и факт выручки по 5 отделениям клиники</span>
				</h3>
				<button
					type="button"
					onClick={onToggleDepts}
					className="secondary-button fin-analytics-toggle-btn"
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
						5 направлений: Терапия • Ортопедия • Хирургия • Ортодонтия • Детство. Всего визитов:{" "}
						<strong>{totalCompletedVisits}</strong>.
					</span>
					<button
						type="button"
						onClick={onToggleDepts}
						className="secondary-button fin-analytics-toggle-btn"
						style={{ fontSize: 11, height: 26, minHeight: 26 }}
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
								departments.map((d) => {
									const deptTitle = d.titleRu || d.shortTitleRu || d.departmentNameRu || d.departmentKey;
									const avgBillStr =
										d.averageCheckFormatted ||
										`${Math.round((d.averageCheckRub ?? ((d.averageCheckKopecks ?? d.averageBillKopecks ?? 0) / 100))).toLocaleString("ru-RU")} ₽`;
									const sharePct = d.shareOfTotalRevenuePercent ?? d.revenueSharePercent ?? 0;

									return (
										<tr key={d.departmentKey}>
											<td style={{ fontWeight: 600 }}>{deptTitle}</td>
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
												{avgBillStr}
											</td>
											<td style={{ textAlign: "center", fontWeight: 600 }}>
												{sharePct}%
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
};

export interface FinancialExpensesSectionProps {
	readonly isExpensesExpanded: boolean;
	readonly onToggleExpenses: () => void;
	readonly expenseReasons: ExpenseReasonRecord[];
	readonly realPnl: any | null;
	readonly totalOpexRub: number;
}

export const FinancialExpensesSection: React.FC<FinancialExpensesSectionProps> = ({
	isExpensesExpanded,
	onToggleExpenses,
	expenseReasons,
	realPnl,
	totalOpexRub,
}) => {
	const resolvedExpenses: ExpenseReasonRecord[] =
		expenseReasons.length > 0
			? expenseReasons
			: (realPnl?.statutoryExpenses || []).map((se: any) => ({
					id: String(se.reasonId),
					code: se.reasonId,
					name: se.titleRu,
					category:
						se.costNature === "direct_cogs"
							? "Прямые (COGS)"
							: se.costNature === "taxes"
								? "Налоги"
								: "Операционные (OPEX)",
					description: "Регламентированная статья управленческого учета P&L",
				}));

	return (
		<section className="fin-analytics-panel" data-testid="panel-expenses">
			<div className="fin-analytics-panel-header">
				<h3 className="fin-analytics-panel-title">
					<Receipt size={16} color="var(--warn-fg)" />
					<span>12 регламентированных статей расходов клиники</span>
				</h3>
				<button
					type="button"
					onClick={onToggleExpenses}
					className="secondary-button fin-analytics-toggle-btn"
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
						12 нормативных статей: ЗТЛ ({(realPnl?.directLabCostRub || 0).toLocaleString("ru-RU")} ₽) • Материалы (
						{(realPnl?.directMaterialsCostRub || 0).toLocaleString("ru-RU")} ₽) • ФОТ (
						{(realPnl?.directDoctorPieceRateRub || 0).toLocaleString("ru-RU")} ₽) • OPEX (
						{totalOpexRub.toLocaleString("ru-RU")} ₽)
					</span>
					<button
						type="button"
						onClick={onToggleExpenses}
						className="secondary-button fin-analytics-toggle-btn"
						style={{ fontSize: 11, height: 26, minHeight: 26 }}
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
								<th style={{ textAlign: "right" }}>Факт за период (₽)</th>
								<th>Назначение</th>
							</tr>
						</thead>
						<tbody>
							{resolvedExpenses.length === 0 ? (
								<tr>
									<td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 16 }}>
										Классификатор расходов загружается...
									</td>
								</tr>
							) : (
								resolvedExpenses.map((exp) => {
									const statMatch = realPnl?.statutoryExpenses?.find(
										(s: any) => Number(s.reasonId) === Number(exp.code),
									);
									const amountRub = Number(statMatch?.amountRub || 0);
									return (
										<tr key={exp.id || exp.code}>
											<td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--teal)" }}>
												#{exp.code}
											</td>
											<td style={{ fontWeight: 600 }}>{exp.name}</td>
											<td>
												<span
													style={{
														fontSize: 11,
														padding: "2px 6px",
														borderRadius: 4,
														background: "color-mix(in srgb, var(--teal) 12%, transparent)",
														color: "var(--teal)",
													}}
												>
													{exp.category || "Операционные"}
												</span>
											</td>
											<td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
												{amountRub.toLocaleString("ru-RU")} ₽
											</td>
											<td style={{ color: "var(--muted)" }}>
												{exp.description || "Регламентированная статья кассового расхода"}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
};
