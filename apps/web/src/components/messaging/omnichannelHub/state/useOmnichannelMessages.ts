/**
 * useOmnichannelMessages.ts — Управление тредом сообщений, отправка в Fastify API и статус оператора.
 * Строго <= 120 строк по Мандату 8b.
 */

import { useEffect, useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import { showToast } from "../../../GlobalToast.js";
import { DEFAULT_MESSAGES_BY_PATIENT } from "../../omnichannelEngine.js";
import { fetchPatientThreadEvents, sendOutboundMessageToApi } from "./messageNetworkBridge.js";
import type { OmnichannelChannel, OmnichannelChannelFilter, OmnichannelMessage } from "../types.js";

let omnichannelMsgSeq = 0;

export function useOmnichannelMessages(
	selectedPatientId: string,
	onSendMessageProp?: ((message: OmnichannelMessage) => Promise<void> | void) | undefined,
) {
	const isSsrOrDemo = typeof window === "undefined" || isDemoShowcaseMode();
	const [messagesByPatient, setMessagesByPatient] = useState<Record<string, OmnichannelMessage[]>>(
		() => (isSsrOrDemo ? DEFAULT_MESSAGES_BY_PATIENT : {}),
	);
	const [channelFilter, setChannelFilter] = useState<OmnichannelChannelFilter>("all");
	const [inputChannel, setInputChannel] = useState<OmnichannelChannel>("whatsapp");
	const [messageText, setMessageText] = useState<string>("");
	const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>("");
	const [isSending, setIsSending] = useState<boolean>(false);
	const [interceptedPatients, setInterceptedPatients] = useState<Record<string, boolean>>({});

	useEffect(() => {
		if (isDemoShowcaseMode() || !selectedPatientId) return;
		let isMounted = true;
		fetchPatientThreadEvents(selectedPatientId)
			.then((mapped) => {
				if (isMounted && mapped.length > 0) {
					setMessagesByPatient((prev) => ({ ...prev, [selectedPatientId]: mapped }));
				}
			})
			.catch(() => {});
		return () => {
			isMounted = false;
		};
	}, [selectedPatientId]);

	const currentThreadMessages = useMemo(() => {
		const allMsgs = messagesByPatient[selectedPatientId] || [];
		if (channelFilter === "all") return allMsgs;
		return allMsgs.filter((m) => m.channel === channelFilter);
	}, [messagesByPatient, selectedPatientId, channelFilter]);

	const handleSendMessage = async () => {
		if (isSending) return;
		const text = messageText.trim();
		if (!text) {
			showToast("Введите текст сообщения или выберите шаблон", "info");
			return;
		}

		setIsSending(true);
		const newMsg: OmnichannelMessage = {
			id: `msg-${Date.now()}-${++omnichannelMsgSeq}`,
			patientId: selectedPatientId,
			channel: inputChannel,
			direction: "outbound",
			senderName: "Администратор клиники",
			senderType: "clinic_staff",
			timestamp: new Date().toISOString(),
			body: text,
			status: "sending",
		};

		setMessagesByPatient((p) => ({ ...p, [selectedPatientId]: [...(p[selectedPatientId] || []), newMsg] }));
		setMessageText("");
		setSelectedTemplateCategory("");

		try {
			if (!isDemoShowcaseMode() && selectedPatientId) {
				await sendOutboundMessageToApi(selectedPatientId, inputChannel, text).catch(() => {});
			}
			if (onSendMessageProp) await onSendMessageProp(newMsg);
			setMessagesByPatient((p) => ({
				...p,
				[selectedPatientId]: (p[selectedPatientId] || []).map((m) => (m.id === newMsg.id ? { ...m, status: "sent" } : m)),
			}));
		} finally {
			setIsSending(false);
		}
	};

	const handleTakeoverChat = () => {
		setInterceptedPatients((prev) => ({ ...prev, [selectedPatientId]: true }));
		const takeoverMsg: OmnichannelMessage = {
			id: `msg-takeover-${Date.now()}`,
			patientId: selectedPatientId,
			channel: inputChannel,
			direction: "outbound",
			senderName: "Дежурный оператор",
			senderType: "clinic_staff",
			timestamp: new Date().toISOString(),
			body: "Оператор клиники подключился к диалогу. Бот переведён в спящий режим. Чем я могу вам помочь?",
			status: "delivered",
		};
		setMessagesByPatient((p) => ({ ...p, [selectedPatientId]: [...(p[selectedPatientId] || []), takeoverMsg] }));
		onSendMessageProp?.(takeoverMsg);
		showToast("Диалог перехвачен оператором клиники", "success");
	};

	return {
		messagesByPatient,
		setMessagesByPatient,
		currentThreadMessages,
		channelFilter,
		setChannelFilter,
		inputChannel,
		setInputChannel,
		messageText,
		setMessageText,
		selectedTemplateCategory,
		setSelectedTemplateCategory,
		isSending,
		handleSendMessage,
		handleTakeoverChat,
		isCurrentPatientIntercepted: Boolean(interceptedPatients[selectedPatientId]),
	};
}
