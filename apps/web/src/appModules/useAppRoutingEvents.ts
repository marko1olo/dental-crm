/**
 * DENTE Dental CRM — Application Hash & Window Events Handler (Layer 3)
 * Mandate 8b (Layer 3 Hooks), Mandate 8e (Doctor Autonomy).
 */

import { useEffect } from "react";
import type { AppHashRoutingState, ImplantPassportConfig } from "./appStateTypes";
import { hasLocationToken } from "./appRoutingHelpers";

export function useAppRoutingEvents(
	state: AppHashRoutingState,
	openDoctorShiftCockpit?: () => void,
	setShowStaffPinPad?: (v: boolean) => void,
) {
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.altKey && (e.key === "i" || e.key === "ш")) {
				e.preventDefault();
				state.setIsConsentDirectModalOpen(true);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [state.setIsConsentDirectModalOpen]);

	useEffect(() => {
		const handleHashChange = () => {
			const s = window.location.search || "", h = window.location.hash || "";
			if (hasLocationToken(s, h, ["cbct=tuner"])) { state.setIsCbctTunerOpen(true); return; }
			if (hasLocationToken(s, h, ["cbct=", "cbct=1", "cbct=demo", "cbct"])) state.setIsCbctDirectModalOpen(true);
			if (hasLocationToken(s, h, ["ct-selector", "ct_selector"])) state.setIsCtSelectorDirectModalOpen(true);
			if (hasLocationToken(s, h, ["consent", "ids"])) state.setIsConsentDirectModalOpen(true);
			if (hasLocationToken(s, h, ["ceph", "trg"])) state.setIsCephDirectModalOpen(true);
			if (hasLocationToken(s, h, ["egisz", "remd"])) state.setIsEgiszRemdModalOpen(true);
			if (hasLocationToken(s, h, ["opg"])) state.setIsSmartOpgDirectModalOpen(true);
			if (hasLocationToken(s, h, ["visiograph"])) state.setIsVisiographDirectModalOpen(true);
			if (hasLocationToken(s, h, ["imaging-export"])) state.setIsImagingExportDirectModalOpen(true);
			if (hasLocationToken(s, h, ["lab-create"])) state.setIsLabCreateOrderDirectModalOpen(true);
			if (hasLocationToken(s, h, ["dms"])) state.setIsDmsDirectModalOpen(true);
			if (hasLocationToken(s, h, ["scenarios"])) state.setIsPlanScenariosDirectModalOpen(true);
			if (hasLocationToken(s, h, ["presenter"])) state.setIsCasePresenterDirectModalOpen(true);
			if (hasLocationToken(s, h, ["sbp"])) state.setIsSbpDirectModalOpen(true);
			if (hasLocationToken(s, h, ["receipt"])) state.setIsReceiptDirectModalOpen(true);
			if (hasLocationToken(s, h, ["recalls", "prophylaxis", "preventive"])) state.setIsRecallsHubOpen(true);
			if (hasLocationToken(s, h, ["implants", "implant_passport", "implant-passport"])) state.setIsImplantPassportDirectOpen(true);
			if (hasLocationToken(s, h, ["warranty-passport", "warranty_passport", "warranty-studio", "warranty=1", "warranty=true"])) state.setIsWarrantyPassportOpen(true);
			if (hasLocationToken(s, h, ["ortho-photo", "orthodontic-photo"])) state.setIsOrthoPhotoDirectModalOpen(true);
			if (hasLocationToken(s, h, ["tooth-drawer", "tooth-card"])) state.setIsToothDrawerDirectModalOpen(true);
			if (hasLocationToken(s, h, ["emergency", "rescue"])) state.setIsEmergencyDirectModalOpen(true);
			if (hasLocationToken(s, h, ["prescriptions", "prescription", "rx"])) state.setIsPrescriptionForm107Open(true);
			if (hasLocationToken(s, h, ["doctor-portal", "mobile-shift"])) openDoctorShiftCockpit?.();
			if (hasLocationToken(s, h, ["chairside-auth"])) setShowStaffPinPad?.(true);
			if (hasLocationToken(s, h, ["tasks", "clinical-tasks"])) state.setIsClinicalTasksOpen(true);
		};
		handleHashChange();
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, [state, openDoctorShiftCockpit, setShowStaffPinPad]);

	useEffect(() => {
		const onRx = (e: Event) => {
			const d = (e as CustomEvent<{ medicationId?: string; medicationIds?: string[] }>).detail;
			state.setIsPrescriptionForm107Open(true);
		};
		const onPassport = (e?: Event) => {
			const d = (e as CustomEvent<ImplantPassportConfig> | undefined)?.detail;
			if (d) state.setImplantPassportConfig(d);
			state.setIsImplantPassportDirectOpen(true);
		};
		const onTasks = (e?: Event) => {
			state.setIsClinicalTasksOpen(true);
		};
		window.addEventListener("dente:open-prescriptions", onRx);
		window.addEventListener("dente-open-cbct", () => state.setIsCbctDirectModalOpen(true));
		window.addEventListener("dente-open-tuner", () => state.setIsCbctTunerOpen(true));
		window.addEventListener("dente-open-consent", () => state.setIsConsentDirectModalOpen(true));
		window.addEventListener("dente-open-ceph", () => state.setIsCephDirectModalOpen(true));
		window.addEventListener("dente-open-opg", () => state.setIsSmartOpgDirectModalOpen(true));
		window.addEventListener("dente-open-visiograph-comparison", () => state.setIsVisiographDirectModalOpen(true));
		window.addEventListener("dente-open-imaging-export", () => state.setIsImagingExportDirectModalOpen(true));
		window.addEventListener("dente-open-create-lab-order", () => state.setIsLabCreateOrderDirectModalOpen(true));
		window.addEventListener("dente-open-dms-letters", () => state.setIsDmsDirectModalOpen(true));
		window.addEventListener("dente:open-dms-letters", () => state.setIsDmsDirectModalOpen(true));
		window.addEventListener("dente-open-plan-scenarios", () => state.setIsPlanScenariosDirectModalOpen(true));
		window.addEventListener("dente-open-case-presenter", () => state.setIsCasePresenterDirectModalOpen(true));
		window.addEventListener("dente-open-treatment-plan-presenter", () => state.setIsCasePresenterDirectModalOpen(true));
		window.addEventListener("dente:open-treatment-plan-presenter", () => state.setIsCasePresenterDirectModalOpen(true));
		window.addEventListener("dente-open-emergency-rescue", () => state.setIsEmergencyDirectModalOpen(true));
		window.addEventListener("dente:open-emergency-rescue", () => state.setIsEmergencyDirectModalOpen(true));
		window.addEventListener("dente-open-implant-passport", onPassport);
		window.addEventListener("dente:open-implant-passport", onPassport);
		window.addEventListener("dente-open-recalls-hub", () => state.setIsRecallsHubOpen(true));
		window.addEventListener("dente:open-recalls-hub", () => state.setIsRecallsHubOpen(true));
		window.addEventListener("dente-open-warranty-passport", () => state.setIsWarrantyPassportOpen(true));
		window.addEventListener("dente:open-warranty-passport", () => state.setIsWarrantyPassportOpen(true));
		window.addEventListener("dente-open-clinical-tasks", onTasks);
		window.addEventListener("dente:open-clinical-tasks", onTasks);
		return () => {
			window.removeEventListener("dente:open-prescriptions", onRx);
			window.removeEventListener("dente-open-implant-passport", onPassport);
			window.removeEventListener("dente:open-implant-passport", onPassport);
		};
	}, [state]);
}
