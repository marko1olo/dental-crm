import type { OdontogramViewModalsProps } from "./OdontogramViewModals";
import type { OdontogramViewContainerProps } from "./OdontogramViewTypes";
import type { useOdontogramContainerState } from "./useOdontogramContainerState";

export function buildModalsProps(
	props: OdontogramViewContainerProps,
	st: ReturnType<typeof useOdontogramContainerState>,
): OdontogramViewModalsProps {
	return {
		teethData: props.teethData,
		patientId: props.patientId,
		isPlanWizardOpen: st.isPlanWizardOpen,
		onClosePlanWizard: () => st.setIsPlanWizardOpen(false),
		radialMenuData: st.radialMenuData,
		onCloseRadialMenu: () => st.setRadialMenuData(null),
		onRadialSelectState: st.handleRadialSelectState,
		onRadialAddToInvoice: () => st.setIsLiveInvoiceOpen(true),
		onRadialOpenTherapy: (num) => {
			st.setContextDrawerTooth(num);
			st.setRadialMenuData(null);
		},
		contextDrawerTooth: st.contextDrawerTooth,
		onCloseContextDrawer: () => st.setContextDrawerTooth(null),
		onUpdateToothContext: (num, state, surfaces) =>
			props.onQuickStateChange?.([num], state, surfaces),
		endoDrawerTooth: st.endoDrawerTooth,
		onCloseEndoDrawer: () => st.setEndoDrawerTooth(null),
		isOrthoCephOpen: st.isOrthoCephOpen,
		onCloseOrthoCeph: () => st.setIsOrthoCephOpen(false),
		isSmartOpgOpen: st.isSmartOpgOpen,
		onCloseSmartOpg: () => st.setIsSmartOpgOpen(false),
		onApplyOpgOdontogram: st.handleApplyOpgOdontogram,
		activeJawModalTarget: st.activeJawModalTarget,
		onCloseJawModal: () => st.setActiveJawModalTarget(null),
		orthoDrawerTooth: st.orthoDrawerTooth,
		onCloseOrthoDrawer: () => st.setOrthoDrawerTooth(null),
	};
}
