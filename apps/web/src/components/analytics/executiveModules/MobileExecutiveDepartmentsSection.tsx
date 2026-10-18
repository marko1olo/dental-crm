import React from "react";

export interface MobileDepartmentItem {
	key: string;
	title: string;
	sub: string;
	fact: string;
	percent: number;
	status: "success" | "warning" | "neutral";
}

interface MobileExecutiveDepartmentsSectionProps {
	readonly departmentsData: MobileDepartmentItem[];
}

export function MobileExecutiveDepartmentsSection({
	departmentsData,
}: MobileExecutiveDepartmentsSectionProps) {
	return (
		<section className="mobile-exec-section" aria-label="План и факт по направлениям">
			<div className="mobile-exec-section-header">
				<span className="mobile-exec-section-title">План / факт по отделениям</span>
				<span className="mobile-exec-section-count">{departmentsData.length} отделений</span>
			</div>
			<div className="mobile-exec-grouped-card">
				{departmentsData.length > 0 ? (
					departmentsData.map((dept) => (
						<div key={dept.key} className="mobile-exec-grouped-row">
							<div className="grouped-row-left">
								<div className="grouped-row-meta">
									<div className="grouped-row-name">{dept.title}</div>
									<div className="grouped-row-sub">{dept.sub}</div>
								</div>
							</div>
							<div className="grouped-row-right">
								<div className="grouped-row-amount font-mono">{dept.fact}</div>
								<div className="grouped-row-status">
									<span className={`kpi-pill-mini ${dept.status === "success" ? "kpi-badge-success" : dept.status === "warning" ? "kpi-badge-warning" : "kpi-badge-neutral"}`}>
										{dept.percent}% плана
									</span>
								</div>
							</div>
						</div>
					))
				) : (
					<div style={{ padding: "1.25rem", textAlign: "center", fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
						Показатели отделений появятся после оказания услуг
					</div>
				)}
			</div>
		</section>
	);
}
