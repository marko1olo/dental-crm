import type { Dashboard } from "@dental/shared";
import { useCallback, useMemo, useState } from "react";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import {
	compileTomorrowReminders,
	formatAllRemindersClipboardBuffer,
	type ReminderChannel,
	type TomorrowReminderItem,
} from "../tomorrowRemindersEngine";

export function useTomorrowRemindersLogic(
	dashboard: Dashboard,
	targetDateIso?: string,
) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedChannelFilter, setSelectedChannelFilter] = useState<
		"all" | ReminderChannel
	>("all");
	const [sentAppointmentIds, setSentAppointmentIds] = useState<Set<string>>(
		new Set(),
	);
	const [isDispatching, setIsDispatching] = useState(false);
	const [dispatchProgress, setDispatchProgress] = useState<{
		current: number;
		total: number;
	} | null>(null);
	const [allowQuietHoursOverride, setAllowQuietHoursOverride] = useState(false);
	const [activeMenuAppointmentId, setActiveMenuAppointmentId] = useState<
		string | null
	>(null);

	const summary = useMemo(
		() => compileTomorrowReminders(dashboard, targetDateIso),
		[dashboard, targetDateIso],
	);

	const filteredReminders = useMemo(() => {
		let list = summary.reminders;
		if (selectedChannelFilter !== "all") {
			list = list.filter((r) =>
				r.availableChannels.includes(selectedChannelFilter),
			);
		}
		if (!searchQuery.trim()) return list;
		const q = searchQuery.toLowerCase().trim();
		return list.filter(
			(r) =>
				r.patientName.toLowerCase().includes(q) ||
				r.patientPhone?.includes(q) ||
				r.telegramUsername?.toLowerCase().includes(q) ||
				r.doctorName?.toLowerCase().includes(q) ||
				r.treatmentReason?.toLowerCase().includes(q),
		);
	}, [summary.reminders, searchQuery, selectedChannelFilter]);

	const handleCopyAll = useCallback(() => {
		const buffer = formatAllRemindersClipboardBuffer(summary);
		navigator.clipboard?.writeText(buffer);
		showToast(
			`Скопировано ${summary.totalAppointmentsCount} напоминаний в буфер обмена`,
			"success",
		);
	}, [summary]);

	const handleCopySingle = useCallback((reminder: TomorrowReminderItem) => {
		navigator.clipboard?.writeText(reminder.reminderText);
		showToast(`Текст для «${reminder.patientName}» скопирован`, "success");
	}, []);

	const handleSendWhatsApp = useCallback((reminder: TomorrowReminderItem) => {
		if (!reminder.patientPhone) {
			showToast("У пациента не указан номер телефона", "error");
			return;
		}
		if (reminder.whatsAppUrl)
			window.open(reminder.whatsAppUrl, "_blank", "noopener,noreferrer");
		else openWhatsAppChat(reminder.patientPhone, reminder.reminderText);
		setSentAppointmentIds((prev) => new Set(prev).add(reminder.appointmentId));
		showToast(`WhatsApp открыт для «${reminder.patientName}»`, "success");
	}, []);

	const handleSendTelegram = useCallback((reminder: TomorrowReminderItem) => {
		if (!reminder.telegramUrl) {
			showToast("У пациента не привязан Telegram", "error");
			return;
		}
		window.open(reminder.telegramUrl, "_blank", "noopener,noreferrer");
		setSentAppointmentIds((prev) => new Set(prev).add(reminder.appointmentId));
		showToast(`Telegram открыт для «${reminder.patientName}»`, "success");
	}, []);

	const handleSendSms = useCallback((reminder: TomorrowReminderItem) => {
		if (!reminder.smsUrl) {
			showToast("У пациента нет номера для SMS", "error");
			return;
		}
		window.open(reminder.smsUrl, "_self");
		setSentAppointmentIds((prev) => new Set(prev).add(reminder.appointmentId));
		showToast(`SMS-клиент открыт для «${reminder.patientName}»`, "success");
	}, []);

	return {
		searchQuery, setSearchQuery, selectedChannelFilter, setSelectedChannelFilter,
		sentAppointmentIds, setSentAppointmentIds, isDispatching, setIsDispatching,
		dispatchProgress, setDispatchProgress, allowQuietHoursOverride, setAllowQuietHoursOverride,
		activeMenuAppointmentId, setActiveMenuAppointmentId, summary, filteredReminders,
		handleCopyAll, handleCopySingle, handleSendWhatsApp, handleSendTelegram, handleSendSms,
	};
}
