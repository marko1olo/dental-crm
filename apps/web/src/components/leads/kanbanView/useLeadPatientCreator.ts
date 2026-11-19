/**
 * DENTE Dental CRM — Leads Patient Creation Hook
 * Mandate 8b (<= 120 lines)
 */

import { useState } from "react";
import type { Lead } from "../../../store/leadsStore";
import { showToast } from "../../GlobalToast";

export interface LeadPatientCreationResult {
	success?: boolean | undefined;
	alreadyExisted?: boolean | undefined;
	patient?: unknown;
	patientId?: string | undefined;
	message?: string | undefined;
}

export function useLeadPatientCreator(
	createPatientFromLead: (
		leadId: string,
	) => Promise<LeadPatientCreationResult>,
	fetchLeads: () => Promise<void> | void,
	handleOpenPatientCard: (id: string) => void,
) {
	const [creatingPatientLeadId, setCreatingPatientLeadId] = useState<
		string | null
	>(null);

	const handleCreatePatientFromLead = async (lead: Lead) => {
		if (lead.existingPatient) {
			try {
				handleOpenPatientCard(lead.existingPatient.id);
				showToast(
					`Открыта амбулаторная карта: ${lead.existingPatient.fullName}`,
					"info",
				);
			} catch {
				// fallback
			}
			return;
		}
		if (creatingPatientLeadId) return;
		setCreatingPatientLeadId(lead.id);
		try {
			const res = await createPatientFromLead(lead.id);
			const patientObj =
				res.patient &&
				typeof res.patient === "object" &&
				"id" in res.patient &&
				typeof (res.patient as { id: unknown }).id === "string"
					? (res.patient as { id: string })
					: null;
			const targetPatientId = res.patientId || patientObj?.id;
			if (res.alreadyExisted) {
				showToast(
					res.message || "Пациент с таким номером уже есть в базе клиники",
					"info",
				);
			} else {
				showToast(
					res.message || `Создана амбулаторная карта: ${lead.name}`,
					"success",
				);
			}
			if (targetPatientId) {
				try {
					handleOpenPatientCard(targetPatientId);
				} catch {
					// safe fallback
				}
			}
			fetchLeads();
		} catch (err: unknown) {
			const text =
				err instanceof Error && err.message.trim()
					? err.message
					: "Не удалось создать карту пациента.";
			showToast(text, "error");
		} finally {
			setCreatingPatientLeadId(null);
		}
	};

	return { creatingPatientLeadId, handleCreatePatientFromLead };
}
