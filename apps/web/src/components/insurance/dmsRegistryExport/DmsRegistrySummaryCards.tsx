/**
 * DmsRegistrySummaryCards.tsx — Финансовая статистика и балансовая проверка реестра
 */

import { CheckCircle2 } from "lucide-react";
import React from "react";
import { formatRubKopecks, type DmsRegistrySummary } from "../insuranceMath.js";

export interface DmsRegistrySummaryCardsProps {
	readonly summary: DmsRegistrySummary;
	readonly periodDisplay: string;
}

export function DmsRegistrySummaryCards({ summary, periodDisplay }: DmsRegistrySummaryCardsProps) {
	return (
		<>
			<div className="dms-stats-row">
				<div className="dms-stat-card">
					<span className="dms-stat-label">Всего услуг в реестре</span>
					<span className="dms-stat-value font-mono">{summary.totalServicesCount}</span>
					<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Пациентов: {summary.uniquePatientsCount}
					</span>
				</div>

				<div className="dms-stat-card">
					<span className="dms-stat-label">Общая стоимость (Всего)</span>
					<span className="dms-stat-value font-mono">{formatRubKopecks(summary.totalAmountRub)}</span>
					<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						По тарифам клиники
					</span>
				</div>

				<div className="dms-stat-card" style={{ borderColor: "var(--ok-fg, #10b981)", background: "var(--ok-bg, rgba(16, 185, 129, 0.04))" }}>
					<span className="dms-stat-label">К оплате страховой (ДМС)</span>
					<span className="dms-stat-value font-mono text-[var(--ok-fg,#059669)]">
						{formatRubKopecks(summary.totalDmsCoveredRub)}
					</span>
					<span style={{ fontSize: "0.75rem", color: "var(--ok-fg, #10b981)", fontWeight: 600 }}>
						Покрыто по договорам ДМС
					</span>
				</div>

				<div className="dms-stat-card" style={{ borderColor: "var(--warn-fg, #f59e0b)", background: "var(--warn-bg, rgba(245, 158, 11, 0.04))" }}>
					<span className="dms-stat-label">Оплачено пациентами (Copay)</span>
					<span className="dms-stat-value font-mono text-[var(--warn-fg,#d97706)]">
						{formatRubKopecks(summary.totalPatientPaidRub)}
					</span>
					<span style={{ fontSize: "0.75rem", color: "var(--warn-fg, #f59e0b)", fontWeight: 600 }}>
						Франшизы и исключения
					</span>
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderRadius: "12px", background: summary.isBalanced ? "var(--ok-bg, rgba(16, 185, 129, 0.08))" : "var(--bad-bg, rgba(239, 68, 68, 0.08))", border: `1px solid ${summary.isBalanced ? "var(--ok-fg, rgba(16, 185, 129, 0.3))" : "var(--bad-fg, rgba(239, 68, 68, 0.3))"}` }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<CheckCircle2 size={18} className={summary.isBalanced ? "text-[var(--ok-fg,#059669)]" : "text-[var(--bad-fg,#dc2626)]"} />
					<span style={{ fontSize: "0.875rem", fontWeight: 700, color: summary.isBalanced ? "var(--ok-fg, #059669)" : "var(--bad-fg, #dc2626)" }}>
						{summary.isBalanced
							? `Копеечный баланс сошелся на 100%: ${formatRubKopecks(summary.totalDmsCoveredRub)} (ДМС) + ${formatRubKopecks(summary.totalPatientPaidRub)} (Пациенты) = ${formatRubKopecks(summary.totalAmountRub)} (Итого)`
							: "Внимание: Обнаружено расхождение в распределении копеек!"}
					</span>
				</div>
				<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
					Период: {periodDisplay}
				</div>
			</div>
		</>
	);
}
