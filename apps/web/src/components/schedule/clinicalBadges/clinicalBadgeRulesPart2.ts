import type { Appointment } from "@dental/shared";
import type { ClinicalBadgeItem } from "./types";
import { isAppointmentCito } from "../appointmentCardHelpers";

export function resolveBadgesPart2(
	appointment: Appointment,
	patient: any,
): ClinicalBadgeItem[] {
	const badges: ClinicalBadgeItem[] = [];
	const reason = (appointment?.reason || "").toLowerCase();
	const aAny = appointment as any;

	// 9. schi-9: Treatment plan
	if (Boolean(aAny?.treatmentPlanId) || Boolean(aAny?.planNumber)) {
		badges.push({
			id: "plan",
			schiCode: "schi-9",
			icon: "FileSpreadsheet",
			labelRu: "План",
			title: `Прикреплен активный план лечения: ${aAny?.planNumber || "План"}`,
			badgeClass: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-indigo-500/30",
		});
	}

	// 10. schi-10: Radiology / X-Ray / CBCT
	if (
		Boolean(patient?.hasXrays) ||
		Boolean(patient?.radiologyStudiesCount > 0) ||
		Boolean(aAny?.hasXray) ||
		/снимок|рентген|кт|cbct|оптг/i.test(reason)
	) {
		badges.push({
			id: "radiology",
			schiCode: "schi-10",
			icon: "Camera",
			labelRu: "Снимки КТ",
			title: "В карте пациента имеются рентген-снимки / 3D КТ",
			badgeClass: "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/30",
		});
	}

	// 11. schi-11: Messenger confirmation
	if (Boolean(aAny?.confirmedViaMessenger) || Boolean(aAny?.whatsappConfirmed)) {
		badges.push({
			id: "chat_confirmed",
			schiCode: "schi-11",
			icon: "MessageSquare",
			labelRu: "WhatsApp подтверждён",
			title: "Визит подтвержден пациентом в мессенджере WhatsApp/Telegram",
			badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
		});
	}

	// 12. schi-12: DMS insurance policy
	if (Boolean(patient?.insurancePolicy) || Boolean(aAny?.isDms) || /дмс|страхов/i.test(reason)) {
		badges.push({
			id: "dms_insurance",
			schiCode: "schi-12",
			icon: "Shield",
			labelRu: "ДМС",
			title: "Приём по полису добровольного медицинского страхования (ДМС)",
			badgeClass: "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30",
		});
	}

	// 13. schi-13: Emergency (Срочно)
	if (isAppointmentCito(appointment)) {
		badges.push({
			id: "cito_emergency",
			schiCode: "schi-13",
			icon: "Zap",
			labelRu: "СРОЧНО",
			title: "Срочный приём (острая боль, экстренный приоритет)",
			badgeClass: "bg-rose-600/20 text-rose-900 dark:text-rose-100 border-rose-500/50 font-black",
		});
	}

	return badges;
}
