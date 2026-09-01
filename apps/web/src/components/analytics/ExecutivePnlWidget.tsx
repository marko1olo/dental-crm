/**
 * apps/web/src/components/analytics/ExecutivePnlWidget.tsx
 *
 * План/факт выручки клиники с разбивкой по 5 клиническим отделениям (Фича #29).
 *
 * 1. Терапия
 * 2. Ортопедия
 * 3. Хирургия и Имплантация
 * 4. Ортодонтия
 * 5. Детская стоматология
 */

import React from "react";
import type { ExecutiveDepartmentItem, DepartmentPerformanceStatus } from "@dental/shared";
import { Stethoscope, Activity, ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle } from "lucide-react";

export interface ExecutivePnlWidgetProps {
	readonly departments: readonly ExecutiveDepartmentItem[];
	readonly totalRevenueFormatted: string;
	readonly totalPlanFormatted: string;
	readonly overallFulfillmentPercent: number;
}

export const ExecutivePnlWidget: React.FC<ExecutivePnlWidgetProps> = ({
	departments,
	totalRevenueFormatted,
	totalPlanFormatted,
	overallFulfillmentPercent,
}) => {
	const getStatusPill = (status: DepartmentPerformanceStatus, label: string) => {
		switch (status) {
			case "ahead":
				return (
					<span className="executive-pill executive-pill-success">
						<ArrowUpRight size={12} aria-hidden="true" />
						{label}
					</span>
				);
			case "on_track":
				return (
					<span className="executive-pill executive-pill-success">
						<CheckCircle size={12} aria-hidden="true" />
						{label}
					</span>
				);
			case "behind":
				return (
					<span className="executive-pill executive-pill-warning">
						<ArrowDownRight size={12} aria-hidden="true" />
						{label}
					</span>
				);
			case "critical":
				return (
					<span className="executive-pill executive-pill-danger">
						<AlertCircle size={12} aria-hidden="true" />
						{label}
					</span>
				);
		}
	};

	const getProgressFillColor = (status: DepartmentPerformanceStatus, accent: string) => {
		switch (status) {
			case "ahead":
				return "var(--ok-fg, #10b981)";
			case "on_track":
				return accent || "var(--teal, #0d9488)";
			case "behind":
				return "var(--warn-fg, #f59e0b)";
			case "critical":
				return "var(--err-fg, #ef4444)";
		}
	};

	return (
		<div className="executive-dept-list" role="region" aria-label="План/факт выручки по отделениям клиники">
			{/* Сводная строка итогов */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "0.875rem 1.25rem",
					background: "var(--paper, #f1f5f9)",
					border: "1px solid var(--line, #cbd5e1)",
					borderRadius: "8px",
					fontWeight: 600,
					fontSize: "0.875rem",
					flexWrap: "wrap",
					gap: "0.5rem",
				}}
			>
				<div>
					<span>Итого по клинике: </span>
					<strong style={{ fontSize: "1rem", color: "var(--ink, #0f172a)", marginLeft: "0.25rem" }}>
						{totalRevenueFormatted}
					</strong>
					<span style={{ color: "var(--muted, #64748b)", marginLeft: "0.5rem" }}>
						(план: {totalPlanFormatted})
					</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<span>Выполнение: </span>
					<strong style={{ color: overallFulfillmentPercent >= 95 ? "var(--ok-fg, #10b981)" : "var(--warn-fg, #f59e0b)" }}>
						{overallFulfillmentPercent}%
					</strong>
				</div>
			</div>

			{/* Список 5 отделений */}
			{departments.map((dept) => {
				const progressWidth = Math.min(100, Math.max(2, dept.planFulfillmentPercent));

				return (
					<div key={dept.departmentKey} className="executive-dept-card">
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
								<div className="dept-fact-val">{dept.factRevenueFormatted}</div>
								<div className="dept-plan-val">План: {dept.planRevenueFormatted}</div>
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

						{/* Прогресс-бар выполнения */}
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

						{/* Дополнительные показатели отделения */}
						<div className="dept-submetrics">
							<span>
								Ср. чек: <strong>{dept.averageCheckFormatted}</strong>
							</span>
							<span>
								Визитов: <strong>{dept.completedVisitsCount}</strong>
							</span>
							<span>
								Пациентов: <strong>{dept.uniquePatientsCount}</strong>
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
};
