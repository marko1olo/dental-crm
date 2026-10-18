import { useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	generatePersonalizedOffer,
	type PersonalizedOfferResult,
} from "../analyticsWidgetData.js";
import type { LostPatientRow } from "./lostPatientTypes";

export function useLostPatientOffer(clinicName?: string) {
	const [selectedOfferPatient, setSelectedOfferPatient] =
		useState<LostPatientRow | null>(null);
	const [activeOffer, setActiveOffer] =
		useState<PersonalizedOfferResult | null>(null);
	const [copiedText, setCopiedText] = useState<boolean>(false);
	const [openMenuPatientId, setOpenMenuPatientId] = useState<string | null>(null);

	const handleGenerateOffer = (patient: LostPatientRow) => {
		setSelectedOfferPatient(patient);
		setCopiedText(false);
		const offer = generatePersonalizedOffer({
			patientName: patient.patientName,
			clinicName: clinicName || undefined,
			daysSinceLastVisit: patient.daysSinceLastVisit,
			category: patient.lastTreatmentCategory || "sanitation",
			doctorName: patient.lastDoctorName || undefined,
		});
		setActiveOffer(offer);
	};

	const handleCopyOffer = async () => {
		if (!activeOffer?.messageText) return;
		try {
			await navigator.clipboard.writeText(activeOffer.messageText);
			setCopiedText(true);
			showToast("Текст предложения скопирован в буфер обмена", "info");
			setTimeout(() => setCopiedText(false), 3000);
		} catch {
			showToast("Не удалось скопировать текст", "error");
		}
	};

	const handleCloseOffer = () => {
		setSelectedOfferPatient(null);
	};

	const toggleMenu = (id: string) => {
		setOpenMenuPatientId((prev) => (prev === id ? null : id));
	};

	return {
		selectedOfferPatient,
		activeOffer,
		copiedText,
		openMenuPatientId,
		handleGenerateOffer,
		handleCopyOffer,
		handleCloseOffer,
		toggleMenu,
	};
}
