import React from "react";
import type { Fiscal54FzSplitResult } from "./loyaltyEngine";
import {
	LoyaltyModalHeader,
	LoyaltyModalTabNav,
	useLoyaltyModalState,
} from "./modalModules";
import { LoyaltyModalTabContent } from "./modalModules/LoyaltyModalTabContent";
import "./loyaltyProgram.css";

export interface LoyaltyProgramModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly initialPointsBalance?: number | undefined;
	readonly initialLifetimeSpentKop?: number | undefined;
	readonly currentInvoiceAmountKop?: number | undefined;
	readonly onRedeemSuccess?: (
		redeemedPointsRub: number,
		fiscalSplit: Fiscal54FzSplitResult
	) => void;
}

export const LoyaltyProgramModal: React.FC<LoyaltyProgramModalProps> = (props) => {
	const { isOpen, onClose, clinicName = "ООО «Денте Стоматология»", patientName = "Пациент", medicalCardNumber = "" } = props;
	const m = useLoyaltyModalState(props);

	if (!isOpen) return null;

	return (
		<div className="loyalty-modal-overlay" onClick={onClose}>
			<div
				className="loyalty-modal-container"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-labelledby="loyalty-modal-title"
			>
				<LoyaltyModalHeader
					clinicName={clinicName}
					patientName={patientName}
					medicalCardNumber={medicalCardNumber}
					onClose={onClose}
				/>
				<LoyaltyModalTabNav
					activeTab={m.activeTab}
					onSelectTab={m.setActiveTab}
				/>
				<LoyaltyModalTabContent
					m={m}
					patientName={patientName}
					clinicName={clinicName}
				/>
			</div>
		</div>
	);
};

export default LoyaltyProgramModal;
