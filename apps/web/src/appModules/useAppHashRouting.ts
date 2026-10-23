/**
 * DENTE Dental CRM — Application Hash & Direct Modals Routing Hook (Layer 3)
 * Mandate 8b (Layer 3 Hooks), Mandate 8e (Doctor Autonomy).
 */

import { useState } from "react";
import type { AppHashRoutingState, ImplantPassportConfig } from "./appStateTypes";
import { hasLocationToken, isCbctDirectActive, isCbctTunerActive } from "./appRoutingHelpers";
import { useAppRoutingEvents } from "./useAppRoutingEvents";

export function useAppHashRouting(
	openDoctorShiftCockpit?: () => void,
	setShowStaffPinPad?: (v: boolean) => void,
): AppHashRoutingState {
	const s = typeof window !== "undefined" ? window.location.search || "" : "";
	const h = typeof window !== "undefined" ? window.location.hash || "" : "";

	const [isPrescriptionForm107Open, setIsPrescriptionForm107Open] = useState(false);
	const [prescriptionInitialMedId, setPrescriptionInitialMedId] = useState<string | null>(null);
	const [prescriptionInitialMedIds, setPrescriptionInitialMedIds] = useState<string[] | null>(null);
	const [isImplantPassportDirectOpen, setIsImplantPassportDirectOpen] = useState(() => hasLocationToken(s, h, ["implant_passport", "implant-passport", "implants"]));
	const [implantPassportConfig, setImplantPassportConfig] = useState<ImplantPassportConfig | null>(null);
	const [isWarrantyPassportOpen, setIsWarrantyPassportOpen] = useState(() => hasLocationToken(s, h, ["warranty-passport", "warranty_passport", "warranty-studio", "warranty=1", "warranty=true"]));
	const [isRecallsHubOpen, setIsRecallsHubOpen] = useState(() => hasLocationToken(s, h, ["recalls", "prophylaxis", "preventive"]));
	const [isOrthoPhotoDirectModalOpen, setIsOrthoPhotoDirectModalOpen] = useState(() => hasLocationToken(s, h, ["ortho-photo", "orthodontic-photo"]));
	const [isOrthoProtocolDirectModalOpen, setIsOrthoProtocolDirectModalOpen] = useState(() => hasLocationToken(s, h, ["ortho-protocol", "orthodontic-protocol", "ortho=protocol"]));
	const [isToothDrawerDirectModalOpen, setIsToothDrawerDirectModalOpen] = useState(() => hasLocationToken(s, h, ["tooth-drawer", "tooth-card"]));
	const [isClinicalTasksOpen, setIsClinicalTasksOpen] = useState(false);
	const [clinicalTasksPatientId, setClinicalTasksPatientId] = useState<string | null>(null);
	const [isCbctTunerOpen, setIsCbctTunerOpen] = useState(() => isCbctTunerActive());
	const [isCbctDirectModalOpen, setIsCbctDirectModalOpen] = useState(() => isCbctDirectActive());
	const [isConsentDirectModalOpen, setIsConsentDirectModalOpen] = useState(() => hasLocationToken(s, h, ["consent", "ids"]));
	const [isCephDirectModalOpen, setIsCephDirectModalOpen] = useState(() => hasLocationToken(s, h, ["ceph", "trg"]));
	const [isEgiszRemdModalOpen, setIsEgiszRemdModalOpen] = useState(() => hasLocationToken(s, h, ["egisz", "remd"]));
	const [isSmartSlotRecoveryDemoOpen, setIsSmartSlotRecoveryDemoOpen] = useState(() => hasLocationToken(s, h, ["smart_slot", "recovery", "smart-slot"]));
	const [isSmartOpgDirectModalOpen, setIsSmartOpgDirectModalOpen] = useState(() => hasLocationToken(s, h, ["opg"]));
	const [isCtSelectorDirectModalOpen, setIsCtSelectorDirectModalOpen] = useState(() => hasLocationToken(s, h, ["ct-selector", "ct_selector"]));
	const [isVisiographDirectModalOpen, setIsVisiographDirectModalOpen] = useState(() => hasLocationToken(s, h, ["visiograph"]));
	const [isImagingExportDirectModalOpen, setIsImagingExportDirectModalOpen] = useState(() => hasLocationToken(s, h, ["imaging-export"]));
	const [isLabCreateOrderDirectModalOpen, setIsLabCreateOrderDirectModalOpen] = useState(() => hasLocationToken(s, h, ["lab-create"]));
	const [isDmsDirectModalOpen, setIsDmsDirectModalOpen] = useState(() => hasLocationToken(s, h, ["dms"]));
	const [isPlanScenariosDirectModalOpen, setIsPlanScenariosDirectModalOpen] = useState(() => hasLocationToken(s, h, ["scenarios"]));
	const [isCasePresenterDirectModalOpen, setIsCasePresenterDirectModalOpen] = useState(() => hasLocationToken(s, h, ["presenter"]));
	const [isSbpDirectModalOpen, setIsSbpDirectModalOpen] = useState(() => hasLocationToken(s, h, ["sbp"]));
	const [isReceiptDirectModalOpen, setIsReceiptDirectModalOpen] = useState(() => hasLocationToken(s, h, ["receipt"]));
	const [isEmergencyDirectModalOpen, setIsEmergencyDirectModalOpen] = useState(() => hasLocationToken(s, h, ["emergency", "rescue"]));

	const state: AppHashRoutingState = {
		isPrescriptionForm107Open, setIsPrescriptionForm107Open,
		prescriptionInitialMedId, prescriptionInitialMedIds,
		isImplantPassportDirectOpen, setIsImplantPassportDirectOpen,
		implantPassportConfig, setImplantPassportConfig,
		isRecallsHubOpen, setIsRecallsHubOpen,
		isOrthoPhotoDirectModalOpen, setIsOrthoPhotoDirectModalOpen,
		isOrthoProtocolDirectModalOpen, setIsOrthoProtocolDirectModalOpen,
		isToothDrawerDirectModalOpen, setIsToothDrawerDirectModalOpen,
		isClinicalTasksOpen, setIsClinicalTasksOpen,
		clinicalTasksPatientId,
		isCbctTunerOpen, setIsCbctTunerOpen,
		isCbctDirectModalOpen, setIsCbctDirectModalOpen,
		isConsentDirectModalOpen, setIsConsentDirectModalOpen,
		isCephDirectModalOpen, setIsCephDirectModalOpen,
		isEgiszRemdModalOpen, setIsEgiszRemdModalOpen,
		isSmartSlotRecoveryDemoOpen, setIsSmartSlotRecoveryDemoOpen,
		isSmartOpgDirectModalOpen, setIsSmartOpgDirectModalOpen,
		isCtSelectorDirectModalOpen, setIsCtSelectorDirectModalOpen,
		isVisiographDirectModalOpen, setIsVisiographDirectModalOpen,
		isImagingExportDirectModalOpen, setIsImagingExportDirectModalOpen,
		isLabCreateOrderDirectModalOpen, setIsLabCreateOrderDirectModalOpen,
		isDmsDirectModalOpen, setIsDmsDirectModalOpen,
		isPlanScenariosDirectModalOpen, setIsPlanScenariosDirectModalOpen,
		isCasePresenterDirectModalOpen, setIsCasePresenterDirectModalOpen,
		isSbpDirectModalOpen, setIsSbpDirectModalOpen,
		isReceiptDirectModalOpen, setIsReceiptDirectModalOpen,
		isEmergencyDirectModalOpen, setIsEmergencyDirectModalOpen,
		isWarrantyPassportOpen, setIsWarrantyPassportOpen,
	};

	useAppRoutingEvents(state, openDoctorShiftCockpit, setShowStaffPinPad);

	return state;
}
