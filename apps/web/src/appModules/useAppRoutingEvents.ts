/**
 * DENTE Dental CRM — Application Hash & Window Events Handler (Layer 3)
 * Mandate 8b (Layer 3 Hooks), Mandate 8e (Doctor Autonomy).
 */

import { useEffect, useRef } from "react";
import { kopecksToRub, rublesToKopecks } from "@dental/shared";
import type { AppHashRoutingState } from "./appStateTypes";
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
			if (hasLocationToken(s, h, ["consent", "ids", "documents", "tax-certificate"])) st.setIsConsentDirectModalOpen(true);
			if (hasLocationToken(s, h, ["ceph", "trg"])) st.setIsCephDirectModalOpen(true);
			if (hasLocationToken(s, h, ["egisz", "remd"])) st.setIsEgiszRemdModalOpen(true);
			if (hasLocationToken(s, h, ["opg"])) st.setIsSmartOpgDirectModalOpen(true);
			if (hasLocationToken(s, h, ["visiograph", "rvg", "direct-rvg"])) st.setIsVisiographDirectModalOpen(true);
			if (hasLocationToken(s, h, ["imaging-export"])) st.setIsImagingExportDirectModalOpen(true);
			if (hasLocationToken(s, h, ["lab-create"])) st.setIsLabCreateOrderDirectModalOpen(true);
			if (hasLocationToken(s, h, ["dms"])) st.setIsDmsDirectModalOpen(true);
			if (hasLocationToken(s, h, ["scenarios"])) st.setIsPlanScenariosDirectModalOpen(true);
			if (hasLocationToken(s, h, ["presenter"])) st.setIsCasePresenterDirectModalOpen(true);
			if (hasLocationToken(s, h, ["sbp"])) st.setIsSbpDirectModalOpen(true);
			if (hasLocationToken(s, h, ["receipt"])) st.setIsReceiptDirectModalOpen(true);
			if (hasLocationToken(s, h, ["recalls", "prophylaxis", "preventive"])) st.setIsRecallsHubOpen(true);
			if (hasLocationToken(s, h, ["warranty-passport", "warranty_passport", "warranty-studio", "warranty=1", "warranty=true"])) st.setIsWarrantyPassportOpen(true);
			if (hasLocationToken(s, h, ["ortho-photo", "orthodontic-photo"])) st.setIsOrthoPhotoDirectModalOpen(true);
			if (hasLocationToken(s, h, ["tooth-drawer", "tooth-card"])) st.setIsToothDrawerDirectModalOpen(true);
			if (hasLocationToken(s, h, ["emergency", "rescue"])) st.setIsEmergencyDirectModalOpen(true);
			if (hasLocationToken(s, h, ["prescriptions", "prescription", "rx"])) {
				st.setIsPrescriptionBlankOpen?.(true);
				st.setIsPrescriptionForm107Open?.(true);
			}
			if (hasLocationToken(s, h, ["loyalty", "bonus", "family-pool", "points"])) st.setIsLoyaltyProgramOpen(true);
			if (hasLocationToken(s, h, ["bonus-payment", "direct-cashier-bonus"])) st.setIsFastCheckoutDirectOpen(true);
			if (hasLocationToken(s, h, ["zreport", "z-report", "shift-close", "shift_close"])) st.setIsShiftCloseZReportDirectOpen(true);
			if (hasLocationToken(s, h, ["doctor-portal", "mobile-shift"])) openDoctorRef.current?.();
			if (hasLocationToken(s, h, ["chairside-auth"])) setPinPadRef.current?.(true);
			if (hasLocationToken(s, h, ["tasks", "clinical-tasks"])) st.setIsClinicalTasksOpen(true);
			if (hasLocationToken(s, h, ["emr", "medical-card", "form043", "card043"])) st.setIsEmrCardDirectModalOpen(true);
		};
		handleHashChange();
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	useEffect(() => {
		const onRx = () => {
			stateRef.current.setIsPrescriptionBlankOpen?.(true);
			stateRef.current.setIsPrescriptionForm107Open?.(true);
		};
		const onTasks = () => {
			stateRef.current.setIsClinicalTasksOpen(true);
		};
		const onEmrCard = () => {
			stateRef.current.setIsEmrCardDirectModalOpen(true);
		};
		const onDmsLetters = (e: Event) => {
			const d = (e as CustomEvent<{ patientId?: string; patientFullName?: string }>).detail;
			if (d?.patientId && typeof window !== "undefined") {
				const url = new URL(window.location.href);
				url.searchParams.set("patientId", d.patientId);
				window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
			}
			stateRef.current.setIsDmsDirectModalOpen(true);
		};
		const onOpenCbct = () => stateRef.current.setIsCbctDirectModalOpen(true);
		const onOpenTuner = () => stateRef.current.setIsCbctTunerOpen(true);
		const onOpenConsent = () => stateRef.current.setIsConsentDirectModalOpen(true);
		const onOpenCeph = () => stateRef.current.setIsCephDirectModalOpen(true);
		const onOpenOpg = () => stateRef.current.setIsSmartOpgDirectModalOpen(true);
		const onOpenVisiograph = () => stateRef.current.setIsVisiographDirectModalOpen(true);
		const onOpenImagingExport = () => stateRef.current.setIsImagingExportDirectModalOpen(true);
		const onOpenLabCreate = () => stateRef.current.setIsLabCreateOrderDirectModalOpen(true);
		const onOpenPlanScenarios = () => stateRef.current.setIsPlanScenariosDirectModalOpen(true);
		const onOpenCasePresenter = () => stateRef.current.setIsCasePresenterDirectModalOpen(true);
		const onOpenEmergency = () => stateRef.current.setIsEmergencyDirectModalOpen(true);
		const onOpenRecallsHub = () => stateRef.current.setIsRecallsHubOpen(true);
		const onOpenWarrantyPassport = () => stateRef.current.setIsWarrantyPassportOpen(true);
		const onOpenLoyalty = () => stateRef.current.setIsLoyaltyProgramOpen(true);
		const onOpenFastCheckout = (e: Event) => {
			const d = (e as CustomEvent<{ amountRub?: number; amountKopecks?: number }>).detail;
			if (typeof d?.amountKopecks === "number") {
				stateRef.current.setFastCheckoutInitialAmountKopecks?.(d.amountKopecks);
				stateRef.current.setFastCheckoutInitialAmountRub?.(kopecksToRub(d.amountKopecks));
			} else if (typeof d?.amountRub === "number") {
				stateRef.current.setFastCheckoutInitialAmountRub?.(d.amountRub);
				stateRef.current.setFastCheckoutInitialAmountKopecks?.(rublesToKopecks(d.amountRub));
			}
			stateRef.current.setIsFastCheckoutDirectOpen(true);
		};
		const onOpenShiftCloseZReport = (e: Event) => {
			const d = (e as CustomEvent<{ shiftNumber?: number }>).detail;
			if (typeof d?.shiftNumber === "number") {
				stateRef.current.setShiftNumber?.(d.shiftNumber);
			}
			stateRef.current.setIsShiftCloseZReportDirectOpen(true);
		};
		const onApplyDsdToTreatmentPlan = (e: Event) => {
			const d = (e as CustomEvent<{
				patientId?: string;
				patientName?: string;
				doctorName?: string;
				teeth?: number[];
				material?: string;
				colorVita?: string;
				notes?: string;
				dsdAnalysis?: Record<string, unknown>;
			}>).detail;
			if (typeof window !== "undefined") {
				try {
					window.sessionStorage.setItem(
						"dente:dsd-treatment-plan-handoff",
						JSON.stringify({
							patientId: d?.patientId,
							patientName: d?.patientName,
							doctorName: d?.doctorName,
							teeth: d?.teeth ?? [13, 12, 11, 21, 22, 23],
							material: d?.material,
							colorVita: d?.colorVita,
							notes: d?.notes,
						}),
					);
				} catch {
					// Ignore storage restrictions
				}
				window.dispatchEvent(
					new CustomEvent("dente:open-treatment-plan", {
						detail: {
							patientId: d?.patientId,
							patientName: d?.patientName,
							doctorFullName: d?.doctorName,
							dsdDetail: d,
						},
					}),
				);
			}
			stateRef.current.setIsCasePresenterDirectModalOpen(true);
		};

		const eventBindings: ReadonlyArray<readonly [string, EventListener]> = [
			["dente-open-medical-card", onEmrCard],
			["dente:open-medical-card", onEmrCard],
			["dente:open-prescriptions", onRx],
			["dente-open-cbct", onOpenCbct],
			["dente-open-tuner", onOpenTuner],
			["dente-open-consent", onOpenConsent],
			["dente:open-consent", onOpenConsent],
			["dente-open-documents", onOpenConsent],
			["dente:open-documents", onOpenConsent],
			["dente-open-ceph", onOpenCeph],
			["dente-open-opg", onOpenOpg],
			["dente-open-visiograph-comparison", onOpenVisiograph],
			["dente-open-imaging-export", onOpenImagingExport],
			["dente-open-create-lab-order", onOpenLabCreate],
			["dente-open-dms-letters", onDmsLetters],
			["dente:open-dms-letters", onDmsLetters],
			["dente-open-plan-scenarios", onOpenPlanScenarios],
			["dente-open-case-presenter", onOpenCasePresenter],
			["dente-open-treatment-plan-presenter", onOpenCasePresenter],
			["dente:open-treatment-plan-presenter", onOpenCasePresenter],
			["dente-apply-dsd-to-treatment-plan", onApplyDsdToTreatmentPlan],
			["dente:apply-dsd-to-treatment-plan", onApplyDsdToTreatmentPlan],
			["dente-open-emergency-rescue", onOpenEmergency],
			["dente:open-emergency-rescue", onOpenEmergency],
			["dente-open-recalls-hub", onOpenRecallsHub],
			["dente:open-recalls-hub", onOpenRecallsHub],
			["dente-open-warranty-passport", onOpenWarrantyPassport],
			["dente:open-warranty-passport", onOpenWarrantyPassport],
			["dente-open-clinical-tasks", onTasks],
			["dente:open-clinical-tasks", onTasks],
			["dente-open-loyalty", onOpenLoyalty],
			["dente:open-loyalty", onOpenLoyalty],
			["dente-open-loyalty-program", onOpenLoyalty],
			["dente-open-fast-checkout", onOpenFastCheckout],
			["dente:open-fast-checkout", onOpenFastCheckout],
			["dente-open-zreport", onOpenShiftCloseZReport],
			["dente:open-zreport", onOpenShiftCloseZReport],
			["dente-open-shift-close", onOpenShiftCloseZReport],
			["dente:open-shift-close", onOpenShiftCloseZReport],
		];

		for (const [eventName, handler] of eventBindings) {
			window.addEventListener(eventName, handler);
		}
		return () => {
			for (const [eventName, handler] of eventBindings) {
				window.removeEventListener(eventName, handler);
			}
		};
	}, []);
}
