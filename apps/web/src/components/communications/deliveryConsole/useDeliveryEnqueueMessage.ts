import { useMemo, useState } from "react";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import { failNotice, type Notice } from "../deliveryReportNotice.js";
import { readJson } from "./constants";
import type { MessageDeliveryConsoleProps, TemplateItem } from "./types";

export function useDeliveryEnqueueMessage(
	commQueries: any,
	loadAll: () => Promise<void>,
	setNotice: (n: Notice | null) => void,
	busy: boolean,
	templates: TemplateItem[],
	props?: MessageDeliveryConsoleProps,
) {
	const [enqueueChannel, setEnqueueChannel] = useState<"sms" | "email" | "whatsapp" | "telegram">(
		props?.initialEnqueueChannel ?? "sms",
	);
	const [enqueueIntent, setEnqueueIntent] = useState("general");
	const [enqueueScope, setEnqueueScope] = useState<"service" | "marketing">("service");
	const [enqueueTemplateId, setEnqueueTemplateId] = useState("");
	const [enqueueBody, setEnqueueBody] = useState("");
	const [enqueueRecipient, setEnqueueRecipient] = useState("");
	const [enqueueSubject, setEnqueueSubject] = useState("");
	const [enqueueBusy, setEnqueueBusy] = useState(false);

	const enqueueTemplates = useMemo(
		() => (templates || []).filter((t) => t.isActive && t.channel === enqueueChannel),
		[templates, enqueueChannel],
	);

	const enqueueCanSubmit = !enqueueBusy;

	async function enqueueMessage() {
		if (enqueueBusy) return;
		if (busy) {
			showToast("Выполняется фоновая синхронизация, подождите завершения...", "info");
			return;
		}
		const recipient = enqueueRecipient.trim();
		if (!recipient) {
			showToast("Укажите номер телефона или адрес получателя", "warning");
			setNotice({ kind: "fail", text: "Укажите номер телефона или адрес получателя сообщения." });
			return;
		}

		let bodyToSend = enqueueBody.trim();
		if (!enqueueTemplateId && !bodyToSend) {
			bodyToSend = "Здравствуйте! Напоминаем о вашей записи на приём в клинику ДЕНТЕ. Ждём вас!";
			setEnqueueBody(bodyToSend);
		}

		setEnqueueBusy(true);
		setNotice(null);
		try {
			const payload: Record<string, unknown> = {
				channel: enqueueChannel,
				intent: enqueueIntent,
				scope: enqueueScope,
				recipientAddress: recipient,
			};
			if (enqueueTemplateId) {
				payload.templateId = enqueueTemplateId;
			} else {
				payload.body = bodyToSend;
			}
			if (enqueueChannel === "email" && enqueueSubject.trim()) {
				payload.subject = enqueueSubject.trim();
			}
			const response = await commQueries.addOutboxMessage(payload);
			const data = await readJson<{ outboxId: string; duplicate: boolean; message: string }>(response);
			setNotice({
				kind: "done",
				text: data.message || (data.duplicate ? "Такое сообщение уже стоит в очереди." : "Сообщение поставлено в очередь."),
			});
			setEnqueueBody("");
			setEnqueueTemplateId("");
			setEnqueueSubject("");
			await loadAll();
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			setNotice(failNotice(error, "Сообщение не поставлено в очередь. Текст и адрес не пропали — исправьте и нажмите ещё раз."));
		} finally {
			setEnqueueBusy(false);
		}
	}

	return {
		enqueueChannel,
		setEnqueueChannel,
		enqueueIntent,
		setEnqueueIntent,
		enqueueScope,
		setEnqueueScope,
		enqueueTemplateId,
		setEnqueueTemplateId,
		enqueueBody,
		setEnqueueBody,
		enqueueRecipient,
		setEnqueueRecipient,
		enqueueSubject,
		setEnqueueSubject,
		enqueueBusy,
		enqueueTemplates,
		enqueueCanSubmit,
		enqueueMessage,
	};
}
