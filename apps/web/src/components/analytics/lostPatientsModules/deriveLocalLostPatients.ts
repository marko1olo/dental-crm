import type { Dashboard } from "@dental/shared";
import type { LostPatientRow } from "./lostPatientTypes";

export function deriveLocalLostPatients(dashboard: Dashboard | null | undefined): LostPatientRow[] {
	const localPatients = Array.isArray(dashboard?.patients) ? dashboard.patients : [];
	const localAppointments = Array.isArray(dashboard?.appointments) ? dashboard.appointments : [];
	const now = Date.now();
	const derived: LostPatientRow[] = [];

	for (const p of localPatients) {
		const pId = typeof p.id === "string" ? p.id : "";
		if (!pId) continue;
		const pFullName = typeof p.fullName === "string" ? p.fullName.trim() : "";
		const pFallbackName =
			"name" in p && typeof (p as { name?: unknown }).name === "string"
				? (p as { name: string }).name.trim()
				: "";
		const pName =
			pFullName && pFullName !== "Пациент"
				? pFullName
				: pFallbackName && pFallbackName !== "Пациент"
					? pFallbackName
					: "";
		if (!pName) continue;

		const patientAppts = localAppointments
			.filter((a) => a.patientId === pId)
			.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

		const futureAppt = patientAppts.some((a) => new Date(a.startsAt).getTime() > now);
		const lastAppt = patientAppts.find((a) => new Date(a.startsAt).getTime() <= now);
		if (!lastAppt) continue;

		const daysSince = Math.floor((now - new Date(lastAppt.startsAt).getTime()) / (1000 * 60 * 60 * 24));
		if (daysSince < 90) continue;

		const doctorNameCandidate = (lastAppt as { doctorName?: unknown }).doctorName;
		const lastDoctorName = typeof doctorNameCandidate === "string" ? doctorNameCandidate : undefined;

		const row: LostPatientRow = {
			id: pId,
			organizationId: typeof p.organizationId === "string" ? p.organizationId : "org-1",
			patientName: pName,
			phone: typeof p.phone === "string" ? p.phone : "",
			daysSinceLastVisit: daysSince,
			hasFutureAppointment: futureAppt,
			createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
			lastTreatmentCategory: "general_therapy",
			...(lastDoctorName ? { lastDoctorName } : {}),
		};
		derived.push(row);
	}
	return derived;
}
