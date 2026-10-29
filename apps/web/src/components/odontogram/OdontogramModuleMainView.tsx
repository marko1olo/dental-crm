import type React from "react";
import { OdontogramViewContainer } from "./OdontogramViewContainer";
import type { useOdontogramModuleModalsState } from "./useOdontogramModuleModalsState";
import type { useOdontogramModuleSyncFacade } from "./useOdontogramModuleSyncFacade";

export interface OdontogramModuleMainViewProps {
	readonly patientId: string;
	readonly syncFacade: ReturnType<typeof useOdontogramModuleSyncFacade>;
	readonly modals: ReturnType<typeof useOdontogramModuleModalsState>;
	readonly handleToothClick: (
		arg1: number | React.MouseEvent,
		arg2?: DOMRect | number,
		surface?: string,
	) => void;
	readonly odontogramUseSurfaces?: boolean | undefined;
}

export const OdontogramModuleMainView: React.FC<
	OdontogramModuleMainViewProps
> = ({
	patientId,
	syncFacade,
	modals,
	handleToothClick,
	odontogramUseSurfaces,
}) => {
	if (!syncFacade?.sync) {
		return null;
	}
	const {
		sync,
		safety,
		dentitionMode,
		setDentitionMode,
		isPediatricMode,
		liveGrossTotalRub,
		quickActions,
	} = syncFacade;

	return (
		<OdontogramViewContainer
			patientId={patientId}
			teethData={sync.teethData}
			pediatricMode={isPediatricMode}
			dentitionMode={dentitionMode}
			onDentitionModeChange={setDentitionMode}
			selectedTeeth={sync.selectedTeeth}
			onToothClick={handleToothClick}
			onMarkIntactDentition={quickActions.handleMarkAllHealthy}
			onMarkWisdomTeethMissing={quickActions.handleMarkWisdomMissing}
			onQuickStateChange={sync.updateToothState}
			useSurfaces={odontogramUseSurfaces}
			onOpenVoiceDictation={() => modals.setIsVoiceOpen(true)}
			onOpenPediatricModal={() => modals.setIsPediatricModalOpen(true)}
			onTogglePerio={() => modals.setIsPerioOpen((p) => !p)}
			isPerioOpen={modals.isPerioOpen}
			onToggleEstimator={() => modals.setIsEstimatorOpen((e) => !e)}
			isEstimatorOpen={modals.isEstimatorOpen}
			isMultiSelectMode={sync.isMultiSelectMode}
			onToggleMultiSelect={(en) => {
				sync.setIsMultiSelectMode(en);
				if (!en) modals.setMenuConfig(null);
			}}
			onSelectTeethGroup={(t) => {
				sync.setSelectedTeeth(t);
				sync.setIsMultiSelectMode(true);
			}}
			onSyncAllToDiary={quickActions.handleSyncAllToDiary}
			liveGrossTotalRub={liveGrossTotalRub}
			onOpenFastCheckout={() => {
				modals.setFastCheckoutMethod("sbp_qr");
				modals.setIsFastCheckoutOpen(true);
			}}
			allergyText={safety.allergyText}
			onOneClickLabOrder={quickActions.handleOneClickLabOrder}
			contextDrawerTooth={modals.contextDrawerTooth}
			setContextDrawerTooth={modals.setContextDrawerTooth}
		/>
	);
};
