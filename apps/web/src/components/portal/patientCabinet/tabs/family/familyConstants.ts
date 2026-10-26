import type { PatientCabinetFamilyMember } from "../../patientCabinetEngine";

export const RELATIONSHIP_OPTIONS: readonly string[] = [
	"Супруг(а)",
	"Сын",
	"Дочь",
	"Родитель",
	"Другой родственник",
];

export const DEFAULT_FAMILY_MEMBERS: readonly PatientCabinetFamilyMember[] = [
	{
		id: "fam-member-spouse",
		fullName: "Воронова Екатерина Павловна",
		relationshipRu: "Супруг(а)",
		birthDate: "1987-03-22",
		phone: "+7 (999) 765-43-21",
		cardNumber: "043-8843",
		avatarInitials: "ЕВ",
		allowSpendFamilyBalance: true,
		allowBooking: true,
		nextAppointmentDateIso: "2026-09-12",
		nextAppointmentTimeRu: "14:00",
		nextAppointmentTitleRu: "Профессиональная гигиена и AirFlow",
		nextAppointmentDoctor: "Д-р Лебедева Е. М.",
	},
	{
		id: "fam-member-child",
		fullName: "Воронов Михаил Алексеевич",
		relationshipRu: "Сын",
		birthDate: "2016-08-10",
		cardNumber: "043-8844",
		avatarInitials: "МВ",
		allowSpendFamilyBalance: true,
		allowBooking: true,
		nextAppointmentDateIso: "2026-09-18",
		nextAppointmentTimeRu: "11:30",
		nextAppointmentTitleRu: "Детский профилактический осмотр",
		nextAppointmentDoctor: "Д-р Васильева Т. А.",
	},
];

export function calculateAge(birthDate?: string): number | null {
	if (!birthDate) return null;
	try {
		const b = new Date(birthDate);
		const now = new Date();
		let age = now.getFullYear() - b.getFullYear();
		const m = now.getMonth() - b.getMonth();
		if (m < 0 || (m === 0 && now.getDate() < b.getDate())) {
			age--;
		}
		return age > 0 ? age : null;
	} catch {
		return null;
	}
}
