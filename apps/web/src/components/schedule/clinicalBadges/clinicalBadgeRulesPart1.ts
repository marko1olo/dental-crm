import type { Appointment } from "@dental/shared";
import type { ClinicalBadgeItem } from "./types";
import { resolveAppointmentLabStatus } from "./labStatusResolver";

export function resolveBadgesPart1(
	appointment: Appointment,
	patient: any,
	balance: number | null | undefined,
	allergyAlert: string | null | undefined,
	explicitLabOrder?: any,
): ClinicalBadgeItem[] {
	const badges: ClinicalBadgeItem[] = [];
	const reason = (appointment?.reason || "").toLowerCase();
	const aAny = appointment as any;

	if (allergyAlert || patient?.allergies || patient?.anamnesis?.allergies) {
		badges.push({
			id: "somatic_allergy",
			schiCode: "schi-1",
			icon: "AlertTriangle",
			labelRu: "Аллергия / Соматика",
			title: allergyAlert || "Соматический статус или аллергологический анамнез пациента",
			badgeClass: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30",
		});
	}

	const isPrimary =
		Boolean(aAny?.isPrimary) || Boolean(aAny?.isFirstVisit) ||
		reason.includes("первичн") || reason.includes("консультац");
	if (isPrimary) {
		badges.push({
			id: "primary",
			schiCode: "schi-2",
			icon: "Star",
			labelRu: "Первичный",
			title: "Первичный пациент / консультационный приём",
			badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
		});
	}

	if (Boolean(patient?.contractSigned) || Boolean(aAny?.contractSigned)) {
		badges.push({
			id: "contract",
			schiCode: "schi-3",
			icon: "FileText",
			labelRu: "Договор",
			title: "Медицинский договор с клиникой подписан",
			badgeClass: "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30",
		});
	}

	const hasConsent =
		Boolean(patient?.hasInformedConsent) ||
		Boolean(patient?.consents?.length > 0) ||
		Boolean(aAny?.hasConsent);
	if (hasConsent) {
		badges.push({
			id: "consent",
			schiCode: "schi-4",
			icon: "ClipboardCheck",
			labelRu: "ИДС",
			title: "Информированное добровольное согласие (ИДС) подписано",
			badgeClass: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-500/30",
		});
	}

	if (balance !== null && balance !== undefined && balance > 0) {
		badges.push({
			id: "deposit",
			schiCode: "schi-5",
			icon: "Wallet",
			labelRu: `+${balance.toLocaleString("ru-RU")} ₽`,
			title: `Депозит / аванс на балансе: +${balance.toLocaleString("ru-RU")} ₽`,
			badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
		});
	}

	if (balance !== null && balance !== undefined && balance < 0) {
		badges.push({
			id: "debt",
			schiCode: "schi-6",
			icon: "AlertCircle",
			labelRu: `Долг ${Math.abs(balance).toLocaleString("ru-RU")} ₽`,
			title: `Задолженность по счетам: ${Math.abs(balance).toLocaleString("ru-RU")} ₽`,
			badgeClass: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30",
		});
	}

	if (Boolean(patient?.hasInstallment) || Boolean(aAny?.hasInstallment) || Boolean(aAny?.isSplitPayment)) {
		badges.push({
			id: "installment",
			schiCode: "schi-7",
			icon: "Scissors",
			labelRu: "Рассрочка",
			title: "Оплата в рассрочку / согласованный график платежей",
			badgeClass: "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-500/30",
		});
	}

	const labStatus = resolveAppointmentLabStatus(appointment, explicitLabOrder);
	if (labStatus) {
		badges.push({
			id: "lab_order",
			schiCode: "schi-8",
			icon: labStatus.isOverdue ? "AlertTriangle" : labStatus.state === "ready_in_clinic" ? "CheckCircle2" : "Clock",
			labelRu: labStatus.isOverdue ? `ЗТЛ: +${labStatus.daysOverdue}д!` : labStatus.shortLabelRu,
			title: `ЗТЛ: ${labStatus.labelRu} (${labStatus.orderNumber || "Наряд"}). ${
				labStatus.workTypeRu ? `Изделие: ${labStatus.workTypeRu}. ` : ""
			}${labStatus.colorVita ? `Цвет VITA: ${labStatus.colorVita}. ` : ""}${
				labStatus.dueDateIso ? `Срок: ${labStatus.dueDateIso.slice(0, 10)}` : ""
			}`.trim(),
			badgeClass: labStatus.badgeClass,
		});
	}

	return badges;
}
