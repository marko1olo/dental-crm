import type { VisitPatientEntity } from "../VisitViewProps";
import { VisitHeaderMoreActionsBillingItems } from "./VisitHeaderMoreActionsBillingItems";
import { VisitHeaderMoreActionsPrintFinanceItems } from "./VisitHeaderMoreActionsPrintFinanceItems";

export interface VisitHeaderMoreActionsFinanceItemsProps {
	activePatient: VisitPatientEntity | null | undefined;
	onCloseMenu: () => void;
	handlePrintCompletedActFast: () => void;
	handlePrintEstimateFast: () => void;
	setIsWarrantyModalOpen?: ((open: boolean) => void) | undefined;
	setIsDoctorShiftModalOpen: (open: boolean) => void;
	setIsPriceValidatorModalOpen: (open: boolean) => void;
	setIsStagePaymentModalOpen: (open: boolean) => void;
	setIsPrescriptionModalOpen?: ((open: boolean) => void) | undefined;
}

export function VisitHeaderMoreActionsFinanceItems(props: VisitHeaderMoreActionsFinanceItemsProps) {
	return (
		<>
			<VisitHeaderMoreActionsPrintFinanceItems
				onCloseMenu={props.onCloseMenu}
				handlePrintCompletedActFast={props.handlePrintCompletedActFast}
				handlePrintEstimateFast={props.handlePrintEstimateFast}
				setIsWarrantyModalOpen={props.setIsWarrantyModalOpen}
			/>
			<VisitHeaderMoreActionsBillingItems
				activePatient={props.activePatient}
				onCloseMenu={props.onCloseMenu}
				setIsDoctorShiftModalOpen={props.setIsDoctorShiftModalOpen}
				setIsPriceValidatorModalOpen={props.setIsPriceValidatorModalOpen}
				setIsStagePaymentModalOpen={props.setIsStagePaymentModalOpen}
				setIsPrescriptionModalOpen={props.setIsPrescriptionModalOpen}
			/>
		</>
	);
}
