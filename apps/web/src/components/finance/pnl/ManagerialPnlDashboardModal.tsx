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
	PlusCircle,
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
import { QuickExpenseModal } from "../QuickExpenseModal";
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
	const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState<boolean>(false);

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
							className="pnl-action-btn-expense"
							onClick={() => setIsQuickExpenseOpen(true)}
							title="Внести операционный расход (аренда, материалы, коммуналка)"
						>
							<PlusCircle size={13} />
							<span>+ Расход</span>
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
													<th>Прямые затраты</th>
													<th>Маржа (₽)</th>
													<th>Рентабельность (%)</th>
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
															<td className="text-rose-600">
																{dept.directCostsRub.toLocaleString("ru-RU")} ₽
															</td>
															<td className="font-semibold text-emerald-600">
																{dept.marginRub.toLocaleString("ru-RU")} ₽
															</td>
															<td className="font-semibold">
																{dept.marginPct}%
															</td>
															<td>{dept.averageBillRub.toLocaleString("ru-RU")} ₽</td>
														</tr>
													);
												})}
												<tr className="total-row">
													<td>ИТОГО ВЫРУЧКА</td>
													<td>{report.grossRevenueRub.toLocaleString("ru-RU")} ₽</td>
													<td>100%</td>
													<td className="text-rose-600">{report.totalCogsRub.toLocaleString("ru-RU")} ₽</td>
													<td className="text-emerald-600">{report.grossProfitRub.toLocaleString("ru-RU")} ₽</td>
													<td>{report.grossMarginPct}%</td>
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

							{/* Секция 4: Точка безубыточности (CVP Break-Even Analysis) */}
							{report.breakEven && (
								<div className="pnl-section-block">
									<h3 className="pnl-section-title">
										<TrendingUp size={15} className="text-emerald-600" />
										4. Точка безубыточности (CVP-анализ практики)
									</h3>
									<div className="pnl-breakeven-grid">
										<div className="pnl-breakeven-card">
											<span className="pnl-kpi-label">Точка безубыточности</span>
											<span className="pnl-kpi-val text-blue-600">
												{report.breakEven.breakEvenRevenueRub.toLocaleString("ru-RU")} ₽
											</span>
											<span className="pnl-kpi-sub">
												Требуется визитов: <b>{report.breakEven.breakEvenVisitsCount}</b>
											</span>
										</div>

										<div className="pnl-breakeven-card">
											<span className="pnl-kpi-label">Постоянные расходы (Fixed)</span>
											<span className="pnl-kpi-val">
												{report.breakEven.fixedCostsRub.toLocaleString("ru-RU")} ₽
											</span>
											<span className="pnl-kpi-sub">Аренда, оклады, IT, коммуналка</span>
										</div>

										<div className="pnl-breakeven-card">
											<span className="pnl-kpi-label">Переменные расходы (Variable)</span>
											<span className="pnl-kpi-val cogs">
												{report.breakEven.variableCostsRub.toLocaleString("ru-RU")} ₽
											</span>
											<span className="pnl-kpi-sub">Материалы, ЗТЛ, сдельный ФОТ</span>
										</div>

										<div className="pnl-breakeven-card">
											<span className="pnl-kpi-label">Коэффициент марж. дохода</span>
											<span className="pnl-kpi-val profit">
												{(report.breakEven.contributionMarginRatio * 100).toFixed(1)}%
											</span>
											<span className="pnl-kpi-sub">
												Марж. доход: {report.breakEven.contributionMarginRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>

										<div className="pnl-breakeven-card">
											<span className="pnl-kpi-label">Запас фин. прочности</span>
											<span className={`pnl-kpi-val ${report.breakEven.isBreakEvenReached ? "profit" : "loss"}`}>
												{report.breakEven.marginOfSafetyRub.toLocaleString("ru-RU")} ₽
											</span>
											<span className="pnl-kpi-sub">
												{report.breakEven.isBreakEvenReached
													? `Запас безопасности: +${report.breakEven.marginOfSafetyPct}%`
													: "Ниже точки безубыточности"}
											</span>
										</div>

										<div className="pnl-breakeven-card">
											<span className="pnl-kpi-label">Статус безубыточности</span>
											<div className="mt-1">
												<span
													className={`pnl-status-pill ${report.breakEven.isBreakEvenReached ? "success" : "danger"}`}
												>
													{report.breakEven.isBreakEvenReached ? "Безубыточность достигнута" : "Зона риска"}
												</span>
											</div>
											<span className="pnl-kpi-sub mt-1">
												{report.grossRevenueRub >= report.breakEven.breakEvenRevenueRub
													? `Превышение на ${(report.grossRevenueRub - report.breakEven.breakEvenRevenueRub).toLocaleString("ru-RU")} ₽`
													: `Дефицит: ${(report.breakEven.breakEvenRevenueRub - report.grossRevenueRub).toLocaleString("ru-RU")} ₽`}
											</span>
										</div>
									</div>
								</div>
							)}

							{/* Секция 5: Юнит-экономика стоматологических кресел */}
							{report.chairEconomics && (
								<div className="pnl-section-block">
									<h3 className="pnl-section-title">
										<Building2 size={15} className="text-indigo-600" />
										5. Юнит-экономика стоматологических кресел
									</h3>
									<div className="pnl-chair-summary-grid">
										<div className="pnl-kpi-card">
											<span className="pnl-kpi-label">Активных установок</span>
											<span className="pnl-kpi-val text-indigo-600">
												{report.chairEconomics.activeChairsCount} кресел
											</span>
											<span className="pnl-kpi-sub">
												Фонд часов: {report.chairEconomics.totalOperatingHours} ч
											</span>
										</div>

										<div className="pnl-kpi-card">
											<span className="pnl-kpi-label">Загрузка фонда кресел</span>
											<span className="pnl-kpi-val">
												{report.chairEconomics.chairOccupancyRatePct}%
											</span>
											<span className="pnl-kpi-sub">
												Отработано: {report.chairEconomics.totalOccupiedHours} ч
											</span>
										</div>

										<div className="pnl-kpi-card">
											<span className="pnl-kpi-label">Себестоимость часа доступности</span>
											<span className="pnl-kpi-val text-slate-700">
												{report.chairEconomics.costPerAvailableChairHourRub.toLocaleString("ru-RU")} ₽/ч
											</span>
											<span className="pnl-kpi-sub">Все расходы / фонд часов</span>
										</div>

										<div className="pnl-kpi-card">
											<span className="pnl-kpi-label">Себестоимость часа приема</span>
											<span className="pnl-kpi-val text-rose-600">
												{report.chairEconomics.costPerOccupiedChairHourRub.toLocaleString("ru-RU")} ₽/ч
											</span>
											<span className="pnl-kpi-sub">Все расходы / занятые часы</span>
										</div>

										<div className="pnl-kpi-card">
											<span className="pnl-kpi-label">Выручка на кресло</span>
											<span className="pnl-kpi-val revenue">
												{report.chairEconomics.revenuePerChairRub.toLocaleString("ru-RU")} ₽
											</span>
											<span className="pnl-kpi-sub">Средняя выработка</span>
										</div>

										<div className="pnl-kpi-card">
											<span className="pnl-kpi-label">Прибыль на кресло</span>
											<span className={`pnl-kpi-val ${report.chairEconomics.profitPerChairRub >= 0 ? "profit" : "loss"}`}>
												{report.chairEconomics.profitPerChairRub.toLocaleString("ru-RU")} ₽
											</span>
											<span className="pnl-kpi-sub">Чистый финансовый итог</span>
										</div>
									</div>

									{report.chairEconomics.chairs.length > 0 && (
										<div className="pnl-table-wrapper">
											<table className="pnl-table">
												<thead>
													<tr>
														<th>Установка / Кабинет</th>
														<th style={{ textAlign: "center" }}>Часы фонда</th>
														<th style={{ textAlign: "center" }}>Часы приема</th>
														<th style={{ textAlign: "center" }}>Загрузка (%)</th>
														<th style={{ textAlign: "right" }}>Выручка (₽)</th>
														<th style={{ textAlign: "right" }}>Расход (₽)</th>
														<th style={{ textAlign: "right" }}>Прибыль кресла (₽)</th>
													</tr>
												</thead>
												<tbody>
													{report.chairEconomics.chairs.map((chair) => (
														<tr key={chair.chairId}>
															<td className="font-semibold text-slate-800">
																{chair.chairName} {chair.roomName ? `(${chair.roomName})` : ""}
															</td>
															<td style={{ textAlign: "center" }}>{chair.operatingHours} ч</td>
															<td style={{ textAlign: "center" }}>{chair.occupiedHours} ч</td>
															<td style={{ textAlign: "center" }}>
																<span className="font-semibold">{chair.occupancyRatePct}%</span>
															</td>
															<td style={{ textAlign: "right", fontWeight: 600 }}>
																{chair.revenueRub.toLocaleString("ru-RU")} ₽
															</td>
															<td style={{ textAlign: "right", color: "var(--muted)" }}>
																{chair.costRub.toLocaleString("ru-RU")} ₽
															</td>
															<td
																style={{
																	textAlign: "right",
																	fontWeight: 700,
																	color: chair.profitRub >= 0 ? "#059669" : "#dc2626",
																}}
															>
																{chair.profitRub.toLocaleString("ru-RU")} ₽
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							)}
						</>
					) : null}
				</div>
			</div>

			{isQuickExpenseOpen && (
				<QuickExpenseModal
					isOpen={isQuickExpenseOpen}
					onClose={() => setIsQuickExpenseOpen(false)}
					onSuccess={() => loadPnl(periodPreset)}
				/>
			)}
		</div>
	);
};
