import { useEffect } from "react";

export interface UsePatientsRouteAndEventsOptions {
	setIsRecallsHubOpen: (open: boolean) => void;
	setIsPatientCardModalOpen: (open: boolean) => void;
	handleSelectPatient: (patientId: string) => void;
}

export function usePatientsRouteAndEvents({
	setIsRecallsHubOpen,
	setIsPatientCardModalOpen,
	handleSelectPatient,
}: UsePatientsRouteAndEventsOptions) {
	useEffect(() => {
		const checkRoute = () => {
			const hash =
				typeof window !== "undefined"
					? window.location.hash.toLowerCase()
					: "";
			if (hash.includes("recall") || hash.includes("prevention")) {
				setIsRecallsHubOpen(true);
			}
		};
		checkRoute();
		window.addEventListener("hashchange", checkRoute);
		const onOpen = () => setIsRecallsHubOpen(true);
		window.addEventListener("dente:open-recalls-hub", onOpen);
		window.addEventListener("dente-open-recalls-hub", onOpen);
		return () => {
			window.removeEventListener("hashchange", checkRoute);
			window.removeEventListener("dente:open-recalls-hub", onOpen);
			window.removeEventListener("dente-open-recalls-hub", onOpen);
		};
	}, [setIsRecallsHubOpen]);

	useEffect(() => {
		const handleOpenCard = (e: Event) => {
			const detail = (e as CustomEvent).detail;
			if (detail?.patientId) {
				handleSelectPatient(detail.patientId);
			}
			setIsPatientCardModalOpen(true);
		};
		const handleBackofficeModal = (e: Event) => {
			const detail = (e as CustomEvent).detail;
			if (detail?.modalId === "patient_card") {
				if (detail?.patientId) {
					handleSelectPatient(detail.patientId);
				}
				setIsPatientCardModalOpen(true);
			}
		};
		window.addEventListener("dente-open-patient-card-modal", handleOpenCard);
		window.addEventListener(
			"dente-open-backoffice-modal",
			handleBackofficeModal,
		);
		return () => {
			window.removeEventListener(
				"dente-open-patient-card-modal",
				handleOpenCard,
			);
			window.removeEventListener(
				"dente-open-backoffice-modal",
				handleBackofficeModal,
			);
		};
	}, [handleSelectPatient, setIsPatientCardModalOpen]);
}
