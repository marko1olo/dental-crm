/**
 * DoctorPayoutMobileWallet.tsx — Мобильный Apple Wallet кошелек сдельной оплаты врача.
 * Mandate 8e: Doctor Autonomy & Financial Sovereignty.
 * Mandate 8x: полное исключение канцелярита Т-51.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React, { useId } from "react";
import { Wallet, Calendar, FileSpreadsheet, RefreshCw } from "lucide-react";
import "../../../styles/modules/mobile-doctor-payout.css";
import { formatMonthLabel } from "./dateUtils.js";
import type { DoctorPayoutMobileWalletProps } from "./types.js";
import { DoctorWalletBalanceHeader } from "./DoctorWalletBalanceHeader.js";
import { DoctorEarningsBreakdownCard } from "./DoctorEarningsBreakdownCard.js";
import { DoctorPayoutHistoryList } from "./DoctorPayoutHistoryList.js";
import { useDoctorPayoutWallet } from "./useDoctorPayoutWallet.js";

export function DoctorPayoutMobileWallet({
	report,
	month,
	onMonthChange,
	onRefresh,
	onOpenPayrollModal,
	isLoading,
	onRequestPayout,
}: DoctorPayoutMobileWalletProps) {
	const monthInputId = useId();
	const monthLabel = formatMonthLabel(month);
	const wallet = useDoctorPayoutWallet(report);

	if (!wallet.currentDoctor) {
		return (
			<div className="doctor-wallet-container">
				<header className="doctor-wallet-header">
					<div className="doctor-wallet-title-wrap">
						<h2 className="doctor-wallet-title">Выплаты врачам</h2>
						<span className="doctor-wallet-subtitle">Расчётный кошелёк сотрудника</span>
					</div>
					<label htmlFor={monthInputId} className="doctor-wallet-month-badge">
						<Calendar size={16} />
						<span>{monthLabel}</span>
						<input id={monthInputId} type="month" className="doctor-wallet-month-input" value={month} onChange={(e) => onMonthChange(e.target.value)} />
					</label>
				</header>

				<div className="doctor-wallet-empty">
					<div className="doctor-wallet-empty-icon"><Wallet size={24} /></div>
					<h3 className="doctor-wallet-empty-title">Нет начислений за выбранный месяц</h3>
					<p className="doctor-wallet-empty-sub">В периоде {monthLabel} отсутствуют закрытые приёмы или наряды лаборатории.</p>
					<button type="button" className="doctor-wallet-primary-cta" onClick={onRefresh} disabled={isLoading}>
						<RefreshCw size={16} />
						<span>Обновить данные</span>
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="doctor-wallet-container">
			<DoctorWalletBalanceHeader
				monthLabel={monthLabel}
				month={month}
				monthInputId={monthInputId}
				onMonthChange={onMonthChange}
				availableDoctors={wallet.availableDoctors}
				currentDoctor={wallet.currentDoctor}
				onSelectDoctor={wallet.setSelectedDoctorId}
				totalWithheld={wallet.totalWithheld}
				onRequestPayout={onRequestPayout}
			/>

			<DoctorEarningsBreakdownCard categoryCards={wallet.categoryCards} />

			<DoctorPayoutHistoryList
				shifts={wallet.shifts}
				activeShift={wallet.activeShift}
				onSelectShiftDate={wallet.setActiveShiftDate}
				currentDoctor={wallet.currentDoctor}
			/>

			<div className="doctor-wallet-bottom-bar">
				<button
					type="button"
					className="doctor-wallet-primary-cta"
					onClick={() => wallet.currentDoctor && onOpenPayrollModal(wallet.currentDoctor)}
					aria-label="Открыть расчётную ведомость"
				>
					<FileSpreadsheet size={18} />
					<span>Расчёт выплат врачу</span>
				</button>

				<button
					type="button"
					className="doctor-wallet-sec-cta"
					onClick={onRefresh}
					disabled={isLoading}
					aria-label="Обновить расчёт выплат"
					title="Обновить"
				>
					<RefreshCw size={18} />
				</button>
			</div>
		</div>
	);
}
