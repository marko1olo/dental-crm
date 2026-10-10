import React from "react";
import {
	AlertTriangle,
	History,
	MessageCircle,
	Star,
	ThumbsDown,
	ThumbsUp,
	TrendingUp,
	Users,
} from "lucide-react";
import { formatRussianPhone, getNpsUrgency } from "../omnichannelEngine.js";
import type { NpsMetrics, NpsReview, NpsReviewStatus } from "../omnichannelTypes.js";

export interface OmnichannelNpsTabProps {
	readonly npsMetrics: NpsMetrics;
	readonly npsReviews: readonly NpsReview[];
	readonly filteredNpsReviews: readonly NpsReview[];
	readonly npsFilterUrgency: string;
	readonly setNpsFilterUrgency: (val: string) => void;
	readonly npsFilterStatus: string;
	readonly setNpsFilterStatus: (val: string) => void;
	readonly onUpdateNpsStatus: (reviewId: string, newStatus: NpsReviewStatus) => void;
	readonly onOpenChatFromNps: (patientId: string) => void;
}

/**
 * OmnichannelNpsTab — Дашборд аналитики NPS и триажа отзывов пациентов.
 */
export const OmnichannelNpsTab: React.FC<OmnichannelNpsTabProps> = ({
	npsMetrics,
	npsReviews,
	filteredNpsReviews,
	npsFilterUrgency,
	setNpsFilterUrgency,
	npsFilterStatus,
	setNpsFilterStatus,
	onUpdateNpsStatus,
	onOpenChatFromNps,
}) => {
	return (
		<div className="hub-nps-workspace">
			{/* Верхние карточки метрик NPS */}
			<div className="hub-nps-metrics-grid">
				{/* Главный балл NPS */}
				<div className="hub-nps-metric-card primary">
					<div className="metric-card-top">
						<span className="metric-title">Индекс лояльности (Net Promoter Score)</span>
						<TrendingUp size={18} className="text-teal" />
					</div>
					<div className="metric-val-num text-teal">
						+{npsMetrics.npsScore}%
					</div>
					<div className="metric-bar-track">
						<div
							className="metric-bar-fill bar-promoter"
							style={{ width: `${Math.max(0, npsMetrics.npsScore)}%` }}
						/>
					</div>
					<p className="metric-hint">
						Средний балл {npsMetrics.averageScore} из 10 на основе {npsMetrics.totalReviews} отзывов
					</p>
				</div>

				{/* Промоутеры */}
				<div className="hub-nps-metric-card promoter">
					<div className="metric-card-top">
						<span className="metric-title">Промоутеры (9–10)</span>
						<ThumbsUp size={16} className="text-ok" />
					</div>
					<div className="metric-val-num text-ok">
						{npsMetrics.promotersPct}% <span className="metric-count">({npsMetrics.promotersCount})</span>
					</div>
					<div className="metric-bar-track">
						<div className="metric-bar-fill bar-promoter" style={{ width: `${npsMetrics.promotersPct}%` }} />
					</div>
					<p className="metric-hint">Лояльные клиенты, рекомендуют клинику</p>
				</div>

				{/* Нейтралы */}
				<div className="hub-nps-metric-card neutral">
					<div className="metric-card-top">
						<span className="metric-title">Нейтралы (7–8)</span>
						<Users size={16} className="text-amber" />
					</div>
					<div className="metric-val-num text-amber">
						{npsMetrics.neutralsPct}% <span className="metric-count">({npsMetrics.neutralsCount})</span>
					</div>
					<div className="metric-bar-track">
						<div className="metric-bar-fill bar-neutral" style={{ width: `${npsMetrics.neutralsPct}%` }} />
					</div>
					<p className="metric-hint">Удовлетворены, но уязвимы к конкурентам</p>
				</div>

				{/* Детракторы */}
				<div className="hub-nps-metric-card detractor">
					<div className="metric-card-top">
						<span className="metric-title">Детракторы (0–6)</span>
						<ThumbsDown size={16} className="text-bad" />
					</div>
					<div className="metric-val-num text-bad">
						{npsMetrics.detractorsPct}% <span className="metric-count">({npsMetrics.detractorsCount})</span>
					</div>
					<div className="metric-bar-track">
						<div className="metric-bar-fill bar-detractor" style={{ width: `${npsMetrics.detractorsPct}%` }} />
					</div>
					<p className="metric-hint">Критики, требуют срочного разбора сервиса</p>
				</div>
			</div>

			{/* Нижняя панель: Таблица отзывов и фильтры */}
			<div className="hub-nps-table-container">
				<div className="hub-nps-table-header">
					<div className="hub-nps-header-left">
						<h3 className="hub-nps-table-title">Лента отзывов и сервис-триаж</h3>
						<span className="hub-nps-count-badge">Всего: {npsReviews.length}</span>
					</div>

					<div className="hub-nps-table-filters">
						{/* Фильтр срочности / категории */}
						<div className="hub-filter-select-wrap">
							<span className="filter-label">Категория:</span>
							<select
								className="hub-nps-select"
								value={npsFilterUrgency}
								onChange={(e) => setNpsFilterUrgency(e.target.value)}
							>
								<option value="all">Все категории</option>
								<option value="critical">🚨 Критические (Срочно)</option>
								<option value="detractor">Детракторы (0–6)</option>
								<option value="neutral">Нейтралы (7–8)</option>
								<option value="promoter">Промоутеры (9–10)</option>
							</select>
						</div>

						{/* Фильтр статуса обработки */}
						<div className="hub-filter-select-wrap">
							<span className="filter-label">Статус:</span>
							<select
								className="hub-nps-select"
								value={npsFilterStatus}
								onChange={(e) => setNpsFilterStatus(e.target.value)}
							>
								<option value="all">Все статусы</option>
								<option value="pending">Новый (Ожидает разбора)</option>
								<option value="in_progress">В работе у главврача</option>
								<option value="resolved">Урегулировано</option>
								<option value="ignored">Отклонено</option>
							</select>
						</div>
					</div>
				</div>

				<div className="hub-nps-table-scroll">
					<table className="hub-nps-table">
						<thead>
							<tr>
								<th>Пациент</th>
								<th>Оценка</th>
								<th>Категория</th>
								<th>Отзыв / Комментарий</th>
								<th>Врач / Процедура</th>
								<th>Срочность</th>
								<th>Статус разбора</th>
								<th>Действия</th>
							</tr>
						</thead>
						<tbody>
							{filteredNpsReviews.length === 0 ? (
								<tr>
									<td colSpan={8} className="hub-table-empty">
										Нет отзывов по выбранным критериям.
									</td>
								</tr>
							) : (
								filteredNpsReviews.map((rev) => {
									const { urgency } = getNpsUrgency(rev.score);
									return (
										<tr key={rev.id} className={`nps-row ${urgency === "critical" ? "critical-row" : ""}`}>
											<td className="cell-patient">
												<span className="patient-name">{rev.patientName}</span>
												<span className="patient-phone">{formatRussianPhone(rev.phone)}</span>
											</td>

											<td className="cell-score">
												<span className={`score-badge score-${rev.score >= 9 ? "high" : rev.score >= 7 ? "mid" : "low"}`}>
													<Star size={12} /> {rev.score}
												</span>
											</td>

											<td className="cell-category">
												{rev.category === "promoter" && <span className="cat-pill promoter">Промоутер</span>}
												{rev.category === "neutral" && <span className="cat-pill neutral">Нейтрал</span>}
												{rev.category === "detractor" && <span className="cat-pill detractor">Детрактор</span>}
											</td>

											<td className="cell-comment">
												<p className="comment-text">{rev.comment || "—"}</p>
												<span className="comment-date">
													{new Date(rev.createdAt).toLocaleDateString("ru-RU", {
														day: "numeric",
														month: "short",
														year: "numeric",
													})}
												</span>
											</td>

											<td className="cell-doctor">
												<span className="doc-name">{rev.doctorName || "—"}</span>
												<span className="proc-name">{rev.serviceName || "—"}</span>
											</td>

											<td className="cell-urgency">
												{urgency === "critical" && (
													<span className="urgency-badge critical">
														<AlertTriangle size={12} /> Срочно (24ч)
													</span>
												)}
												{urgency === "high" && <span className="urgency-badge high">Высокая</span>}
												{urgency === "medium" && <span className="urgency-badge medium">Средняя</span>}
												{urgency === "low" && <span className="urgency-badge low">Стандарт</span>}
											</td>

											<td className="cell-status">
												<select
													className={`status-select status-${rev.status}`}
													value={rev.status}
													onChange={(e) => onUpdateNpsStatus(rev.id, e.target.value as NpsReviewStatus)}
												>
													<option value="pending">Новый</option>
													<option value="in_progress">В работе</option>
													<option value="resolved">Урегулировано</option>
													<option value="ignored">Отклонено</option>
												</select>
											</td>

											<td className="cell-actions">
												<button
													type="button"
													className="btn-open-chat min-h-[44px] cursor-pointer"
													style={{ minHeight: "44px" }}
													onClick={() => onOpenChatFromNps(rev.patientId)}
													title="Перейти к переписке с пациентом в WhatsApp/Telegram"
												>
													<MessageCircle size={14} /> Чат
												</button>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
