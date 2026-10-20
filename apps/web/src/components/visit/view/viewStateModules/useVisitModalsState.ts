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
	const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
	const [isVisiographComparisonModalOpen, setIsVisiographComparisonModalOpen] = useState(false);
	const [isHeaderMoreMenuOpen, setIsHeaderMoreMenuOpen] = useState(false);
	const headerMoreMenuRef = React.useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const handleOpenComp = () => setIsVisiographComparisonModalOpen(true);
		window.addEventListener("dente-open-visiograph-comparison", handleOpenComp);
		return () => window.removeEventListener("dente-open-visiograph-comparison", handleOpenComp);
	}, []);

	const handleOpenLabOrder = useCallback((targetTooth?: string | number | null | unknown) => {
		if (typeof onOpenLabOrderModal === "function") {
			onOpenLabOrderModal();
		}
		const toothStr = (targetTooth && (typeof targetTooth === "string" || typeof targetTooth === "number"))
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
			const customEvent = e as CustomEvent<{ toothNumber?: number | string; toothFdi?: number | string }>;
			const customTooth = customEvent?.detail?.toothNumber || customEvent?.detail?.toothFdi;
			handleOpenLabOrder(customTooth);
		};
		window.addEventListener("dente-open-lab-order-modal", handleLabOrderEvent);
		return () => window.removeEventListener("dente-open-lab-order-modal", handleLabOrderEvent);
	}, [handleOpenLabOrder]);

	return {
		endoModalToothNumber,
		setEndoModalToothNumber,
		endoModalToothState,
		setEndoModalToothState,
		labOrderModalToothNumber,
		setLabOrderModalToothNumber,
		isEndoModalOpen,
		setIsEndoModalOpen,
		isLabOrderModalOpen,
		setIsLabOrderModalOpen,
		isStagePaymentModalOpen,
		setIsStagePaymentModalOpen,
		isPriceValidatorModalOpen,
		setIsPriceValidatorModalOpen,
		isEmergencyModalOpen,
		setIsEmergencyModalOpen,
		isVoiceDictationModalOpen,
		setIsVoiceDictationModalOpen,
		isWarrantyModalOpen,
		setIsWarrantyModalOpen,
		isDoctorShiftModalOpen,
		setIsDoctorShiftModalOpen,
		isInformedConsentModalOpen,
		setIsInformedConsentModalOpen,
		isPrescriptionModalOpen,
		setIsPrescriptionModalOpen,
		isVisiographComparisonModalOpen,
		setIsVisiographComparisonModalOpen,
		isHeaderMoreMenuOpen,
		setIsHeaderMoreMenuOpen,
		headerMoreMenuRef,
		handleOpenLabOrder,
	};
}
