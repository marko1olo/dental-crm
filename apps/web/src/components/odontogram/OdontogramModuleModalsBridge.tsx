import type React from "react";
import { OdontogramModalsLayer } from "./OdontogramModalsLayer";
import { OdontogramPrintA4 } from "./OdontogramPrintA4";
import { OdontogramRadialMenuSlot } from "./OdontogramRadialMenuSlot";
import type { OdontogramModuleModalsBridgeProps } from "./odontogramModuleModalsBridgeTypes";
import { ToothActionMenuPortal } from "./ToothActionMenuPortal";

export * from "./odontogramModuleModalsBridgeTypes";

export const OdontogramModuleModalsBridge: React.FC<
	OdontogramModuleModalsBridgeProps
> = ({
	patientId,
	syncFacade,
	modals,
	handleApplyToothState,
	activePatient,
	activeDoctor,
	auth,
	odontogramUseSurfaces,
}) => {
	if (!syncFacade?.sync) {
		return null;
	}
	const { sync, quickActions, isPediatricMode, liveGrossTotalRub } = syncFacade;

	return (
		<>
			<ToothActionMenuPortal
				menuConfig={modals.radialMenuData ? null : modals.menuConfig}
				onClose={modals.clearMenu}
				selectedTeeth={sync.selectedTeeth}
				activeSurfaces={sync.activeSurfaces}
				setActiveSurfaces={sync.setActiveSurfaces}
				onApplyToothState={handleApplyToothState}
				onOpenContextDrawer={(num) => modals.setContextDrawerTooth(num)}
				onOpenHistory={(num) => modals.setHistoryTooth(num)}
				onOpenEndo={(num) => modals.setEndoTooth(num)}
				onOneClickLabOrder={quickActions.handleOneClickLabOrder}
				teethData={sync.teethData}
			/>

			<OdontogramRadialMenuSlot
				radialMenuData={modals.radialMenuData}
				setRadialMenuData={modals.setRadialMenuData}
				selectedTeeth={sync.selectedTeeth}
				updateToothState={sync.updateToothState}
				patientId={patientId}
				setActiveSurfaces={sync.setActiveSurfaces}
				setEndoTooth={modals.setEndoTooth}
				setContextDrawerTooth={modals.setContextDrawerTooth}
				setIsFastCheckoutOpen={modals.setIsFastCheckoutOpen}
			/>

			<OdontogramModalsLayer
				patientId={patientId}
				teethData={sync.teethData}
				setTeethData={sync.setTeethData}
				historyTooth={modals.historyTooth}
				setHistoryTooth={modals.setHistoryTooth}
				endoTooth={modals.endoTooth}
				setEndoTooth={modals.setEndoTooth}
				isEstimatorOpen={modals.isEstimatorOpen}
				isPerioOpen={modals.isPerioOpen}
				isVoiceOpen={modals.isVoiceOpen}
				setIsVoiceOpen={modals.setIsVoiceOpen}
				isPediatricModalOpen={modals.isPediatricModalOpen}
				setIsPediatricModalOpen={modals.setIsPediatricModalOpen}
				isFastCheckoutOpen={modals.isFastCheckoutOpen}
				setIsFastCheckoutOpen={modals.setIsFastCheckoutOpen}
				fastCheckoutMethod={modals.fastCheckoutMethod}
				liveGrossTotalRub={liveGrossTotalRub}
				activePatient={activePatient}
				activeDoctor={activeDoctor}
				auth={auth}
				setAiPendingProposal={modals.setAiPendingProposal}
			/>

			<OdontogramPrintA4
				patientId={patientId}
				teethData={sync.teethData}
				isPediatricMode={isPediatricMode}
				odontogramUseSurfaces={odontogramUseSurfaces}
				activePatient={activePatient}
				activeDoctor={activeDoctor}
				auth={auth}
			/>
		</>
	);
};
