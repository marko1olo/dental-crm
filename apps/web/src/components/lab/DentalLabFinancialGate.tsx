import type React from "react";
import type { DentalLabFinancialGateResult } from "./dentalLabFinancialGateEngine";
import { DentalLabFinancialGateBanner } from "./financialGateModules/DentalLabFinancialGateBanner";
import { DentalLabFinancialGateModal } from "./financialGateModules/DentalLabFinancialGateModal";

export interface DentalLabFinancialGateProps {
	readonly gateResult: DentalLabFinancialGateResult;
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly patientName?: string;
	readonly stageTitle?: string;
	readonly doctorName?: string;
	readonly defaultDoctorName?: string;
	readonly defaultChiefDoctorName?: string;
	readonly variant?: "modal" | "inline" | "banner";
	readonly onConfirmOverride?: (override: {
		authorized: boolean;
		doctorName: string;
		timestampIso: string;
		reason: string;
	}) => void;
	readonly onBlock?: () => void;
	readonly onOpenInstallmentModal?: () => void;
	readonly onAcceptAdvancePayment?: () => void;
}

export const DentalLabFinancialGate: React.FC<DentalLabFinancialGateProps> = ({
	gateResult,
	isOpen = true,
	variant = "banner",
	onConfirmOverride,
}) => {
	if (!isOpen) return null;

	const isPaid = gateResult.isGatePassed || gateResult.paidPercent >= 100;
	const percent = gateResult.paidPercent ?? 0;
	const label = isPaid
		? "Оплачено 100%"
		: percent > 0
			? `Предоплата ${percent}%`
			: "Без предоплаты";

	if (variant === "modal") {
		return (
			<DentalLabFinancialGateModal
				isPaid={isPaid}
				label={label}
				onConfirmOverride={onConfirmOverride}
			/>
		);
	}

	return (
		<DentalLabFinancialGateBanner
			gateResult={gateResult}
			isPaid={isPaid}
			label={label}
			onConfirmOverride={onConfirmOverride}
		/>
	);
};

export default DentalLabFinancialGate;
