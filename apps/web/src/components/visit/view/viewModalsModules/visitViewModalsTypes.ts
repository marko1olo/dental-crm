/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit View Modals Types
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface VisitViewModalsProps {
	loadedTreatmentPlan?: any;
	isVisiographComparisonModalOpen?: boolean;
	setIsVisiographComparisonModalOpen?: (v: boolean) => void;
	endoModalToothNumber: string | number | null;
	endoModalToothState?: string;
	isEndoModalOpen: boolean;
	setIsEndoModalOpen: (v: boolean) => void;
	setEndoModalToothNumber: (v: string | number | null) => void;
	isLabOrderModalOpen: boolean;
	setIsLabOrderModalOpen: (v: boolean) => void;
	labOrderModalToothNumber: string | number | null;
	setLabOrderModalToothNumber: (v: string | number | null) => void;
	isStagePaymentModalOpen: boolean;
	setIsStagePaymentModalOpen: (v: boolean) => void;
	isPriceValidatorModalOpen: boolean;
	setIsPriceValidatorModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: modal payloads
	priceValidatorPlanPayload: any;
	// biome-ignore lint/suspicious/noExplicitAny: modal payloads
	priceValidatorCatalogList: any;
	isEmergencyModalOpen: boolean;
	setIsEmergencyModalOpen: (v: boolean) => void;
	isVoiceDictationModalOpen: boolean;
	setIsVoiceDictationModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: menu selection
	selectedToothForMenu: any;
	isWarrantyModalOpen: boolean;
	setIsWarrantyModalOpen: (v: boolean) => void;
	isDoctorShiftModalOpen: boolean;
	setIsDoctorShiftModalOpen: (v: boolean) => void;
	isInformedConsentModalOpen: boolean;
	setIsInformedConsentModalOpen: (v: boolean) => void;
	isPrescriptionModalOpen?: boolean | undefined;
	setIsPrescriptionModalOpen?: ((v: boolean) => void) | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: patient & doctor
	activePatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard
	dashboard: any;
	patientAge?: string | null;
	appendToEMKField: (field: string, text: string) => void;
	// biome-ignore lint/suspicious/noExplicitAny: tooth state
	setToothState: (code: string, state: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: visit note form
	visitNoteForm: any;
	// biome-ignore lint/suspicious/noExplicitAny: active appointment
	activeAppointment: any;
}
