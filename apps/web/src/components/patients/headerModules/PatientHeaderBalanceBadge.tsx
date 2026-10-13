/**
 * DENTE CRM — Patient Header Balance Badge
 * (DOMAIN: 54-FZ Fiscal Balance & One-Click Navigation to Cash Desk)
 */

import React from "react";
import { usePatientStore } from "../../../store/patientStore";
import { useAppStore } from "../../../store/appStore";
import { showToast } from "../../GlobalToast";

export interface PatientHeaderBalanceBadgeProps {
	patientId?: string | undefined;
	patientFullName?: string | undefined;
	balance: number;
}

export const PatientHeaderBalanceBadge: React.FC<PatientHeaderBalanceBadgeProps> = ({
	patientId,
	patientFullName,
	balance,
}) => {
	const handleQuickFinanceNav = () => {
		if (patientId) {
			usePatientStore.getState().setSelectedPatientId(patientId);
		}
		useAppStore.getState().setCurrentView("finance");
		showToast(
			patientFullName ? `Открыта касса: ${patientFullName}` : "Открыта касса",
			"info",
		);
	};

	const balanceText =
		balance > 0
			? `+${balance.toLocaleString("ru-RU")} ₽`
			: balance < 0
				? `Долг: ${Math.abs(balance).toLocaleString("ru-RU")} ₽`
				: "0 ₽";

	const tooltip =
		balance > 0
			? "Аванс / Депозит пациента (клик — открыть кассу)"
			: balance < 0
				? "Задолженность за оказанные услуги (клик — открыть кассу)"
				: "Баланс нулевой — все услуги оплачены (клик — открыть кассу)";

	const badgeColorClasses =
		balance > 0
			? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/25"
			: balance < 0
				? "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40 hover:bg-rose-500/25"
				: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:bg-[var(--paper)]";

	return (
		<button
			type="button"
			onClick={handleQuickFinanceNav}
			className={`px-2 py-1 rounded-lg text-xs font-black font-mono shrink-0 whitespace-nowrap border cursor-pointer transition-colors ${badgeColorClasses}`}
			title={tooltip}
			data-testid="header-balance-badge"
		>
			{balanceText}
		</button>
	);
};
