/**
 * OmnichannelNpsMetricsCards.tsx — 4 карточки аналитики лояльности пациентов (NPS, Промоутеры, Нейтралы, Детракторы).
 * Строго <= 120 строк по Мандату 8b.
 */

import React from "react";
import { ThumbsDown, ThumbsUp, TrendingUp, Users } from "lucide-react";
import type { NpsMetrics } from "../omnichannelTypes.js";

export interface OmnichannelNpsMetricsCardsProps {
	readonly npsMetrics: NpsMetrics;
}

export const OmnichannelNpsMetricsCards: React.FC<OmnichannelNpsMetricsCardsProps> = ({ npsMetrics }) => {
	return (
		<div className="hub-nps-metrics-grid">
			{/* Главный балл NPS */}
			<div className="hub-nps-metric-card primary">
				<div className="metric-card-top">
					<span className="metric-title">Индекс лояльности (NPS)</span>
					<TrendingUp size={18} className="text-teal" />
				</div>
				<div className="metric-val-num text-teal">+{npsMetrics.npsScore}%</div>
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
				<p className="metric-hint">Лояльные пациенты, рекомендуют клинику</p>
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
				<p className="metric-hint">Удовлетворены качеством, но нейтральны</p>
			</div>

			{/* Детракторы */}
			<div className="hub-nps-metric-card detractor">
				<div className="metric-card-top">
					<span className="metric-title">Критики (0–6)</span>
					<ThumbsDown size={16} className="text-bad" />
				</div>
				<div className="metric-val-num text-bad">
					{npsMetrics.detractorsPct}% <span className="metric-count">({npsMetrics.detractorsCount})</span>
				</div>
				<div className="metric-bar-track">
					<div className="metric-bar-fill bar-detractor" style={{ width: `${npsMetrics.detractorsPct}%` }} />
				</div>
				<p className="metric-hint">Требуют оперативного разбора сервиса</p>
			</div>
		</div>
	);
};
