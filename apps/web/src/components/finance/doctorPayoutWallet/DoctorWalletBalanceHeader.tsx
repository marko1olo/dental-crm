import React from "react";
import { money } from "../../../AppHelpers";
import { Calendar, Sparkles, User } from "lucide-react";
import type { DoctorPayoutRow } from "../../../pages/payoutDashboard/types.js";

export interface DoctorWalletBalanceHeaderProps {
	readonly monthLabel: string;
	readonly month: string;
	readonly monthInputId: string;
	readonly onMonthChange: (newMonth: string) => void;
	readonly availableDoctors: readonly DoctorPayoutRow[];
	readonly currentDoctor: DoctorPayoutRow;
	readonly onSelectDoctor: (doctorUserId: string) => void;
	readonly totalWithheld: number;
	readonly onRequestPayout?: ((doctor: DoctorPayoutRow, amountKopecks: number) => void) | undefined;
}

export function DoctorWalletBalanceHeader({
	monthLabel,
	month,
	monthInputId,
	onMonthChange,
	availableDoctors,
	currentDoctor,
	onSelectDoctor,
	totalWithheld,
}: DoctorWalletBalanceHeaderProps) {
	const payoutAmountRub = currentDoctor.payoutRub ?? currentDoctor.accruedRub ?? 0;

	return (
		<>
			{/* Top Header */}
			<header className="doctor-wallet-header">
				<div className="doctor-wallet-title-wrap">
					<h2 className="doctor-wallet-title">Выплаты врачам</h2>
					<span className="doctor-wallet-subtitle">Кресельный расчётный листок</span>
				</div>

				<label
					htmlFor={monthInputId}
					className="doctor-wallet-month-badge"
					title="Сменить зарплатный месяц"
				>
					<Calendar size={16} />
					<span>{monthLabel}</span>
					<input
						id={monthInputId}
						type="month"
						className="doctor-wallet-month-input"
						value={month}
						onChange={(e) => onMonthChange(e.target.value)}
					/>
				</label>
			</header>

			{/* Doctor Selector Chips Scroller (if multi-doctor) */}
			{availableDoctors.length > 1 && (
				<nav className="doctor-wallet-chips-scroller" aria-label="Выбор врача">
					{availableDoctors.map((doc) => {
						const isSelected = doc.doctorUserId === currentDoctor.doctorUserId;
						return (
							<button
								key={doc.doctorUserId}
								type="button"
								className={`doctor-wallet-chip ${isSelected ? "doctor-wallet-chip--active" : ""}`}
								onClick={() => onSelectDoctor(doc.doctorUserId)}
							>
								<User size={14} />
								<span>{doc.doctorName}</span>
							</button>
						);
					})}
				</nav>
			)}

			{/* ── Apple Wallet Hero Card ── */}
			<article className="doctor-wallet-card" aria-label="Карточка начислений врача">
				<div className="doctor-wallet-card-top">
					<span className="doctor-wallet-card-brand">DENTE • PAYOUT</span>
					<span className="doctor-wallet-card-status">
						<Sparkles size={12} />
						<span>К ВЫПЛАТЕ</span>
					</span>
				</div>

				<h3 className="doctor-wallet-card-doctor">{currentDoctor.doctorName}</h3>
				<p className="doctor-wallet-card-role">{currentDoctor.role}</p>

				<div className="doctor-wallet-card-center">
					<div className="doctor-wallet-card-amount">
						{money(payoutAmountRub)}
					</div>
					<div className="doctor-wallet-card-amount-sub">
						Начислено за {monthLabel}
					</div>
				</div>

				<div className="doctor-wallet-card-stats">
					<div className="doctor-wallet-card-stat">
						<span className="doctor-wallet-card-stat-label">Касса</span>
						<span className="doctor-wallet-card-stat-val">
							{money(currentDoctor.revenueRub)}
						</span>
					</div>

					<div className="doctor-wallet-card-stat">
						<span className="doctor-wallet-card-stat-label">Удержано</span>
						<span
							className={`doctor-wallet-card-stat-val ${
								totalWithheld > 0 ? "doctor-wallet-card-stat-val--danger" : ""
							}`}
						>
							{totalWithheld > 0 ? `−${money(totalWithheld)}` : money(0)}
						</span>
					</div>

					<div className="doctor-wallet-card-stat">
						<span className="doctor-wallet-card-stat-label">Ставка</span>
						<span className="doctor-wallet-card-stat-val">
							{currentDoctor.commissionPct !== null ? `${currentDoctor.commissionPct}%` : "—"}
						</span>
					</div>
				</div>
			</article>
		</>
	);
}
