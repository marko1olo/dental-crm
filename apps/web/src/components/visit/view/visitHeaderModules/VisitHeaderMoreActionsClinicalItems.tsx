import type { VisitPatientEntity } from "../VisitViewProps";
import { VisitHeaderMoreActionsDocItems } from "./VisitHeaderMoreActionsDocItems";
import { VisitHeaderMoreActionsNavItems } from "./VisitHeaderMoreActionsNavItems";

export interface VisitHeaderMoreActionsClinicalItemsProps {
	activePatient: VisitPatientEntity | null | undefined;
	onCloseMenu: () => void;
	setIsQueueCockpitForced: (forced: boolean) => void;
	setSelectedPatientId?: ((id: string | null) => void) | undefined;
	appLogic?: any;
	setIsEmergencyModalOpen: (open: boolean) => void;
	handlePrintForm043uFast: () => void;
	handleOpenLabOrder: () => void;
	onOpenVisiographComparison?: (() => void) | undefined;
	setIsVisiographComparisonModalOpen?: ((open: boolean) => void) | undefined;
	handlePrintInformedConsentFast: () => void;
}

export function VisitHeaderMoreActionsClinicalItems(props: VisitHeaderMoreActionsClinicalItemsProps) {
	return (
		<>
			<VisitHeaderMoreActionsNavItems
				activePatient={props.activePatient}
				onCloseMenu={props.onCloseMenu}
				setIsQueueCockpitForced={props.setIsQueueCockpitForced}
				setSelectedPatientId={props.setSelectedPatientId}
				appLogic={props.appLogic}
				setIsEmergencyModalOpen={props.setIsEmergencyModalOpen}
				handleOpenLabOrder={props.handleOpenLabOrder}
				onOpenVisiographComparison={props.onOpenVisiographComparison}
				setIsVisiographComparisonModalOpen={props.setIsVisiographComparisonModalOpen}
			/>
			<VisitHeaderMoreActionsDocItems
				onCloseMenu={props.onCloseMenu}
				handlePrintForm043uFast={props.handlePrintForm043uFast}
				handlePrintInformedConsentFast={props.handlePrintInformedConsentFast}
			/>
		</>
	);
}
