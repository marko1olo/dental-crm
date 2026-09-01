/**
 * Прямая отправка WhatsApp пациенту (POST /api/whatsapp/send) и быстрые шаблоны сообщений.
 *
 * ВОЗМОЖНОСТИ:
 * 1. Быстрые шаблоны с автоматической подстановкой имени, времени, врача и клиники:
 *    - 🔔 Напоминание о приёме
 *    - ✅ Подтверждение записи
 *    - ✨ Приглашение на профгигиену (раз в 6 месяцев)
 *    - 🦷 Контрольный осмотр после лечения
 * 2. Двойной канал отправки:
 *    - Прямая отправка через Cloud API сервера (POST /api/whatsapp/send)
 *    - Быстрый переход в WhatsApp Web / App (wa.me) в 1 клик
 * 3. Валидация прав (requireNonDoctorAccess), очистка номера и защита от сбоев сети.
 */

import { Calendar, CheckCircle2, MessageSquare, Send, Sparkles, Stethoscope } from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { operatorReadableErrorDetail } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	actionFailureToast,
	requestFailureCause,
} from "../../lib/panelStateText";
import {
	generateAppointmentConfirmationMessage,
	openWhatsAppChat,
	resolvePatientUpcomingAppointment,
} from "../../store/telephonyStore";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

