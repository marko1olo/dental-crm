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
import { formatRussianPhone, getNpsUrgency } from "./omnichannelEngine.js";
import type { NpsReview, NpsReviewStatus, NpsMetrics } from "./omnichannelTypes.js";

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
 * NPS Analytics and Patient Feedback Triage Dashboard Tab.
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
					<p className="metric-hint">
						{npsMetrics.criticalPendingCount > 0 ? (
							<span className="text-bad font-semibold inline-flex items-center gap-1">
								<AlertTriangle size={13} className="text-bad" /> {npsMetrics.criticalPendingCount} требуют звонка главврача!
							</span>
						) : (
							"Критических инцидентов нет"
						)}
					</p>
				</div>
			</div>

			{/* Таблица последних отзывов и инцидентов */}
			<div className="hub-nps-table-container">
				<div className="hub-nps-table-toolbar">
					<h4 className="hub-nps-table-heading">
						<History size={16} /> Лента отзывов пациентов и триаж инцидентов
					</h4>

					<div className="hub-nps-filters">
						<div className="nps-filter-item">
							<span>Категория:</span>
							<select
								className="hub-nps-select"
								value={npsFilterUrgency}
								onChange={(e) => setNpsFilterUrgency(e.target.value)}
							>
								<option value="all">Все отзывы ({npsReviews.length})</option>
								<option value="critical">Критические (≤4)</option>
								<option value="detractor">Все детракторы (0-6)</option>
								<option value="neutral">Нейтралы (7-8)</option>
								<option value="promoter">Промоутеры (9-10)</option>
							</select>
						</div>

						<div className="nps-filter-item">
							<span>Статус:</span>
							<select
								className="hub-nps-select"
								value={npsFilterStatus}
								onChange={(e) => setNpsFilterStatus(e.target.value)}
							>
								<option value="all">Все статусы</option>
								<option value="pending">Ожидает ответа</option>
								<option value="in_progress">В работе</option>
								<option value="resolved">Урегулирован</option>
								<option value="thanked">Поблагодарили</option>
							</select>
						</div>
					</div>
				</div>

				<div className="hub-nps-table-wrapper">
					<table className="hub-nps-table">
						<thead>
							<tr>
								<th>Дата</th>
								<th>Пациент</th>
								<th>Оценка</th>
								<th>Срочность / Бейдж</th>
								<th>Комментарий пациента</th>
								<th>Врач и услуга</th>
								<th>Статус</th>
								<th>Действие</th>
							</tr>
						</thead>
						<tbody>
							{filteredNpsReviews.map((rev) => {
								const urgencyInfo = getNpsUrgency(rev.score);
								return (
									<tr key={rev.id} className={`nps-row-${rev.urgency}`}>
										<td className="cell-date">
											{new Date(rev.createdAt).toLocaleDateString("ru-RU", {
												day: "2-digit",
												month: "2-digit",
												hour: "2-digit",
												minute: "2-digit",
											})}
										</td>
										<td className="cell-patient">
											<span className="patient-name">{rev.patientName}</span>
											<span className="patient-phone">{formatRussianPhone(rev.phone)}</span>
										</td>
										<td className="cell-score">
											<span className={`nps-score-badge score-${rev.score} inline-flex items-center gap-1`}>
												<Star size={11} className="text-amber-500 fill-amber-500 inline" />
												<span>{rev.score}</span>
											</span>
										</td>
										<td className="cell-urgency">
											<span className={`nps-urgency-pill ${urgencyInfo.colorClass}`}>
												{urgencyInfo.badgeText}
											</span>
										</td>
										<td className="cell-comment">
											<p className="comment-text">{rev.comment}</p>
											{rev.resolutionNote && (
												<p className="resolution-note">
													<strong>Решение:</strong> {rev.resolutionNote}
												</p>
											)}
										</td>
										<td className="cell-doctor">
											<span className="doctor-name">{rev.doctorName}</span>
											<span className="service-name">{rev.serviceName}</span>
										</td>
										<td className="cell-status">
											<select
												className={`status-select status-${rev.status}`}
												value={rev.status}
												onChange={(e) =>
													onUpdateNpsStatus(rev.id, e.target.value as NpsReviewStatus)
												}
											>
												<option value="pending">Не отвечен</option>
												<option value="in_progress">В работе</option>
												<option value="resolved">Урегулирован</option>
												<option value="thanked">Поблагодарили</option>
											</select>
										</td>
										<td className="cell-action">
											<button
												type="button"
												className="hub-table-btn-chat"
												onClick={() => onOpenChatFromNps(rev.patientId)}
												title="Открыть чат с пациентом"
											>
												<MessageCircle size={14} /> Чат
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
