import React from "react";
import { ChevronDown, ChevronUp, CreditCard, Wallet } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { buildRfc4180Csv, triggerCsvDownload } from "../../reports/reportsCsvExport";

export type FinancialPeriodChoice = "month" | "quarter" | "year";

export interface CashBoxRecord {
	id: string;
	name: string;
	code: string;
	balanceRub: number;
	isShiftOpen: boolean;
	accountType?: string;
}

export function getFinancialPeriodDateRange(p: FinancialPeriodChoice) {
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth();
	if (p === "quarter") {
		const qStart = Math.floor(m / 3) * 3;
		const from = new Date(Date.UTC(y, qStart, 1)).toISOString().slice(0, 10);
		const to = new Date(Date.UTC(y, qStart + 3, 0)).toISOString().slice(0, 10);
		return { from, to };
	}
	if (p === "year") {
		return { from: `${y}-01-01`, to: `${y}-12-31` };
	}
	const from = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
	const to = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
	return { from, to };
}

export function exportFinancialPnlCsvReport(params: {
	period: FinancialPeriodChoice;
	totalRevenueRub: number;
	estimatedCogsRub: number;
	grossProfitRub: number;
	estimatedPayrollRub: number;
	marketingSpendRub: number;
	estimatedOverheadRub: number;
	ebitdaRub: number;
	netProfitRub: number;
	netMarginPercent: number;
}) {
	try {
		const rows = [
			["Статья P&L", "Сумма (₽)"],
			["Выручка (Gross Revenue)", params.totalRevenueRub],
			["Себестоимость лечения (COGS: ЗТЛ + Материалы + ФОТ)", params.estimatedCogsRub],
			["Валовая прибыль (Gross Profit)", params.grossProfitRub],
			["ФОТ врачей и персонала (факт)", params.estimatedPayrollRub],
			["Маркетинг и реклама", params.marketingSpendRub],
			["Аренда и накладные расходы (факт)", params.estimatedOverheadRub],
			["EBITDA", params.ebitdaRub],
			["Чистая прибыль (Net Profit)", params.netProfitRub],
			["Рентабельность (%)", `${params.netMarginPercent}%`],
		];
		const todayDate = new Date().toISOString().slice(0, 10);
		const csvContent = buildRfc4180Csv(rows, ";");
		triggerCsvDownload(csvContent, `Dente_Financial_PnL_${params.period}_${todayDate}.csv`);
		showToast("Финансовый отчет выгружен в CSV (Excel)", "success");
	} catch {
		showToast("Не удалось экспортировать отчет", "error");
	}
}

export interface FinancialCashflowTimelineProps {
	readonly isCashBoxesExpanded: boolean;
	readonly onToggleCashBoxes: () => void;
	readonly cashBoxes: CashBoxRecord[];
	readonly totalCashRub: number;
}

export const FinancialCashflowTimeline: React.FC<FinancialCashflowTimelineProps> = ({
	isCashBoxesExpanded,
	onToggleCashBoxes,
	cashBoxes,
	totalCashRub,
}) => {
	return (
		<section className="fin-analytics-panel" data-testid="panel-cashboxes">
			<div className="fin-analytics-panel-header">
				<h3 className="fin-analytics-panel-title">
					<Wallet size={16} color="var(--ok-fg)" />
					<span>Кассовые счета и эквайринг</span>
				</h3>
				<button
					type="button"
					onClick={onToggleCashBoxes}
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
						Счетов в учете: <strong>{cashBoxes.length}</strong> • Суммарный кассовый остаток:{" "}
						<strong>{totalCashRub.toLocaleString("ru-RU")} ₽</strong>.
					</span>
					<button
						type="button"
						onClick={onToggleCashBoxes}
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
													background: box.isShiftOpen
														? "rgba(16, 185, 129, 0.15)"
														: "rgba(148, 163, 184, 0.15)",
													color: box.isShiftOpen ? "var(--ok-fg)" : "var(--muted)",
													fontWeight: 600,
												}}
											>
												{box.isShiftOpen ? "Открыта" : "Закрыта"}
											</span>
										</td>
										<td style={{ color: "var(--muted)" }}>
											{box.code.includes("cash")
												? "Наличные платежи кассы"
												: box.code.includes("terminal")
													? "Безналичный эквайринг и СБП"
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
	);
};
