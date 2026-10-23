export const MACRO_KEY_ALIASES: Record<string, string> = {
	patient: "patient_name",
	patientname: "patient_name",
	patient_full_name: "patient_name",
	patientfullname: "patient_name",
	patientfirstname: "patient_first_name",
	patient_first: "patient_first_name",
	doctor: "doctor_name",
	doctorname: "doctor_name",
	doctor_full_name: "doctor_name",
	clinic: "clinic_name",
	clinicname: "clinic_name",
	phone: "clinic_phone",
	clinicphone: "clinic_phone",
	clinic_phone_number: "clinic_phone",
	address: "clinic_address",
	clinicaddress: "clinic_address",
	date: "appointment_date",
	appointmentdate: "appointment_date",
	time: "appointment_time",
	appointmenttime: "appointment_time",
	amount: "total_amount_rub",
	total_amount: "total_amount_rub",
	amount_rub: "total_amount_rub",
	sum_rub: "total_amount_rub",
	cost_rub: "total_amount_rub",
	price_rub: "total_amount_rub",
	chair: "chair_number",
	cabinet: "chair_number",
	portal: "portal_link",
	sbp: "sbp_payment_link",
};

export function extractMacroKeys(templateText: string): string[] {
	const matches = templateText.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
	const keys = new Set<string>();
	for (const raw of matches) {
		const key = raw.slice(1, -1).trim();
		if (key) {
			const canonical = MACRO_KEY_ALIASES[key.toLowerCase()] || key;
			keys.add(canonical);
		}
	}
	return Array.from(keys);
}
