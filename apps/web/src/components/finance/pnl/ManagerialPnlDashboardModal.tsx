import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
	BarChart3,
	Building2,
	Calendar,
	CheckCircle,
	CreditCard,
	DollarSign,
	PieChart,
	RefreshCw,
	TrendingDown,
	TrendingUp,
	Wallet,
	X,
} from "lucide-react";
import {
	DEPARTMENT_METADATA_RU,
	type ManagerialPnlReport,
} from "@dental/shared";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { fetchManagerialPnl } from "../../../lib/managerialPnlApi";
import { showToast } from "../../GlobalToast";
import "./ManagerialPnlDashboardModal.css";

interface Props {
	isOpen: boolean;
	onClose: () => void;
}

export const ManagerialPnlDashboardModal: React.FC<Props> = ({ isOpen, onClose }) => {
	const appLogic = useAppLogicContext();
	const auth = appLogic.auth;

	const [report, setReport] = useState<ManagerialPnlReport | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [periodPreset, setPeriodPreset] = useState<"current_month" | "prev_month" | "quarter" | "year">("current_month");

	const getDatesForPreset = useCallback((preset: "current_month" | "prev_month" | "quarter" | "year") => {
		const now = new Date();
		const y = now.getFullYear();
		const m = now.getMonth();

		if (preset === "current_month") {
			const from = new Date(Date.UTC(y, m, 1)).toISOString().split("T")[0]!;
			const to = new Date(Date.UTC(y, m + 1, 0)).toISOString().split("T")[0]!;
			return { from, to };
		}
		if (preset === "prev_month") {
			const from = new Date(Date.UTC(y, m - 1, 1)).toISOString().split("T")[0]!;
			const to = new Date(Date.UTC(y, m, 0)).toISOString().split("T")[0]!;
			return { from, to };
		}
		if (preset === "quarter") {
			const quarterStartMonth = Math.floor(m / 3) * 3;
			const from = new Date(Date.UTC(y, quarterStartMonth, 1)).toISOString().split("T")[0]!;
			const to = new Date(Date.UTC(y, quarterStartMonth + 3, 0)).toISOString().split("T")[0]!;
			return { from, to };
		}
		const from = new Date(Date.UTC(y, 0, 1)).toISOString().split("T")[0]!;
		const to = new Date(Date.UTC(y, 11, 31)).toISOString().split("T")[0]!;
		return { from, to };
	}, []);

	const loadPnl = useCallback(async (preset: "current_month" | "prev_month" | "quarter" | "year") => {
		try {
			setLoading(true);
			const headers = auth.denteClinicalReadHeaders();
			const dates = getDatesForPreset(preset);
			const res = await fetchManagerialPnl(headers, dates);
			setReport(res.data || null);
		} catch (err: any) {
			showToast(`Ошибка отчета P&L: ${err.message}`, "error");
		} finally {
			setLoading(false);
		}
	}, [auth, getDatesForPreset]);

	useEffect(() => {
		if (isOpen) {
			loadPnl(periodPreset);
		}
	}, [isOpen, periodPreset, loadPnl]);

	if (!isOpen) return null;

	return (
		<div className="pnl-modal-overlay">
			<div className="pnl-modal-dialog">
				{/* Шапка */}
				<div className="pnl-header">
					<div className="flex items-center gap-3">
						<h2 className="pnl-title">
							<BarChart3 size={18} className="text-blue-600" />
							Управленческий отчет P&L (Прибыли и убытки)
						</h2>
						<span className="pnl-badge">
							6 реальных касс · 12 регламентированных статей расходов
						</span>
					</div>

					<div className="pnl-header-actions">
						<button
							type="button"
							className={`pnl-date-btn ${periodPreset === "current_month" ? "active" : ""}`}
							onClick={() => setPeriodPreset("current_month")}
						>
							Текущий месяц
						</button>
						<button
							type="button"
							className={`pnl-date-btn ${periodPreset === "prev_month" ? "active" : ""}`}
							onClick={() => setPeriodPreset("prev_month")}
						>
							Прошлый месяц
						</button>
						<button
							type="button"
							className={`pnl-date-btn ${periodPreset === "quarter" ? "active" : ""}`}
							onClick={() => setPeriodPreset("quarter")}
						>
							Квартал
						</button>
						<button
							type="button"
							className={`pnl-date-btn ${periodPreset === "year" ? "active" : ""}`}
							onClick={() => setPeriodPreset("year")}
						>
							Год
						</button>

						<button
							type="button"
							className="pnl-date-btn"
							onClick={() => loadPnl(periodPreset)}
							disabled={loading}
							title="Обновить расчет"
						>
							<RefreshCw size={13} className={loading ? "animate-spin" : ""} />
						</button>

						<button
							type="button"
							className="pnl-btn-close"
							onClick={onClose}
							title="Закрыть"
						>
							<X size={16} />
						</button>
					</div>
				</div>

				{/* Исполнительная панель KPI */}
				{report && (
					<div className="pnl-kpi-grid">
						<div className="pnl-kpi-card">
							<span className="pnl-kpi-label">Валовая выручка</span>
							<span className="pnl-kpi-val revenue">
								{report.grossRevenueRub.toLocaleString("ru-RU")} ₽
							</span>
							<span className="pnl-kpi-sub">
								{report.departmentRevenue.reduce((a, b) => a + b.servicesCount, 0)} услуг
							</span>
						</div>

						<div className="pnl-kpi-card">
							<span className="pnl-kpi-label">Себестоимость (COGS)</span>
							<span className="pnl-kpi-val cogs">
								{report.totalCogsRub.toLocaleString("ru-RU")} ₽
							</span>
							<span className="pnl-kpi-sub">
								ЗТЛ: {report.directLabCostRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<div className="pnl-kpi-card">
							<span className="pnl-kpi-label">Валовая прибыль</span>
							<span className="pnl-kpi-val profit">
								{report.grossProfitRub.toLocaleString("ru-RU")} ₽
							</span>
							<span className="pnl-kpi-sub">
								Маржинальность: {report.grossMarginPct}%
							</span>
						</div>

						<div className="pnl-kpi-card">
							<span className="pnl-kpi-label">Расходы клиники (OPEX)</span>
							<span className="pnl-kpi-val">
								{report.totalOpexRub.toLocaleString("ru-RU")} ₽
							</span>
							<span className="pnl-kpi-sub">
								Аренда, маркетинг, связь
							</span>
						</div>

						<div className="pnl-kpi-card">
							<span className="pnl-kpi-label">EBITDA</span>
							<span className="pnl-kpi-val ebitda">
								{report.ebitdaRub.toLocaleString("ru-RU")} ₽
							</span>
							<span className="pnl-kpi-sub">
								Рентабельность: {report.ebitdaMarginPct}%
							</span>
						</div>

						<div className="pnl-kpi-card">
							<span className="pnl-kpi-label">Чистая прибыль (Net)</span>
							<span className={`pnl-kpi-val ${report.isProfitable ? "profit" : "loss"}`}>
								{report.netProfitRub.toLocaleString("ru-RU")} ₽
							</span>
							<span className="pnl-kpi-sub">
								Рентабельность: {report.netMarginPct}%
							</span>
						</div>
					</div>
				)}

				{/* Детальный отчет */}
				<div className="pnl-content">
					{loading && !report ? (
						<div className="text-center py-16 text-slate-500">
							<RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
							Формирование отчета P&L по кассам и статьям...
						</div>
					) : report ? (
						<>
							{/* Секция 1: Выручка по направлениям и кассам */}
							<div className="pnl-grid-two-col">
								{/* Направления */}
								<div>
									<h3 className="pnl-section-title">
										<PieChart size={15} className="text-blue-600" />
										1. Выручка по клиническим направлениям
									</h3>
									<div className="pnl-table-wrapper">
										<table className="pnl-table">
											<thead>
												<tr>
													<th>Направление</th>
													<th>Выручка (₽)</th>
													<th>Доля (%)</th>
													<th>Средний чек</th>
												</tr>
											</thead>
											<tbody>
												{report.departmentRevenue.map((dept) => {
													const color = DEPARTMENT_METADATA_RU[dept.department]?.color || "#3b82f6";
													return (
														<tr key={dept.department}>
															<td>
																<div className="font-semibold text-slate-800">
																	{dept.titleRu}
																</div>
																<div className="pnl-progress-bar-bg">
																	<div
																		className="pnl-progress-bar-fill"
																		style={{
																			width: `${dept.sharePct}%`,
																			background: color,
																		}}
																	/>
																</div>
															</td>
															<td className="font-semibold">
																{dept.revenueRub.toLocaleString("ru-RU")} ₽
															</td>
															<td>{dept.sharePct}%</td>
															<td>{dept.averageBillRub.toLocaleString("ru-RU")} ₽</td>
														</tr>
													);
												})}
												<tr className="total-row">
													<td>ИТОГО ВЫРУЧКА</td>
													<td>{report.grossRevenueRub.toLocaleString("ru-RU")} ₽</td>
													<td>100%</td>
													<td>—</td>
												</tr>
											</tbody>
										</table>
									</div>
								</div>

								{/* Кассовые счета */}
								<div>
									<h3 className="pnl-section-title">
										<Wallet size={15} className="text-blue-600" />
										2. Поступления по 6 счетам кассы клиники
									</h3>
									<div className="pnl-table-wrapper">
										<table className="pnl-table">
											<thead>
												<tr>
													<th>Кассовый счет</th>
													<th>Тип счета</th>
													<th>Поступления (₽)</th>
													<th>Доля (%)</th>
												</tr>
											</thead>
											<tbody>
												{report.cashBoxRevenue.map((box) => (
													<tr key={box.boxId}>
														<td className="font-semibold text-slate-800">
															{box.boxName}
														</td>
														<td className="text-slate-500 font-mono text-xs">
															{box.boxType}
														</td>
														<td className="font-semibold">
															{box.revenueRub.toLocaleString("ru-RU")} ₽
														</td>
														<td>{box.sharePct}%</td>
													</tr>
												))}
												{report.cashBoxRevenue.length === 0 && (
													<tr>
														<td colSpan={4} className="text-center py-4 text-slate-400">
															Нет платежей в кассах за указанный период
														</td>
													</tr>
												)}
												<tr className="total-row">
													<td>ИТОГО ПО КАССАМ</td>
													<td>—</td>
													<td>{report.grossRevenueRub.toLocaleString("ru-RU")} ₽</td>
													<td>100%</td>
												</tr>
											</tbody>
										</table>
									</div>
								</div>
							</div>

							{/* Секция 2: Расходы по 12 регламентированным статьям StomX */}
							<div>
								<h3 className="pnl-section-title">
									<TrendingDown size={15} className="text-red-600" />
									3. Расходы по 12 регламентированным статьям
								</h3>
								<div className="pnl-table-wrapper">
									<table className="pnl-table">
										<thead>
											<tr>
												<th>№</th>
												<th>Статья расхода</th>
												<th>Категория затрат</th>
												<th>Сумма расхода (₽)</th>
												<th>Доля в расходах (%)</th>
											</tr>
										</thead>
										<tbody>
											{report.statutoryExpenses.map((exp) => (
												<tr key={exp.reasonId}>
													<td className="font-mono font-bold text-slate-500">
														{exp.reasonId}
													</td>
													<td>
														<span className="font-semibold text-slate-800">
															{exp.titleRu}
														</span>
														{exp.isLocked && (
															<span className="ml-2 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
																Системная
															</span>
														)}
													</td>
													<td>
														{exp.costNature === "direct_cogs" && (
															<span className="pnl-tag-cogs">Прямая себестоимость (COGS)</span>
														)}
														{exp.costNature === "opex" && (
															<span className="pnl-tag-opex">Операционные расходы (OPEX)</span>
														)}
														{exp.costNature === "taxes" && (
															<span className="pnl-tag-taxes">Налоги и сборы</span>
														)}
													</td>
													<td className="font-semibold">
														{exp.amountRub.toLocaleString("ru-RU")} ₽
													</td>
													<td>{exp.shareOfExpensesPct}%</td>
												</tr>
											))}
											<tr className="total-row">
												<td colSpan={3}>ИТОГО РАСХОДОВ КЛИНИКИ</td>
												<td>{report.totalExpensesRub.toLocaleString("ru-RU")} ₽</td>
												<td>100%</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</>
					) : null}
				</div>
			</div>
		</div>
	);
};
