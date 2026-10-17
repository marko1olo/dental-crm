import type { Appointment } from "@dental/shared";
import type { ClinicalBadgeItem } from "./types";
import { isAppointmentInChair } from "../appointmentCardHelpers";

export function resolveBadgesPart3(
	appointment: Appointment,
	patient: any,
): ClinicalBadgeItem[] {
	const badges: ClinicalBadgeItem[] = [];
	const aAny = appointment as any;

	// 14. schi-14: Pediatric
	if (patient?.birthDate) {
		const bDate = new Date(patient.birthDate);
		if (!Number.isNaN(bDate.getTime())) {
			const ageYears = Math.floor(
				(Date.now() - bDate.getTime()) / (365.25 * 24 * 3600 * 1000),
			);
			if (ageYears >= 0 && ageYears < 18) {
				badges.push({
					id: "pediatric",
					schiCode: "schi-14",
					icon: "Baby",
					labelRu: `${ageYears} лет`,
					title: `Детский приём: ${ageYears} лет (в сопровождении законных представителей)`,
					badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
				});
			}
		}
	}

	// 15. schi-15: Loyalty discount
	const discount = Number(patient?.discountPercent || aAny?.discountPercent || 0);
	if (discount > 0) {
		badges.push({
			id: "discount",
			schiCode: "schi-15",
			icon: "Gift",
			labelRu: `-${discount}%`,
			title: `Персональная скидка / программа лояльности: ${discount}%`,
			badgeClass: "bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-500/30",
		});
	}

	// 16. schi-16: Arrived / Waiting
	if (appointment?.status === "arrived") {
		badges.push({
			id: "arrived_waiting",
			schiCode: "schi-16",
			icon: "Clock",
			labelRu: "В клинике",
			title: "Пациент прибыл и ожидает приглашения в кабинет",
			badgeClass: "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40",
		});
	}

	// 17. schi-17: In Chair
	if (isAppointmentInChair(appointment?.status)) {
		badges.push({
			id: "in_chair",
			schiCode: "schi-17",
			icon: "Armchair",
			labelRu: "В кресле",
			title: "Пациент находится в кресле (идёт медицинский приём)",
			badgeClass: "bg-teal-500/20 text-teal-800 dark:text-teal-200 border-teal-500/50",
		});
	}

	return badges;
}
