/**
 * queueBillboardTypes.ts — Контракты и маппинг очереди табло холла
 * Соблюдение 152-ФЗ: маскирование персональных данных, отказ от банковских талонов.
 */

import { buildPatientShiftQueue, type Appointment } from "@dental/shared";
import { maskPatientName152Fz } from "../lounge/patientNameMasker";

export interface QueueBillboardItem {
	readonly id: string;
	readonly cabinetName: string;
	readonly doctorName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly patientInitials?: string | undefined;
	readonly status: "invited" | "in_chair" | "waiting" | "ready_for_checkout";
	readonly timeInfo?: string | undefined;
	readonly estimatedWaitMinutes?: number | undefined;
	readonly ticketNumber?: string | undefined;
}

export interface QueueBillboardViewProps {
	readonly clinicName?: string | undefined;
	readonly clinicSubtitle?: string | undefined;
	readonly items?: readonly QueueBillboardItem[] | undefined;
	readonly appointments?: Array<Partial<Appointment> & Record<string, any>> | undefined;
	readonly className?: string | undefined;
	readonly overlayAlpha?: number | undefined;
	readonly announcementText?: string | undefined;
	readonly onClose?: (() => void) | undefined;
}

export const DEFAULT_BILLBOARD_QUEUE_ITEMS: readonly QueueBillboardItem[] = [
	{
		id: "billboard-item-1",
		cabinetName: "Кабинет 3",
		doctorName: "Д-р Воронова Е. С.",
		doctorSpecialty: "Терапевт-микроскопист",
		patientInitials: "Алексей В.",
		status: "invited",
		timeInfo: "Приглашается",
	},
	{
		id: "billboard-item-2",
		cabinetName: "Кабинет 1",
		doctorName: "Д-р Смирнов А. В.",
		doctorSpecialty: "Хирург-имплантолог",
		patientInitials: "Михаил Д.",
		status: "in_chair",
		timeInfo: "Идет прием",
	},
	{
		id: "billboard-item-3",
		cabinetName: "Кабинет 2",
		doctorName: "Д-р Соколов Д. К.",
		doctorSpecialty: "Ортодонт",
		patientInitials: "Екатерина П.",
		status: "waiting",
		timeInfo: "~5 мин",
		estimatedWaitMinutes: 5,
	},
	{
		id: "billboard-item-4",
		cabinetName: "Кабинет 3",
		doctorName: "Д-р Воронова Е. С.",
		doctorSpecialty: "Терапевт-микроскопист",
		patientInitials: "Светлана Р.",
		status: "waiting",
		timeInfo: "~15 мин",
		estimatedWaitMinutes: 15,
	},
];

export function mapShiftAppointmentsToBillboard(
	appointments: Array<Partial<Appointment> & Record<string, any>>,
): QueueBillboardItem[] {
	if (!appointments || appointments.length === 0) return [];
	const queueData = buildPatientShiftQueue(appointments);
	const mapped: QueueBillboardItem[] = [];

	// 1. В кресле / приглашены
	queueData.itemsByTab.in_chair.forEach((item) => {
		const isInvited = item.rawStatus === "invited" ||
			(item.operationalStatus as string) === "invited" ||
			(item.comment && item.comment.toLowerCase().includes("[invited]"));

		mapped.push({
			id: `billboard-chair-${item.id}`,
			cabinetName: item.chairName,
			doctorName: item.doctorName,
			doctorSpecialty: item.doctorSpecialty ?? undefined,
			patientInitials: maskPatientName152Fz(item.patientName),
			status: isInvited ? "invited" : "in_chair",
			timeInfo: isInvited ? "Приглашается" : item.chairDurationFormatted || "Идет прием",
		});
	});

	// 2. Ожидают в холле
	const waitList = queueData.itemsByTab.waiting.length > 0
		? queueData.itemsByTab.waiting
		: queueData.itemsByTab.all.filter((i) => i.operationalStatus === "planned" || i.operationalStatus === "confirmed").slice(0, 6);

	waitList.forEach((item) => {
		const isInvited = item.rawStatus === "invited" ||
			(item.operationalStatus as string) === "invited" ||
			(item.comment && item.comment.toLowerCase().includes("[invited]"));

		mapped.push({
			id: `billboard-wait-${item.id}`,
			cabinetName: item.chairName,
			doctorName: item.doctorName,
			doctorSpecialty: item.doctorSpecialty ?? undefined,
			patientInitials: maskPatientName152Fz(item.patientName),
			status: isInvited ? "invited" : "waiting",
			timeInfo: isInvited ? "Приглашается" : item.waitFormatted ? `Ожидание: ${item.waitFormatted}` : item.timeRange || "~10 мин",
		});
	});

	return mapped;
}
