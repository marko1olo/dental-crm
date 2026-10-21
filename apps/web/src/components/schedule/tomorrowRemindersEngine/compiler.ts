import type { Chair, Dashboard, Patient, StaffMember } from "@dental/shared";
import { checkQuietHoursPolicy } from "../generateAppointmentWhatsAppMessage";
import { getTomorrowDateIso } from "./dateHelpers";
import { buildTomorrowReminderItem } from "./itemBuilder";
import type { CompileRemindersOptions, TomorrowReminderItem, TomorrowRemindersSummary } from "./types";

export function compileTomorrowReminders(
	dashboard: Dashboard,
	targetDateIso?: string,
	options?: CompileRemindersOptions,
): TomorrowRemindersSummary {
	const now = options?.now || new Date();
	const timezone = options?.timezone || dashboard?.clinicSettings?.profile?.timezone || "Europe/Moscow";
	const dateIso = targetDateIso || getTomorrowDateIso(now, timezone);
	const baseUrl = options?.baseUrl || (typeof window !== "undefined" ? window.location.origin : "");

	const quietHoursStatus = checkQuietHoursPolicy(now, timezone);
	const clinicProfile = dashboard?.clinicSettings?.profile;
	const clinicInfo = {
		clinicName:
			(clinicProfile as { name?: string; clinicName?: string } | undefined)?.name ||
			clinicProfile?.clinicName ||
			"Стоматологическая клиника «ДЕНТЕ»",
		clinicAddress: dashboard?.clinicSettings?.profile?.address || "г. Москва, ул. Медицинская, д. 10",
		clinicPhone: dashboard?.clinicSettings?.profile?.phone || "+7 (495) 100-20-30",
	};

	const allAppointments = dashboard?.appointments || [];
	const patientsMap = new Map<string, Patient>();
	for (const p of dashboard?.patients || []) {
		if (p.id) patientsMap.set(p.id, p);
	}
	const staffMap = new Map<string, StaffMember>();
	for (const s of dashboard?.clinicSettings?.staff || []) {
		if (s.id) staffMap.set(s.id, s);
	}
	const chairsMap = new Map<string, Chair>();
	for (const c of dashboard?.clinicSettings?.chairs || []) {
		if (c.id) chairsMap.set(c.id, c);
	}

	const tomorrowAppointments = allAppointments.filter((a) => {
		if (a.status === "cancelled" || a.status === "no_show") return false;
		return (a.startsAt ? a.startsAt.slice(0, 10) : "") === dateIso;
	});
	tomorrowAppointments.sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""));

	let telegramAvailableCount = 0;
	let whatsAppAvailableCount = 0;
	let smsAvailableCount = 0;

	const reminders: TomorrowReminderItem[] = tomorrowAppointments.map((appt) => {
		const { item, availableChannels } = buildTomorrowReminderItem(
			appt,
			patientsMap,
			staffMap,
			chairsMap,
			dateIso,
			baseUrl,
			clinicInfo,
			quietHoursStatus,
			options,
		);
		if (availableChannels.includes("telegram")) telegramAvailableCount++;
		if (availableChannels.includes("whatsapp")) whatsAppAvailableCount++;
		if (availableChannels.includes("sms")) smsAvailableCount++;
		return item;
	});

	const validPhoneCount = reminders.filter((r) => Boolean(r.patientPhone)).length;
	const missingPhoneCount = reminders.length - validPhoneCount;
	const targetDateObj = new Date(dateIso);
	const targetDateFormatted = Number.isNaN(targetDateObj.getTime())
		? dateIso
		: targetDateObj.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

	return {
		targetDateIso: dateIso,
		targetDateFormatted,
		totalAppointmentsCount: reminders.length,
		validPhoneCount,
		missingPhoneCount,
		telegramAvailableCount,
		whatsAppAvailableCount,
		smsAvailableCount,
		isQuietHoursActive: quietHoursStatus.isQuietHours,
		quietHoursAlertText: quietHoursStatus.warningRu ?? null,
		reminders,
	};
}
