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
		const pName =
			typeof p.fullName === "string" && p.fullName.trim() && p.fullName !== "Пациент"
				? p.fullName
				: typeof (p as { name?: string }).name === "string" && (p as { name?: string }).name!.trim() && (p as { name?: string }).name !== "Пациент"
					? (p as { name?: string }).name!
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

		derived.push({
			id: pId,
			organizationId: typeof p.organizationId === "string" ? p.organizationId : "org-1",
			patientName: pName,
			phone: typeof p.phone === "string" ? p.phone : "",
			daysSinceLastVisit: daysSince,
			hasFutureAppointment: futureAppt,
			createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
			lastTreatmentCategory: "general_therapy",
			lastDoctorName: typeof (lastAppt as any).doctorName === "string" ? (lastAppt as any).doctorName : undefined,
		});
	}
	return derived;
}
