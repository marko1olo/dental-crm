import React from "react";
import { Clock } from "lucide-react";
import type { MobileShiftCockpitProps } from "./types";
import { MobileShiftHeroCard } from "./MobileShiftHeroCard";

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
}) => {
	const renderTopbar = () => (
		<header className="mobile-shift-topbar">
			<div className="mobile-shift-topbar-left">
				<h1 className="mobile-shift-topbar-title">Смена врача</h1>
				<span className={`mobile-shift-status-pill ${isShiftOpen ? "open" : "closed"}`} data-testid="shift-status-pill">
					<span
						className="w-2 h-2 rounded-full shrink-0"
						style={{ background: isShiftOpen ? "var(--ok-fg, #15803d)" : "var(--warn-fg, #c2410c)" }}
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
				<div className="mobile-shift-duration-badge" title="Время текущей рабочей смены" data-testid="shift-duration-timer">
					<Clock size={13} aria-hidden="true" />
					<span>{elapsedTimeDisplay}</span>
				</div>
			</div>
		</header>
	);

	const renderHero = () => (
		<MobileShiftHeroCard
			doctorName={doctorName}
			doctorSpecialty={doctorSpecialty}
			cabinetName={cabinetName}
			totalRevenueRub={totalRevenueRub}
			cashInDrawerRub={cashInDrawerRub}
			cardSumRub={cardSumRub}
			sbpSumRub={sbpSumRub}
			doctorCommissionPct={doctorCommissionPct}
			estimatedDoctorPayoutRub={estimatedDoctorPayoutRub}
		/>
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
