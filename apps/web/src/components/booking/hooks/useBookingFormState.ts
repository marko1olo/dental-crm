import { useEffect, useState } from "react";
import { formatRussianPhone } from "../engine/bookingPhoneUtils";

export function useBookingFormState(initialName?: string, initialPhone?: string) {
	const [patientName, setPatientName] = useState(initialName || "");
	const [patientPhone, setPatientPhone] = useState(initialPhone ? formatRussianPhone(initialPhone) : "");
	const [patientComment, setPatientComment] = useState("");
	const [hasAgreedToPrivacy, setHasAgreedToPrivacy] = useState(true);

	useEffect(() => {
		if (initialName && !patientName) {
			setPatientName(initialName);
		}
	}, [initialName, patientName]);

	useEffect(() => {
		if (initialPhone && !patientPhone) {
			setPatientPhone(formatRussianPhone(initialPhone));
		}
	}, [initialPhone, patientPhone]);

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		setPatientPhone(formatRussianPhone(raw));
	};

	return {
		patientName,
		setPatientName,
		patientPhone,
		setPatientPhone,
		handlePhoneChange,
		patientComment,
		setPatientComment,
		hasAgreedToPrivacy,
		setHasAgreedToPrivacy,
	};
}
