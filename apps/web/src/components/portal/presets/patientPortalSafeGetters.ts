import type {
	BookingBranch,
	BookingDoctor,
	BookingService,
	FiscalReceipt54Fz,
	PatientPortalProfile,
	PortalDocumentItem,
	PortalInvoiceItem,
	PortalTreatmentPlan,
	RadiologyScanItem,
	VisitProtocol043,
} from "../patientPortalTypes";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { SAMPLE_PORTAL_PROFILE } from "./demoProfile";
import { SAMPLE_VISIT_PROTOCOLS } from "./demoVisits";
import { SAMPLE_PORTAL_TREATMENT_PLAN } from "./demoTreatmentPlan";
import { SAMPLE_PORTAL_INVOICES } from "./demoInvoices";
import { SAMPLE_PORTAL_DOCUMENTS, SAMPLE_RADIOLOGY_SCANS } from "./demoScansAndDocuments";
import { SAMPLE_BOOKING_BRANCHES, SAMPLE_BOOKING_DOCTORS } from "./demoBooking";
import { SAMPLE_BOOKING_SERVICES, SAMPLE_UPCOMING_VISIT } from "./demoServicesAndUpcoming";

export function getSafePortalProfile(
	override?: PatientPortalProfile | null,
): PatientPortalProfile | null {
	if (override) return override;
	if (isDemoShowcaseMode()) return SAMPLE_PORTAL_PROFILE;
	return null;
}

export function getSafeVisitProtocols(
	override?: VisitProtocol043[] | null,
): VisitProtocol043[] {
	if (override && override.length > 0) return override;
	if (isDemoShowcaseMode()) return SAMPLE_VISIT_PROTOCOLS;
	return [];
}

export function getSafePortalTreatmentPlan(
	override?: PortalTreatmentPlan | null,
): PortalTreatmentPlan | null {
	if (override) return override;
	if (isDemoShowcaseMode()) return SAMPLE_PORTAL_TREATMENT_PLAN;
	return null;
}

export function getSafePortalInvoices(
	override?: PortalInvoiceItem[] | null,
): PortalInvoiceItem[] {
	if (override && override.length > 0) return override;
	if (isDemoShowcaseMode()) return SAMPLE_PORTAL_INVOICES;
	return [];
}

export function getSafePortalDocuments(
	override?: PortalDocumentItem[] | null,
): PortalDocumentItem[] {
	if (override && override.length > 0) return override;
	if (isDemoShowcaseMode()) return SAMPLE_PORTAL_DOCUMENTS;
	return [];
}

export function getSafeRadiologyScans(
	override?: RadiologyScanItem[] | null,
): RadiologyScanItem[] {
	if (override && override.length > 0) return override;
	if (isDemoShowcaseMode()) return SAMPLE_RADIOLOGY_SCANS;
	return [];
}

export function getSafeBookingBranches(
	override?: BookingBranch[] | null,
): BookingBranch[] {
	if (override && override.length > 0) return override;
	if (isDemoShowcaseMode()) return SAMPLE_BOOKING_BRANCHES;
	return [];
}

export function getSafeBookingDoctors(
	override?: BookingDoctor[] | null,
): BookingDoctor[] {
	if (override && override.length > 0) return override;
	if (isDemoShowcaseMode()) return SAMPLE_BOOKING_DOCTORS;
	return [];
}

export function getSafeBookingServices(
	override?: BookingService[] | null,
): BookingService[] {
	if (override && override.length > 0) return override;
	if (isDemoShowcaseMode()) return SAMPLE_BOOKING_SERVICES;
	return [];
}

export function getSafeUpcomingVisit(
	override?: typeof SAMPLE_UPCOMING_VISIT | null,
): typeof SAMPLE_UPCOMING_VISIT | null {
	if (override) return override;
	if (isDemoShowcaseMode()) return SAMPLE_UPCOMING_VISIT;
	return null;
}
