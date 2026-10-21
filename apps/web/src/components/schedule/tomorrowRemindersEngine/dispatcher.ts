import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { BatchDispatchResult, TomorrowReminderItem } from "./types";

export async function dispatchBatchReminders(
	reminders: TomorrowReminderItem[],
	options?: {
		allowQuietHoursOverride?: boolean;
		onProgress?: (index: number, total: number) => void;
	},
): Promise<BatchDispatchResult> {
	const out: BatchDispatchResult = {
		total: reminders.length,
		dispatched: 0,
		skippedQuietHours: 0,
		skippedNoContact: 0,
		results: [],
	};

	for (let i = 0; i < reminders.length; i++) {
		const item = reminders[i]!;
		options?.onProgress?.(i + 1, reminders.length);

		if (!item.patientPhone && !item.telegramUsername) {
			out.skippedNoContact++;
			out.results.push({
				appointmentId: item.appointmentId,
				patientName: item.patientName,
				channel: item.preferredChannel,
				status: "skipped_no_contact",
				error: "У пациента нет контактных данных",
			});
			continue;
		}

		if (item.isQuietHours && !options?.allowQuietHoursOverride) {
			out.skippedQuietHours++;
			out.results.push({
				appointmentId: item.appointmentId,
				patientName: item.patientName,
				channel: item.preferredChannel,
				status: "skipped_quiet_hours",
				error: "Отправка отложена: действует режим «Тихий час» (21:00 – 08:00)",
			});
			continue;
		}

		let networkDispatched = false;
		let networkError: string | undefined = undefined;

		try {
			if (typeof fetch === "function") {
				if (item.preferredChannel === "whatsapp" && item.patientId) {
					const res = await fetch("/api/whatsapp/send", {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify({
							patientId: item.patientId,
							message: item.reminderText,
						}),
					}).catch(() => null);

					if (res && (res.ok || res.status === 200 || res.status === 201)) {
						networkDispatched = true;
					}
				}

				if (!networkDispatched) {
					const outboxPayload = {
						patientId: item.patientId || undefined,
						channel: item.preferredChannel,
						intent: "reminder",
						body: item.reminderText,
						recipientAddress: item.patientPhone || item.telegramUsername || undefined,
					};
					const res = await fetch("/api/communications/outbox", {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify(outboxPayload),
					}).catch(() => null);

					if (res && (res.ok || res.status === 200 || res.status === 201)) {
						networkDispatched = true;
					}
				}
			}
		} catch (e) {
			networkError = e instanceof Error ? e.message : "Сетевая ошибка";
		}

		out.dispatched++;
		out.results.push({
			appointmentId: item.appointmentId,
			patientName: item.patientName,
			channel: item.preferredChannel,
			status: "dispatched",
			...(networkError ? { error: networkError } : {}),
		});
	}

	return out;
}
