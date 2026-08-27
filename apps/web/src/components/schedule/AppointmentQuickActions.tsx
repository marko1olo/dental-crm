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
	}> = [
		{
			key: "arrived",
			targetStatus: "arrived",
			label: "Пришел",
			shortLabel: "Пришел",
			icon: <UserCheck size={13} className="shrink-0 text-current" />,
			title: `Отметить прибытие: ${patientName} в клинике (Клавиша 1)`,
			activeClass: "bg-emerald-600 text-white font-bold shadow-2xs border-emerald-600",
		},
		{
			key: "in_treatment",
			targetStatus: "in_treatment",
			label: "В кресле",
			shortLabel: "В кресле",
			icon: <CalendarCheck size={13} className="shrink-0 text-current" />,
			title: `Отметить: ${patientName} в кресле у врача (Клавиша 2)`,
			activeClass: "bg-[var(--teal-dark)] text-white font-bold shadow-2xs border-[var(--teal-dark)]",
		},
		{
			key: "completed",
			targetStatus: "completed",
			label: "Завершен",
			shortLabel: "Готово",
			icon: <CheckCircle2 size={13} className="shrink-0 text-current" />,
			title: `Завершить прием: ${patientName} (Клавиша 3)`,
			activeClass: "bg-slate-700 dark:bg-slate-600 text-white font-bold shadow-2xs border-slate-700 dark:border-slate-600",
		},
		{
			key: "confirmed",
			targetStatus: "confirmed",
			label: "Подтвердить",
			shortLabel: "Подтвержден",
			icon: <PhoneCall size={13} className="shrink-0 text-current" />,
			title: `Подтвердить запись: звонок или SMS для ${patientName}`,
			activeClass: "bg-violet-600 text-white font-bold shadow-2xs border-violet-600",
		},
		{
			key: "late",
			targetStatus: "no_show",
			noteAppend: "Опоздание",
			label: "Опоздал",
			shortLabel: "Опоздал",
			icon: <Clock size={13} className="shrink-0 text-current" />,
			title: `Отметить опоздание: ${patientName} (Клавиша 4)`,
			activeClass: "bg-amber-600 text-white font-bold shadow-2xs border-amber-600",
		},
		{
			key: "no_show",
			targetStatus: "no_show",
			label: "Не пришел",
			shortLabel: "Не явился",
			icon: <UserX size={13} className="shrink-0 text-current" />,
			title: `Неявка: ${patientName} не пришел на прием (Клавиша 5)`,
			activeClass: "bg-rose-600 text-white font-bold shadow-2xs border-rose-600",
		},
		{
			key: "cancelled",
			targetStatus: "cancelled",
			label: "Отменен",
			shortLabel: "Отменен",
			icon: <XCircle size={13} className="shrink-0 text-current" />,
			title: `Отменить прием: ${patientName}`,
			activeClass: "bg-slate-500 text-white font-bold shadow-2xs border-slate-500",
		},
	];

	return (
		<div
			className={`appointment-quick-actions-bar flex flex-wrap items-center justify-between gap-1 p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] min-w-0 max-w-full`}
			data-testid={`appointment-quick-actions-${appointmentId}`}
			role="toolbar"
			aria-label={`Быстрые действия по статусу: ${patientName}`}
		>
			<div className="flex items-center gap-1 flex-wrap min-w-0">
				<span className="text-[11px] font-semibold text-[var(--muted)] px-1 uppercase tracking-wider select-none hidden lg:inline shrink-0">
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
							className={`quick-action-pill h-7.5 px-2 py-0.5 rounded-md border text-xs font-medium flex items-center justify-center gap-1 transition-all duration-150 cursor-pointer select-none active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus:ring-2 focus:ring-[var(--teal)] focus:outline-none min-w-0 ${
								isCurrent
									? action.activeClass
									: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper-soft)]"
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
								<span className="break-words leading-none text-center">
									{compact ? action.shortLabel : action.label}
								</span>
							)}
							{isCurrent && (
								<Check size={11} className="shrink-0 text-current ml-0.5 opacity-90" />
							)}
						</button>
					);
				})}
			</div>

			{/* 1-Click WhatsApp reminder / confirmation / time-shift trigger */}
			{patientPhone && startsAt && (
				<div className="flex items-center gap-1 shrink-0 flex-wrap">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleSendWhatsApp("reminder_24h");
						}}
						className="quick-action-pill h-7.5 px-2 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-emerald-500/10 hover:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none select-none min-w-0"
						title={`Отправить напоминание за 24ч с памяткой в WhatsApp (${patientName})`}
						aria-label={`WhatsApp напоминание: ${patientName}`}
					>
						<MessageSquare size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
						{showLabels && (
							<span className="break-words leading-none text-center">
								{compact ? "WA" : "💬 WA: 24ч"}
							</span>
						)}
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleCopySmsReminder("reminder_24h");
						}}
						className="h-7.5 px-2 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] text-[var(--ink)] text-xs font-medium transition-all cursor-pointer flex items-center gap-1 touch-manipulation"
						title={`Скопировать текст напоминания (SMS/мессенджер) для ${patientName}`}
						aria-label={`Скопировать SMS: ${patientName}`}
					>
						<Copy size={12} className="shrink-0 text-[var(--teal,var(--brand-primary))]" />
						<span>SMS</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleSendWhatsApp("confirmation");
						}}
						className="h-7.5 px-2 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-medium transition-all cursor-pointer flex items-center gap-1 touch-manipulation"
						title={`Отправить подтверждение визита в WhatsApp (${patientName})`}
						aria-label={`WhatsApp подтверждение: ${patientName}`}
					>
						<CheckCircle2 size={12} className="shrink-0 text-violet-500" />
						<span className="hidden sm:inline">Подтвердить</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleSendWhatsApp("time_shift", 15);
						}}
						className="h-7.5 px-2 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium transition-all cursor-pointer flex items-center gap-1 touch-manipulation"
						title={`Отправить уведомление о переносе времени (+15 мин) в WhatsApp (${patientName})`}
						aria-label={`WhatsApp перенос: ${patientName}`}
					>
						<Clock size={12} className="shrink-0 text-amber-500" />
						<span className="hidden sm:inline">Перенос</span>
					</button>
				</div>
			)}
		</div>
	);
}
