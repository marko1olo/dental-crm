/**
 * apps/web/src/components/patient-portal/PatientWebappPortalModal.tsx
 *
 * DENTE Dental CRM — Patient WebApp Portal Modal (Canonical Delegate).
 * Consolidates duplicate 1742-line mobile webapp clone into canonical PatientCabinetModal.
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY, MANDATES 8c & 8n)
 */

import type React from "react";
import { useMemo } from "react";
import {
	PatientCabinetModal,
	type PatientCabinetTab,
} from "../portal/patientCabinet/PatientCabinetModal";
import { DEMO_PATIENT_CABINET } from "../portal/patientCabinet/patientCabinetPresets";
import type {
	PatientPersonalCabinetData,
	PatientInvoiceItem,
	PatientAppointment,
} from "../portal/patientCabinet/patientCabinetEngine";
import type { PatientWebappAggregatedProfile } from "./patientWebappEngine.js";

export interface PatientWebappPortalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialPatientId?: string | undefined;
	readonly initialTab?: "home" | "appointments" | "plan" | "photos" | "payments" | "documents" | "postop" | undefined;
	readonly customProfile?: PatientWebappAggregatedProfile | undefined;
	readonly onAppointmentBook?: (() => void) | undefined;
	readonly onAppointmentReschedule?: ((appointmentId: string) => void) | undefined;
	readonly onPaymentComplete?: ((invoiceNumber: string, amountRub: number) => void) | undefined;
	readonly onDocumentSigned?: ((documentId: string) => void) | undefined;
}

const TAB_MAP: Record<string, PatientCabinetTab> = {
	home: "overview",
	appointments: "appointments",
	plan: "plans",
	photos: "plans",
	payments: "invoices",
	documents: "documents",
	postop: "care",
};

/**
 * Transparent delegate to canonical PatientCabinetModal
 */
export const PatientWebappPortalModal: React.FC<PatientWebappPortalModalProps> = ({
	isOpen,
	onClose,
	initialPatientId,
	initialTab = "home",
	customProfile,
	onAppointmentBook,
	onAppointmentReschedule,
	onPaymentComplete,
	onDocumentSigned,
}) => {
	const mappedTab = (initialTab && TAB_MAP[initialTab]) || "overview";

	const initialData = useMemo<PatientPersonalCabinetData | undefined>(() => {
		if (!customProfile) {
			if (!initialPatientId) return undefined;
			return {
				...DEMO_PATIENT_CABINET,
				patientId: initialPatientId,
			};
		}
		const base = DEMO_PATIENT_CABINET;
		return {
			...base,
			patientId: customProfile.patientId || base.patientId,
			fullName: customProfile.fullName || base.fullName,
			phone: customProfile.phone || base.phone,
			email: customProfile.email || base.email,
			birthDate: customProfile.birthDate || base.birthDate,
			cardNumber: customProfile.cardNumber || base.cardNumber,
			curatingDoctor: customProfile.curatingDoctor || base.curatingDoctor,
			loyaltyBonusBalance: customProfile.loyaltyBonusBalance ?? base.loyaltyBonusBalance,
			cashbackEarnedRub: customProfile.loyaltyCashbackRub ?? base.cashbackEarnedRub,
			invoices: customProfile.invoices
				? customProfile.invoices.map((inv): PatientInvoiceItem => ({
						id: inv.id,
						invoiceNumber: inv.invoiceNumber,
						issueDateIso: inv.issueDateIso,
						dueDateIso: inv.dueDateIso,
						titleRu: inv.titleRu,
						totalAmountRub: inv.totalAmountRub,
						paidAmountRub: inv.paidAmountRub,
						remainingAmountRub: inv.remainingAmountRub,
						status: inv.status,
						paymentMethod: inv.paymentMethod,
						paidAtIso: inv.paidAtIso,
						fiscalReceiptNumber: inv.fiscalReceiptNumber,
						fiscalReceiptUrl: inv.fiscalReceiptUrl,
						items: [],
					}))
				: base.invoices,
			appointments: customProfile.upcomingAppointments
				? customProfile.upcomingAppointments.map((apt): PatientAppointment => ({
						id: apt.id,
						dateIso: apt.dateIso,
						timeRu: apt.timeRu,
						doctorId: apt.doctorId,
						doctorName: apt.doctorName,
						doctorSpecialtyRu: apt.doctorSpecialtyRu,
						doctorAvatarUrl: apt.doctorAvatarUrl,
						roomNumber: apt.roomNumber,
						clinicName: customProfile.clinicName || base.appointments[0]?.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»",
						clinicAddressRu: customProfile.clinicAddress || base.appointments[0]?.clinicAddressRu || "г. Москва, ул. Арбат, д. 24",
						titleRu: apt.titleRu,
						status: apt.status === "cancelled" ? "cancelled" : "scheduled",
						reminderSent: apt.reminderSent,
					}))
				: base.appointments,
		};
	}, [customProfile, initialPatientId]);

	return (
		<PatientCabinetModal
			isOpen={isOpen}
			onClose={onClose}
			initialTab={mappedTab}
			initialData={initialData}
			onAppointmentBooked={onAppointmentBook ? () => onAppointmentBook() : undefined}
			onInvoicePaid={
				onPaymentComplete
					? (inv) => onPaymentComplete(inv.invoiceNumber, inv.totalAmountRub)
					: undefined
			}
			onConsentSigned={
				onDocumentSigned
					? (c) => onDocumentSigned(c.id)
					: undefined
			}
		/>
	);
};

export default PatientWebappPortalModal;
