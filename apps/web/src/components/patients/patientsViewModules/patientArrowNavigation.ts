import type { Patient } from "@dental/shared";

export function handlePatientArrowNavigation(
	key: "ArrowDown" | "ArrowUp",
	displayPatients: Patient[],
	selectedPatientId: string | null,
	patientPagination: { limit: number; loadMore: (count?: number) => void },
	handleSelectPatient: (patientId: string) => void,
) {
	if (!displayPatients || displayPatients.length === 0) return;
	const currentIndex = displayPatients.findIndex((p) => p.id === selectedPatientId);
	let nextIndex = 0;
	if (key === "ArrowDown") {
		nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, displayPatients.length - 1);
	} else {
		nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
	}
	const nextPatient = displayPatients[nextIndex];
	if (nextPatient) {
		if (nextIndex >= patientPagination.limit) {
			patientPagination.loadMore(Math.max(50, nextIndex - patientPagination.limit + 10));
		}
		handleSelectPatient(nextPatient.id);
		const el = document.querySelector(`[data-patient-id="${nextPatient.id}"]`);
		el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
	}
}
