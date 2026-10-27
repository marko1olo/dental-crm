/**
 * OmnichannelNpsTableRow.tsx — Строка таблицы отзыва пациента и кнопки действий.
 * Строго <= 120 строк по Мандату 8b.
 */

import React from "react";
import { AlertTriangle, MessageCircle, Star } from "lucide-react";
import { formatRussianPhone, getNpsUrgency } from "../omnichannelEngine.js";
import type { NpsReview, NpsReviewStatus } from "../omnichannelTypes.js";

export interface OmnichannelNpsTableRowProps {
	readonly rev: NpsReview;
	readonly onUpdateNpsStatus: (reviewId: string, newStatus: NpsReviewStatus) => void;
	readonly onOpenChatFromNps: (patientId: string) => void;
}

export const OmnichannelNpsTableRow: React.FC<OmnichannelNpsTableRowProps> = ({
	rev,
	onUpdateNpsStatus,
	onOpenChatFromNps,
}) => {
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
				<span className={`cat-pill ${rev.category}`}>
					{rev.category === "promoter" ? "Промоутер" : rev.category === "neutral" ? "Нейтрал" : "Критик"}
				</span>
			</td>
			<td className="cell-comment">
				<p className="comment-text">{rev.comment || "—"}</p>
			</td>
			<td className="cell-doctor">
				<span className="doc-name">{rev.doctorName || "—"}</span>
				<span className="proc-name">{rev.serviceName || "—"}</span>
			</td>
			<td className="cell-urgency">
				{urgency === "critical" ? (
					<span className="urgency-badge critical">
						<AlertTriangle size={12} /> Срочно (24ч)
					</span>
				) : (
					<span className={`urgency-badge ${urgency}`}>{urgency}</span>
				)}
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
					title="Перейти к переписке с пациентом"
				>
					<MessageCircle size={14} /> Чат
				</button>
			</td>
		</tr>
	);
};
