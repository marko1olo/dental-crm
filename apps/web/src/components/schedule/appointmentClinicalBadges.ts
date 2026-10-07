import type {
	Appointment,
	AppointmentLabStatusInfo,
} from "@dental/shared";
import { evaluateAppointmentLabStatus } from "@dental/shared";
import { isAppointmentCito, isAppointmentInChair } from "./appointmentCardHelpers";

export interface ClinicalBadgeItem {
	id:
		| "somatic_allergy"
		| "primary"
		| "contract"
		| "consent"
		| "deposit"
		| "debt"
		| "installment"
		| "lab_order"
		| "plan"
		| "radiology"
		| "chat_confirmed"
		| "dms_insurance"
		| "cito_emergency"
		| "pediatric"
		| "discount"
		| "arrived_waiting"
		| "in_chair";
	schiCode: string; // "schi-1" .. "schi-17"
	icon: string;
	title: string;
	labelRu: string;
	badgeClass: string;
}

/**
 * Resolves lab order status info:
 * - «Поступил в клинику» (ready_in_clinic: зеленый/emerald)
 * - «Просрочен» (overdue: красный/rose с числом дней задержки)
 * - «В лаборатории» (in_lab: желтый/amber)
 */
export function resolveAppointmentLabStatus(
	appointment?: Appointment | null,
	// biome-ignore lint/suspicious/noExplicitAny: lab order payload
	explicitLabOrder?: any,
	referenceDate: Date | string = new Date(),
): AppointmentLabStatusInfo | null {
	if (!appointment && !explicitLabOrder) return null;

	if (
		explicitLabOrder &&
		typeof explicitLabOrder === "object" &&
		"state" in explicitLabOrder &&
		"badgeClass" in explicitLabOrder
	) {
		return explicitLabOrder as AppointmentLabStatusInfo;
	}

	// biome-ignore lint/suspicious/noExplicitAny: polymorphic appointment structure
	const aAny = appointment as any;
	const candidate =
		explicitLabOrder ||
		aAny?.labOrder ||
		(aAny?.labOrderId ||
		aAny?.labWorkTitle ||
		aAny?.labDueDate ||
		aAny?.labStatus
			? {
					id: aAny?.labOrderId,
					orderNumber: aAny?.labOrderNumber,
					patientId: appointment?.patientId,
					toothFdi: aAny?.toothNumber || aAny?.tooth,
					workType: aAny?.labWorkTitle || aAny?.labWorkType,
					material: aAny?.labMaterial,
					colorVita: aAny?.colorVita || aAny?.vitaShade,
					dueDate: aAny?.labDueDate || aAny?.expectedLabDeliveryDate,
					status: aAny?.labStatus,
					stage: aAny?.labStage,
					receivedDate: aAny?.labReceivedDate,
				}
			: null);

	if (candidate) {
		return evaluateAppointmentLabStatus(candidate, referenceDate);
	}

	const reason = (appointment?.reason || "").toLowerCase();
	if (/лаборат|наряд|слепок|коронк|протез|вкладк|примерк/i.test(reason)) {
		return evaluateAppointmentLabStatus(
			{
				status: /готов|сдач|поступ/i.test(reason) ? "ready_in_clinic" : "in_progress",
				workType: appointment?.reason ?? null,
			},
			referenceDate,
		);
	}

	return null;
}

/**
 * Resolves the 17 canonical clinical badges from DentalPRO expo26 (schi-1 .. schi-17):
 * 1.  schi-1:  Somatic/Allergy alert
 * 2.  schi-2:  Primary patient / first consultation
 * 3.  schi-3:  Contract signed
 * 4.  schi-4:  Informed Consent (IDS 1051n) signed
 * 5.  schi-5:  Paid / Deposit advance
 * 6.  schi-6:  Debt / unpaid balance
 * 7.  schi-7:  Installment / payment split
 * 8.  schi-8:  Dental lab work order attached
 * 9.  schi-9:  Active treatment plan attached
 * 10. schi-10: CBCT / X-ray radiology study present
 * 11. schi-11: Messenger reminder confirmed (WhatsApp/Telegram)
 * 12. schi-12: DMS voluntary medical insurance policy
 * 13. schi-13: CITO Acute pain / emergency slot
 * 14. schi-14: Pediatric patient (<18 y.o.)
 * 15. schi-15: Loyalty discount active
 * 16. schi-16: Patient arrived / waiting in hall
 * 17. schi-17: In chair / active procedure
 */
export function resolveAppointmentClinicalBadges(
	appointment?: Appointment | null,
	// biome-ignore lint/suspicious/noExplicitAny: patient payload
	patient?: any,
	balance?: number | null,
	allergyAlert?: string | null,
	// biome-ignore lint/suspicious/noExplicitAny: lab order payload
	explicitLabOrder?: any,
): ClinicalBadgeItem[] {
	if (!appointment) return [];
	const badges: ClinicalBadgeItem[] = [];
	const reason = (appointment?.reason || "").toLowerCase();
	// biome-ignore lint/suspicious/noExplicitAny: appointment polymorphic fields
	const aAny = appointment as any;

	// 1. schi-1: Somatic / Allergy Alert
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

	// 2. schi-2: Primary consultation
	const isPrimary =
		Boolean(aAny?.isPrimary) ||
		Boolean(aAny?.isFirstVisit) ||
		reason.includes("первичн") ||
		reason.includes("консультац");
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

	// 3. schi-3: Contract Signed
	const hasContract =
		Boolean(patient?.contractSigned) ||
		Boolean(aAny?.contractSigned);
	if (hasContract) {
		badges.push({
			id: "contract",
			schiCode: "schi-3",
			icon: "FileText",
			labelRu: "Договор",
			title: "Медицинский договор с клиникой подписан",
			badgeClass: "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30",
		});
	}

	// 4. schi-4: Informed Consent (IDS 1051n)
	const hasConsent =
		Boolean(patient?.hasInformedConsent) ||
		Boolean((patient?.consents && patient.consents.length > 0)) ||
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

	// 5. schi-5: Deposit / Advance
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

	// 6. schi-6: Debt / Unpaid
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

	// 7. schi-7: Installment / Split
	const hasInstallment =
		Boolean(patient?.hasInstallment) ||
		Boolean(aAny?.hasInstallment) ||
		Boolean(aAny?.isSplitPayment);
	if (hasInstallment) {
		badges.push({
			id: "installment",
			schiCode: "schi-7",
			icon: "Scissors",
			labelRu: "Рассрочка",
			title: "Оплата в рассрочку / согласованный график платежей",
			badgeClass: "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-500/30",
		});
	}

	// 8. schi-8: Lab work order & clinical status
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

	// 9. schi-9: Treatment plan
	const hasPlan =
		Boolean(aAny?.treatmentPlanId) ||
		Boolean(aAny?.planNumber);
	if (hasPlan) {
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
	const hasRadiology =
		Boolean(patient?.hasXrays) ||
		Boolean(patient?.radiologyStudiesCount > 0) ||
		Boolean(aAny?.hasXray) ||
		/снимок|рентген|кт|cbct|оптг/i.test(reason);
	if (hasRadiology) {
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
	const isMessengerConfirmed =
		Boolean(aAny?.confirmedViaMessenger) ||
		Boolean(aAny?.whatsappConfirmed);
	if (isMessengerConfirmed) {
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
	const isDms =
		Boolean(patient?.insurancePolicy) ||
		Boolean(aAny?.isDms) ||
		/дмс|страхов/i.test(reason);
	if (isDms) {
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
