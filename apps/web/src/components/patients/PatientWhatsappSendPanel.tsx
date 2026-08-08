/**
 * Прямая отправка WhatsApp пациенту (POST /api/whatsapp/send).
 *
 * БЫЛО: API уже ходил в Meta Cloud API (credentials, phone normalize, real
 * sendWhatsappTextMessage), писал communication_events sent|failed и слал
 * INBOX_NEW_MESSAGE по WS — но **zero web callers**. Настройки WhatsApp
 * (settings/status) были в SettingsMessengersTab; outbox ставит в очередь
 * шаблоны/кампании. Администратор на карточке пациента не мог написать
 * одноразовое сообщение в WhatsApp без CLI/SQL — «отправлено» существовало
 * только в API.
 *
 * ТЕПЕРЬ: панель на карточке пациента — текст + «Отправить в WhatsApp».
 * Заголовки: denteAdminSecretRequestHeaders (тот же путь, что settings/status;
 * requireNonDoctorAccess — врач не шлёт). Ответ сервера (message / ok /
 * providerMessageId) показывается toast'ом; 400 inactive / 422 no phone /
 * 502 Meta failure — читаемый RU текст из payload.message.
 */

import type React from "react";
import { useCallback, useState } from "react";
import { operatorReadableErrorDetail } from "../../AppHelpers";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	actionFailureToast,
	requestFailureCause,
} from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

function jsonObjectOrNull(raw: string): Record<string, unknown> | null {
	const t = raw.trim();
	if (!t) return null;
	try {
		const p: unknown = JSON.parse(t);
		return typeof p === "object" && p !== null && !Array.isArray(p)
			? (p as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

export type PatientWhatsappSendPanelProps = {
	patientId?: string | null;
	/** Номер из карточки — только подсказка; сервер берёт phone из БД. */
	patientPhone?: string | null;
	patientName?: string | null;
};

export const PatientWhatsappSendPanel: React.FC<
	PatientWhatsappSendPanelProps
> = ({ patientId, patientPhone, patientName }) => {
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastOk, setLastOk] = useState<string | null>(null);

	const pid = (patientId ?? "").trim();
	const canSubmit = pid.length > 0 && message.trim().length > 0 && !busy;

	const send = useCallback(async () => {
		const id = (patientId ?? "").trim();
		const text = message.trim();
		if (!id || !text || busy) return;

		setBusy(true);
		setError(null);
		setLastOk(null);
		try {
			const res = await fetch("/api/whatsapp/send", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ patientId: id, message: text }),
			});
			const raw = await res.text();
			const json = jsonObjectOrNull(raw);
			const serverMsg =
				typeof json?.message === "string" ? json.message.trim() : "";
			const detail = operatorReadableErrorDetail(serverMsg || null);

			if (!res.ok) {
				logger.error(`[whatsapp-send] POST ${res.status} ${raw.slice(0, 300)}`);
				const msg =
					detail ??
					(res.status === 404
						? "Пациент не найден в этой клинике."
						: res.status === 400
							? "WhatsApp неактивен или не настроен — проверьте Настройки → Мессенджеры."
							: res.status === 422
								? "У пациента нет корректного номера телефона для WhatsApp."
								: res.status === 502
									? "WhatsApp Cloud API отклонил сообщение."
									: res.status === 403
										? "Недостаточно прав: прямая отправка WhatsApp недоступна врачу."
										: actionFailureToast(
												"Сообщение в WhatsApp не отправлено",
												res.status,
											));
				setError(msg);
				showToast(msg, "error", 12000);
				return;
			}

			const providerId =
				typeof json?.providerMessageId === "string"
					? json.providerMessageId.trim()
					: "";
			const okText = providerId
				? `WhatsApp отправлен (id ${providerId}).`
				: "Сообщение отправлено в WhatsApp.";
			setLastOk(okText);
			setMessage("");
			showToast(okText, "success", 8000);
		} catch (e) {
			logger.error("[whatsapp-send] request failed", e);
			const msg = `Сообщение в WhatsApp не отправлено: ${requestFailureCause(null)}.`;
			setError(msg);
			showToast(msg, "error", 12000);
		} finally {
			setBusy(false);
		}
	}, [busy, message, patientId]);

	if (!pid) return null;

	const phoneHint = (patientPhone ?? "").trim();
	const nameHint = (patientName ?? "").trim();

	return (
		<section
			className="rounded-2xl border border-emerald-500/25 bg-zinc-950/80 p-4 shadow-[0_0_40px_-18px_rgba(16,185,129,0.28)]"
			data-testid="patient-whatsapp-send-panel"
			aria-label="Отправить сообщение в WhatsApp"
		>
			<div className="mb-3">
				<h3 className="text-sm font-bold text-emerald-200 tracking-wide">
					WhatsApp пациенту
				</h3>
				<p className="text-xs text-zinc-500 mt-0.5">
					Прямая отправка через Cloud API на номер из карточки
					{nameHint ? ` · ${nameHint}` : ""}
					{phoneHint ? ` · ${phoneHint}` : ""}. Не очередь и не рассылка — одно
					сообщение сейчас. Нужны активные настройки WhatsApp и роль не врач.
				</p>
			</div>

			{error ? (
				<p
					className="mb-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2"
					data-testid="patient-whatsapp-send-error"
					role="alert"
				>
					{error}
				</p>
			) : null}

			{lastOk ? (
				<p
					className="mb-3 text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2"
					data-testid="patient-whatsapp-send-ok"
					role="status"
				>
					{lastOk}
				</p>
			) : null}

			<label className="block mb-2">
				<span className="sr-only">Текст сообщения WhatsApp</span>
				<textarea
					data-testid="patient-whatsapp-send-message"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					disabled={busy}
					rows={4}
					maxLength={4000}
					placeholder="Текст сообщения…"
					className="w-full min-h-[96px] px-3 py-2 text-sm rounded-xl border border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50"
				/>
			</label>

			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					data-testid="patient-whatsapp-send-submit"
					disabled={!canSubmit}
					onClick={() => void send()}
					className="min-h-[44px] min-w-[44px] px-4 py-2 text-sm font-medium rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-400/40 disabled:opacity-50"
				>
					{busy ? "Отправляю…" : "Отправить в WhatsApp"}
				</button>
				<span
					className="text-[11px] text-zinc-500"
					data-testid="patient-whatsapp-send-hint"
				>
					{message.trim().length > 0
						? `${message.trim().length} симв.`
						: "Введите текст"}
				</span>
			</div>
		</section>
	);
};

export default PatientWhatsappSendPanel;
