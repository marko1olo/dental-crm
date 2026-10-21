/**
 * PhasedStageFooterActions.tsx — Нижняя панель действий по 4-стадийному плану лечения
 * для ПК/планшета и адаптивный Floating Bottom Bar в зоне большого пальца для смартфонов.
 */

import React from "react";
import type { InstallmentMonthsOption } from "./types.js";
import { PhasedDesktopFooterPanel } from "./footer/PhasedDesktopFooterPanel.js";
import { PhasedMobileFloatingBottomBar } from "./footer/PhasedMobileFloatingBottomBar.js";

export interface PhasedStageFooterActionsProps {
	readonly totalItemsCount: number;
	readonly grandTotalRub: number;
	readonly installmentMonths: InstallmentMonthsOption;
	readonly installmentMonthlyRub: number;
	readonly planApproved: boolean;
	readonly patientName?: string | undefined;
	readonly onApprovePlan: () => void;
	readonly onOpenInstallment?: ((totalRub: number) => void) | undefined;
	readonly onOpenStagePayment?: ((amountRub: number) => void) | undefined;
	readonly onPrintContract?: (() => void) | undefined;
}

export const PhasedStageFooterActions: React.FC<PhasedStageFooterActionsProps> = ({
	totalItemsCount,
	grandTotalRub,
	installmentMonths,
	installmentMonthlyRub,
	planApproved,
	patientName,
	onApprovePlan,
	onOpenInstallment,
	onOpenStagePayment,
	onPrintContract,
}) => {
	return (
		<>
			<PhasedDesktopFooterPanel
				totalItemsCount={totalItemsCount}
				grandTotalRub={grandTotalRub}
				installmentMonths={installmentMonths}
				installmentMonthlyRub={installmentMonthlyRub}
				planApproved={planApproved}
				patientName={patientName}
				onApprovePlan={onApprovePlan}
				onOpenInstallment={onOpenInstallment}
				onOpenStagePayment={onOpenStagePayment}
				onPrintContract={onPrintContract}
			/>

			<PhasedMobileFloatingBottomBar
				grandTotalRub={grandTotalRub}
				installmentMonths={installmentMonths}
				installmentMonthlyRub={installmentMonthlyRub}
				planApproved={planApproved}
				onApprovePlan={onApprovePlan}
				onOpenInstallment={onOpenInstallment}
				onPrintContract={onPrintContract}
			/>
		</>
	);
};
