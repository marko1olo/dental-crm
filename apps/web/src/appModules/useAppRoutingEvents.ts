/**
 * DENTE Dental CRM — Application Hash & Window Events Handler (Layer 3)
 * Mandate 8b (Layer 3 Hooks), Mandate 8e (Doctor Autonomy).
 */

import { useEffect, useRef } from "react";
import type { AppHashRoutingState, ImplantPassportConfig } from "./appStateTypes";
import { hasLocationToken } from "./appRoutingHelpers";

export function useAppRoutingEvents(
	state: AppHashRoutingState,
	openDoctorShiftCockpit?: () => void,
	setShowStaffPinPad?: (v: boolean) => void,
) {
	const stateRef = useRef(state); stateRef.current = state;
	const openDoctorRef = useRef(openDoctorShiftCockpit); openDoctorRef.current = openDoctorShiftCockpit;
	const setPinPadRef = useRef(setShowStaffPinPad); setPinPadRef.current = setShowStaffPinPad;

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.altKey && (e.key === "i" || e.key === "ш")) {
				e.preventDefault();
				stateRef.current.setIsConsentDirectModalOpen(true);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	useEffect(() => {
		const handleHashChange = () => {
			const s = window.location.search || "", h = window.location.hash || "";
			const st = stateRef.current;
			if (hasLocationToken(s, h, ["cbct=tuner"])) { st.setIsCbctTunerOpen(true); return; }
			if (hasLocationToken(s, h, ["cbct=", "cbct=1", "cbct=demo", "cbct"])) st.setIsCbctDirectModalOpen(true);
			if (hasLocationToken(s, h, ["ct-selector", "ct_selector"])) st.setIsCtSelectorDirectModalOpen(true);
			if (hasLocationToken(s, h, ["consent", "ids"])) st.setIsConsentDirectModalOpen(true);
			if (hasLocationToken(s, h, ["ceph", "trg"])) st.setIsCephDirectModalOpen(true);
			if (hasLocationToken(s, h, ["egisz", "remd"])) st.setIsEgiszRemdModalOpen(true);
			if (hasLocationToken(s, h, ["opg"])) st.setIsSmartOpgDirectModalOpen(true);
			if (hasLocationToken(s, h, ["visiograph"])) st.setIsVisiographDirectModalOpen(true);
			if (hasLocationToken(s, h, ["imaging-export"])) st.setIsImagingExportDirectModalOpen(true);
			if (hasLocationToken(s, h, ["lab-create"])) st.setIsLabCreateOrderDirectModalOpen(true);
			if (hasLocationToken(s, h, ["dms"])) st.setIsDmsDirectModalOpen(true);
			if (hasLocationToken(s, h, ["scenarios"])) st.setIsPlanScenariosDirectModalOpen(true);
			if (hasLocationToken(s, h, ["presenter"])) st.setIsCasePresenterDirectModalOpen(true);
			if (hasLocationToken(s, h, ["sbp"])) st.setIsSbpDirectModalOpen(true);
			if (hasLocationToken(s, h, ["receipt"])) st.setIsReceiptDirectModalOpen(true);
			if (hasLocationToken(s, h, ["recalls", "prophylaxis", "preventive"])) st.setIsRecallsHubOpen(true);
			if (hasLocationToken(s, h, ["implants", "implant_passport", "implant-passport"])) st.setIsImplantPassportDirectOpen(true);
			if (hasLocationToken(s, h, ["warranty-passport", "warranty_passport", "warranty-studio", "warranty=1", "warranty=true"])) st.setIsWarrantyPassportOpen(true);
			if (hasLocationToken(s, h, ["ortho-photo", "orthodontic-photo"])) st.setIsOrthoPhotoDirectModalOpen(true);
			if (hasLocationToken(s, h, ["tooth-drawer", "tooth-card"])) st.setIsToothDrawerDirectModalOpen(true);
			if (hasLocationToken(s, h, ["emergency", "rescue"])) st.setIsEmergencyDirectModalOpen(true);
			if (hasLocationToken(s, h, ["prescriptions", "prescription", "rx"])) st.setIsPrescriptionForm107Open(true);
			if (hasLocationToken(s, h, ["loyalty", "bonus", "family-pool", "points"])) st.setIsLoyaltyProgramOpen(true);
			if (hasLocationToken(s, h, ["bonus-payment", "direct-cashier-bonus"])) st.setIsFastCheckoutDirectOpen(true);
			if (hasLocationToken(s, h, ["zreport", "z-report", "shift-close", "shift_close"])) st.setIsShiftCloseZReportDirectOpen(true);
			if (hasLocationToken(s, h, ["doctor-portal", "mobile-shift"])) openDoctorRef.current?.();
			if (hasLocationToken(s, h, ["chairside-auth"])) setPinPadRef.current?.(true);
			if (hasLocationToken(s, h, ["tasks", "clinical-tasks"])) st.setIsClinicalTasksOpen(true);
		};
		handleHashChange();
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	useEffect(() => {
		const onRx = (e: Event) => {
			const d = (e as CustomEvent<{ medicationId?: string; medicationIds?: string[] }>).detail;
			stateRef.current.setIsPrescriptionForm107Open(true);
		};
		const onPassport = (e?: Event) => {
			const d = (e as CustomEvent<ImplantPassportConfig> | undefined)?.detail;
			if (d) stateRef.current.setImplantPassportConfig(d);
			stateRef.current.setIsImplantPassportDirectOpen(true);
		};
		const onTasks = (e?: Event) => {
			stateRef.current.setIsClinicalTasksOpen(true);
		};
		window.addEventListener("dente:open-prescriptions", onRx);
		window.addEventListener("dente-open-cbct", () => stateRef.current.setIsCbctDirectModalOpen(true));
		window.addEventListener("dente-open-tuner", () => stateRef.current.setIsCbctTunerOpen(true));
		window.addEventListener("dente-open-consent", () => stateRef.current.setIsConsentDirectModalOpen(true));
		window.addEventListener("dente-open-ceph", () => stateRef.current.setIsCephDirectModalOpen(true));
		window.addEventListener("dente-open-opg", () => stateRef.current.setIsSmartOpgDirectModalOpen(true));
		window.addEventListener("dente-open-visiograph-comparison", () => stateRef.current.setIsVisiographDirectModalOpen(true));
		window.addEventListener("dente-open-imaging-export", () => stateRef.current.setIsImagingExportDirectModalOpen(true));
		window.addEventListener("dente-open-create-lab-order", () => stateRef.current.setIsLabCreateOrderDirectModalOpen(true));
		window.addEventListener("dente-open-dms-letters", () => stateRef.current.setIsDmsDirectModalOpen(true));
		window.addEventListener("dente:open-dms-letters", () => stateRef.current.setIsDmsDirectModalOpen(true));
		window.addEventListener("dente-open-plan-scenarios", () => stateRef.current.setIsPlanScenariosDirectModalOpen(true));
		window.addEventListener("dente-open-case-presenter", () => stateRef.current.setIsCasePresenterDirectModalOpen(true));
		window.addEventListener("dente-open-treatment-plan-presenter", () => stateRef.current.setIsCasePresenterDirectModalOpen(true));
		window.addEventListener("dente:open-treatment-plan-presenter", () => stateRef.current.setIsCasePresenterDirectModalOpen(true));
		window.addEventListener("dente-open-emergency-rescue", () => stateRef.current.setIsEmergencyDirectModalOpen(true));
		window.addEventListener("dente:open-emergency-rescue", () => stateRef.current.setIsEmergencyDirectModalOpen(true));
		window.addEventListener("dente-open-implant-passport", onPassport);
		window.addEventListener("dente:open-implant-passport", onPassport);
		window.addEventListener("dente-open-recalls-hub", () => stateRef.current.setIsRecallsHubOpen(true));
		window.addEventListener("dente:open-recalls-hub", () => stateRef.current.setIsRecallsHubOpen(true));
		window.addEventListener("dente-open-warranty-passport", () => stateRef.current.setIsWarrantyPassportOpen(true));
		window.addEventListener("dente:open-warranty-passport", () => stateRef.current.setIsWarrantyPassportOpen(true));
		window.addEventListener("dente-open-clinical-tasks", onTasks);
		window.addEventListener("dente:open-clinical-tasks", onTasks);
		window.addEventListener("dente-open-loyalty", () => stateRef.current.setIsLoyaltyProgramOpen(true));
		window.addEventListener("dente:open-loyalty", () => stateRef.current.setIsLoyaltyProgramOpen(true));
		window.addEventListener("dente-open-loyalty-program", () => stateRef.current.setIsLoyaltyProgramOpen(true));
		window.addEventListener("dente-open-fast-checkout", () => stateRef.current.setIsFastCheckoutDirectOpen(true));
		window.addEventListener("dente:open-fast-checkout", () => stateRef.current.setIsFastCheckoutDirectOpen(true));
		window.addEventListener("dente-open-zreport", () => stateRef.current.setIsShiftCloseZReportDirectOpen(true));
		window.addEventListener("dente:open-zreport", () => stateRef.current.setIsShiftCloseZReportDirectOpen(true));
		window.addEventListener("dente-open-shift-close", () => stateRef.current.setIsShiftCloseZReportDirectOpen(true));
		window.addEventListener("dente:open-shift-close", () => stateRef.current.setIsShiftCloseZReportDirectOpen(true));
		return () => {
			window.removeEventListener("dente:open-prescriptions", onRx);
			window.removeEventListener("dente-open-implant-passport", onPassport);
			window.removeEventListener("dente:open-implant-passport", onPassport);
		};
	}, []);
}
