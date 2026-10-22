import type React from "react";
import { MoreHorizontal } from "lucide-react";
import type { VisitPatientEntity } from "../VisitViewProps";
import { VisitHeaderMoreActionsClinicalItems } from "./VisitHeaderMoreActionsClinicalItems";
import { VisitHeaderMoreActionsFinanceItems } from "./VisitHeaderMoreActionsFinanceItems";

export interface VisitHeaderMoreActionsDropdownProps {
	activePatient: VisitPatientEntity | null | undefined;
	isHeaderMoreMenuOpen: boolean;
	setIsHeaderMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	headerMoreMenuRef: React.RefObject<HTMLDivElement | null>;
	setIsQueueCockpitForced: (forced: boolean) => void;
	setSelectedPatientId?: ((id: string | null) => void) | undefined;
	appLogic?: any;
	setIsEmergencyModalOpen: (open: boolean) => void;
	handlePrintForm043uFast: () => void;
	handlePrintCompletedActFast: () => void;
	handlePrintEstimateFast: () => void;
	handleOpenLabOrder: () => void;
	onOpenVisiographComparison?: (() => void) | undefined;
	setIsVisiographComparisonModalOpen?: ((open: boolean) => void) | undefined;
	handlePrintInformedConsentFast: () => void;
	setIsWarrantyModalOpen?: ((open: boolean) => void) | undefined;
	setIsDoctorShiftModalOpen: (open: boolean) => void;
	setIsPriceValidatorModalOpen: (open: boolean) => void;
	setIsStagePaymentModalOpen: (open: boolean) => void;
	setIsPrescriptionModalOpen?: ((open: boolean) => void) | undefined;
}

export function VisitHeaderMoreActionsDropdown(props: VisitHeaderMoreActionsDropdownProps) {
	const { isHeaderMoreMenuOpen, setIsHeaderMoreMenuOpen, headerMoreMenuRef } = props;
	const onCloseMenu = () => setIsHeaderMoreMenuOpen(false);

	return (
		<div className="relative shrink-0" ref={headerMoreMenuRef as any}>
			<button
				type="button"
				onClick={() => setIsHeaderMoreMenuOpen((prev) => !prev)}
				data-testid="visit-header-more-actions-btn"
				className="secondary-button h-9 min-h-[36px] min-w-[36px] w-9 p-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center cursor-pointer shrink-0 rounded-xl shadow-xs transition-colors"
				title="Дополнительные действия"
				aria-label="Дополнительные действия"
				aria-expanded={isHeaderMoreMenuOpen}
			>
				<MoreHorizontal className="w-4 h-4 text-[var(--ink-muted)] shrink-0" aria-hidden="true" />
			</button>

			{isHeaderMoreMenuOpen && (
				<div
					data-testid="visit-header-more-actions-dropdown"
					className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xl z-50 p-1.5 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
					role="menu"
				>
					<VisitHeaderMoreActionsClinicalItems
						activePatient={props.activePatient}
						onCloseMenu={onCloseMenu}
						setIsQueueCockpitForced={props.setIsQueueCockpitForced}
						setSelectedPatientId={props.setSelectedPatientId}
						appLogic={props.appLogic}
						setIsEmergencyModalOpen={props.setIsEmergencyModalOpen}
						handlePrintForm043uFast={props.handlePrintForm043uFast}
						handleOpenLabOrder={props.handleOpenLabOrder}
						onOpenVisiographComparison={props.onOpenVisiographComparison}
						setIsVisiographComparisonModalOpen={props.setIsVisiographComparisonModalOpen}
						handlePrintInformedConsentFast={props.handlePrintInformedConsentFast}
					/>
					<VisitHeaderMoreActionsFinanceItems
						activePatient={props.activePatient}
						onCloseMenu={onCloseMenu}
						handlePrintCompletedActFast={props.handlePrintCompletedActFast}
						handlePrintEstimateFast={props.handlePrintEstimateFast}
						setIsWarrantyModalOpen={props.setIsWarrantyModalOpen}
						setIsDoctorShiftModalOpen={props.setIsDoctorShiftModalOpen}
						setIsPriceValidatorModalOpen={props.setIsPriceValidatorModalOpen}
						setIsStagePaymentModalOpen={props.setIsStagePaymentModalOpen}
						setIsPrescriptionModalOpen={props.setIsPrescriptionModalOpen}
					/>
				</div>
			)}
		</div>
	);
}
