/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit Modals State Hook
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Управление состоянием открытия клинических модалок визита:
 * эндо, ЗТЛ, оплата этапов, проверка цен, экстренная помощь, диктовка, гарантия, сплит-визиограф.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useVisitStore } from "../../../../store/visitStore";

export interface UseVisitModalsStateParams {
	onOpenLabOrderModal?: (() => void) | undefined;
	selectedToothForMenu: { code: string; label?: string; state?: string } | null;
}

export function useVisitModalsState({
	onOpenLabOrderModal,
	selectedToothForMenu,
}: UseVisitModalsStateParams) {
	const [endoModalToothNumber, setEndoModalToothNumber] = useState<number | string | null>(null);
	const [endoModalToothState, setEndoModalToothState] = useState<string>("idle");
	const [labOrderModalToothNumber, setLabOrderModalToothNumber] = useState<number | string | null>(null);
	const [isEndoModalOpen, setIsEndoModalOpen] = useState(false);
	const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState(false);
	const [isStagePaymentModalOpen, setIsStagePaymentModalOpen] = useState(false);
	const [isPriceValidatorModalOpen, setIsPriceValidatorModalOpen] = useState(false);
	const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
	const [isVoiceDictationModalOpen, setIsVoiceDictationModalOpen] = useState(false);
	const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
	const [isDoctorShiftModalOpen, setIsDoctorShiftModalOpen] = useState(false);
	const [isInformedConsentModalOpen, setIsInformedConsentModalOpen] = useState(false);
	const [isPrescriptionModalOpen, setIsPrescriptionModalOpenState] = useState(false);
	const setIsPrescriptionModalOpen = useCallback((open: boolean) => {
		if (open) {
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:open-prescriptions"));
			}
		} else {
			setIsPrescriptionModalOpenState(false);
		}
	}, []);
	const [isVisiographComparisonModalOpen, setIsVisiographComparisonModalOpen] = useState(false);
	const [isHeaderMoreMenuOpen, setIsHeaderMoreMenuOpen] = useState(false);
	const headerMoreMenuRef = React.useRef<HTMLDivElement | null>(null);

	const handleOpenLabOrder = useCallback((targetTooth?: string | number | (string | number)[] | null | unknown) => {
		if (typeof onOpenLabOrderModal === "function") {
			onOpenLabOrderModal();
		}
		const toothStr = (Array.isArray(targetTooth) && targetTooth.length > 0)
			? targetTooth.join(", ")
			: (targetTooth && (typeof targetTooth === "string" || typeof targetTooth === "number"))
			? String(targetTooth)
			: selectedToothForMenu?.code
			? String(selectedToothForMenu.code)
			: useVisitStore.getState().activeToothNumber
			? String(useVisitStore.getState().activeToothNumber)
			: null;
		if (toothStr) {
			setLabOrderModalToothNumber(toothStr);
		}
		setIsLabOrderModalOpen(true);
	}, [onOpenLabOrderModal, selectedToothForMenu]);

	useEffect(() => {
		const handleLabOrderEvent = (e: Event) => {
			const ce = e as CustomEvent<any>;
			const itemsTeeth = Array.isArray(ce?.detail?.items)
				? ce.detail.items.map((it: any) => it.toothNumber ?? it.toothCode).filter(Boolean)
				: undefined;
			const customTooth = ce?.detail?.selectedTeeth ?? ce?.detail?.teeth ?? ce?.detail?.toothNumber ?? ce?.detail?.toothFdi ?? (itemsTeeth?.length ? itemsTeeth : undefined);
			handleOpenLabOrder(customTooth);
		};
		const handleEndoEvent = (e: Event) => {
			const ce = e as CustomEvent<{ toothNumber?: number | string; toothState?: string }>;
			setEndoModalToothNumber(ce?.detail?.toothNumber ?? 16);
			if (ce?.detail?.toothState) setEndoModalToothState(ce.detail.toothState);
			setIsEndoModalOpen(true);
		};
		const handleWarrantyEvent = () => {
			setIsWarrantyModalOpen(true);
		};
		window.addEventListener("dente-open-lab-order-modal", handleLabOrderEvent);
		window.addEventListener("dente-open-endo-modal", handleEndoEvent);
		window.addEventListener("dente-open-warranty-passport", handleWarrantyEvent);
		window.addEventListener("dente:open-warranty-passport", handleWarrantyEvent);
		return () => {
			window.removeEventListener("dente-open-lab-order-modal", handleLabOrderEvent);
			window.removeEventListener("dente-open-endo-modal", handleEndoEvent);
			window.removeEventListener("dente-open-warranty-passport", handleWarrantyEvent);
			window.removeEventListener("dente:open-warranty-passport", handleWarrantyEvent);
		};
	}, [handleOpenLabOrder]);

	return {
		endoModalToothNumber, setEndoModalToothNumber,
		endoModalToothState, setEndoModalToothState,
		labOrderModalToothNumber, setLabOrderModalToothNumber,
		isEndoModalOpen, setIsEndoModalOpen,
		isLabOrderModalOpen, setIsLabOrderModalOpen,
		isStagePaymentModalOpen, setIsStagePaymentModalOpen,
		isPriceValidatorModalOpen, setIsPriceValidatorModalOpen,
		isEmergencyModalOpen, setIsEmergencyModalOpen,
		isVoiceDictationModalOpen, setIsVoiceDictationModalOpen,
		isWarrantyModalOpen, setIsWarrantyModalOpen,
		isDoctorShiftModalOpen, setIsDoctorShiftModalOpen,
		isInformedConsentModalOpen, setIsInformedConsentModalOpen,
		isPrescriptionModalOpen, setIsPrescriptionModalOpen,
		isVisiographComparisonModalOpen, setIsVisiographComparisonModalOpen,
		isHeaderMoreMenuOpen, setIsHeaderMoreMenuOpen,
		headerMoreMenuRef, handleOpenLabOrder,
	};
}
