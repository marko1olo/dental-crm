import { useCallback, useMemo, useState } from "react";
import { operatorReadableErrorDetail } from "../../../AppHelpers";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { actionFailureToast, requestFailureCause } from "../../../lib/panelStateText";
import { openWhatsAppChat, resolvePatientUpcomingAppointment } from "../../../store/telephonyStore";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import type { PatientWhatsappSendPanelProps, WhatsappTemplateType } from "./types";
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
		if (!id) { showToast("Выберите пациента для отправки WhatsApp", "warning"); return; }
		if (!text) { showToast("Введите текст сообщения или выберите быстрый шаблон", "warning"); return; }
		if (busy) return;
		setBusy(true); setError(null); setLastOk(null);
		try {
			const res = await fetch("/api/whatsapp/send", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ patientId: id, message: text }),
			});
			const raw = await res.text();
			const json = jsonObjectOrNull(raw);
			const serverMsg = typeof json?.message === "string" ? json.message.trim() : "";
			const detail = operatorReadableErrorDetail(serverMsg || null);
			if (!res.ok) {
				logger.error(`[whatsapp-send] POST ${res.status} ${raw.slice(0, 300)}`);
				const msg = detail ?? (res.status === 404 ? "Пациент не найден в этой клинике." : res.status === 400 ? "WhatsApp неактивен или не настроен — проверьте Настройки → Мессенджеры." : res.status === 422 ? "У пациента нет корректного номера телефона для WhatsApp." : res.status === 502 ? "WhatsApp Cloud API отклонил сообщение." : res.status === 403 ? "Недостаточно прав: прямая отправка WhatsApp недоступна врачу." : actionFailureToast("Сообщение в WhatsApp не отправлено", res.status));
				setError(msg); showToast(msg, "error", 12000); return;
			}
			const providerId = typeof json?.providerMessageId === "string" ? json.providerMessageId.trim() : "";
			const okText = providerId ? `WhatsApp отправлен (id ${providerId}).` : "Сообщение отправлено в WhatsApp.";
			setLastOk(okText); setMessage(""); showToast(okText, "success", 8000);
		} catch (e) {
			logger.error("[whatsapp-send] request failed", e);
			const msg = `Сообщение в WhatsApp не отправлено: ${requestFailureCause(null)}.`;
			setError(msg); showToast(msg, "error", 12000);
		} finally { setBusy(false); }
	}, [busy, message, patientId]);

	const handleOpenWebWhatsApp = useCallback(() => {
		if (!phoneHint) { showToast("У пациента не указан номер телефона", "warning"); return; }
		const text = message.trim() || `Здравствуйте, ${nameHint}! Вас приветствует стоматологическая клиника ${clinicName}.`;
		openWhatsAppChat(phoneHint, text);
		showToast("Чат WhatsApp открыт в новой вкладке", "success");
	}, [clinicName, message, nameHint, phoneHint]);

	return {
		pid, nameHint, phoneHint, cleanPhone, upcomingAppointment, message, setMessage, busy, error, lastOk,
		applyTemplate, send, handleOpenWebWhatsApp,
	};
}
