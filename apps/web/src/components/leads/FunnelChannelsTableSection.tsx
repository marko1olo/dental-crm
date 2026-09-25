import { ChevronDown, ChevronUp, Globe } from "lucide-react";
import type React from "react";
import type {
	ChannelFunnelMetric,
	MarketingMetricsSummary,
} from "./leadsFunnelTypes";

export interface FunnelChannelsTableSectionProps {
	readonly channels: readonly ChannelFunnelMetric[];
	readonly summary: MarketingMetricsSummary;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

export const FunnelChannelsTableSection: React.FC<
	FunnelChannelsTableSectionProps
> = ({ channels, summary, isOpen, onToggle }) => {
	return (
		<div
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: 14,
				padding: "20px",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 16,
					flexWrap: "wrap",
					gap: 8,
				}}
			>
				<div>
					<h3
						style={{
							margin: 0,
							fontSize: 15,
							fontWeight: 700,
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: 6,
						}}
					>
						<Globe size={18} color="var(--brand-500)" />
						Эффективность Рекламных Каналов
					</h3>
					<p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
						Сравнение CPL, CAC, среднего чека и окупаемости инвестиций (ROMI)
					</p>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<div
						style={{
							fontSize: 12,
							fontWeight: 600,
							color: "var(--muted)",
							background: "var(--paper-soft)",
							padding: "4px 10px",
							borderRadius: 8,
							border: "1px solid var(--line)",
						}}
					>
						Каналов: {channels.length}
					</div>
					<button
						type="button"
						onClick={onToggle}
						style={{
							height: 32,
							padding: "0 10px",
							borderRadius: 8,
							fontSize: 12,
							fontWeight: 600,
							border: "1px solid var(--line)",
							background: isOpen
								? "rgba(15, 118, 110, 0.15)"
								: "var(--paper-soft)",
							color: isOpen ? "var(--teal)" : "var(--ink)",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: 6,
						}}
						aria-expanded={isOpen}
						data-testid="toggle-channels-table-btn"
					>
						{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
						{isOpen ? "Скрыть таблицу" : "Показать аналитику по каналам"}
					</button>
				</div>
			</div>

			{/* Compact Channels Strip (Frontend Rule 3.1 & Mandate 8d) */}
			{!isOpen && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						fontSize: 12,
						padding: "10px 14px",
						background: "var(--paper-soft)",
						borderRadius: 10,
						border: "1px solid var(--line)",
						flexWrap: "wrap",
						gap: 8,
					}}
					data-testid="channels-compact-strip"
				>
					<span style={{ color: "var(--muted)" }}>
						Рекламных каналов: <strong style={{ color: "var(--ink)" }}>{channels.length}</strong> • Бюджет: <strong style={{ color: "var(--ink)" }}>{summary.totalMarketingSpendRub.toLocaleString("ru-RU")} ₽</strong> • CAC: <strong style={{ color: "var(--accent)" }}>{summary.cacRub.toLocaleString("ru-RU")} ₽</strong> • Выручка: <strong style={{ color: "var(--ok-fg)" }}>{summary.totalRevenueRub.toLocaleString("ru-RU")} ₽</strong>
					</span>
					<button
						type="button"
						onClick={onToggle}
						style={{
							background: "none",
							border: "none",
							color: "var(--teal)",
							fontWeight: 600,
							cursor: "pointer",
							fontSize: 12,
							display: "inline-flex",
							alignItems: "center",
							gap: 4,
						}}
					>
						<span>Развернуть таблицу каналов</span>
						<ChevronDown size={13} />
					</button>
				</div>
			)}

			{/* Expanded Channels Table */}
			{isOpen && (
				<div
					style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}
					data-testid="channels-table-expanded"
				>
					<table
						style={{
							width: "100%",
							minWidth: "760px",
							borderCollapse: "collapse",
							fontSize: 12,
							textAlign: "left",
							whiteSpace: "nowrap",
						}}
					>
						<thead>
							<tr
								style={{
									borderBottom: "1px solid var(--line)",
									color: "var(--muted)",
									fontSize: 11,
									textTransform: "uppercase",
									letterSpacing: "0.03em",
								}}
							>
								<th style={{ padding: "10px 8px" }}>Канал</th>
								<th style={{ padding: "10px 8px" }}>Расход (₽)</th>
								<th style={{ padding: "10px 8px" }}>Лиды</th>
								<th style={{ padding: "10px 8px" }}>Записи</th>
								<th style={{ padding: "10px 8px" }}>Дошли</th>
								<th style={{ padding: "10px 8px" }}>Оплатили</th>
								<th style={{ padding: "10px 8px" }}>Конв. (%)</th>
								<th style={{ padding: "10px 8px" }}>Выручка (₽)</th>
								<th style={{ padding: "10px 8px" }}>CAC (₽)</th>
								<th style={{ padding: "10px 8px" }}>ROMI (%)</th>
								<th style={{ padding: "10px 8px" }}>Статус & Рекомендация</th>
							</tr>
						</thead>
						<tbody>
							{channels.map((ch) => {
								return (
									<tr
										key={ch.channelKey}
										style={{
											borderBottom: "1px solid var(--line)",
											transition: "background 0.15s",
										}}
									>
										<td style={{ padding: "10px 8px", fontWeight: 600 }}>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 6,
												}}
											>
												<span
													style={{
														width: 8,
														height: 8,
														borderRadius: "50%",
														background: ch.color,
														display: "inline-block",
													}}
												/>
												{ch.channelLabel}
											</div>
										</td>
										<td style={{ padding: "10px 8px", fontWeight: 500 }}>
											{ch.spendRub.toLocaleString("ru-RU")} ₽
										</td>
										<td style={{ padding: "10px 8px", fontWeight: 600 }}>
											{ch.leadsCount}
										</td>
										<td style={{ padding: "10px 8px" }}>{ch.bookedCount}</td>
										<td style={{ padding: "10px 8px" }}>{ch.showUpCount}</td>
										<td
											style={{
												padding: "10px 8px",
												fontWeight: 700,
												color:
													ch.paidCount > 0
														? "var(--ok-fg)"
														: "var(--ink)",
											}}
										>
											{ch.paidCount}
										</td>
										<td style={{ padding: "10px 8px", fontWeight: 600 }}>
											{ch.conversionRatePercent}%
										</td>
										<td style={{ padding: "10px 8px", fontWeight: 700 }}>
											{ch.revenueRub.toLocaleString("ru-RU")} ₽
										</td>
										<td style={{ padding: "10px 8px", color: "var(--muted)" }}>
											{ch.cacRub > 0 ? `${ch.cacRub.toLocaleString("ru-RU")} ₽` : "—"}
										</td>
										<td style={{ padding: "10px 8px" }}>
											<span
												style={{
													fontWeight: 700,
													color:
														ch.romiPercent >= 100
															? "var(--ok-fg)"
															: ch.romiPercent >= 0
																? "var(--warn-fg)"
																: "var(--rust)",
												}}
											>
												{ch.spendRub > 0 ? `${ch.romiPercent}%` : "Органика"}
											</span>
										</td>
										<td style={{ padding: "10px 8px", fontSize: 11 }}>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 6,
												}}
											>
												{ch.efficiencyRating === "excellent" && (
													<span
														style={{
															background: "rgba(16, 185, 129, 0.15)",
															color: "var(--ok-fg)",
															padding: "2px 6px",
															borderRadius: 4,
															fontWeight: 700,
														}}
													>
														ТОП
													</span>
												)}
												{ch.efficiencyRating === "good" && (
													<span
														style={{
															background: "rgba(59, 130, 246, 0.15)",
															color: "var(--accent)",
															padding: "2px 6px",
															borderRadius: 4,
															fontWeight: 600,
														}}
													>
														В плюсе
													</span>
												)}
												{ch.efficiencyRating === "warning" && (
													<span
														style={{
															background: "rgba(245, 158, 11, 0.15)",
															color: "var(--warn-fg)",
															padding: "2px 6px",
															borderRadius: 4,
															fontWeight: 600,
														}}
													>
														В ноль
													</span>
												)}
												{ch.efficiencyRating === "critical" && (
													<span
														style={{
															background: "rgba(239, 68, 68, 0.15)",
															color: "var(--rust)",
															padding: "2px 6px",
															borderRadius: 4,
															fontWeight: 600,
														}}
													>
														Убыток
													</span>
												)}
												{ch.efficiencyRating === "organic" && (
													<span
														style={{
															background: "rgba(139, 92, 246, 0.15)",
															color: "var(--accent)",
															padding: "2px 6px",
															borderRadius: 4,
															fontWeight: 600,
														}}
													>
														Органика / Сарафан
													</span>
												)}
												<span style={{ color: "var(--muted)" }}>
													{ch.recommendation}
												</span>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};
