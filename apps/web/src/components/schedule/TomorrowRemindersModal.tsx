import React, { useState, useMemo, useCallback } from "react";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	ExternalLink,
	MessageSquare,
	Phone,
	Search,
	Send,
	Sparkles,
	User,
	X,
} from "lucide-react";
import type { Dashboard } from "@dental/shared";
import {
	compileTomorrowReminders,
	formatAllRemindersClipboardBuffer,
	type TomorrowReminderItem,
} from "./tomorrowRemindersEngine";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";

export interface TomorrowRemindersModalProps {
	dashboard: Dashboard;
	isOpen: boolean;
	onClose: () => void;
	targetDateIso?: string;
}

export function TomorrowRemindersModal({
	dashboard,
	isOpen,
	onClose,
	targetDateIso,
}: TomorrowRemindersModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [sentAppointmentIds, setSentAppointmentIds] = useState<Set<string>>(new Set());
	const [selectedReminder, setSelectedReminder] = useState<TomorrowReminderItem | null>(null);

	const summary = useMemo(() => {
		return compileTomorrowReminders(dashboard, targetDateIso);
	}, [dashboard, targetDateIso]);

	const filteredReminders = useMemo(() => {
		if (!searchQuery.trim()) return summary.reminders;
		const q = searchQuery.toLowerCase().trim();
		return summary.reminders.filter(
			(r) =>
				r.patientName.toLowerCase().includes(q) ||
				(r.patientPhone && r.patientPhone.includes(q)) ||
				(r.doctorName && r.doctorName.toLowerCase().includes(q)) ||
				(r.treatmentReason && r.treatmentReason.toLowerCase().includes(q)),
		);
	}, [summary.reminders, searchQuery]);

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

	const handleSendWhatsApp = useCallback((reminder: TomorrowReminderItem) => {
		if (!reminder.patientPhone) {
			showToast("У пациента не указан номер телефона", "error");
			return;
		}
		openWhatsAppChat(reminder.patientPhone, reminder.reminderText);
		setSentAppointmentIds((prev) => {
			const next = new Set(prev);
			next.add(reminder.appointmentId);
			return next;
		});
		showToast(`WhatsApp открыт для «${reminder.patientName}»`, "success");
	}, []);

	const handleMarkAllSent = useCallback(() => {
		const allIds = new Set(summary.reminders.map((r) => r.appointmentId));
		setSentAppointmentIds(allIds);
		showToast(`Все ${summary.totalAppointmentsCount} напоминаний отмечены отправленными`, "success");
	}, [summary.reminders, summary.totalAppointmentsCount]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
			data-testid="tomorrow-reminders-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tomorrow-reminders-title"
		>
			<div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border-2 border-teal-500/40 shadow-2xl overflow-hidden">
				{/* Modal Header */}
				<div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-teal-500/10 via-sky-500/5 to-transparent shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
							<Send className="w-6 h-6" />
						</div>
						<div>
							<h2
								id="tomorrow-reminders-title"
								className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap"
							>
								<span>Напоминания на завтра</span>
								<span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-800 dark:text-teal-200 border border-teal-500/40">
									{summary.targetDateFormatted}
								</span>
							</h2>
							<p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
								1-клик рассылка WhatsApp/SMS с инструкциями по подготовке к приему
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
						aria-label="Закрыть"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				{/* Summary Bar & Action Strip */}
				<div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
					<div className="flex items-center gap-3 flex-wrap">
						<div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
							<span className="w-2 h-2 rounded-full bg-teal-500" />
							<span>Всего записей: <strong>{summary.totalAppointmentsCount}</strong></span>
						</div>
						<div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
							<CheckCircle2 size={14} className="text-emerald-600" />
							<span>С телефонами: <strong>{summary.validPhoneCount}</strong></span>
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
							className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
							title="Скопировать все тексты для ручной рассылки"
						>
							<Copy size={14} />
							<span>Копировать все тексты</span>
						</button>
						<button
							type="button"
							onClick={handleMarkAllSent}
							className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-black hover:bg-teal-500 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
							title="Отметить все записи отправленными"
						>
							<Check size={14} />
							<span>Отметить все отправленными</span>
						</button>
					</div>
				</div>

				{/* Search Input */}
				<div className="p-3 sm:px-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
					<div className="relative">
						<Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по пациенту, телефону, врачу или диагнозу..."
							className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
						/>
					</div>
				</div>

				{/* Reminders List & Detail Drawer */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-[260px]">
					{filteredReminders.length === 0 ? (
						<div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
							<Clock className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
							<p className="font-semibold text-sm">
								{summary.totalAppointmentsCount === 0
									? `На ${summary.targetDateFormatted} нет запланированных приёмов`
									: "Ничего не найдено по вашему поисковому запросу"}
							</p>
						</div>
					) : (
						filteredReminders.map((reminder) => {
							const isSent = sentAppointmentIds.has(reminder.appointmentId);
							const isSelected = selectedReminder?.appointmentId === reminder.appointmentId;

							return (
								<div
									key={reminder.appointmentId}
									className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-3 ${
										isSent
											? "bg-slate-50/80 dark:bg-slate-900/40 border-slate-300/80 dark:border-slate-800 opacity-80"
											: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 shadow-xs hover:border-teal-500/60"
									}`}
								>
									{/* Top Row: Time, Patient, Doctor, Status Badges */}
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-base font-black font-mono px-2.5 py-0.5 rounded-lg bg-teal-500/15 text-teal-800 dark:text-teal-200 border border-teal-500/30">
												{reminder.timeFormatted}
											</span>
											<span className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
												<User size={16} className="text-teal-600 shrink-0" />
												{reminder.patientName}
											</span>
											{reminder.isCito && (
												<span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white animate-pulse">
													CITO Острая боль
												</span>
											)}
										</div>

										<div className="flex items-center gap-2">
											{isSent ? (
												<span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
													<Check size={14} />
													<span>Отправлено</span>
												</span>
											) : (
												<span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/40">
													К отправке
												</span>
											)}
										</div>
									</div>

									{/* Middle Info: Phone, Doctor, Chair, Reason */}
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400">
										<div className="flex items-center gap-1.5 font-mono">
											<Phone size={13} className="text-teal-600 shrink-0" />
											<strong className="text-slate-800 dark:text-slate-200">
												{reminder.patientPhone || "Телефон не указан"}
											</strong>
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

									{/* Action Buttons Row */}
									<div className="flex flex-wrap items-center justify-between gap-2 pt-1">
										<div className="text-[11px] text-slate-500">
											Кабинет: {reminder.chairName || "Основной"}
										</div>

										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => handleCopySingle(reminder)}
												className="h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
												title="Скопировать текст"
											>
												<Copy size={13} />
												<span>Копировать</span>
											</button>

											{reminder.patientPhone && (
												<button
													type="button"
													onClick={() => handleSendWhatsApp(reminder)}
													className="h-[38px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
													title="Открыть диалог WhatsApp с предзаполненным сообщением"
												>
													<MessageSquare size={14} />
													<span>WhatsApp</span>
													<ExternalLink size={12} className="opacity-70" />
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
					<span className="text-xs text-slate-500">
						Отправлено: {sentAppointmentIds.size} из {summary.validPhoneCount}
					</span>
					<button
						type="button"
						onClick={onClose}
						className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all cursor-pointer"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
}
