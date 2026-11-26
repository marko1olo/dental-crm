import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import type { BatchDispatchResult, ReminderChannel, TomorrowReminderItem } from "./types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function dispatchBatchReminders(
	reminders: TomorrowReminderItem[],
	options?: {
		allowQuietHoursOverride?: boolean;
		channelOverride?: "auto" | ReminderChannel;
		dateIso?: string;
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

	const eligibleItems: TomorrowReminderItem[] = [];

	for (let i = 0; i < reminders.length; i++) {
		const item = reminders[i];
		if (!item) continue;
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

		eligibleItems.push(item);
	}

	if (eligibleItems.length === 0) {
		return out;
	}

	const derivedDate = options?.dateIso ?? eligibleItems[0]?.startsAtIso?.slice(0, 10);
	const validUuidIds = eligibleItems
		.map((item) => item.appointmentId)
		.filter((id) => UUID_REGEX.test(id));

	const requestPayload: Record<string, unknown> = {
		...(derivedDate && /^\d{4}-\d{2}-\d{2}$/.test(derivedDate) ? { date: derivedDate } : {}),
		...(options?.allowQuietHoursOverride !== undefined
			? { allowQuietHoursOverride: options.allowQuietHoursOverride }
			: {}),
		...(options?.channelOverride ? { channelOverride: options.channelOverride } : {}),
		...(validUuidIds.length > 0 ? { appointmentIds: validUuidIds } : {}),
	};

	try {
		const res = await fetch("/api/schedule/tomorrow-reminders/dispatch", {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify(requestPayload),
		});

		if (!res.ok) {
			const errJson = (await res.json().catch(() => null)) as Record<string, unknown> | null;
			const errMessage =
				(typeof errJson?.message === "string" && errJson.message.trim()) ||
				`Ошибка сервера при отправке напоминаний (HTTP ${res.status})`;
			clientLogger.warn("[tomorrowRemindersEngine] /api/schedule/tomorrow-reminders/dispatch returned non-OK", {
				status: res.status,
				errMessage,
			});
			for (const item of eligibleItems) {
				out.results.push({
					appointmentId: item.appointmentId,
					patientName: item.patientName,
					channel: item.preferredChannel,
					status: "error",
					error: errMessage,
				});
			}
			return out;
		}

		const rawJson = (await res.json()) as unknown;
		const payload =
			rawJson && typeof rawJson === "object" && "data" in rawJson
				? ((rawJson as { data?: unknown }).data ?? rawJson)
				: rawJson;
		const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
		const serverResults = Array.isArray(record.results)
			? (record.results as Array<Record<string, unknown>>)
			: null;

		if (serverResults && serverResults.length > 0) {
			const byApptId = new Map<string, Record<string, unknown>>();
			for (const row of serverResults) {
				if (typeof row.appointmentId === "string") {
					byApptId.set(row.appointmentId, row);
				}
			}

			for (const item of eligibleItems) {
				const srv = byApptId.get(item.appointmentId);
				const srvStatus = typeof srv?.status === "string" ? srv.status : null;
				if (srvStatus === "skipped_quiet_hours") {
					out.skippedQuietHours++;
					out.results.push({
						appointmentId: item.appointmentId,
						patientName: item.patientName,
						channel: item.preferredChannel,
						status: "skipped_quiet_hours",
						...(typeof srv?.reason === "string" ? { error: srv.reason } : {}),
					});
				} else if (srvStatus === "skipped_no_contact") {
					out.skippedNoContact++;
					out.results.push({
						appointmentId: item.appointmentId,
						patientName: item.patientName,
						channel: item.preferredChannel,
						status: "skipped_no_contact",
						...(typeof srv?.reason === "string" ? { error: srv.reason } : {}),
					});
				} else if (srvStatus === "failed" || srvStatus === "error") {
					out.results.push({
						appointmentId: item.appointmentId,
						patientName: item.patientName,
						channel: item.preferredChannel,
						status: "error",
						error: typeof srv?.reason === "string" ? srv.reason : "Не удалось отправить напоминание",
					});
				} else {
					out.dispatched++;
					out.results.push({
						appointmentId: item.appointmentId,
						patientName: item.patientName,
						channel: item.preferredChannel,
						status: "dispatched",
					});
				}
			}
			return out;
		}

		const serverDispatched = typeof record.dispatched === "number" ? record.dispatched : eligibleItems.length;
		const confirmedCount = Math.max(0, Math.min(eligibleItems.length, serverDispatched));
		for (let idx = 0; idx < eligibleItems.length; idx++) {
			const item = eligibleItems[idx];
			if (!item) continue;
			if (idx < confirmedCount) {
				out.dispatched++;
				out.results.push({
					appointmentId: item.appointmentId,
					patientName: item.patientName,
					channel: item.preferredChannel,
					status: "dispatched",
				});
			} else {
				out.results.push({
					appointmentId: item.appointmentId,
					patientName: item.patientName,
					channel: item.preferredChannel,
					status: "error",
					error: "Сервер не подтвердил отправку напоминания",
				});
			}
		}
	} catch (e) {
		const networkError = e instanceof Error ? e.message : "Сетевая ошибка при отправке напоминаний";
		clientLogger.warn("[tomorrowRemindersEngine] Batch dispatch network error:", e);
		for (const item of eligibleItems) {
			out.results.push({
				appointmentId: item.appointmentId,
				patientName: item.patientName,
				channel: item.preferredChannel,
				status: "error",
				error: networkError,
			});
		}
	}

	return out;
}
