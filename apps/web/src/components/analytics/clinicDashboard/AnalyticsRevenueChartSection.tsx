/**
 * apps/web/src/components/analytics/clinicDashboard/AnalyticsRevenueChartSection.tsx
 *
 * Секция финансовых потоков, способов оплаты и управленческого P&L (Layer 4).
 * Включает структуру платежей (эквайринг, нал, СБП), расчет P&L клиники
 * (выручка, COGS, ФОТ, накладные, EBITDA, чистая прибыль) и динамику среднего чека.
 */

import React from "react";
import { CreditCard, FileSpreadsheet, TrendingUp, Wallet } from "lucide-react";
import {
	type FinancialAnalyticsSummary,
	formatMoneyKopecks,
} from "../financialAnalyticsEngine.js";

export interface AnalyticsRevenueChartSectionProps {
	readonly financialSummary: FinancialAnalyticsSummary;
	readonly periodLabel?: string | undefined;
}

export const AnalyticsRevenueChartSection: React.FC<AnalyticsRevenueChartSectionProps> = ({
	financialSummary,
	periodLabel,
}) => {
	const { paymentMethods, pnl, averageCheckKopecks, netRevenueKopecks } = financialSummary;

	// Расчет долей расходов для визуальной гистограммы структуры выручки
	const cogsPercent = pnl.grossRevenueKopecks > 0 ? Math.round((pnl.cogsKopecks / pnl.grossRevenueKopecks) * 100) : 18;
	const payrollPercent = pnl.grossRevenueKopecks > 0 ? Math.round((pnl.payrollKopecks / pnl.grossRevenueKopecks) * 100) : 40;
	const overheadPercent = pnl.grossRevenueKopecks > 0 ? Math.round((pnl.overheadKopecks / pnl.grossRevenueKopecks) * 100) : 15;
	const profitPercent = Math.max(0, 100 - cogsPercent - payrollPercent - overheadPercent);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
			{/* График и динамика структуры выручки клиники */}
			<section className="cad-panel" aria-label="Динамика структуры выручки">
				<div className="cad-panel-title-row">
					<h3 className="cad-panel-title">
						<TrendingUp size={16} style={{ color: "var(--teal, #0d9488)" }} />
						<span>Динамика выручки и среднего чека {periodLabel ? `(${periodLabel})` : ""}</span>
					</h3>
					<span className="cad-badge font-mono font-bold text-xs" style={{ color: "var(--teal, #0d9488)" }}>
						Ср. чек: {formatMoneyKopecks(averageCheckKopecks, false)}
					</span>
				</div>

				<div style={{ padding: "0.5rem 0" }}>
					<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.8125rem" }}>
						<span style={{ color: "var(--muted, #94a3b8)" }}>Качественное распределение выручки клиники:</span>
						<span style={{ fontWeight: 600, fontFamily: "monospace" }}>
							Всего: {formatMoneyKopecks(netRevenueKopecks, false)}
						</span>
					</div>

					{/* Сегментированная полоса распределения P&L */}
					<div
						style={{
							display: "flex",
							height: 20,
							width: "100%",
							borderRadius: 6,
							overflow: "hidden",
							backgroundColor: "var(--paper-soft, #f1f5f9)",
							border: "1px solid var(--line, #e2e8f0)",
						}}
					>
						<div
							style={{
								width: `${cogsPercent}%`,
								backgroundColor: "#f43f5e",
								transition: "width 0.3s ease",
							}}
							title={`Материалы (COGS): ${cogsPercent}%`}
						/>
						<div
							style={{
								width: `${payrollPercent}%`,
								backgroundColor: "#3b82f6",
								transition: "width 0.3s ease",
							}}
							title={`ФОТ персонала: ${payrollPercent}%`}
						/>
						<div
							style={{
								width: `${overheadPercent}%`,
								backgroundColor: "#f59e0b",
								transition: "width 0.3s ease",
							}}
							title={`Аренда и накладные: ${overheadPercent}%`}
						/>
						<div
							style={{
								width: `${profitPercent}%`,
								backgroundColor: "#10b981",
								transition: "width 0.3s ease",
							}}
							title={`Чистая рентабельность: ${profitPercent}%`}
						/>
					</div>

					{/* Легенда структуры P&L */}
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "1rem",
							marginTop: "0.75rem",
							fontSize: "0.75rem",
							color: "var(--muted, #94a3b8)",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
							<span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#f43f5e", display: "inline-block" }} />
							<span>Материалы ({cogsPercent}%)</span>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
							<span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#3b82f6", display: "inline-block" }} />
							<span>ФОТ ({payrollPercent}%)</span>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
							<span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#f59e0b", display: "inline-block" }} />
							<span>Накладные ({overheadPercent}%)</span>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
							<span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#10b981", display: "inline-block" }} />
							<span style={{ fontWeight: 600, color: "var(--ok-fg, #10b981)" }}>
								Прибыль ({profitPercent}%)
							</span>
						</div>
					</div>
				</div>
			</section>

			{/* Сетка: Способы оплаты + Управленческий P&L */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "0.875rem" }}>
				{/* Структура оплат */}
				<section className="cad-panel" aria-label="Методы оплат">
					<div className="cad-panel-title-row">
						<h3 className="cad-panel-title">
							<CreditCard size={16} style={{ color: "var(--teal, #0d9488)" }} />
							<span>Структура способов оплаты</span>
						</h3>
					</div>
					{paymentMethods.length === 0 ? (
						<div style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted, #94a3b8)", fontSize: "0.8125rem" }}>
							Платежей за период не зафиксировано
						</div>
					) : (
						<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
							{paymentMethods.map((pm) => (
								<div
									key={pm.method}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										fontSize: "0.8125rem",
									}}
								>
									<div>
										<span style={{ fontWeight: 500 }}>{pm.labelRu}</span>
										<span style={{ color: "var(--muted, #94a3b8)", marginLeft: 6, fontSize: "0.75rem" }}>
											({pm.transactionsCount} чеков)
										</span>
									</div>
									<div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace" }}>
										<span style={{ fontWeight: 600 }}>{formatMoneyKopecks(pm.totalKopecks, false)}</span>
										<span style={{ color: "var(--teal, #0d9488)", fontSize: "0.75rem", width: 40, textAlign: "right" }}>
											{pm.sharePercent}%
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</section>

				{/* Управленческий P&L */}
				<section className="cad-panel" aria-label="Управленческий отчет PnL">
					<div className="cad-panel-title-row">
						<h3 className="cad-panel-title">
							<FileSpreadsheet size={16} style={{ color: "var(--ok-fg, #10b981)" }} />
							<span>Управленческий P&amp;L клиники</span>
						</h3>
						<span
							className="cad-badge"
							style={{ color: "var(--ok-fg, #10b981)", backgroundColor: "rgba(16, 185, 129, 0.15)" }}
						>
							Рентабельность {pnl.netMarginPercent}%
						</span>
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", fontSize: "0.8125rem" }}>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span style={{ color: "var(--muted, #94a3b8)" }}>Выручка (Gross):</span>
							<span style={{ fontWeight: 600, fontFamily: "monospace" }}>
								{formatMoneyKopecks(pnl.grossRevenueKopecks, false)}
							</span>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span style={{ color: "var(--muted, #94a3b8)" }}>Материалы (COGS ~18%):</span>
							<span style={{ fontFamily: "monospace", color: "var(--err-fg, #ef4444)" }}>
								-{formatMoneyKopecks(pnl.cogsKopecks, false)}
							</span>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span style={{ color: "var(--muted, #94a3b8)" }}>ФОТ персонала (~40%):</span>
							<span style={{ fontFamily: "monospace", color: "var(--err-fg, #ef4444)" }}>
								-{formatMoneyKopecks(pnl.payrollKopecks, false)}
							</span>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span style={{ color: "var(--muted, #94a3b8)" }}>Аренда и накладные (~15%):</span>
							<span style={{ fontFamily: "monospace", color: "var(--err-fg, #ef4444)" }}>
								-{formatMoneyKopecks(pnl.overheadKopecks, false)}
							</span>
						</div>
						<div
							style={{
								borderTop: "1px solid var(--line, rgba(255, 255, 255, 0.1))",
								paddingTop: 4,
								display: "flex",
								justifyContent: "space-between",
								fontWeight: 700,
							}}
						>
							<span>Чистая прибыль:</span>
							<span style={{ fontFamily: "monospace", color: "var(--ok-fg, #10b981)" }}>
								{formatMoneyKopecks(pnl.netProfitKopecks, false)}
							</span>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
};
