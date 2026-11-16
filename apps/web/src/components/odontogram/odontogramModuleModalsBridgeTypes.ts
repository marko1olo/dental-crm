import type { ToothState } from "./ToothChart";
import type {
	OdontogramActiveDoctorContext,
	OdontogramActivePatientContext,
	OdontogramAuthContext,
} from "./OdontogramModalsLayer";
import type { useOdontogramModuleModalsState } from "./useOdontogramModuleModalsState";
import type { useOdontogramModuleSyncFacade } from "./useOdontogramModuleSyncFacade";

export interface OdontogramModuleModalsBridgeProps {
	readonly patientId: string;
	readonly syncFacade: ReturnType<typeof useOdontogramModuleSyncFacade>;
	readonly modals: ReturnType<typeof useOdontogramModuleModalsState>;
	readonly handleApplyToothState: (state: ToothState) => void;
	readonly activePatient?: OdontogramActivePatientContext | undefined;
	readonly activeDoctor?: OdontogramActiveDoctorContext | undefined;
	readonly auth?: OdontogramAuthContext | undefined;
	readonly odontogramUseSurfaces?: boolean | undefined;
}
