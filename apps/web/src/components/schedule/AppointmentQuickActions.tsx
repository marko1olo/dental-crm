import type { Appointment } from "@dental/shared";
import {
	Ban,
	CalendarCheck,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	MessageSquare,
	PhoneCall,
	UserCheck,
	UserX,
	XCircle,
} from "lucide-react";
import React, { useCallback } from "react";
import { showToast } from "../GlobalToast";

import {
	generateAppointmentWhatsAppMessage,
	buildWhatsAppUrl,
	type AppointmentMessageType,
} from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";

export type QuickActionStatus =
	| "confirmed"
	| "arrived"
	| "in_treatment"
	| "completed"
	| "late"
	| "no_show"
	| "cancelled";

export interface AppointmentQuickActionsProps {
	appointmentId: string;
	currentStatus: Appointment["status"];
	patientName: string;
	patientPhone?: string | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	startsAt?: string | undefined;
	clinicName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	treatmentReason?: string | null | undefined;
	cabinetName?: string | null | undefined;
	appointmentHasOpenVisit?: boolean;
	activeVisitLockedAppointmentStatuses?: Set<Appointment["status"]>;
	onStatusChange: (
		status: Appointment["status"],
		noteAppend?: string,
	) => Promise<void> | void;
	onWhatsAppConfirm?: (() => void) | undefined;
	disabled?: boolean;
	compact?: boolean;
	showLabels?: boolean;
}

