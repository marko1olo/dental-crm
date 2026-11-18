import { useCallback, useMemo, useState } from "react";
import { operatorReadableErrorDetail } from "../../../AppHelpers";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { actionFailureToast, requestFailureCause } from "../../../lib/panelStateText";
import { openWhatsAppChat, resolvePatientUpcomingAppointment } from "../../../store/telephonyStore";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import type { PatientChatChannel, PatientWhatsappSendPanelProps, WhatsappTemplateType } from "./types";
import { getWhatsappTemplateText } from "./whatsappTemplates";

function jsonObjectOrNull(raw: string): Record<string, unknown> | null {
	if (typeof raw !== "string" || !raw.trim()) return null;
	try {
		const p: unknown = JSON.parse(raw.trim());
		return typeof p === "object" && p !== null && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
	} catch { return null; }
}

export function usePatientWhatsappSend({ patientId, patientPhone, patientName }: PatientWhatsappSendPanelProps) {
	const appLogic = useAppLogicContext();
	const dashboard = appLogic?.dashboard;
	const [channel, setChannel] = useState<PatientChatChannel>("whatsapp");
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastOk, setLastOk] = useState<string | null>(null);

	const pid = (patientId ?? "").trim();
	const nameHint = (patientName ?? "").trim() || "Пациент";
	const phoneHint = (patientPhone ?? "").trim();
	const clinicName = dashboard?.clinicSettings?.name || "клиника DENTE";

	const cleanPhone = useMemo(() => {
		const raw = (patientPhone ?? "").replace(/\D/g, "");
		return raw.length === 11 && raw.startsWith("8") ? `7${raw.slice(1)}` : raw;
	}, [patientPhone]);

	const upcomingAppointment = useMemo(() => {
		if (!pid || !dashboard?.appointments) return null;
		return resolvePatientUpcomingAppointment(pid, dashboard.appointments, dashboard.clinicSettings?.staff, dashboard.todayIso);
	}, [pid, dashboard?.appointments, dashboard?.clinicSettings?.staff, dashboard?.todayIso]);

	const applyTemplate = useCallback((type: WhatsappTemplateType) => {
		const text = getWhatsappTemplateText(type, { nameHint, clinicName, upcomingAppointment });
		setMessage(text); setError(null); setLastOk(null);
		showToast("Шаблон сообщения применён", "info");
	}, [clinicName, nameHint, upcomingAppointment]);

	const send = useCallback(async () => {
		const id = (patientId ?? "").trim();
		const text = message.trim();
		if (!id) { showToast("Выберите пациента для отправки сообщения", "warning"); return; }
		if (!text) { showToast("Введите текст сообщения или выберите быстрый шаблон", "warning"); return; }
		if (busy) return;
		setBusy(true); setError(null); setLastOk(null);
		try {
			const endpoint =
				channel === "whatsapp"
					? "/api/whatsapp/send"
					: channel === "max"
						? "/api/max/send"
						: `/api/communications/inbox/${encodeURIComponent(id)}/send`;
			const payload =
				channel === "whatsapp" || channel === "max"
					? { patientId: id, message: text }
					: { message: text, channel: "telegram" };

			const res = await fetch(endpoint, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(payload),
			});
			const raw = await res.text();
			const json = jsonObjectOrNull(raw);
			const serverMsg = typeof json?.message === "string" ? json.message.trim() : "";
			const detail = operatorReadableErrorDetail(serverMsg || null);
			if (!res.ok) {
				logger.error(`[messenger-send] POST ${res.status} ${raw.slice(0, 300)}`);
				const channelLabel = channel === "whatsapp" ? "WhatsApp" : channel === "max" ? "MAX" : "Telegram";
				const msg = detail ?? (res.status === 404 ? "Пациент не найден в этой клинике." : res.status === 400 ? `${channelLabel} неактивен или не настроен — проверьте Настройки → Мессенджеры.` : res.status === 422 ? `У пациента нет данных для отправки через ${channelLabel}.` : res.status === 502 ? `${channelLabel} шлюз отклонил сообщение.` : res.status === 403 ? `Недостаточно прав: прямая отправка ${channelLabel} недоступна.` : actionFailureToast(`Сообщение в ${channelLabel} не отправлено`, res.status));
				setError(msg); showToast(msg, "error", 12000); return;
			}
			const providerId = typeof json?.providerMessageId === "string" ? json.providerMessageId.trim() : "";
			const channelLabel = channel === "whatsapp" ? "WhatsApp" : channel === "max" ? "MAX" : "Telegram";
			const okText = providerId ? `${channelLabel} отправлен (id ${providerId}).` : `Сообщение отправлено в ${channelLabel}.`;
			setLastOk(okText); setMessage(""); showToast(okText, "success", 8000);
		} catch (e) {
			logger.error("[messenger-send] request failed", e);
			const channelLabel = channel === "whatsapp" ? "WhatsApp" : channel === "max" ? "MAX" : "Telegram";
			const msg = `Сообщение в ${channelLabel} не отправлено: ${requestFailureCause(null)}.`;
			setError(msg); showToast(msg, "error", 12000);
		} finally { setBusy(false); }
	}, [busy, channel, message, patientId]);

	const handleOpenWebWhatsApp = useCallback(() => {
		if (!phoneHint) { showToast("У пациента не указан номер телефона", "warning"); return; }
		const text = message.trim() || `Здравствуйте, ${nameHint}! Вас приветствует стоматологическая клиника ${clinicName}.`;
		openWhatsAppChat(phoneHint, text);
		showToast("Чат WhatsApp открыт в новой вкладке", "success");
	}, [clinicName, message, nameHint, phoneHint]);

	return {
		pid, nameHint, phoneHint, cleanPhone, upcomingAppointment, message, setMessage, busy, error, lastOk,
		channel, setChannel,
		applyTemplate, send, handleOpenWebWhatsApp,
	};
}
