/**
 * DENTE Dental CRM — Leads Patient-Only Conversion Submitter
 * Mandate 8b (<= 120 lines)
 */

import type { Lead } from "../../../store/leadsStore";
import { usePatientStore } from "../../../store/patientStore";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import type { LeadConvertSubmitOptions } from "../LeadConvertModal";

interface PatientOnlyConvertParams {
	convertingLeadId: string;
	options?: LeadConvertSubmitOptions;
	leads: Lead[];
	convertLeadToAppointment: (id: string, payload: any) => Promise<any>;
	fetchLeads: () => void;
	setIsConvertOpen: (b: boolean) => void;
	setConvertingLeadId: (id: string | null) => void;
	setIsBooking: (b: boolean) => void;
}

export async function submitPatientOnlyConversion(params: PatientOnlyConvertParams) {
	params.setIsBooking(true);
	try {
		const res = await params.convertLeadToAppointment(params.convertingLeadId, {
			comment: params.options?.comment,
		});
		const activeLead = params.leads.find((l) => l.id === params.convertingLeadId);
		const src = activeLead?.source ? ` (источник: ${activeLead.source})` : "";
		const consent = params.options?.consentMarketing
			? " [рассылки: разрешены]"
			: " [рассылки: отключены]";
		const msg = activeLead?.existingPatient
			? `Обращение сопоставлено с постоянным пациентом (${activeLead.existingPatient.fullName})${src}${consent}`
			: `Создана амбулаторная карта пациента${src}${consent}`;
		showToast(msg, "success");
		params.setIsConvertOpen(false);
		params.setConvertingLeadId(null);
		params.fetchLeads();
		const createdPatient = res?.patient as { id?: string } | undefined;
		if (createdPatient?.id) usePatientStore.getState().setSelectedPatientId(createdPatient.id);
	} catch (err: unknown) {
		logger.error(err);
		showToast(
			err instanceof Error && err.message.trim() ? err.message : "Карта не создана",
			"error",
		);
	} finally {
		params.setIsBooking(false);
	}
}
