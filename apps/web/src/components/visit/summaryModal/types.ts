import type { DiaryState } from "../diaryLogic/diaryLogicTypes";
import type { VisitDiaryEntry043 } from "../../emr";
import type { RadiologySnapshotItem } from "../VisitSummaryRadiologyGallery";
import type { PaymentMethodTab } from "../../finance/modal/payment/paymentModalTypes.js";

export type { RadiologySnapshotItem };

export interface VisitSummaryPatient {
	id?: string;
	fullName?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	middleName?: string | null;
	birthDate?: string | null;
	dateOfBirth?: string | null;
	cardNumber?: string | null;
	medicalCardNumber?: string | null;
	chartNumber?: string | null;
	phone?: string | null;
	address?: string | null;
	administrativeProfile?: {
		identityDocument?: string | null;
		insurancePolicyNumber?: string | null;
		omsPolis?: string | null;
		snils?: string | null;
		registrationAddress?: string | null;
		residentialAddress?: string | null;
	} | null;
	identityDocument?: string | null;
	passport?: string | null;
	insurancePolicyNumber?: string | null;
	omsPolis?: string | null;
	snils?: string | null;
	balanceRub?: number | null;
	balanceKopecks?: number | null;
	depositRub?: number | null;
	familyBalanceRub?: number | null;
}

export interface VisitSummaryToothItem {
	toothNumber: number;
	state: string;
	surfaces?: readonly string[] | null;
}

export interface VisitSummaryModalProps {
	isOpen: boolean;
	onClose: () => void;
	patient: VisitSummaryPatient | null;
	diary: DiaryState;
	doctorName?: string | null;
	doctorSpecialty?: string | null;
	lockedAt?: string | null;
	diaryHash?: string | null;
	hasCryptoSignature?: boolean;
	isLocked?: boolean;
	teethData?: readonly VisitSummaryToothItem[];
	radiologySnapshots?: readonly RadiologySnapshotItem[];
	onPrint?: () => void;
	onOpenPrescription?: () => void;
	onOpenRadiologyReferral?: () => void;
	onOpenEgiszExport?: () => void;
	onApplySynthesizedDiary?: (diary: VisitDiaryEntry043) => void;
	onOpenProtocolGenerator?: () => void;
	onScheduleNextVisit?: () => void;
	onCompleteVisit?: () => void;
	services?: readonly any[];
	totalDueRub?: number;
	patientDepositRub?: number;
	patientFamilyBalanceRub?: number;
	isPaid?: boolean;
	defaultDocsDropupOpen?: boolean;
	onPaymentSuccess?: (paymentData: any) => void;
}

export interface ChairsideBillingCalculationResult {
	chairsideServices: readonly any[];
	calculatedServicesTotalRub: number;
	effectiveTotalDueRub: number;
	effectiveDepositRub: number;
	effectiveFamilyBalanceRub: number;
	vatRatePercent: number;
	warrantyMonths: number;
}
