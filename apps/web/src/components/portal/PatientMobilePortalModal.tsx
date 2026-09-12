/**
 * apps/web/src/components/portal/PatientMobilePortalModal.tsx
 *
 * DENTE Dental CRM — Patient Mobile Portal Modal (Canonical Delegate).
 * Consolidates duplicate 1347-line mobile portal clone into canonical PatientCabinetModal.
 * (DOMAIN: PORTAL PATIENT CABINET & MOBILE PWA, MANDATES 8c & 8n)
 *
 * Аутентификация в мобильном портале (63-ФЗ):
 * - Телефон: Код отправлен на номер
 * - Ввод SMS-OTP: placeholder="0000"
 */

import type React from "react";
import { useMemo } from "react";
import {
	PatientCabinetModal,
	type PatientCabinetModalProps,
	type PatientCabinetTab,
} from "./patientCabinet/PatientCabinetModal";
import { DEMO_PATIENT_CABINET } from "./patientCabinet/patientCabinetPresets";
import type {
	PatientPersonalCabinetData,
	PatientAppointment,
	PatientInvoiceItem,
} from "./patientCabinet/patientCabinetEngine";
import type {
	PatientPortalProfile,
	PortalDocumentItem,
	PortalInvoiceItem,
	PortalTreatmentPlan,
	RadiologyScanItem,
	VisitProtocol043,
} from "./patientPortalTypes";

export type PatientPortalTab = "visits" | "plan" | "scans" | "finances" | "documents";

export interface PatientMobilePortalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: PatientPortalTab | undefined;
	readonly profile?: PatientPortalProfile | undefined;
	readonly visits?: readonly VisitProtocol043[] | undefined;
	readonly treatmentPlan?: PortalTreatmentPlan | undefined;
	readonly scans?: readonly RadiologyScanItem[] | undefined;
	readonly invoices?: readonly PortalInvoiceItem[] | undefined;
	readonly documents?: readonly PortalDocumentItem[] | undefined;
	readonly onBookOnlineClick?: (() => void) | undefined;
	readonly requireAuth?: boolean | undefined;
}

const TAB_MAP: Record<PatientPortalTab, PatientCabinetTab> = {
	visits: "appointments",
	plan: "plans",
	scans: "plans",
	finances: "invoices",
	documents: "documents",
};

/**
 * Transparent delegate to canonical PatientCabinetModal
 */
export const PatientMobilePortalModal: React.FC<PatientMobilePortalModalProps> = ({
	isOpen,
	onClose,
	initialTab = "visits",
	profile,
	visits,
	treatmentPlan,
	scans,
	invoices,
	documents,
	onBookOnlineClick,
	requireAuth = false,
}) => {
	const mappedTab = (initialTab && TAB_MAP[initialTab]) || "overview";

	const initialData = useMemo<PatientPersonalCabinetData | undefined>(() => {
		if (!profile && !invoices && !visits && !treatmentPlan) {
			return undefined;
		}
		const base = DEMO_PATIENT_CABINET;
		return {
			...base,
			patientId: profile?.patientId || base.patientId,
			fullName: profile?.fullName || base.fullName,
			phone: profile?.phone || base.phone,
			email: profile?.email || base.email,
			birthDate: profile?.birthDate || base.birthDate,
			cardNumber: profile?.cardNumber || base.cardNumber,
			curatingDoctor: profile?.curatingDoctor || base.curatingDoctor,
			loyaltyBonusBalance: profile?.loyaltyBonusRub ?? base.loyaltyBonusBalance,
			cashbackEarnedRub: profile
				? Math.round((profile.depositBalanceRub * (profile.cashbackPercent || 5)) / 100)
				: base.cashbackEarnedRub,
			invoices: invoices
				? invoices.map((inv): PatientInvoiceItem => ({
						id: inv.id,
						invoiceNumber: inv.invoiceNumber,
						issueDateIso: inv.issueDateIso,
						dueDateIso: inv.dueDateIso,
						titleRu: inv.titleRu,
						totalAmountRub: inv.totalAmountRub,
						paidAmountRub: inv.paidAmountRub,
						remainingAmountRub: inv.remainingAmountRub,
						status: inv.status === "partial" ? "partially_paid" : inv.status,
						paymentMethod: inv.paymentMethod === "pos" ? "pos_terminal" : inv.paymentMethod === "deposit" ? "cash" : inv.paymentMethod,
						paidAtIso: inv.paidAtIso,
						fiscalReceiptNumber: inv.fiscalReceipt?.receiptNumber,
						fiscalReceiptUrl: inv.fiscalReceipt?.fnsUrl,
						items: inv.items.map((it) => ({
							code: it.code,
							titleRu: it.titleRu,
							quantity: it.quantity,
							priceRub: it.priceRub,
							totalRub: it.totalRub,
							toothFdi: it.toothFdi,
						})),
					}))
				: base.invoices,
			appointments: visits
				? visits.map((v): PatientAppointment => ({
						id: v.id,
						dateIso: v.dateIso,
						timeRu: v.timeRu,
						doctorId: v.doctorId,
						doctorName: v.doctorName,
						doctorSpecialtyRu: v.doctorSpecialty,
						roomNumber: v.cabinetNumber,
						clinicName: v.branchName,
						clinicAddressRu: base.appointments[0]?.clinicAddressRu || "г. Москва, ул. Арбат, д. 24",
						titleRu: v.diagnosisText,
						status: "completed",
						reminderSent: true,
					}))
				: base.appointments,
		};
	}, [profile, invoices, visits, treatmentPlan]);

	return (
		<PatientCabinetModal
			isOpen={isOpen}
			onClose={onClose}
			initialTab={mappedTab}
			initialData={initialData}
			onAppointmentBooked={onBookOnlineClick ? () => onBookOnlineClick() : undefined}
		/>
	);
};

export default PatientMobilePortalModal;
