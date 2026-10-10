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
}) => {
	const renderTopbar = () => (
		<header className="mobile-shift-topbar">
			<div className="mobile-shift-topbar-left">
				<h1 className="mobile-shift-topbar-title">Смена & Касса</h1>
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
					{isShiftOpen ? "Смена открыта" : "Смена закрыта"}
				</span>
			</div>
			<div
				className="mobile-shift-duration-badge"
				title="Время текущей рабочей смены"
				data-testid="shift-duration-timer"
			>
				<Clock size={13} aria-hidden="true" />
				<span>{elapsedTimeDisplay}</span>
			</div>
		</header>
	);

	const renderHero = () => (
		<section className="mobile-shift-hero-card" aria-label="Карточка дежурной смены">
			<div className="mobile-shift-doctor-row">
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

			<div className="mobile-shift-revenue-block">
				<div className="mobile-shift-revenue-header">
					<span className="mobile-shift-revenue-label">Выручка за смену</span>
					<strong
						className="mobile-shift-revenue-total"
						data-testid="shift-total-revenue"
					>
						{money(totalRevenueRub)}
					</strong>
				</div>

				<div className="mobile-shift-channels-grid">
					<div className="mobile-shift-channel-item">
						<span className="mobile-shift-channel-title">
							<Banknote size={11} className="inline mr-1 text-emerald-600 dark:text-emerald-400" />
							Наличные
						</span>
						<strong className="mobile-shift-channel-sum">
							{money(cashInDrawerRub)}
						</strong>
					</div>
					<div className="mobile-shift-channel-item">
						<span className="mobile-shift-channel-title">
							<CreditCard size={11} className="inline mr-1 text-sky-600 dark:text-sky-400" />
							Терминал
						</span>
						<strong className="mobile-shift-channel-sum">
							{money(cardSumRub)}
						</strong>
					</div>
					<div className="mobile-shift-channel-item">
						<span className="mobile-shift-channel-title">
							<QrCode size={11} className="inline mr-1 text-teal-600 dark:text-teal-400" />
							СБП (QR)
						</span>
						<strong className="mobile-shift-channel-sum">
							{money(sbpSumRub)}
						</strong>
					</div>
				</div>

				<div className="mobile-shift-payout-strip">
					<span className="mobile-shift-payout-label">
						<Zap size={12} />
						Гонорар врача ({doctorCommissionPct}% сдельно)
					</span>
					<strong className="mobile-shift-payout-amount">
						{money(estimatedDoctorPayoutRub)} на руки
					</strong>
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
