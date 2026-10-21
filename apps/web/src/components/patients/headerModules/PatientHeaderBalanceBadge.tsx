import { Wallet } from "lucide-react";
import type React from "react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";

export interface PatientHeaderBalanceBadgeProps {
	readonly patientId?: string | undefined;
	readonly patientFullName?: string | undefined;
	readonly balance: number;
}

export const PatientHeaderBalanceBadge: React.FC<
	PatientHeaderBalanceBadgeProps
> = ({ patientId, patientFullName, balance }) => {
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
			? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15"
			: balance < 0
				? "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/15"
				: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:bg-[var(--paper)]";

	return (
		<button
			type="button"
			onClick={handleQuickFinanceNav}
			className={`min-h-[36px] h-9 px-3 rounded-xl text-xs font-mono font-bold shrink-0 whitespace-nowrap border cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-2xs ${badgeColorClasses}`}
			title={tooltip}
			data-testid="header-balance-badge"
		>
			<Wallet size={14} className="shrink-0 opacity-80" />
			<span>{balanceText}</span>
		</button>
	);
};
