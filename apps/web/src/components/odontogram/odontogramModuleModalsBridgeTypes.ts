import type { ToothState } from "./ToothChart";
import type { useOdontogramModuleModalsState } from "./useOdontogramModuleModalsState";
import type { useOdontogramModuleSyncFacade } from "./useOdontogramModuleSyncFacade";

export interface OdontogramModuleModalsBridgeProps {
	readonly patientId: string;
	readonly syncFacade: ReturnType<typeof useOdontogramModuleSyncFacade>;
	readonly modals: ReturnType<typeof useOdontogramModuleModalsState>;
	readonly handleApplyToothState: (state: ToothState) => void;
	readonly activePatient: any;
	readonly activeDoctor: any;
	readonly auth: any;
	readonly odontogramUseSurfaces?: boolean | undefined;
}
