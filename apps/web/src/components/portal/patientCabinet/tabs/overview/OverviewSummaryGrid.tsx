import React from "react";
import { Calendar, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import type { PatientCabinetSummary } from "../../patientCabinetEngine";
import { formatRubles } from "../../patientCabinetEngine";

export interface OverviewSummaryGridProps {
	readonly summary: PatientCabinetSummary;
}

export const OverviewSummaryGrid: React.FC<OverviewSummaryGridProps> = ({ summary }) => {
	return (
		<div className="pc-summary-grid">
			<div className="pc-metric-card">
				<div className="pc-metric-icon primary">
					<CreditCard size={20} />
				</div>
				<div className="pc-metric-content">
					<span className="pc-metric-label">Счета к оплате</span>
					<span className="pc-metric-value">{formatRubles(summary.totalUnpaidAmountRub)}</span>
				</div>
			</div>

			<div className="pc-metric-card">
				<div className="pc-metric-icon success">
					<ShieldCheck size={20} />
				</div>
				<div className="pc-metric-content">
					<span className="pc-metric-label">Активных гарантий</span>
					<span className="pc-metric-value">{summary.activeWarrantiesCount} паспортов</span>
				</div>
			</div>

			<div className="pc-metric-card">
				<div className="pc-metric-icon warning">
					<Sparkles size={20} />
				</div>
				<div className="pc-metric-content">
					<span className="pc-metric-label">Бонусный счет</span>
					<span className="pc-metric-value">{summary.loyaltyBonusBalance.toLocaleString("ru-RU")} ₽</span>
				</div>
			</div>

			<div className="pc-metric-card">
				<div className="pc-metric-icon primary">
					<Calendar size={20} />
				</div>
				<div className="pc-metric-content">
					<span className="pc-metric-label">Визиты</span>
					<span className="pc-metric-value">{summary.upcomingAppointmentsCount} запланировано</span>
				</div>
			</div>
		</div>
	);
};
