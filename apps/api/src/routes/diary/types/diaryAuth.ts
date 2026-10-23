/**
 * Проверяет, имеет ли пользователь право подписывать, блокировать и исправлять дневник приёма.
 * Подписание разрешено врачам всех специальностей (терапевт, хирург, ортопед, ортодонт, пародонтолог,
 * имплантолог, гигиенист, рентгенолог), главврачам (chief_doctor, head_doctor, cmo), владельцам и администраторам (Мандат 8e).
 */
export function isDoctorOrClinicalSigner(role: string): boolean {
	const normalized = (role || "").toLowerCase();
	return (
		normalized === "doctor" ||
		normalized === "admin" ||
		normalized === "owner" ||
		normalized === "head_doctor" ||
		normalized === "chief_doctor" ||
		normalized === "chiefdoctor" ||
		normalized === "cmo" ||
		normalized === "therapist" ||
		normalized === "surgeon" ||
		normalized === "orthopedist" ||
		normalized === "orthodontist" ||
		normalized === "periodontist" ||
		normalized === "implantologist" ||
		normalized === "hygienist" ||
		normalized === "radiologist"
	);
}
