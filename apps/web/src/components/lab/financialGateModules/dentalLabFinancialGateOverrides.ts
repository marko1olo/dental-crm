export function createDoctorClinicalOverride(
	doctorName: string,
	reason = "Клиническое решение врача (Автономия)",
) {
	return {
		authorized: true,
		doctorName: doctorName.trim() || "Лечащий врач",
		timestampIso: new Date().toISOString(),
		reason: reason.trim(),
	};
}

export function createChiefDoctorOverride(
	doctorName: string,
	reason = "Согласовано клиническое решение",
) {
	return {
		authorized: true,
		doctorName: doctorName.trim() || "Главный врач клиники",
		timestampIso: new Date().toISOString(),
		reason: reason.trim(),
	};
}
