import React, { useState, useMemo, useCallback } from "react";
import {
	AlertTriangle,
	Bell,
	BellOff,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	ExternalLink,
	Globe,
	MessageCircle,
	MessageSquare,
	Moon,
	Phone,
	Search,
	Send,
	Share2,
	Sparkles,
	ThumbsDown,
	ThumbsUp,
	User,
	X,
	Zap,
} from "lucide-react";
import type { Dashboard } from "@dental/shared";
import {
	compileTomorrowReminders,
	dispatchBatchReminders,
	formatAllRemindersClipboardBuffer,
	type ReminderChannel,
	type TomorrowReminderItem,
} from "./tomorrowRemindersEngine";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";

export interface TomorrowRemindersModalProps {
	dashboard: Dashboard;
	isOpen: boolean;
	onClose: () => void;
	targetDateIso?: string | undefined;
}

export function TomorrowRemindersModal({
	dashboard,
	isOpen,
	onClose,
	targetDateIso,
}: TomorrowRemindersModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedChannelFilter, setSelectedChannelFilter] = useState<"all" | ReminderChannel>("all");
	const [sentAppointmentIds, setSentAppointmentIds] = useState<Set<string>>(new Set());
	const [isDispatching, setIsDispatching] = useState(false);
	const [dispatchProgress, setDispatchProgress] = useState<{ current: number; total: number } | null>(null);
	const [allowQuietHoursOverride, setAllowQuietHoursOverride] = useState(false);

	const summary = useMemo(() => {
		return compileTomorrowReminders(dashboard, targetDateIso);
	}, [dashboard, targetDateIso]);

	const filteredReminders = useMemo(() => {
		let list = summary.reminders;

		if (selectedChannelFilter !== "all") {
			list = list.filter((r) => r.availableChannels.includes(selectedChannelFilter));
		}

		if (!searchQuery.trim()) return list;
		const q = searchQuery.toLowerCase().trim();
		return list.filter(
			(r) =>
				r.patientName.toLowerCase().includes(q) ||
				(r.patientPhone && r.patientPhone.includes(q)) ||
				(r.telegramUsername && r.telegramUsername.toLowerCase().includes(q)) ||
				(r.doctorName && r.doctorName.toLowerCase().includes(q)) ||
				(r.treatmentReason && r.treatmentReason.toLowerCase().includes(q)),
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

	const handleCopyLink = useCallback((url: string, label: string) => {
		navigator.clipboard?.writeText(url);
		showToast(`Ссылка «${label}» скопирована в буфер`, "success");
	}, []);

	const handleSendWhatsApp = useCallback((reminder: TomorrowReminderItem) => {
		if (!reminder.patientPhone) {
			showToast("У пациента не указан номер телефона", "error");
			return;
		}
		if (reminder.whatsAppUrl) {
			window.open(reminder.whatsAppUrl, "_blank", "noopener,noreferrer");
		} else {
			openWhatsAppChat(reminder.patientPhone, reminder.reminderText);
		}
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

	const handleMarkAllSent = useCallback(() => {
		const allIds = new Set(summary.reminders.map((r) => r.appointmentId));
		setSentAppointmentIds(allIds);
		showToast(`Все ${summary.totalAppointmentsCount} напоминаний отмечены отправленными`, "success");
	}, [summary.reminders, summary.totalAppointmentsCount]);

	const handleBatchDispatch = useCallback(async () => {
		if (summary.reminders.length === 0) {
			showToast("Нет записей для рассылки", "info");
			return;
		}

		setIsDispatching(true);
		try {
			const res = await dispatchBatchReminders(summary.reminders, {
				allowQuietHoursOverride,
				onProgress: (current, total) => setDispatchProgress({ current, total }),
			});

			const newSent = new Set(sentAppointmentIds);
			for (const r of res.results) {
				if (r.status === "dispatched") {
					newSent.add(r.appointmentId);
				}
			}
			setSentAppointmentIds(newSent);

			if (res.skippedQuietHours > 0 && !allowQuietHoursOverride) {
				showToast(
					`Отправлено: ${res.dispatched}, пропущено из-за тихого часа (21:00-08:00): ${res.skippedQuietHours}`,
					"warning",
				);
			} else {
				showToast(
					`Успешно обработано ${res.dispatched} из ${res.total} напоминаний!`,
					"success",
				);
			}
		} catch (err) {
			showToast("Ошибка пакетной рассылки", "error");
		} finally {
			setIsDispatching(false);
			setDispatchProgress(null);
		}
	}, [summary.reminders, allowQuietHoursOverride, sentAppointmentIds]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
			data-testid="tomorrow-reminders-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tomorrow-reminders-title"
		>
			<div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[var(--paper)] rounded-3xl border-2 border-[var(--teal,var(--brand-primary))]/40 shadow-2xl overflow-hidden">
				{/* Modal Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-gradient-to-r from-[var(--teal)]/10 via-[var(--teal)]/5 to-transparent shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-2xl bg-[var(--teal,var(--brand-primary))] text-white flex items-center justify-center shadow-sm shrink-0">
							<Send className="w-6 h-6" />
						</div>
						<div>
							<h2
								id="tomorrow-reminders-title"
								className="text-lg sm:text-xl font-black text-[var(--ink)] flex items-center gap-2 flex-wrap"
							>
								<span>Напоминания на завтра</span>
								<span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/40">
									{summary.targetDateFormatted}
								</span>
							</h2>
							<p className="text-xs text-[var(--muted)] mt-0.5">
								Отказоустойчивая рассылка Telegram · WhatsApp · SMS с подтверждением визита в 1 клик
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
						aria-label="Закрыть"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* Quiet Hours Warning Banner per 152-FZ / 38-FZ */}
				{summary.isQuietHoursActive && (
					<div className="px-4 py-2.5 bg-amber-500/15 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-amber-900 dark:text-amber-200">
						<div className="flex items-center gap-2">
							<Moon className="w-4 h-4 text-amber-600 shrink-0" />
							<span>{summary.quietHoursAlertText}</span>
						</div>
						<label className="flex items-center gap-1.5 cursor-pointer font-bold select-none text-amber-950 dark:text-amber-100">
							<input
								type="checkbox"
								checked={allowQuietHoursOverride}
								onChange={(e) => setAllowQuietHoursOverride(e.target.checked)}
								className="rounded text-[var(--teal)] focus:ring-[var(--teal)]"
							/>
							<span>Разрешить экстренную отправку (CITO)</span>
						</label>
					</div>
				)}

				{/* Summary Bar & Action Strip */}
				<div className="px-4 sm:px-5 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
					<div className="flex items-center gap-3 flex-wrap">
						<div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
							<span className="w-2 h-2 rounded-full bg-[var(--teal,var(--brand-primary))]" />
							<span>Всего: <strong>{summary.totalAppointmentsCount}</strong></span>
						</div>
						<div className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-300">
							<MessageCircle size={14} className="text-sky-600" />
							<span>Telegram: <strong>{summary.telegramAvailableCount}</strong></span>
						</div>
						<div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
							<CheckCircle2 size={14} className="text-emerald-600" />
							<span>WhatsApp: <strong>{summary.whatsAppAvailableCount}</strong></span>
						</div>
						{summary.missingPhoneCount > 0 && (
							<div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
								<AlertTriangle size={14} className="text-amber-600" />
								<span>Без телефона: <strong>{summary.missingPhoneCount}</strong></span>
							</div>
						)}
					</div>

					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={handleCopyAll}
							className="h-[38px] px-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-bold hover:bg-[var(--paper-soft)] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
							title="Скопировать все тексты для ручной рассылки"
						>
							<Copy size={14} />
							<span>Копировать все</span>
						</button>
						<button
							type="button"
							onClick={handleBatchDispatch}
							disabled={isDispatching}
							className="h-[38px] px-4 rounded-xl bg-[var(--teal,var(--brand-primary))] text-white font-black hover:bg-[var(--teal-dark,var(--brand-primary))] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
							title="Запустить умную рассылку по доступным каналам"
						>
							<Zap size={14} className={isDispatching ? "animate-spin" : ""} />
							<span>{isDispatching ? "Рассылка..." : "Разослать все (Каскад)"}</span>
						</button>
					</div>
				</div>

				{/* Filter Tabs & Search Row */}
				<div className="p-3 sm:px-5 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3 shrink-0">
					{/* Channel Filter Chips */}
					<div className="flex items-center gap-1.5 bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)] text-xs font-bold">
						<button
							type="button"
							onClick={() => setSelectedChannelFilter("all")}
							className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
								selectedChannelFilter === "all"
									? "bg-[var(--teal)] text-white shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Все каналы ({summary.totalAppointmentsCount})
						</button>
						<button
							type="button"
							onClick={() => setSelectedChannelFilter("telegram")}
							className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
								selectedChannelFilter === "telegram"
									? "bg-sky-600 text-white shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							<MessageCircle size={13} />
							<span>Telegram ({summary.telegramAvailableCount})</span>
						</button>
						<button
							type="button"
							onClick={() => setSelectedChannelFilter("whatsapp")}
							className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
								selectedChannelFilter === "whatsapp"
									? "bg-emerald-600 text-white shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							<MessageSquare size={13} />
							<span>WhatsApp ({summary.whatsAppAvailableCount})</span>
						</button>
						<button
							type="button"
							onClick={() => setSelectedChannelFilter("sms")}
							className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
								selectedChannelFilter === "sms"
									? "bg-indigo-600 text-white shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							<Phone size={13} />
							<span>SMS ({summary.smsAvailableCount})</span>
						</button>
					</div>

					{/* Search Input */}
					<div className="relative flex-1 min-w-[200px]">
						<Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по пациенту, телефону, Telegram или врачу..."
							className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] focus:ring-2 focus:ring-[var(--teal)] focus:outline-none text-[var(--ink)]"
						/>
					</div>
				</div>

				{/* Reminders List */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-[260px]">
					{filteredReminders.length === 0 ? (
						<div className="p-8 text-center text-[var(--muted)] space-y-2">
							<Clock className="w-10 h-10 mx-auto text-[var(--muted)] opacity-60" />
							<p className="font-semibold text-sm">
								{summary.totalAppointmentsCount === 0
									? `На ${summary.targetDateFormatted} нет запланированных приёмов`
									: "Ничего не найдено по вашим критериям фильтрации"}
							</p>
						</div>
					) : (
						filteredReminders.map((reminder) => {
							const isSent = sentAppointmentIds.has(reminder.appointmentId);

							return (
								<div
									key={reminder.appointmentId}
									className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-3 ${
										isSent
											? "bg-[var(--paper-soft)]/80 border-[var(--line)] opacity-80"
											: "bg-[var(--paper)] border-[var(--line)] shadow-xs hover:border-[var(--teal,var(--brand-primary))]/60"
									}`}
								>
									{/* Top Row: Time, Patient, Doctor, Status Badges */}
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-base font-black font-mono px-2.5 py-0.5 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30">
												{reminder.timeFormatted}
											</span>
											<span className="text-base font-extrabold text-[var(--ink)] flex items-center gap-1.5">
												<User size={16} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
												{reminder.patientName}
											</span>
											{reminder.isCito && (
												<span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white animate-pulse">
													CITO Острая боль
												</span>
											)}
											{/* Channel Preference Badge */}
											<span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
												Канал: {reminder.preferredChannel.toUpperCase()}
											</span>
										</div>

										<div className="flex items-center gap-2">
											{isSent ? (
												<span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
													<Check size={14} />
													<span>Отправлено</span>
												</span>
											) : reminder.isQuietHours ? (
												<span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1">
													<Moon size={13} />
													<span>Тихий час</span>
												</span>
											) : (
												<span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/40">
													К отправке
												</span>
											)}
										</div>
									</div>

									{/* Middle Info: Contacts, Doctor, Chair, Reason */}
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[var(--muted)]">
										<div className="flex items-center gap-1.5 font-mono">
											<Phone size={13} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
											<strong className="text-slate-800 dark:text-slate-200">
												{reminder.patientPhone || "Телефон не указан"}
											</strong>
											{reminder.telegramUsername && (
												<span className="text-sky-600 font-bold">@{reminder.telegramUsername}</span>
											)}
										</div>
										<div className="truncate">
											Врач: <strong className="text-slate-800 dark:text-slate-200">{reminder.doctorName || "Любой врач"}</strong>
										</div>
										<div className="truncate">
											Прием: <strong className="text-slate-800 dark:text-slate-200">{reminder.treatmentReason || "Консультация"}</strong>
										</div>
									</div>

									{/* Allergy Alert if present */}
									{reminder.hasAllergyWarning && (
										<div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
											<AlertTriangle size={14} className="text-amber-600 shrink-0" />
											<span>{reminder.allergyWarningText}</span>
										</div>
									)}

									{/* Reminder Text Box Preview */}
									<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed relative group">
										{reminder.reminderText}
									</div>

									{/* Action Links & Channel Buttons Row */}
									<div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--line)]">
										{/* 1-Click Interactive Action Links */}
										<div className="flex items-center gap-1.5 flex-wrap">
											{reminder.confirmUrl && (
												<button
													type="button"
													onClick={() => handleCopyLink(reminder.confirmUrl!, "Подтверждение")}
													className="h-[32px] px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
													title="Скопировать ссылку подтверждения визита"
												>
													<ThumbsUp size={12} />
													<span>Ссылка «Подтвердить»</span>
												</button>
											)}
											{reminder.rescheduleUrl && (
												<button
													type="button"
													onClick={() => handleCopyLink(reminder.rescheduleUrl!, "Перенос")}
													className="h-[32px] px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-300 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
													title="Скопировать ссылку переноса визита"
												>
													<ThumbsDown size={12} />
													<span>Ссылка «Перенести»</span>
												</button>
											)}
										</div>

										{/* Direct Channel Dispatch Buttons */}
										<div className="flex items-center gap-1.5 flex-wrap">
											<button
												type="button"
												onClick={() => handleCopySingle(reminder)}
												className="h-[36px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
												title="Скопировать текст"
											>
												<Copy size={13} />
												<span>Копировать</span>
											</button>

											{reminder.availableChannels.includes("telegram") && (
												<button
													type="button"
													onClick={() => handleSendTelegram(reminder)}
													className="h-[36px] px-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
													title="Открыть диалог Telegram"
												>
													<MessageCircle size={14} />
													<span>Telegram</span>
													<ExternalLink size={11} className="opacity-70" />
												</button>
											)}

											{reminder.availableChannels.includes("whatsapp") && (
												<button
													type="button"
													onClick={() => handleSendWhatsApp(reminder)}
													className="h-[36px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
													title="Открыть диалог WhatsApp"
												>
													<MessageSquare size={14} />
													<span>WhatsApp</span>
													<ExternalLink size={11} className="opacity-70" />
												</button>
											)}

											{reminder.availableChannels.includes("sms") && (
												<button
													type="button"
													onClick={() => handleSendSms(reminder)}
													className="h-[36px] px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
													title="Открыть SMS-клиент"
												>
													<Phone size={13} />
													<span>SMS</span>
												</button>
											)}
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* Modal Footer */}
				<div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between gap-3 shrink-0">
					<div className="text-xs text-slate-500 flex items-center gap-3">
						<span>Отправлено: <strong>{sentAppointmentIds.size}</strong> из {summary.validPhoneCount}</span>
						<button
							type="button"
							onClick={handleMarkAllSent}
							className="text-[var(--teal)] hover:underline font-bold cursor-pointer"
						>
							Отметить все отправленными
						</button>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px]"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
}
