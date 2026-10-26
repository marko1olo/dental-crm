import React from "react";
import { money } from "../../AppHelpers";
import { formatRub as shortRub } from "../../pages/analyticsDoctorMetrics.js";
import type { ReportsSummary } from "./ManagerReportsTypes";
import { safePercentWidth } from "./reportsCsvExport";

export interface ManagerReportsRevenueBarsProps {
	readonly summary: ReportsSummary;
	readonly maxRevenue: number;
}

export function ManagerReportsRevenueBars({
	summary,
	maxRevenue,
}: ManagerReportsRevenueBarsProps) {
	return (
		<>
			<h3 className="ops-section-title">Выручка</h3>
			{summary.revenue?.isEmpty || !summary.revenue?.points ? (
				<p className="ops-empty">Платежей за период не было.</p>
			) : (
				<ul className="ops-bars">
					{(summary.revenue?.points ?? []).map((point, idx) => (
						<li className="ops-bar" key={point?.bucket ?? `rev-pt-${idx}`}>
							<span className="ops-bar__label">{point?.bucket ?? ""}</span>
							<span
								className="ops-bar__track"
								title={`${point?.paymentCount ?? 0} платеж(ей), ${point?.payingPatients ?? 0} пациент(ов)`}
							>
								<span
									className="ops-bar__fill"
									style={{
										width: `${safePercentWidth(point?.revenueRub, maxRevenue, 2)}%`,
									}}
								/>
							</span>
							<span className="ops-bar__value" title={money(point?.revenueRub ?? 0)}>
								{shortRub(point?.revenueRub ?? 0)}
							</span>
						</li>
					))}
				</ul>
			)}
		</>
	);
}
