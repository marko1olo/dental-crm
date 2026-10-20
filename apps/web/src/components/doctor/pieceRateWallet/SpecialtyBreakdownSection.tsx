/**
 * SpecialtyBreakdownSection.tsx — Сетка ставок и разбивки начислений по специальностям.
 */

import React from "react";
import type { DoctorEarningsCategoryBreakdown } from "./types.js";

export interface SpecialtyBreakdownSectionProps {
	readonly specialtyBreakdown: readonly DoctorEarningsCategoryBreakdown[];
}

export const SpecialtyBreakdownSection: React.FC<
	SpecialtyBreakdownSectionProps
> = ({ specialtyBreakdown }) => {
	if (specialtyBreakdown.length === 0) return null;

	return (
		<div className="dpr-specialty-section">
			<div className="dpr-specialty-title">Разбивка по специальностям и ставкам</div>
			<div className="dpr-specialty-grid">
				{specialtyBreakdown.map((spec) => (
					<div key={spec.category} className="dpr-specialty-chip">
						<div className="dpr-specialty-header">
							<span>{spec.categoryRu}</span>
							<span className="dpr-specialty-badge">{spec.commissionPercent}%</span>
						</div>
						<div className="dpr-specialty-stats">
							<span>Выручка: {spec.grossRevenueRub.toLocaleString("ru-RU")} ₽</span>
							{spec.labDeductionsRub > 0 && (
								<span className="dpr-text-muted-deduction">
									ЗТЛ: −{spec.labDeductionsRub.toLocaleString("ru-RU")} ₽
								</span>
							)}
							<span className="dpr-text-teal">
								+{spec.doctorEarnedRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
