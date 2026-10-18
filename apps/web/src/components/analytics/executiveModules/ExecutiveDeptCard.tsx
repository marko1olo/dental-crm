import React from "react";
import type { ExecutiveDepartmentItem } from "@dental/shared";
import { formatRublesClean } from "./executiveAnalyticsTypes";
import { getProgressFillColor, getStatusPill } from "./executivePnlPills";

interface ExecutiveDeptCardProps {
	readonly dept: ExecutiveDepartmentItem;
}

export function ExecutiveDeptCard({ dept }: ExecutiveDeptCardProps) {
	const progressWidth = Math.min(100, Math.max(2, dept.planFulfillmentPercent));

	return (
		<div className="executive-dept-card">
			<div className="dept-card-header">
				<div className="dept-name-wrap">
					<span
						className="dept-color-dot"
						style={{ background: dept.accentColor }}
						aria-hidden="true"
					/>
					<span className="dept-title">{dept.titleRu}</span>
				</div>
				{getStatusPill(dept.status, dept.statusLabel)}
			</div>

			<div className="dept-financials">
				<div>
					<div className="dept-fact-val">{formatRublesClean(dept.factRevenueFormatted)}</div>
					<div className="dept-plan-val">План: {formatRublesClean(dept.planRevenueFormatted)}</div>
				</div>
				<div style={{ textAlign: "right" }}>
					<div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
						{dept.planFulfillmentPercent}%
					</div>
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Доля: {dept.shareOfTotalRevenuePercent}%
					</div>
				</div>
			</div>

			<div className="dept-progress-bar-wrap" aria-hidden="true">
				<div className="dept-progress-track">
					<div
						className="dept-progress-fill"
						style={{
							width: `${progressWidth}%`,
							background: getProgressFillColor(dept.status, dept.accentColor),
						}}
					/>
				</div>
			</div>

			<div className="dept-submetrics">
				<span>Ср. чек: <strong>{formatRublesClean(dept.averageCheckFormatted)}</strong></span>
				<span>Визитов: <strong>{dept.completedVisitsCount}</strong></span>
				<span>Пациентов: <strong>{dept.uniquePatientsCount}</strong></span>
			</div>
		</div>
	);
}
