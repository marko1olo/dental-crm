import type { Patient } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { normalizePhoneToNational } from "../../utils/patientSearchUtils";
import type { QuickBookingAppointmentType } from "./patientReliabilityScore";
import type { useQuickBookingPatientSearch } from "./useQuickBookingPatientSearch";

export async function resolveOrAutoCreateSubmitPatient(
  patientSearch: ReturnType<typeof useQuickBookingPatientSearch>,
  appointmentType: QuickBookingAppointmentType,
): Promise<string | null> {
  if (patientSearch.patientId) return patientSearch.patientId;

  const rawName = patientSearch.newPatientFullName.trim();
  const rawPhone =
    patientSearch.newPatientPhone.trim() ||
    (/^[0-9+()-\s]+$/.test(patientSearch.searchQuery.trim()) ? patientSearch.searchQuery.trim() : "");
  const fallbackName =
    rawName ||
    (rawPhone ? `Пациент (${rawPhone})` : "") ||
    patientSearch.searchQuery.trim() ||
    (appointmentType === "emergency" ? "Пациент с острой болью (срочно)" : "Новый пациент");

  if (!fallbackName) return null;

  const cleanPhone = rawPhone ? normalizePhoneToNational(rawPhone) : null;
  let inlinePat: Patient | null = null;
  try {
    const resp = await fetch("/api/patients", {
      method: "POST",
      headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        fullName: fallbackName,
        phone: rawPhone || null,
        birthDate: patientSearch.newPatientBirthDate.trim() || null,
        allowDuplicate: true,
      }),
    });
    if (resp.ok) {
      const body = await resp.json();
      inlinePat = body.patient || body;
    } else if (resp.status === 409) {
      const errBody = await resp.json().catch(() => null);
      const existingId = errBody?.existingPatient?.id || errBody?.existingPatientId;
      if (existingId) {
        inlinePat = (errBody?.existingPatient || {
          id: existingId,
          fullName: fallbackName,
          phone: cleanPhone || rawPhone || null,
          status: "active",
        }) as Patient;
      }
    }
  } catch {}

  if (!inlinePat?.id) {
    inlinePat = {
      id: `pat-${Date.now()}`,
      fullName: fallbackName,
      phone: cleanPhone || rawPhone || null,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Patient;
  }
  patientSearch.setSelectedPatient(inlinePat);
  patientSearch.setPatientId(inlinePat.id);
  return inlinePat.id;
}
