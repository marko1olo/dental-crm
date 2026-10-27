/**
 * newAppointmentPatientResolver.ts — Quick create and draft patient auto-resolution.
 */

import type { Dashboard } from "@dental/shared";
import type { AppointmentScheduleDraft } from "../../../AppConstants";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";

export async function quickCreatePatientFromQuery(
	patientSearchQuery: string,
	authRef: React.MutableRefObject<any>,
	updateNewAppointmentDraft: (field: string, val: any) => void,
) {
	const q = patientSearchQuery.trim();
	const nameToCreate = q || "Новый пациент";
	try {
		const headers = typeof authRef.current?.denteClinicalMutationHeaders === "function"
			? authRef.current.denteClinicalMutationHeaders({ "Content-Type": "application/json" })
			: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
		const isPhoneOnly = /^[+\d\s()-]{5,}$/.test(nameToCreate);
		const res = await fetch("/api/patients", {
			method: "POST", headers,
			body: JSON.stringify({
				fullName: isPhoneOnly ? `Пациент (${nameToCreate})` : nameToCreate,
				phone: isPhoneOnly ? nameToCreate : null,
			}),
		});
		if (res.ok) {
			const pat = await res.json();
			if (pat?.id) {
				updateNewAppointmentDraft("patientId", pat.id);
				showToast(`Пациент «${pat.fullName || nameToCreate}» создан и выбран!`, "success", 3500);
			}
		} else {
			showToast("Не удалось создать пациента", "error");
		}
	} catch (err) {
		logger.error("Failed to create inline patient", err);
		showToast("Ошибка создания пациента", "error");
	}
}

export async function resolveDraftPatient(
	newAppointmentDraft: Partial<AppointmentScheduleDraft> | null | undefined,
	patientSearchQuery: string,
	dashboard: Dashboard,
	authRef: React.MutableRefObject<any>,
	updateNewAppointmentDraft: (field: string, val: any) => void,
) {
	if (newAppointmentDraft?.patientId) return;
	const q = patientSearchQuery.trim();
	if (q) {
		try {
			const headers = typeof authRef.current?.denteClinicalMutationHeaders === "function"
				? authRef.current.denteClinicalMutationHeaders({ "Content-Type": "application/json" })
				: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
			const phoneMatch = q.match(/(\+?[78][\d\s()-]{9,}\d)/);
			let resolvedName = q;
			let resolvedPhone: string | null = null;
			if (phoneMatch) {
				resolvedPhone = phoneMatch[0].trim();
				const rem = q.replace(phoneMatch[0], "").trim();
				resolvedName = rem || `Пациент (${resolvedPhone})`;
			} else if (/^[+\d\s()-]{5,}$/.test(q)) {
				resolvedPhone = q;
				resolvedName = `Пациент (${q})`;
			}
			const res = await fetch("/api/patients", {
				method: "POST", headers,
				body: JSON.stringify({ fullName: resolvedName, phone: resolvedPhone }),
			});
			if (res.ok) {
				const pat = await res.json();
				if (pat?.id) {
					newAppointmentDraft!.patientId = pat.id;
					updateNewAppointmentDraft("patientId", pat.id);
				}
			}
		} catch (err) {
			logger.error("Auto patient creation failed in new appointment form", err);
		}
	} else {
		const firstActivePatient = (dashboard.patients ?? []).find((p) => p.status === "active");
		if (firstActivePatient) {
			newAppointmentDraft!.patientId = firstActivePatient.id;
			updateNewAppointmentDraft("patientId", firstActivePatient.id);
		}
	}
}
