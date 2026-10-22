/**
 * TelephonyToast.tsx — Express Incoming Call Toast & Card (CTI Inquisitor Standard)
 * 
 * Mandate 8e: Doctor autonomy, buttons never permanently disabled.
 * Mandate 8n: Solo doctor & small clinic friction-killer (1-click patient card & booking).
 * Apple HIG: Desktop top-right floating toast (z-[9990]), mobile native bottom sheet drawer.
 * Zero-Simulator: Real webhook/SSE/store state, zero audio loops/synths, memory-safe timer cleanup.
 */

import {
	AlertTriangle,
	CalendarCheck,
	Check,
	Clock,
	PhoneCall,
	PhoneOff,
	UserCheck,
	X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import {
	formatDurationTimer,
	formatPhoneDisplay,
	resolvePatientCategory,
	resolvePatientFromPhone,
	useTelephonyStore,
	type IncomingCallPayload,
} from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";
import "./telephonyFloatingWidget.css";

export interface TelephonyToastProps {
	call?: IncomingCallPayload | null | undefined;
	onOpenCard?: ((patientId?: string | undefined) => void) | undefined;
	onQuickBook?: ((patientId?: string | undefined, patientName?: string | undefined, phone?: string | undefined) => void) | undefined;
	onReject?: (() => void) | undefined;
	onAnswer?: (() => void) | undefined;
	onClose?: (() => void) | undefined;
	className?: string | undefined;
	suppressInSterileZone?: boolean | undefined;
}

export function TelephonyToast({
	call: externalCall,
	onOpenCard,
	onQuickBook,
	onReject,
	onAnswer,
	onClose,
	className = "",
	suppressInSterileZone = true,
}: TelephonyToastProps): React.JSX.Element | null {
	const storeActiveCall = useTelephonyStore((s) => s.activeCall);
	const answerCall = useTelephonyStore((s) => s.answerCall);
	const rejectCall = useTelephonyStore((s) => s.rejectCall);
	const endCall = useTelephonyStore((s) => s.endCall);
	const dismissCall = useTelephonyStore((s) => s.dismissCall);
	const openCallDrawer = useTelephonyStore((s) => s.openCallDrawer);
	const isConnected = useTelephonyStore((s) => s.isWsConnected);

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);

	const currentView = useAppStore((s) => s.currentView);
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));

	useEffect(() => {
		const handleHash = () => setHash(window.location.hash);
		window.addEventListener("hashchange", handleHash);
		return () => window.removeEventListener("hashchange", handleHash);
	}, []);

	const activeCall = externalCall !== undefined ? externalCall : storeActiveCall;

	// Timer memory leak prevention: safe interval with guaranteed cleanup
	const [elapsedSeconds, setElapsedSeconds] = useState(0);

	useEffect(() => {
		if (!activeCall) {
			setElapsedSeconds(0);
			return;
		}

		if (
			activeCall.status === "ended" ||
			activeCall.status === "rejected" ||
			activeCall.status === "missed"
		) {
			const finalSec =
				typeof activeCall.durationSeconds === "number" && activeCall.durationSeconds >= 0
					? activeCall.durationSeconds
					: Math.max(
							0,
							Math.floor(
								((activeCall.endedAt || Date.now()) - (activeCall.callStartedAt || Date.now())) / 1000,
							),
						);
			setElapsedSeconds(finalSec);
			return;
		}

		const startTime = activeCall.callStartedAt ?? Date.now();
		const updateTimer = () => {
			setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
		};

		updateTimer();
		const intervalId = setInterval(updateTimer, 1000);

		return () => {
			clearInterval(intervalId);
		};
	}, [activeCall]);

	const isSterileZone =
		suppressInSterileZone &&
		(selectedWorkspaceRole === "doctor" ||
			(currentView as string) === "visit" ||
			(currentView as string) === "odontogram" ||
			(currentView as string) === "periodontics" ||
			hash.includes("#visit") ||
			hash.includes("#odontogram") ||
			hash.includes("#periodontics"));

	if (!activeCall || isSterileZone) {
		return null;
	}

	const rawPhone = activeCall.phone || "";
	const formattedPhone = formatPhoneDisplay(rawPhone);

	// Resolve patient from dashboard by phone or id
	const matchingPatient =
		resolvePatientFromPhone(dashboard?.patients, rawPhone) ||
		(activeCall.patientId && dashboard?.patients
			? dashboard.patients.find((p) => p.id === activeCall.patientId)
			: null);

	const isKnownPatient = Boolean(matchingPatient);
	const callerName = matchingPatient?.fullName || activeCall.patientName || formattedPhone || "Входящий вызов";

	// Clinical last visit resolution
	const patientAppointments = matchingPatient && dashboard?.appointments
		? dashboard.appointments.filter((a) => a.patientId === matchingPatient.id && a.status === "completed")
		: [];
	const lastAppointment = patientAppointments[patientAppointments.length - 1];

	const lastVisitText = lastAppointment?.startsAt
		? new Date(lastAppointment.startsAt).toLocaleDateString("ru-RU", {
				day: "numeric",
				month: "short",
				year: "numeric",
			})
		: isKnownPatient
			? "Ранее не завершён"
			: "Первичный визит";

	// Financial balance
	const balanceRub = matchingPatient?.balanceRub ?? 0;
	const balanceText =
		balanceRub > 0
			? `+${balanceRub.toLocaleString("ru-RU")} ₽`
			: balanceRub < 0
				? `Долг: ${Math.abs(balanceRub).toLocaleString("ru-RU")} ₽`
				: "0 ₽";
	const balanceColor =
		balanceRub > 0
			? "text-emerald-700 dark:text-emerald-300 font-bold"
			: balanceRub < 0
				? "text-rose-700 dark:text-rose-300 font-bold"
				: "text-[var(--muted,#64748b)]";

	// Somatic allergies / alerts
	const somaticNote = matchingPatient?.notes || "";
	const hasAllergy = /аллерг/i.test(somaticNote);

	// Category
	const category = resolvePatientCategory(
		matchingPatient ? { id: matchingPatient.id, fullName: matchingPatient.fullName, notes: somaticNote } : undefined,
		lastAppointment
			? {
					formattedLastVisit: lastVisitText,
					doctorName: "Лечащий врач",
					doctorSpecialty: "Стоматолог",
					appointmentReason: "Приём",
					isNewPatient: false,
					lastVisitDate: lastAppointment.startsAt,
				}
			: undefined,
	);

	const isAnswered = activeCall.status === "answered";
	const isEnded = activeCall.status === "ended" || activeCall.status === "rejected" || activeCall.status === "missed";

	const handleOpenPatientCard = () => {
		if (matchingPatient?.id) {
			setSelectedPatientId(matchingPatient.id);
		} else if (rawPhone) {
			setNewPatientPhone(rawPhone);
		}
		openCallDrawer();
		if (onOpenCard) {
			onOpenCard(matchingPatient?.id);
		} else {
			showToast(`Карта: ${callerName}`, "info");
		}
	};

	const handleCreateAppointment = () => {
		if (onQuickBook) {
			onQuickBook(matchingPatient?.id, callerName, rawPhone);
		} else {
			// Trigger standard quick book slot
			const defaultSlot = ctx?.dashboard?.clinicSettings?.chairs?.[0]?.id;
			const apptTitle = isKnownPatient ? `Приём: ${callerName}` : `Первичная запись (${formattedPhone})`;
			showToast(`Создание записи: ${apptTitle}`, "info");
		}
	};

	const handleAnswer = () => {
		answerCall();
		onAnswer?.();
		showToast(`Вызов принят (${formattedPhone})`, "success");
	};

	const handleRejectCall = () => {
		rejectCall();
		onReject?.();
		showToast(`Вызов ${formattedPhone} отклонён`, "info");
	};

	const handleDismiss = () => {
		dismissCall();
		onClose?.();
	};

	const cardContent = (
		<aside
			className={`telephony-toast-card pointer-events-auto flex flex-col gap-2.5 p-3.5 sm:p-4 rounded-2xl border border-[var(--line-strong,var(--line,#e2e8f0))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2 sm:slide-in-from-top-4 duration-200 w-full sm:max-w-[420px] box-border ${className}`}
			aria-label="Карточка входящего звонка"
			role="alert"
			data-testid="telephony-toast"
		>
			{/* Mobile tactile handle */}
			<div className="w-9 h-1 rounded-full bg-[var(--line)] mx-auto -mt-1 mb-0.5 sm:hidden" aria-hidden="true" />

			{/* Top Bar: Live Status & Carrier & Close */}
			<div className="flex items-center justify-between gap-1.5 pb-1 border-b border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-2 min-w-0">
					<span className="relative flex h-2.5 w-2.5 shrink-0">
						<span
							className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
								isAnswered ? "bg-teal-400" : "bg-emerald-400"
							}`}
						/>
						<span
							className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
								isAnswered ? "bg-teal-500" : "bg-emerald-500"
							}`}
						/>
					</span>
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#0f172a)] shrink-0">
						{isEnded ? "Завершён" : isAnswered ? "Разговор" : "Входящий звонок"}
					</span>
					<span
						className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--teal-surface,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal-soft,#99f6e4)] shrink-0"
						title={`Провайдер телефонии: ${activeCall.provider || "АТС"}`}
					>
						{(activeCall.provider || "АТС").toUpperCase()}
					</span>
					<span
						className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? "bg-emerald-500" : "bg-amber-400"}`}
						title={isConnected ? "Телефония онлайн" : "Подключение..."}
					/>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					<div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f1f5f9)] px-2 py-0.5 rounded-md border border-[var(--line,#e2e8f0)]">
						<Clock size={11} className="text-[var(--teal,#0d9488)]" />
						<span>{formatDurationTimer(elapsedSeconds)}</span>
					</div>

					<button
						type="button"
						onClick={handleDismiss}
						className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950 text-[var(--muted,#64748b)] hover:text-rose-600 transition-colors"
						title="Закрыть уведомление"
						aria-label="Закрыть уведомление"
						data-testid="toast-action-close"
					>
						<X size={15} />
					</button>
				</div>
			</div>

			{/* Patient & Financial Snapshot */}
			<div className="flex flex-col gap-1.5 bg-[var(--paper-soft,#f8fafc)] p-2.5 rounded-xl border border-[var(--line-subtle,#e2e8f0)]">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<div
							className="text-[14px] font-bold text-[var(--ink,#0f172a)] truncate leading-tight"
							title={callerName}
							data-testid="toast-caller-name"
						>
							{callerName}
						</div>
						<div className="text-xs font-mono text-[var(--muted,#64748b)] mt-0.5">
							{formattedPhone}
						</div>
					</div>

					<span
						className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink-secondary,#334155)] shrink-0"
						data-testid="toast-patient-category"
					>
						{category}
					</span>
				</div>

				{/* Financial & Visit Status */}
				<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line-subtle,#e2e8f0)] text-[var(--muted,#64748b)]">
					<div>
						Баланс: <span className={balanceColor} data-testid="toast-patient-balance">{balanceText}</span>
					</div>
					<div className="truncate max-w-[170px]" title={lastVisitText} data-testid="toast-last-visit">
						Визит: {lastVisitText}
					</div>
				</div>

				{/* Passive Somatic Alert */}
				{hasAllergy && (
					<div
						className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800/40"
						data-testid="toast-somatic-alert"
					>
						<AlertTriangle size={12} className="text-amber-600 shrink-0" />
						<span className="truncate">{somaticNote}</span>
					</div>
				)}
			</div>

			{/* Two Clear 1-Click Action Rows + Call Control (Never Disabled, HIG Touch Targets >= 44px) */}
			<div className="flex flex-col gap-2 pt-0.5">
				<div className="grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={handleOpenPatientCard}
						className="secondary-button min-h-[44px] px-2.5 py-2 text-xs font-bold whitespace-nowrap inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)]"
						title="Открыть карту пациента"
						data-testid="toast-action-open-card"
					>
						<UserCheck size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span className="truncate">{isKnownPatient ? "Открыть карту" : "+ Создать карту"}</span>
					</button>

					<button
						type="button"
						onClick={handleCreateAppointment}
						className="primary-button min-h-[44px] px-2.5 py-2 text-xs font-bold whitespace-nowrap inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white"
						title="Записать на приём"
						data-testid="toast-action-quick-book"
					>
						<CalendarCheck size={16} className="shrink-0" />
						<span className="truncate">Записать на приём</span>
					</button>
				</div>

				<div className="grid grid-cols-2 gap-2">
					{!isAnswered ? (
						<>
							<button
								type="button"
								onClick={handleAnswer}
								className="min-h-[44px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
								title="Принять звонок"
								data-testid="toast-action-answer"
							>
								<PhoneCall size={16} />
								<span>Ответить</span>
							</button>
							<button
								type="button"
								onClick={handleRejectCall}
								className="min-h-[44px] px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95"
								title="Отклонить звонок"
								data-testid="toast-action-reject"
							>
								<PhoneOff size={16} />
								<span>Сбросить</span>
							</button>
						</>
					) : (
						<button
							type="button"
							onClick={() => {
								endCall();
								showToast("Разговор завершён", "info");
							}}
							className="col-span-2 min-h-[44px] px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
							title="Завершить разговор"
							data-testid="toast-action-end"
						>
							<PhoneOff size={16} />
							<span>Завершить разговор</span>
						</button>
					)}
				</div>
			</div>
		</aside>
	);

	if (typeof document === "undefined") {
		return cardContent;
	}

	return createPortal(
		<div
			className="telephony-toast-portal fixed inset-x-0 bottom-[70px] sm:bottom-auto sm:top-4 sm:right-6 sm:inset-x-auto sm:w-auto w-full z-[9990] pointer-events-none flex flex-col items-center sm:items-end px-2 sm:px-0"
			data-testid="telephony-toast-portal"
		>
			{cardContent}
		</div>,
		document.body,
	);
}

export default TelephonyToast;
