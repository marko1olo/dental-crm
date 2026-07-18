import { AnimatePresence, motion } from "framer-motion";
import {
	Banknote,
	Calendar,
	ChevronDown,
	ChevronRight,
	Download,
	ReceiptText,
	Search,
	Stethoscope,
	TrendingUp,
	Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLoadingState } from "./AppBootState";
import { useAppLogicContext } from "./contexts/AppLogicContext";

type Payout = {
	id: string;
	visitId: string;
	doctorId: string | null;
	doctorName: string;
	revenue: number;
	materialCost: number;
	commissionRate: number;
	netPayout: number;
	date: string;
};

type DoctorSummary = {
	doctorId: string | null;
	doctorName: string;
	totalRevenue: number;
	totalMaterialCost: number;
	totalNetPayout: number;
	commissionRate: number;
	payoutCount: number;
	payouts: Payout[];
};

/** Returns "YYYY-MM" from a date string or Date */
function toMonthKey(dateStr: string): string {
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return "unknown";
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Returns human-friendly month label like "Июль 2026" */
function monthLabel(key: string): string {
	const monthNames = [
		"Январь",
		"Февраль",
		"Март",
		"Апрель",
		"Май",
		"Июнь",
		"Июль",
		"Август",
		"Сентябрь",
		"Октябрь",
		"Ноябрь",
		"Декабрь",
	];
	const [year, month] = key.split("-");
	if (!month) return key;
	const monthIdx = parseInt(month, 10) - 1;
	if (monthIdx < 0 || monthIdx > 11) return key;
	return `${monthNames[monthIdx]} ${year}`;
}

function formatDate(dateStr: string): string {
	try {
		return new Date(dateStr).toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "short",
		});
	} catch {
		return dateStr;
	}
}

