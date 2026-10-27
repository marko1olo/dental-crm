/**
 * OmnichannelNpsTable.tsx — Таблица отзывов пациентов, сервис-триаж и быстрый переход в чат.
 * Строго <= 120 строк по Мандату 8b.
 */

import React from "react";
import { OmnichannelNpsTableRow } from "./OmnichannelNpsTableRow.js";
import type { NpsReview, NpsReviewStatus } from "../omnichannelTypes.js";

export interface OmnichannelNpsTableProps {
	readonly npsReviews: readonly NpsReview[];
	readonly filteredNpsReviews: readonly NpsReview[];
	readonly npsFilterUrgency: string;
	readonly setNpsFilterUrgency: (val: string) => void;
	readonly npsFilterStatus: string;
	readonly setNpsFilterStatus: (val: string) => void;
	readonly onUpdateNpsStatus: (reviewId: string, newStatus: NpsReviewStatus) => void;
	readonly onOpenChatFromNps: (patientId: string) => void;
}

export const OmnichannelNpsTable: React.FC<OmnichannelNpsTableProps> = ({
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
		<div className="hub-nps-table-container">
			<div className="hub-nps-table-header">
				<div className="hub-nps-header-left">
					<h3 className="hub-nps-table-title">Лента отзывов и сервис-триаж</h3>
					<span className="hub-nps-count-badge">Всего: {npsReviews.length}</span>
				</div>

				<div className="hub-nps-table-filters">
					<div className="hub-filter-select-wrap">
						<span className="filter-label">Категория:</span>
						<select
							className="hub-nps-select"
							value={npsFilterUrgency}
							onChange={(e) => setNpsFilterUrgency(e.target.value)}
						>
							<option value="all">Все категории</option>
							<option value="critical">Критические</option>
							<option value="detractor">Критики (0–6)</option>
							<option value="neutral">Нейтралы (7–8)</option>
							<option value="promoter">Промоутеры (9–10)</option>
						</select>
					</div>

					<div className="hub-filter-select-wrap">
						<span className="filter-label">Статус:</span>
						<select
							className="hub-nps-select"
							value={npsFilterStatus}
							onChange={(e) => setNpsFilterStatus(e.target.value)}
						>
							<option value="all">Все статусы</option>
							<option value="pending">Новый (Ожидает)</option>
							<option value="in_progress">В работе</option>
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
							<th>Отзыв</th>
							<th>Врач / Услуга</th>
							<th>Срочность</th>
							<th>Статус</th>
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
							filteredNpsReviews.map((rev) => (
								<OmnichannelNpsTableRow
									key={rev.id}
									rev={rev}
									onUpdateNpsStatus={onUpdateNpsStatus}
									onOpenChatFromNps={onOpenChatFromNps}
								/>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};
