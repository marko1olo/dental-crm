import React from "react";
import { Clock, Banknote, CreditCard, QrCode, Zap } from "lucide-react";
import { money } from "../../../AppHelpers";
import type { MobileShiftCockpitProps } from "./types";

export interface ShiftMetricsHeaderProps extends MobileShiftCockpitProps {
	elapsedTimeDisplay: string;
	topbarOnly?: boolean;
	heroOnly?: boolean;
}

export const ShiftMetricsHeader: React.FC<ShiftMetricsHeaderProps> = ({
	isShiftOpen,
	doctorName = "Д-р Смирнова Е.В.",
	doctorSpecialty = "Врач-стоматолог терапевт-ортопед",
	cabinetName = "Кабинет 1 (Основной)",
	totalRevenueRub = 42500,
	cashInDrawerRub = 15000,
	cardSumRub = 22500,
	sbpSumRub = 5000,
	doctorCommissionPct = 30,
	estimatedDoctorPayoutRub = 12750,
	elapsedTimeDisplay,
	topbarOnly,
	heroOnly,
	chairRentalTimerDisplay,
	isChairRentalActive,
}) => {
	const renderTopbar = () => (
		<header className="mobile-shift-topbar">
			<div className="mobile-shift-topbar-left">
				<h1 className="mobile-shift-topbar-title">Смена врача</h1>
				<span
					className={`mobile-shift-status-pill ${isShiftOpen ? "open" : "closed"}`}
					data-testid="shift-status-pill"
				>
					<span
						className="w-2 h-2 rounded-full shrink-0"
						style={{
							background: isShiftOpen ? "var(--ok-fg, #15803d)" : "var(--warn-fg, #c2410c)",
						}}
						aria-hidden="true"
					/>
					{isShiftOpen ? "Открыта" : "Закрыта"}
				</span>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
				{chairRentalTimerDisplay && (
					<div
						className="mobile-shift-duration-badge"
						style={{
							background: "color-mix(in srgb, var(--ok-fg, #15803d) 12%, transparent)",
							color: "var(--ok-fg, #15803d)",
							borderColor: "color-mix(in srgb, var(--ok-fg, #15803d) 25%, transparent)",
						}}
						title="Таймер аренды кресла"
						data-testid="chair-rental-timer"
					>
						<Clock size={13} aria-hidden="true" />
						<span>Аренда: {chairRentalTimerDisplay}</span>
					</div>
				)}
				<div
					className="mobile-shift-duration-badge"
					title="Время текущей рабочей смены"
					data-testid="shift-duration-timer"
				>
					<Clock size={13} aria-hidden="true" />
					<span>{elapsedTimeDisplay}</span>
				</div>
			</div>
		</header>
	);

	const renderHero = () => (
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

			{/* Grouped Card Apple HIG: Revenue Dominance & Channels Breakdown */}
			<div className="mobile-shift-revenue-block" data-testid="mobile-shift-revenue-block">
				<div className="mobile-shift-revenue-header">
					<span className="mobile-shift-revenue-label">Выручка за день</span>
					<span className="mobile-shift-revenue-total" data-testid="mobile-shift-total-revenue">
						{money(totalRevenueRub)}
					</span>
				</div>

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

	if (topbarOnly) return renderTopbar();
	if (heroOnly) return renderHero();
	return (
		<>
			{renderTopbar()}
			{renderHero()}
		</>
	);
};