export function PayrollView() {
	const [payouts, setPayouts] = useState<Payout[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedMonth, setSelectedMonth] = useState<string>("all");
	const [expandedDoctorId, setExpandedDoctorId] = useState<string | null>(null);
	const { auth } = useAppLogicContext();
	const organizationId = auth.currentOrganizationId();

	useEffect(() => {
		if (organizationId) {
			fetchPayouts();
		}
	}, [organizationId]);

	const fetchPayouts = async () => {
		try {
			setIsLoading(true);
			const res = await fetch("/api/billing/payouts", {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setPayouts(data.payouts || []);
			} else {
				console.error("Failed to fetch payouts");
			}
		} catch (e) {
			console.error("Error fetching payouts:", e);
		} finally {
			setIsLoading(false);
		}
	};

	// Available months from data
	const availableMonths = useMemo(() => {
		const months = new Set<string>();
		for (const p of payouts) {
			months.add(toMonthKey(p.date));
		}
		return Array.from(months).sort().reverse();
	}, [payouts]);

	// Set default month to current or most recent when data loads
	useEffect(() => {
		if (availableMonths.length > 0 && selectedMonth === "all") {
			const now = new Date();
			const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
			if (availableMonths.includes(currentKey)) {
				setSelectedMonth(currentKey);
			}
			// otherwise keep "all"
		}
	}, [availableMonths]);

	// Filtered payouts
	const filteredPayouts = useMemo(() => {
		let result = payouts;
		if (selectedMonth !== "all") {
			result = result.filter((p) => toMonthKey(p.date) === selectedMonth);
		}
		return result;
	}, [payouts, selectedMonth]);

	// Calculate overall totals from filtered set
	const totalRevenue = filteredPayouts.reduce((sum, p) => sum + p.revenue, 0);
	const totalMaterialCost = filteredPayouts.reduce(
		(sum, p) => sum + p.materialCost,
		0,
	);
	const totalPayroll = filteredPayouts.reduce((sum, p) => sum + p.netPayout, 0);
	const clinicProfit = totalRevenue - totalMaterialCost - totalPayroll;

	// Group by doctor
	const groupedByDoctor = useMemo(() => {
		const acc: Record<string, DoctorSummary> = {};
		for (const p of filteredPayouts) {
			const key = p.doctorId || "unknown";
			if (!acc[key]) {
				acc[key] = {
					doctorId: p.doctorId,
					doctorName: p.doctorName,
					totalRevenue: 0,
					totalMaterialCost: 0,
					totalNetPayout: 0,
					commissionRate: p.commissionRate,
					payoutCount: 0,
					payouts: [],
				};
			}
			acc[key].totalRevenue += p.revenue;
			acc[key].totalMaterialCost += p.materialCost;
			acc[key].totalNetPayout += p.netPayout;
			acc[key].payoutCount += 1;
			acc[key].payouts.push(p);
		}
		return acc;
	}, [filteredPayouts]);

	const doctorsList = Object.values(groupedByDoctor)
		.filter((d) =>
			d.doctorName.toLowerCase().includes(searchQuery.toLowerCase()),
		)
		.sort((a, b) => b.totalNetPayout - a.totalNetPayout);

	if (isLoading) {
		return <AppLoadingState message="Сбор финансовых данных" />;
	}

	const toggleExpand = (doctorId: string) => {
		setExpandedDoctorId((prev) => (prev === doctorId ? null : doctorId));
	};

	const exportCSV = () => {
		const rows = [
			["Врач", "Приемов", "Выручка", "Материалы", "Ставка %", "К выплате"],
		];
		for (const d of doctorsList) {
			rows.push([
				d.doctorName,
				String(d.payoutCount),
				String(d.totalRevenue),
				String(d.totalMaterialCost),
				String(d.commissionRate),
				String(d.totalNetPayout),
			]);
		}
		const csv = rows.map((r) => r.join(";")).join("\n");
		const blob = new Blob(["\uFEFF" + csv], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `payroll_${selectedMonth === "all" ? "all" : selectedMonth}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<motion.div
			className="panel glass-panel"
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
			<div className="panel-heading">
				<div>
					<h2>Зарплаты и комиссии</h2>
					<p className="finance-scope-label">Расчет заработной платы врачей</p>
				</div>
				<button
					type="button"
					className="secondary-button"
					onClick={exportCSV}
					title="Экспорт в CSV"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						padding: "6px 12px",
						fontSize: "13px",
					}}
				>
					<Download size={14} /> CSV
				</button>
			</div>

			{/* Period Selector */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "12px",
					marginBottom: "1.25rem",
					flexWrap: "wrap",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						color: "var(--foreground-muted)",
					}}
				>
					<Calendar size={16} />
					<span style={{ fontSize: "13px", fontWeight: 600 }}>Период:</span>
				</div>
				<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
					<button
						type="button"
						onClick={() => setSelectedMonth("all")}
						style={{
							padding: "5px 12px",
							fontSize: "12px",
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background:
								selectedMonth === "all" ? "var(--teal)" : "var(--paper)",
							color: selectedMonth === "all" ? "white" : "var(--ink)",
							cursor: "pointer",
							fontWeight: selectedMonth === "all" ? 700 : 400,
							transition: "all 0.15s",
						}}
					>
						Всё время
					</button>
					{availableMonths.map((m) => (
						<button
							type="button"
							key={m}
							onClick={() => setSelectedMonth(m)}
							style={{
								padding: "5px 12px",
								fontSize: "12px",
								borderRadius: "6px",
								border: "1px solid var(--line)",
								background:
									selectedMonth === m ? "var(--teal)" : "var(--paper)",
								color: selectedMonth === m ? "white" : "var(--ink)",
								cursor: "pointer",
								fontWeight: selectedMonth === m ? 700 : 400,
								transition: "all 0.15s",
							}}
						>
							{monthLabel(m)}
						</button>
					))}
				</div>
			</div>

			{/* Summary Cards */}
			<div
				className="finance-summary-grid"
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
					gap: "1rem",
					marginBottom: "1.5rem",
				}}
			>
				<div
					className="finance-metric-card"
					style={{
						background: "rgba(255,255,255,0.03)",
						padding: "1.25rem",
						borderRadius: "12px",
						border: "1px solid rgba(255,255,255,0.05)",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							color: "var(--foreground-muted)",
							marginBottom: "0.5rem",
						}}
					>
						<Banknote size={16} />
						<span
							style={{
								fontSize: "0.8rem",
								textTransform: "uppercase",
								letterSpacing: "0.05em",
							}}
						>
							Выручка
						</span>
					</div>
					<div
						style={{
							fontSize: "1.5rem",
							fontWeight: 600,
							color: "var(--color-primary-text)",
						}}
					>
						{totalRevenue.toLocaleString("ru-RU")} ₽
					</div>
				</div>

				<div
					className="finance-metric-card"
					style={{
						background: "rgba(255,255,255,0.03)",
						padding: "1.25rem",
						borderRadius: "12px",
						border: "1px solid rgba(255,255,255,0.05)",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							color: "var(--foreground-muted)",
							marginBottom: "0.5rem",
						}}
					>
						<ReceiptText size={16} />
						<span
							style={{
								fontSize: "0.8rem",
								textTransform: "uppercase",
								letterSpacing: "0.05em",
							}}
						>
							Себестоимость
						</span>
					</div>
					<div
						style={{
							fontSize: "1.5rem",
							fontWeight: 600,
							color: "var(--color-danger)",
						}}
					>
						-{totalMaterialCost.toLocaleString("ru-RU")} ₽
					</div>
				</div>

				<div
					className="finance-metric-card"
					style={{
						background: "rgba(255,255,255,0.03)",
						padding: "1.25rem",
						borderRadius: "12px",
						border: "1px solid rgba(255,255,255,0.05)",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							color: "var(--foreground-muted)",
							marginBottom: "0.5rem",
						}}
					>
						<Users size={16} />
						<span
							style={{
								fontSize: "0.8rem",
								textTransform: "uppercase",
								letterSpacing: "0.05em",
							}}
						>
							ФОТ (врачам)
						</span>
					</div>
					<div
						style={{
							fontSize: "1.5rem",
							fontWeight: 600,
							color: "var(--color-success)",
						}}
					>
						{totalPayroll.toLocaleString("ru-RU")} ₽
					</div>
				</div>

				<div
					className="finance-metric-card"
					style={{
						background: "rgba(255,255,255,0.03)",
						padding: "1.25rem",
						borderRadius: "12px",
						border: "1px solid rgba(255,255,255,0.05)",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							color: "var(--foreground-muted)",
							marginBottom: "0.5rem",
						}}
					>
						<TrendingUp size={16} />
						<span
							style={{
								fontSize: "0.8rem",
								textTransform: "uppercase",
								letterSpacing: "0.05em",
							}}
						>
							Прибыль клиники
						</span>
					</div>
					<div
						style={{
							fontSize: "1.5rem",
							fontWeight: 600,
							color:
								clinicProfit >= 0
									? "var(--color-success)"
									: "var(--color-danger)",
						}}
					>
						{clinicProfit.toLocaleString("ru-RU")} ₽
					</div>
					{totalRevenue > 0 && (
						<div
							style={{
								fontSize: "11px",
								color: "var(--foreground-muted)",
								marginTop: "4px",
							}}
						>
							Маржа: {Math.round((clinicProfit / totalRevenue) * 100)}%
						</div>
					)}
				</div>
			</div>

			{/* Search */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.5rem",
					marginBottom: "1rem",
				}}
			>
				<Search size={18} color="var(--foreground-muted)" />
				<input
					type="text"
					className="input-field"
					placeholder="Поиск по имени врача..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					style={{ maxWidth: "300px" }}
				/>
			</div>

			{/* Doctor Table with Expandable Rows */}
			<div className="custom-table-container">
				<table className="custom-table">
					<thead>
						<tr>
							<th style={{ width: "30px" }}></th>
							<th>Врач</th>
							<th style={{ textAlign: "right" }}>Приемов</th>
							<th style={{ textAlign: "right" }}>Выручка</th>
							<th style={{ textAlign: "right" }}>Материалы</th>
							<th style={{ textAlign: "center" }}>Ставка</th>
							<th style={{ textAlign: "right" }}>К выплате</th>
						</tr>
					</thead>
					<tbody>
						{doctorsList.length === 0 ? (
							<tr>
								<td
									colSpan={7}
									style={{
										textAlign: "center",
										padding: "2rem",
										color: "var(--foreground-muted)",
									}}
								>
									{filteredPayouts.length === 0
										? "Нет начислений за выбранный период"
										: "Врач не найден"}
								</td>
							</tr>
						) : (
							doctorsList.map((doctor) => {
								const dId = doctor.doctorId || "unknown";
								const isExpanded = expandedDoctorId === dId;
								return (
									<>
										<tr
											key={dId}
											onClick={() => toggleExpand(dId)}
											style={{
												cursor: "pointer",
												transition: "background 0.15s",
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background =
													"rgba(255,255,255,0.03)";
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = "transparent";
											}}
										>
											<td style={{ width: "30px", textAlign: "center" }}>
												{isExpanded ? (
													<ChevronDown size={14} color="var(--brand-500)" />
												) : (
													<ChevronRight
														size={14}
														color="var(--foreground-muted)"
													/>
												)}
											</td>
											<td>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: "0.5rem",
													}}
												>
													<Stethoscope size={16} color="var(--color-primary)" />
													<span style={{ fontWeight: 500 }}>
														{doctor.doctorName}
													</span>
												</div>
											</td>
											<td
												style={{
													textAlign: "right",
													color: "var(--foreground-muted)",
												}}
											>
												{doctor.payoutCount}
											</td>
											<td
												style={{
													textAlign: "right",
													fontWeight: 500,
												}}
											>
												{doctor.totalRevenue.toLocaleString("ru-RU")} ₽
											</td>
											<td
												style={{
													textAlign: "right",
													color: "var(--color-danger)",
												}}
											>
												-{doctor.totalMaterialCost.toLocaleString("ru-RU")} ₽
											</td>
											<td style={{ textAlign: "center" }}>
												<div
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: "0.25rem",
														background: "rgba(var(--color-primary-rgb), 0.1)",
														color: "var(--color-primary)",
														padding: "0.25rem 0.5rem",
														borderRadius: "4px",
														fontSize: "0.85rem",
														fontWeight: 600,
													}}
												>
													{doctor.commissionRate}%
												</div>
											</td>
											<td
												style={{
													textAlign: "right",
													fontWeight: 700,
													color: "var(--color-success)",
													fontSize: "1.1rem",
												}}
											>
												{doctor.totalNetPayout.toLocaleString("ru-RU")} ₽
											</td>
										</tr>
										<AnimatePresence>
											{isExpanded && (
												<tr key={`${dId}-detail`}>
													<td colSpan={7} style={{ padding: 0 }}>
														<motion.div
															initial={{
																height: 0,
																opacity: 0,
															}}
															animate={{
																height: "auto",
																opacity: 1,
															}}
															exit={{
																height: 0,
																opacity: 0,
															}}
															transition={{
																duration: 0.2,
															}}
															style={{
																overflow: "hidden",
															}}
														>
															<div
																style={{
																	padding: "8px 16px 12px 48px",
																	background:
																		"rgba(var(--color-primary-rgb), 0.02)",
																	borderTop: "1px solid var(--line)",
																	borderBottom: "1px solid var(--line)",
																}}
															>
																<div
																	style={{
																		fontSize: "11px",
																		fontWeight: 600,
																		color: "var(--foreground-muted)",
																		textTransform: "uppercase",
																		letterSpacing: "0.5px",
																		marginBottom: "8px",
																	}}
																>
																	Детализация начислений
																</div>
																<table
																	style={{
																		width: "100%",
																		fontSize: "13px",
																		borderCollapse: "collapse",
																	}}
																>
																	<thead>
																		<tr
																			style={{
																				color: "var(--foreground-muted)",
																			}}
																		>
																			<th
																				style={{
																					textAlign: "left",
																					padding: "4px 8px",
																					fontWeight: 500,
																				}}
																			>
																				Дата
																			</th>
																			<th
																				style={{
																					textAlign: "right",
																					padding: "4px 8px",
																					fontWeight: 500,
																				}}
																			>
																				Выручка
																			</th>
																			<th
																				style={{
																					textAlign: "right",
																					padding: "4px 8px",
																					fontWeight: 500,
																				}}
																			>
																				Материалы
																			</th>
																			<th
																				style={{
																					textAlign: "right",
																					padding: "4px 8px",
																					fontWeight: 500,
																				}}
																			>
																				Комиссия
																			</th>
																		</tr>
																	</thead>
																	<tbody>
																		{doctor.payouts
																			.sort(
																				(a, b) =>
																					new Date(b.date).getTime() -
																					new Date(a.date).getTime(),
																			)
																			.map((p) => (
																				<tr
																					key={p.id}
																					style={{
																						borderTop:
																							"1px solid rgba(255,255,255,0.03)",
																					}}
																				>
																					<td
																						style={{
																							padding: "4px 8px",
																						}}
																					>
																						{formatDate(p.date)}
																					</td>
																					<td
																						style={{
																							textAlign: "right",
																							padding: "4px 8px",
																						}}
																					>
																						{p.revenue.toLocaleString("ru-RU")}{" "}
																						₽
																					</td>
																					<td
																						style={{
																							textAlign: "right",
																							padding: "4px 8px",
																							color: "var(--color-danger)",
																						}}
																					>
																						-
																						{p.materialCost.toLocaleString(
																							"ru-RU",
																						)}{" "}
																						₽
																					</td>
																					<td
																						style={{
																							textAlign: "right",
																							padding: "4px 8px",
																							fontWeight: 600,
																							color: "var(--color-success)",
																						}}
																					>
																						{p.netPayout.toLocaleString(
																							"ru-RU",
																						)}{" "}
																						₽
																					</td>
																				</tr>
																			))}
																	</tbody>
																</table>
															</div>
														</motion.div>
													</td>
												</tr>
											)}
										</AnimatePresence>
									</>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			<div
				style={{
					marginTop: "1.5rem",
					padding: "1rem",
					background: "rgba(0,0,0,0.2)",
					borderRadius: "8px",
					fontSize: "0.85rem",
					color: "var(--foreground-muted)",
					lineHeight: 1.5,
				}}
			>
				<strong>Справка по расчетам:</strong>
				<br />
				Заработная плата рассчитывается от чистой выручки после вычета
				себестоимости материалов.
				<br />
				Формула: <code>(Выручка - Материалы) × Процент комиссии</code>.
				<br />
				Базовая стоимость материалов (по умолчанию 15%) автоматически вычитается
				до начисления комиссии врачу, защищая маржинальность клиники.
				<br />
				Нажмите на строку врача, чтобы увидеть детализацию по каждому визиту.
			</div>
		</motion.div>
	);
}
