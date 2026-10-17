/**
 * Fast 5-Second Solo Doctor Quick Booking Validator (Mandates 8e, 8k, Scale Sovereignty).
 * Required fields are strictly minimal: patientName, patientPhone, startsAt.
 * Assistant and INN are strictly optional and MUST NOT block booking.
 */
export function validateQuickBookingFields(input: {
	patientName?: string | null;
	patientPhone?: string | null;
	startsAt?: string | null;
	assistantId?: string | null;
	inn?: string | null;
	[key: string]: any;
}): {
	isValid: boolean;
	missingFields: string[];
	errors: string[];
} {
	const missingFields: string[] = [];
	const errors: string[] = [];

	const name = (input.patientName ?? "").trim();
	if (!name) {
		missingFields.push("patientName");
		errors.push("Укажите имя или ФИО пациента");
	}

	const rawPhone = (input.patientPhone ?? "").trim();
	const phoneDigits = rawPhone.replace(/[^\d+]/g, "");
	if (!rawPhone || phoneDigits.length < 5) {
		missingFields.push("patientPhone");
		errors.push("Укажите номер телефона пациента (минимум 5 цифр)");
	}

	const startsAt = (input.startsAt ?? "").trim();
	if (!startsAt) {
		missingFields.push("startsAt");
		errors.push("Укажите дату и время начала приёма");
	}

	return {
		isValid: missingFields.length === 0,
		missingFields,
		errors,
	};
}
