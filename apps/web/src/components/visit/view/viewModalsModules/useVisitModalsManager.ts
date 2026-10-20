/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit Modals Manager Hook
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Управление активным состоянием и взаимным исключением клинических модалок.
 * Мандаты 8b, 8e: строгая эксклюзивность, приоритет экстренной помощи.
 */

import React from "react";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";

interface VisitModalsManagerOptions {
	isEmergencyModalOpen: boolean;
	isVisiographComparisonModalOpen?: boolean | undefined;
	isLabOrderModalOpen: boolean;
	isEndoModalOpen: boolean;
	isStagePaymentModalOpen: boolean;
	isPriceValidatorModalOpen: boolean;
	isVoiceDictationModalOpen: boolean;
	isWarrantyModalOpen: boolean;
	isDoctorShiftModalOpen: boolean;
	isInformedConsentModalOpen: boolean;
	isPrescriptionModalOpen?: boolean | undefined;
	setIsEmergencyModalOpen: (v: boolean) => void;
	setIsLabOrderModalOpen: (v: boolean) => void;
	setIsEndoModalOpen: (v: boolean) => void;
	setIsStagePaymentModalOpen: (v: boolean) => void;
	setIsPriceValidatorModalOpen: (v: boolean) => void;
	setIsVoiceDictationModalOpen: (v: boolean) => void;
	setIsWarrantyModalOpen: (v: boolean) => void;
	setIsDoctorShiftModalOpen: (v: boolean) => void;
	isInformedConsentModalOpenSetter: (v: boolean) => void;
	setIsPrescriptionModalOpen?: ((v: boolean) => void) | undefined;
}

const CLINICAL_MODAL_IDS = [
	"lab_order",
	"endo_canal",
	"stage_payment",
	"price_validator",
	"emergency_rescue",
	"voice_dictation",
	"warranty_passport",
	"doctor_mobile_shift",
	"informed_consent",
	"prescription",
];

export function useVisitModalsManager(opts: VisitModalsManagerOptions) {
	const {
		isEmergencyModalOpen,
		isVisiographComparisonModalOpen,
		isLabOrderModalOpen,
		isEndoModalOpen,
		isStagePaymentModalOpen,
		isPriceValidatorModalOpen,
		isVoiceDictationModalOpen,
		isWarrantyModalOpen,
		isDoctorShiftModalOpen,
		isInformedConsentModalOpen,
		isPrescriptionModalOpen,
		setIsEmergencyModalOpen,
		setIsLabOrderModalOpen,
		setIsEndoModalOpen,
		setIsStagePaymentModalOpen,
		setIsPriceValidatorModalOpen,
		setIsVoiceDictationModalOpen,
		setIsWarrantyModalOpen,
		setIsDoctorShiftModalOpen,
		isInformedConsentModalOpenSetter,
		setIsPrescriptionModalOpen,
	} = opts;

	const effectiveActiveModal = React.useMemo<string | null>(() => {
		if (isEmergencyModalOpen) return "emergency_rescue";
		if (isVisiographComparisonModalOpen) return "visiograph_comparison";
		if (isLabOrderModalOpen) return "lab_order";
		if (isEndoModalOpen) return "endo_canal";
		if (isStagePaymentModalOpen) return "stage_payment";
		if (isPriceValidatorModalOpen) return "price_validator";
		if (isVoiceDictationModalOpen) return "voice_dictation";
		if (isWarrantyModalOpen) return "warranty_passport";
		if (isDoctorShiftModalOpen) return "doctor_mobile_shift";
		if (isInformedConsentModalOpen) return "informed_consent";
		if (isPrescriptionModalOpen) return "prescription";
		return null;
	}, [
		isEmergencyModalOpen,
		isVisiographComparisonModalOpen,
		isLabOrderModalOpen,
		isEndoModalOpen,
		isStagePaymentModalOpen,
		isPriceValidatorModalOpen,
		isVoiceDictationModalOpen,
		isWarrantyModalOpen,
		isDoctorShiftModalOpen,
		isInformedConsentModalOpen,
		isPrescriptionModalOpen,
	]);

	React.useEffect(() => {
		if (!effectiveActiveModal) {
			const current = useUiSurfaceStore.getState().primaryModal?.id;
			if (current && CLINICAL_MODAL_IDS.includes(current)) {
				useUiSurfaceStore.getState().closePrimaryModal();
			}
			return;
		}

		useUiSurfaceStore.getState().openPrimaryModal(effectiveActiveModal as any);

		const closers: Record<string, () => void> = {
			emergency_rescue: () => setIsEmergencyModalOpen(false),
			lab_order: () => setIsLabOrderModalOpen(false),
			endo_canal: () => setIsEndoModalOpen(false),
			stage_payment: () => setIsStagePaymentModalOpen(false),
			price_validator: () => setIsPriceValidatorModalOpen(false),
			voice_dictation: () => setIsVoiceDictationModalOpen(false),
			warranty_passport: () => setIsWarrantyModalOpen(false),
			doctor_mobile_shift: () => setIsDoctorShiftModalOpen(false),
			informed_consent: () => isInformedConsentModalOpenSetter(false),
			prescription: () => setIsPrescriptionModalOpen?.(false),
		};
		for (const [key, closeFn] of Object.entries(closers)) {
			if (key !== effectiveActiveModal) closeFn();
		}
	}, [
		effectiveActiveModal,
		setIsEmergencyModalOpen,
		setIsLabOrderModalOpen,
		setIsEndoModalOpen,
		setIsStagePaymentModalOpen,
		setIsPriceValidatorModalOpen,
		setIsVoiceDictationModalOpen,
		setIsWarrantyModalOpen,
		setIsDoctorShiftModalOpen,
		isInformedConsentModalOpenSetter,
		setIsPrescriptionModalOpen,
	]);

	React.useEffect(() => {
		const handleCloseAll = () => {
			setIsLabOrderModalOpen(false);
			setIsEndoModalOpen(false);
			setIsStagePaymentModalOpen(false);
			setIsPriceValidatorModalOpen(false);
			setIsEmergencyModalOpen(false);
			setIsVoiceDictationModalOpen(false);
			setIsWarrantyModalOpen(false);
			setIsDoctorShiftModalOpen(false);
			isInformedConsentModalOpenSetter(false);
			setIsPrescriptionModalOpen?.(false);
		};
		window.addEventListener("dente:close-all-surfaces", handleCloseAll);
		return () => {
			window.removeEventListener("dente:close-all-surfaces", handleCloseAll);
		};
	}, [
		setIsLabOrderModalOpen,
		setIsEndoModalOpen,
		setIsStagePaymentModalOpen,
		setIsPriceValidatorModalOpen,
		setIsEmergencyModalOpen,
		setIsVoiceDictationModalOpen,
		setIsWarrantyModalOpen,
		setIsDoctorShiftModalOpen,
		isInformedConsentModalOpenSetter,
	]);

	return effectiveActiveModal;
}