export function AppointmentQuickActions({
	appointmentId,
	currentStatus,
	patientName,
	patientPhone,
	doctorName,
	doctorSpecialty,
	startsAt,
	clinicName,
	clinicAddress,
	clinicPhone,
	treatmentReason,
	cabinetName,
	appointmentHasOpenVisit = false,
	activeVisitLockedAppointmentStatuses,
	onStatusChange,
	onWhatsAppConfirm,
	disabled = false,
	compact = false,
	showLabels = true,
}: AppointmentQuickActionsProps) {
	const [optimisticStatus, setOptimisticStatus] = React.useState<Appointment["status"] | null>(null);
	const [optimisticNote, setOptimisticNote] = React.useState<string | null>(null);

	// Sync optimistic state whenever incoming currentStatus updates
	React.useEffect(() => {
		setOptimisticStatus(null);
		setOptimisticNote(null);
	}, [currentStatus]);

	const effectiveStatus = optimisticStatus ?? currentStatus;

	const handleAction = useCallback(
		async (status: Appointment["status"], noteAppend?: string) => {
			if (disabled) return;
			if (
				appointmentHasOpenVisit &&
				activeVisitLockedAppointmentStatuses?.has(status)
			) {
				return;
			}
			// 1-Click Optimistic UI update
			setOptimisticStatus(status);
			setOptimisticNote(noteAppend ?? null);
			try {
				await onStatusChange(status, noteAppend);
			} catch {
				// Rollback on failure
				setOptimisticStatus(null);
				setOptimisticNote(null);
			}
		},
		[
			disabled,
			appointmentHasOpenVisit,
			activeVisitLockedAppointmentStatuses,
			onStatusChange,
		],
	);

	const handleSendWhatsApp = useCallback(
		(messageType: AppointmentMessageType = "reminder_24h", shiftedMinutes?: number) => {
			if (!patientPhone || !startsAt) return;
			const text = generateAppointmentWhatsAppMessage({
				patientName,
				doctorName: doctorName ?? null,
				doctorSpecialty: doctorSpecialty ?? null,
				appointmentStartsAt: startsAt,
				clinicName: clinicName ?? null,
				clinicAddress: clinicAddress ?? null,
				clinicPhone: clinicPhone ?? null,
				treatmentReason: treatmentReason ?? null,
				cabinetName: cabinetName ?? null,
				messageType,
				shiftedMinutes,
			});
			openWhatsAppChat(patientPhone, text);
			if (onWhatsAppConfirm) {
				onWhatsAppConfirm();
			}
		},
		[
			patientPhone,
			startsAt,
			patientName,
			doctorName,
			doctorSpecialty,
			clinicName,
			clinicAddress,
			clinicPhone,
			treatmentReason,
			cabinetName,
			onWhatsAppConfirm,
		],
	);

	const handleCopySmsReminder = useCallback(
		(messageType: AppointmentMessageType = "reminder_24h") => {
			if (!startsAt) return;
			const text = generateAppointmentWhatsAppMessage({
				patientName,
				doctorName: doctorName ?? null,
				doctorSpecialty: doctorSpecialty ?? null,
				appointmentStartsAt: startsAt,
				clinicName: clinicName ?? null,
				clinicAddress: clinicAddress ?? null,
				clinicPhone: clinicPhone ?? null,
				treatmentReason: treatmentReason ?? null,
				cabinetName: cabinetName ?? null,
				messageType,
			});
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				void navigator.clipboard.writeText(text);
				showToast(`Текст напоминания для ${patientName} скопирован в буфер обмена`, "success");
			}
		},
		[
			startsAt,
			patientName,
			doctorName,
			doctorSpecialty,
			clinicName,
			clinicAddress,
			clinicPhone,
			treatmentReason,
			cabinetName,
		],
	);

	const actions: Array<{
		key: QuickActionStatus;
		targetStatus: Appointment["status"];
		noteAppend?: string;
		label: string;
		shortLabel: string;
		icon: React.ReactNode;
		title: string;
		activeClass: string;
		hoverClass: string;
		bgStyle: string;
	}> = [
		{
			key: "arrived",
			targetStatus: "arrived",
			label: "Пришел",
			shortLabel: "Пришел",
			icon: <UserCheck size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />,
			title: `Отметить прибытие: ${patientName} в клинике (Клавиша 1)`,
			activeClass: "ring-2 ring-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-bold shadow-xs",
			hoverClass: "hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
			bgStyle: "border-emerald-500/30 bg-emerald-500/10",
		},
		{
			key: "in_treatment",
			targetStatus: "in_treatment",
			label: "В кресле",
			shortLabel: "В кресле",
			icon: <CalendarCheck size={15} className="shrink-0 text-sky-600 dark:text-sky-400" />,
			title: `Отметить: ${patientName} в кресле у врача (Клавиша 2)`,
			activeClass: "ring-2 ring-sky-500 bg-sky-500/20 text-sky-800 dark:text-sky-200 font-bold shadow-xs",
			hoverClass: "hover:bg-sky-500/15 text-sky-700 dark:text-sky-300",
			bgStyle: "border-sky-500/30 bg-sky-500/10",
		},
		{
			key: "completed",
			targetStatus: "completed",
			label: "Завершен",
			shortLabel: "Готово",
			icon: <CheckCircle2 size={15} className="shrink-0 text-teal-600 dark:text-teal-400" />,
			title: `Завершить прием: ${patientName} (Клавиша 3)`,
			activeClass: "ring-2 ring-teal-500 bg-teal-500/20 text-teal-800 dark:text-teal-200 font-bold shadow-xs",
			hoverClass: "hover:bg-teal-500/15 text-teal-700 dark:text-teal-300",
			bgStyle: "border-teal-500/30 bg-teal-500/10",
		},
		{
			key: "confirmed",
			targetStatus: "confirmed",
			label: "Подтвердить",
			shortLabel: "Подтвержден",
			icon: <PhoneCall size={15} className="shrink-0 text-violet-600 dark:text-violet-400" />,
			title: `Подтвердить запись: звонок или SMS для ${patientName}`,
			activeClass: "ring-2 ring-violet-500 bg-violet-500/20 text-violet-800 dark:text-violet-200 font-bold shadow-xs",
			hoverClass: "hover:bg-violet-500/15 text-violet-700 dark:text-violet-300",
			bgStyle: "border-violet-500/30 bg-violet-500/10",
		},
		{
			key: "late",
			targetStatus: "no_show",
			noteAppend: "Опоздание",
			label: "Опоздал",
			shortLabel: "Опоздал",
			icon: <Clock size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />,
			title: `Отметить опоздание: ${patientName} (Клавиша 4)`,
			activeClass: "ring-2 ring-amber-500 bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold shadow-xs",
			hoverClass: "hover:bg-amber-500/15 text-amber-700 dark:text-amber-300",
			bgStyle: "border-amber-500/30 bg-amber-500/10",
		},
		{
			key: "no_show",
			targetStatus: "no_show",
			label: "Не пришел",
			shortLabel: "Не явился",
			icon: <UserX size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />,
			title: `Неявка: ${patientName} не пришел на прием (Клавиша 5)`,
			activeClass: "ring-2 ring-rose-500 bg-rose-500/20 text-rose-800 dark:text-rose-200 font-bold shadow-xs",
			hoverClass: "hover:bg-rose-500/15 text-rose-700 dark:text-rose-300",
			bgStyle: "border-rose-500/30 bg-rose-500/10",
		},
		{
			key: "cancelled",
			targetStatus: "cancelled",
			label: "Отменен",
			shortLabel: "Отменен",
			icon: <XCircle size={15} className="shrink-0 text-slate-500 dark:text-slate-400" />,
			title: `Отменить прием: ${patientName}`,
			activeClass: "ring-2 ring-slate-500 bg-slate-500/20 text-slate-800 dark:text-slate-200 font-bold shadow-xs",
			hoverClass: "hover:bg-slate-500/15 text-slate-700 dark:text-slate-300",
			bgStyle: "border-slate-500/30 bg-slate-500/10",
		},
	];

	return (
		<div
			className={`appointment-quick-actions-bar flex flex-wrap items-center gap-2 ${compact ? "p-1" : "p-2"} rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-inner min-w-0 max-w-full`}
			data-testid={`appointment-quick-actions-${appointmentId}`}
			role="toolbar"
			aria-label={`Быстрые действия по статусу: ${patientName}`}
		>
			<span className="text-xs font-semibold text-[var(--muted)] px-1 uppercase tracking-wider select-none hidden sm:inline shrink-0">
				Статус:
			</span>
			{actions.map((action) => {
				const isCurrent =
					action.key === "late"
						? effectiveStatus === "no_show" &&
							(optimisticNote !== null ? optimisticNote === "Опоздание" : action.noteAppend === "Опоздание")
						: effectiveStatus === action.targetStatus;
				const isLocked =
					appointmentHasOpenVisit &&
					Boolean(activeVisitLockedAppointmentStatuses?.has(action.targetStatus));

				return (
					<button
						key={action.key}
						type="button"
						disabled={disabled || isLocked}
						onClick={(e) => {
							e.stopPropagation();
							void handleAction(action.targetStatus, action.noteAppend);
						}}
						className={`quick-action-pill min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer select-none active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus:ring-2 focus:ring-teal-500 focus:outline-none min-w-0 ${
							isCurrent ? action.activeClass : `${action.bgStyle} ${action.hoverClass}`
						}`}
						title={
							isLocked
								? "Статус заблокирован: открыт активный визит"
								: action.title
						}
						aria-label={action.title}
						aria-pressed={isCurrent}
					>
						{action.icon}
						{showLabels && (
							<span className="break-words leading-tight text-center">
								{compact ? action.shortLabel : action.label}
							</span>
						)}
						{isCurrent && (
							<Check size={14} className="shrink-0 text-current ml-0.5 opacity-90" />
						)}
					</button>
				);
			})}

			{/* 1-Click WhatsApp reminder / confirmation / time-shift trigger */}
			{patientPhone && startsAt && (
				<div className="relative inline-flex items-center">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleSendWhatsApp("reminder_24h");
						}}
						className="quick-action-pill min-h-[44px] px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none select-none min-w-0"
						title={`Отправить напоминание за 24ч с памяткой в WhatsApp (${patientName})`}
						aria-label={`WhatsApp напоминание: ${patientName}`}
					>
						<MessageSquare size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
						{showLabels && (
							<span className="break-words leading-tight text-center">
								{compact ? "WA" : "💬 WA: 24ч"}
							</span>
						)}
					</button>

					{/* 1-Click Confirmation, Time-Shift & SMS Copy Quick Options */}
					<div className="flex items-center gap-1 ml-1">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleCopySmsReminder("reminder_24h");
							}}
							className="min-h-[44px] px-2.5 py-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 touch-manipulation"
							title={`Скопировать текст напоминания (SMS/мессенджер) для ${patientName}`}
							aria-label={`Скопировать SMS: ${patientName}`}
						>
							<Copy size={13} className="shrink-0 text-teal-500" />
							<span>SMS</span>
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleSendWhatsApp("confirmation");
							}}
							className="min-h-[44px] px-2.5 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 touch-manipulation"
							title={`Отправить подтверждение визита в WhatsApp (${patientName})`}
							aria-label={`WhatsApp подтверждение: ${patientName}`}
						>
							<CheckCircle2 size={13} className="shrink-0 text-violet-500" />
							<span>Подтвердить</span>
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleSendWhatsApp("time_shift", 15);
							}}
							className="min-h-[44px] px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 touch-manipulation"
							title={`Отправить уведомление о переносе времени (+15 мин) в WhatsApp (${patientName})`}
							aria-label={`WhatsApp перенос: ${patientName}`}
						>
							<Clock size={13} className="shrink-0 text-amber-500" />
							<span>Перенос</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
