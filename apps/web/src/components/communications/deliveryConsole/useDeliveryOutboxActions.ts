import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import {
	type DispatchReport,
	type Notice,
	type ReminderScheduleReport,
	describeDispatchReport,
	describeReminderReport,
	failNotice,
} from "../deliveryReportNotice.js";
import { extractHttpStatus, readJson } from "./constants";
import type { CommunicationSettings, DeliveryCommQueries } from "./types";

export function useDeliveryOutboxActions(
	commQueries: DeliveryCommQueries | null | undefined,
	loadAll: () => Promise<void>,
	setNotice: (n: Notice | null) => void,
	setBusy: (b: boolean) => void,
	setSettings: (s: CommunicationSettings) => void,
) {
	async function outboxAction(outboxId: string, action: "cancel" | "retry") {
		setBusy(true);
		setNotice(null);
		try {
			if (!commQueries?.outboxAction) {
				throw new Error("Действие очереди недоступно");
			}
			const response = await commQueries.outboxAction(outboxId, action);
			await readJson(response);
			setNotice({
				kind: "done",
				text: action === "cancel" ? "Сообщение отменено." : "Сообщение возвращено в очередь.",
			});
			await loadAll();
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", extractHttpStatus(error)), "error");
			setNotice(failNotice(error, action === "cancel" ? "Сообщение не отменено. Обновите журнал и попробуйте ещё раз." : "Сообщение не возвращено в очередь. Попробуйте ещё раз."));
		} finally {
			setBusy(false);
		}
	}

	async function runDispatch() {
		setBusy(true);
		setNotice(null);
		try {
			if (!commQueries?.dispatchOutbox) {
				throw new Error("Отправка очереди недоступна");
			}
			const response = await commQueries.dispatchOutbox();
			const data = await readJson<{ report: DispatchReport }>(response);
			setNotice(describeDispatchReport(data.report));
			await loadAll();
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", extractHttpStatus(error)), "error");
			setNotice(failNotice(error, "Из очереди ничего не отправлено. Попробуйте ещё раз; проверьте каналы связи."));
		} finally {
			setBusy(false);
		}
	}

	async function runReminders() {
		setBusy(true);
		setNotice(null);
		try {
			if (!commQueries?.runReminders) {
				throw new Error("Запуск напоминаний недоступен");
			}
			const response = await commQueries.runReminders();
			const data = await readJson<{ report: ReminderScheduleReport }>(response);
			setNotice(describeReminderReport(data.report));
			await loadAll();
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", extractHttpStatus(error)), "error");
			setNotice(failNotice(error, "Напоминания не поставлены. Попробуйте ещё раз."));
		} finally {
			setBusy(false);
		}
	}

	async function saveSettings(patch: Partial<CommunicationSettings>) {
		setBusy(true);
		setNotice(null);
		try {
			if (!commQueries?.saveSettings) {
				throw new Error("Сохранение настроек недоступно");
			}
			const response = await commQueries.saveSettings(patch);
			const data = await readJson<{ settings: CommunicationSettings }>(response);
			setSettings(data.settings);
			setNotice({ kind: "done", text: "Правила рассылки сохранены." });
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", extractHttpStatus(error)), "error");
			setNotice(failNotice(error, "Правила не сохранены, на сервере осталось прежнее. Попробуйте ещё раз."));
		} finally {
			setBusy(false);
		}
	}

	return { outboxAction, runDispatch, runReminders, saveSettings };
}
