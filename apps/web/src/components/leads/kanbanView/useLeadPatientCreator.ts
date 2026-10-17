/**
 * DENTE Dental CRM — Leads Patient Creation Hook
 * Mandate 8b (<= 120 lines)
 */

import { useState } from "react";
import type { Lead } from "../../../store/leadsStore";
import { showToast } from "../../GlobalToast";

export function useLeadPatientCreator(
	createPatientFromLead: (leadId: string) => Promise<{ alreadyExisted?: boolean; message?: string }>,
	fetchLeads: () => Promise<void> | void,
	handleOpenPatientCard: (id: string) => void,
) {
	const [creatingPatientLeadId, setCreatingPatientLeadId] = useState<string | null>(null);

	const handleCreatePatientFromLead = async (lead: Lead) => {
		if (lead.existingPatient) {
			try {
				handleOpenPatientCard(lead.existingPatient.id);
				showToast(`Открыта амбулаторная карта: ${lead.existingPatient.fullName}`, "info");
			} catch {
				// fallback
			}
			return;
		}
		if (creatingPatientLeadId) return;
		setCreatingPatientLeadId(lead.id);
		try {
			const res = await createPatientFromLead(lead.id);
			if (res.alreadyExisted) {
				showToast(res.message || "Пациент с таким номером уже есть в базе клиники", "info");
			} else {
				showToast(res.message || `Создана амбулаторная карта: ${lead.name}`, "success");
			}
			fetchLeads();
		} catch (err: unknown) {
			const text = err instanceof Error && err.message.trim() ? err.message : "Не удалось создать карту пациента.";
			showToast(text, "error");
		} finally {
			setCreatingPatientLeadId(null);
		}
	};

	return { creatingPatientLeadId, handleCreatePatientFromLead };
}
