import React from "react";
import { Banknote, CreditCard, QrCode, Zap } from "lucide-react";
import { money } from "../../../AppHelpers";

export interface MobileShiftHeroCardProps {
	readonly doctorName?: string;
	readonly doctorSpecialty?: string;
	readonly cabinetName?: string;
	readonly totalRevenueRub?: number;
	readonly cashInDrawerRub?: number;
	readonly cardSumRub?: number;
	readonly sbpSumRub?: number;
	readonly doctorCommissionPct?: number;
	readonly estimatedDoctorPayoutRub?: number;
	readonly userRole?: string | undefined;
}

export const MobileShiftHeroCard: React.FC<MobileShiftHeroCardProps> = ({
	doctorName = "Д-р Смирнова Е.В.",
	doctorSpecialty = "Врач-стоматолог терапевт-ортопед",
	cabinetName = "Кабинет 1 (Основной)",
	totalRevenueRub = 42500,
	cashInDrawerRub = 15000,
	cardSumRub = 22500,
	sbpSumRub = 5000,
	doctorCommissionPct = 30,
	estimatedDoctorPayoutRub = 12750,
	userRole,
}) => {
	const isDoctor = userRole === "doctor";

	return (
	<section
		className="mobile-shift-hero-card"
		aria-label="Карточка дежурной смены"
		style={{ padding: "14px 16px", gap: "12px" }}
	>
		<div className="mobile-shift-doctor-row" style={{ marginBottom: 0 }}>
			<div className="mobile-shift-doctor-info">
				<div className="mobile-shift-doctor-avatar">
					{doctorName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
				</div>
				<div className="mobile-shift-doctor-meta">
					<h2 className="mobile-shift-doctor-name">{doctorName}</h2>
					<p className="mobile-shift-doctor-spec">{doctorSpecialty}</p>
				</div>
			</div>
			<span className="mobile-shift-cabinet-chip">{cabinetName}</span>
		</div>

		<div className="mobile-shift-revenue-block" data-testid="mobile-shift-revenue-block">
			<div className="mobile-shift-revenue-header">
				<span className="mobile-shift-revenue-label">Выручка за день</span>
				<span className="mobile-shift-revenue-total" data-testid="mobile-shift-total-revenue">
					{money(totalRevenueRub)}
				</span>
			</div>

			{!isDoctor && (
				<div className="mobile-shift-channels-grid">
					<div className="mobile-shift-channel-item">
						<span className="mobile-shift-channel-title" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
							<Banknote size={11} /> Наличные
						</span>
						<span className="mobile-shift-channel-sum">{money(cashInDrawerRub)}</span>
					</div>
					<div className="mobile-shift-channel-item">
						<span className="mobile-shift-channel-title" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
							<CreditCard size={11} /> POS карты
						</span>
						<span className="mobile-shift-channel-sum">{money(cardSumRub)}</span>
					</div>
					<div className="mobile-shift-channel-item">
						<span className="mobile-shift-channel-title" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
							<QrCode size={11} /> СБП QR
						</span>
						<span className="mobile-shift-channel-sum">{money(sbpSumRub)}</span>
					</div>
				</div>
			)}

			<div className="mobile-shift-payout-strip">
				<span className="mobile-shift-payout-label">
					<Zap size={12} />
					Начислено врачу ({doctorCommissionPct}%):
				</span>
				<span className="mobile-shift-payout-amount">{money(estimatedDoctorPayoutRub)}</span>
			</div>
		</div>
	</section>
	);
};