function jsonObjectOrNull(raw: string): Record<string, unknown> | null {
	if (typeof raw !== "string") return null;
	const t = (raw ?? "").trim();
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
	const appLogic = useAppLogicContext();
	const dashboard = appLogic?.dashboard;

	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastOk, setLastOk] = useState<string | null>(null);

	const pid = (patientId ?? "").trim();
	const canSubmit = pid.length > 0 && message.trim().length > 0 && !busy;

	const nameHint = (patientName ?? "").trim() || "Пациент";
	const phoneHint = (patientPhone ?? "").trim();
	const clinicName = dashboard?.clinicSettings?.name || "клиника DENTE";

	// Поиск ближайшей будущей записи пациента
	const upcomingAppointment = useMemo(() => {
		if (!pid || !dashboard?.appointments) return null;
		return resolvePatientUpcomingAppointment(
			pid,
			dashboard.appointments,
			dashboard.clinicSettings?.staff,
			dashboard.todayIso,
		);
	}, [pid, dashboard?.appointments, dashboard?.clinicSettings?.staff, dashboard?.todayIso]);

	// Генераторы быстрых шаблонов сообщений
	const applyTemplate = useCallback(
		(type: "reminder" | "confirmation" | "hygiene" | "checkup") => {
			let text = "";
			const doctor = upcomingAppointment?.doctorName || "лечащему врачу";
			const dateStr = upcomingAppointment
				? `${upcomingAppointment.isToday ? "сегодня" : upcomingAppointment.isTomorrow ? "завтра" : upcomingAppointment.formattedDate} в ${upcomingAppointment.formattedTime}`
				: "";

			switch (type) {
				case "reminder":
					if (upcomingAppointment) {
						text = generateAppointmentConfirmationMessage({
							patientName: nameHint,
							doctorName: upcomingAppointment.doctorName,
							appointmentStartsAt: upcomingAppointment.startsAt,
							clinicName,
							templateType: "reminder",
						});
					} else {
						text = `Здравствуйте, ${nameHint}! Напоминаем о вашем визите в ${clinicName}. Пожалуйста, приходите за 5–10 минут до начала приёма.`;
					}
					break;

				case "confirmation":
					if (upcomingAppointment) {
						text = `Здравствуйте, ${nameHint}! Напоминаем: вы записаны в ${clinicName} на ${dateStr} к доктору ${doctor}. Пожалуйста, подтвердите визит ответным сообщением ДА или позвоните нам.`;
					} else {
						text = `Здравствуйте, ${nameHint}! Подтверждаем вашу запись в ${clinicName}. Ждём вас на приём!`;
					}
					break;

				case "hygiene":
					text = `Здравствуйте, ${nameHint}! Стоматология ${clinicName} напоминает: прошло 6 месяцев с вашего последнего визита. Рекомендуем пройти комплексную профессиональную гигиену полости рта (AirFlow + ультразвук). Подобрать для вас удобное время?`;
					break;

				case "checkup":
					text = `Здравствуйте, ${nameHint}! Как ваше самочувствие после недавнего лечения в ${clinicName}? Напоминаем о возможности пройти контрольный осмотр. Если вас что-то беспокоит, напишите нам.`;
					break;
			}

			setMessage(text);
			setError(null);
			setLastOk(null);
			showToast("Шаблон WhatsApp применён", "info");
		},
		[clinicName, nameHint, upcomingAppointment],
	);

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

	const handleOpenWebWhatsApp = useCallback(() => {
		if (!phoneHint) {
			showToast("У пациента не указан номер телефона", "warning");
			return;
		}
		const text = message.trim() || `Здравствуйте, ${nameHint}! Вас приветствует стоматологическая клиника ${clinicName}.`;
		openWhatsAppChat(phoneHint, text);
		showToast("Чат WhatsApp открыт в новой вкладке", "success");
	}, [clinicName, message, nameHint, phoneHint]);

	if (!pid) return null;

	return (
		<section
			className="rounded-2xl border border-emerald-500/25 bg-zinc-950/80 p-4 shadow-[0_0_40px_-18px_rgba(16,185,129,0.28)]"
			data-testid="patient-whatsapp-send-panel"
			aria-label="Отправить сообщение в WhatsApp"
		>
			<div className="mb-3">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<h3 className="text-sm font-bold text-emerald-200 tracking-wide flex items-center gap-1.5">
						<MessageSquare size={16} className="text-emerald-400" />
						<span>WhatsApp пациенту</span>
					</h3>
					{phoneHint && (
						<span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800/60">
							{phoneHint}
						</span>
					)}
				</div>
				<p className="text-xs text-zinc-400 mt-1 leading-relaxed">
					Прямая отправка через Cloud API или быстрый чат wa.me. Подставляются имя пациента
					{nameHint ? ` (${nameHint})` : ""}, лечащий врач и параметры записи.
				</p>
			</div>

			{/* Быстрые шаблоны с подстановкой данных */}
			<div className="mb-3 space-y-1.5">
				<span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
					<Sparkles size={12} className="text-amber-400" />
					Быстрые шаблоны:
				</span>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
					<button
						type="button"
						onClick={() => applyTemplate("reminder")}
						className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-emerald-950/60 active:scale-95 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 hover:text-emerald-300 text-xs font-semibold text-left transition-all flex flex-col justify-center"
					>
						<span className="flex items-center gap-1">
							<Calendar size={12} className="text-amber-400" />
							<span>Напоминание</span>
						</span>
						<span className="text-[10px] text-zinc-500 font-normal truncate">
							{upcomingAppointment ? "К визиту" : "Плановый приём"}
						</span>
					</button>

					<button
						type="button"
						onClick={() => applyTemplate("confirmation")}
						className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-emerald-950/60 active:scale-95 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 hover:text-emerald-300 text-xs font-semibold text-left transition-all flex flex-col justify-center"
					>
						<span className="flex items-center gap-1">
							<CheckCircle2 size={12} className="text-emerald-400" />
							<span>Подтверждение</span>
						</span>
						<span className="text-[10px] text-zinc-500 font-normal truncate">
							Ответ ДА / НЕТ
						</span>
					</button>

					<button
						type="button"
						onClick={() => applyTemplate("hygiene")}
						className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-emerald-950/60 active:scale-95 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 hover:text-emerald-300 text-xs font-semibold text-left transition-all flex flex-col justify-center"
					>
						<span className="flex items-center gap-1">
							<Sparkles size={12} className="text-cyan-400" />
							<span>Профгигиена</span>
						</span>
						<span className="text-[10px] text-zinc-500 font-normal truncate">
							Раз в 6 месяцев
						</span>
					</button>

					<button
						type="button"
						onClick={() => applyTemplate("checkup")}
						className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-emerald-950/60 active:scale-95 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 hover:text-emerald-300 text-xs font-semibold text-left transition-all flex flex-col justify-center"
					>
						<span className="flex items-center gap-1">
							<Stethoscope size={12} className="text-purple-400" />
							<span>Осмотр</span>
						</span>
						<span className="text-[10px] text-zinc-500 font-normal truncate">
							После лечения
						</span>
					</button>
				</div>
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
					placeholder="Введите текст сообщения или выберите быстрый шаблон выше…"
					className="w-full min-h-[96px] px-3 py-2 text-sm rounded-xl border border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50"
				/>
			</label>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						data-testid="patient-whatsapp-send-submit"
						disabled={!canSubmit}
						onClick={() => void send()}
						className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white border border-emerald-400/40 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 transition-all shadow-sm"
					>
						<Send size={14} />
						<span>{busy ? "Отправляю…" : "Отправить в WhatsApp"}</span>
					</button>

					{phoneHint && (
						<button
							type="button"
							onClick={handleOpenWebWhatsApp}
							className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-emerald-300 border border-zinc-700 hover:border-emerald-500/30 inline-flex items-center justify-center gap-1.5 transition-all"
							title="Открыть в веб-версии WhatsApp"
						>
							<MessageSquare size={14} />
							<span>Открыть wa.me</span>
						</button>
					)}
				</div>

				<span
					className="text-xs text-zinc-500 font-medium"
					data-testid="patient-whatsapp-send-hint"
				>
					{message.trim().length > 0
						? `${message.trim().length} симв.`
						: "Выберите шаблон или введите текст"}
				</span>
			</div>
		</section>
	);
};

export default PatientWhatsappSendPanel;
