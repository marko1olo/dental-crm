import {
	AlertCircle,
	AlertTriangle,
	CalendarCheck,
	ChevronDown,
	Copy,
	ExternalLink,
	Sparkles,
	UserCheck,
	UserPlus,
	Zap,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import {
	captureLeadFromIncomingCall,
	CHANNEL_BADGE_COLORS,
} from "./telephonyAttribution";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import {
	generateAppointmentConfirmationMessage,
	openWhatsAppChat,
	type IncomingCallPayload,
	useTelephonyStore,
} from "../../store/telephonyStore";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import { showToast } from "../GlobalToast";
import { IncomingCallEmptyDrawer } from "./IncomingCallEmptyDrawer";
import { TelephonyDialerModal } from "./TelephonyDialerModal";
import { IncomingCallQuickBooking, type QuickSlotType } from "./IncomingCallQuickBooking";
import { IncomingCallPastHistory } from "./IncomingCallPastHistory";
import { useIncomingCallData } from "./useIncomingCallData";
import { TelephonyDrawerHeader } from "./TelephonyDrawerHeader";
import { TelephonyDrawerFinancialAndUpcoming } from "./TelephonyDrawerFinancialAndUpcoming";

export interface TelephonyDrawerProps {
	isOpen?: boolean;
	onClose?: () => void;
	call?: IncomingCallPayload | null;
}

/**
 * TelephonyDrawer: Patient Side-Drawer for Telephony Cockpit.
 * Slides over smoothly from the right edge with zero disruption to active Form 043/u diary or chairside treatments.
 * Strictly adheres to Mandates 8b (<=800 lines), 8d (zero emojis), 8e, 8n (Zero-occlusion, doctor autonomy, 1-click caller match).
 */
export function TelephonyDrawer({
	isOpen: propIsOpen,
	onClose: propOnClose,
	call: propCall,
}: TelephonyDrawerProps = {}) {
	const storeIsOpen = useTelephonyStore((s) => s.isCallDrawerOpen);
	const closeCallDrawer = useTelephonyStore((s) => s.closeCallDrawer);
	const activeCall = useTelephonyStore((s) => s.activeCall);
	const isConnected = useTelephonyStore((s) => s.isWsConnected);
	const startCallTransfer = useTelephonyStore((s) => s.startCallTransfer);
	const recordCallOutcome = useTelephonyStore((s) => s.recordCallOutcome);
	const answerCall = useTelephonyStore((s) => s.answerCall);
	const connectCall = useTelephonyStore((s) => s.connectCall);

	const isDrawerOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
	const handleClose = propOnClose || closeCallDrawer;
	const currentCall = propCall !== undefined ? propCall : activeCall;
	const hasPrimaryModal = useUiSurfaceStore((s) => s.hasPrimaryModal);
	const isFullScreenStudioActive = useUiSurfaceStore(
		(s) => s.isFullScreenStudioActive,
	);

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const currentView = useAppStore((s) => s.currentView);
	const setNewAppointmentDraft = useScheduleStore(
		(s) => s.setNewAppointmentDraft,
	);

	const [showQuickBooking, setShowQuickBooking] = useState(false);
	const [showTransferPanel, setShowTransferPanel] = useState(false);
	const [transferType, setTransferType] = useState<"blind" | "attended">("blind");
	const [showOutcomePanel, setShowOutcomePanel] = useState(false);
	const [newPatientNameInput, setNewPatientNameInput] = useState("");
	const [isCreatingPatient, setIsCreatingPatient] = useState(false);
	const [isCapturingLead, setIsCapturingLead] = useState(false);
	const [smsCopied, setSmsCopied] = useState(false);
	const [isDialerOpen, setIsDialerOpen] = useState(false);

	// Escape key listener for side drawer
	useEffect(() => {
		if (!isDrawerOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				handleClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isDrawerOpen, handleClose]);

	// Координация поверхностей: регистрация активной шторки телефонии
	useEffect(() => {
		if (isDrawerOpen && !hasPrimaryModal && !isFullScreenStudioActive) {
			useUiSurfaceStore.getState().openDrawer("telephony");
		} else if (useUiSurfaceStore.getState().activeDrawer === "telephony") {
			useUiSurfaceStore.getState().closeDrawer("telephony");
		}
	}, [isDrawerOpen, hasPrimaryModal, isFullScreenStudioActive]);

	const callData = useIncomingCallData(currentCall, dashboard, () => {});
	const {
		resolvedPatient,
		financialSummary,
		lastVisitSummary,
		upcomingAppointment,
		somaticAlerts,
		activeTreatmentPlan,
		callAttribution,
		callerName,
		formattedPhone,
		initials,
		avatarColors,
		isKnownPatient,
	} = callData;

	if (
		typeof document === "undefined" ||
		!isDrawerOpen ||
		hasPrimaryModal ||
		isFullScreenStudioActive
	)
		return null;

	// Fallback empty view when no call is active (delegated per Mandate 8b)
	if (!currentCall) {
		return createPortal(
			<>
				<IncomingCallEmptyDrawer
					isOpen={isDrawerOpen}
					onClose={handleClose}
					isConnected={isConnected}
					onOpenDialer={() => setIsDialerOpen(true)}
				/>
				<TelephonyDialerModal
					isOpen={isDialerOpen}
					onClose={() => setIsDialerOpen(false)}
				/>
			</>,
			document.body,
		);
	}

	const isCallAnswered =
		currentCall.status === "answered" ||
		currentCall.status === "connected" ||
		currentCall.status === "ended";

	const handleSendWhatsAppConfirmation = () => {
		if (!upcomingAppointment) {
			showToast("Нет предстоящих запланированных записей для подтверждения", "info");
			return;
		}
		const msg = generateAppointmentConfirmationMessage({
			patientName: callerName,
			doctorName: upcomingAppointment.doctorName,
			appointmentStartsAt: upcomingAppointment.startsAt,
			clinicName: dashboard?.clinicSettings?.name || "DENTE",
		});
		openWhatsAppChat(currentCall.phone, msg);
		showToast(`Подтверждение приёма отправлено в WhatsApp (${callerName})`, "success");
	};

	const handleCopySmsConfirmation = () => {
		if (!upcomingAppointment) {
			showToast("Нет предстоящих запланированных записей для подтверждения", "info");
			return;
		}
		const msg = generateAppointmentConfirmationMessage({
			patientName: callerName,
			doctorName: upcomingAppointment.doctorName,
			appointmentStartsAt: upcomingAppointment.startsAt,
			clinicName: dashboard?.clinicSettings?.name || "DENTE",
		});
		navigator.clipboard?.writeText(msg).then(() => {
			setSmsCopied(true);
			showToast("Текст SMS-подтверждения скопирован в буфер", "success");
			setTimeout(() => setSmsCopied(false), 2000);
		});
	};

	const handleOpenFullPatientView = () => {
		if (currentView === "visit") {
			showToast(
				"Приём пациента активен. Карта доступна в текущей шторке без сброса визита.",
				"warning",
			);
			return;
		}
		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
			setCurrentView("patients");
			if (activeCall && activeCall.status === "ringing") {
				connectCall();
			}
			showToast(`Открыта карта: ${resolvedPatient.fullName}`, "info");
		} else if (currentCall.phone) {
			setNewPatientPhone(currentCall.phone);
			setCurrentView("patients");
			if (activeCall && activeCall.status === "ringing") {
				connectCall();
			}
			showToast(`Регистрация нового пациента с номером ${formattedPhone}`, "info");
		}
		handleClose();
	};

	const handleQuickBook = (slotType: QuickSlotType) => {
		const todayIso = dashboard?.todayIso || new Date().toISOString().split("T")[0]!;
		const defaultDoctorId =
			dashboard?.clinicSettings?.staff?.find((s) => s.role === "doctor")?.id || "";
		const defaultChairId = dashboard?.clinicSettings?.chairs?.[0]?.id || "";

		let targetDate = todayIso;
		let startTime = "10:00:00";
		let endTime = "10:30:00";
		let reason = "Первичный звонок";

		if (slotType === "today_urgent") {
			targetDate = todayIso;
			startTime = "10:00:00";
			endTime = "10:30:00";
			reason = "Острая боль / Экстренный приём";
		} else if (slotType === "today_standard") {
			targetDate = todayIso;
			startTime = "14:30:00";
			endTime = "15:00:00";
			reason = "Первичная консультация и диагностика";
		} else if (slotType === "tomorrow") {
			const d = new Date(todayIso);
			d.setDate(d.getDate() + 1);
			targetDate = d.toISOString().split("T")[0]!;
			startTime = "11:00:00";
			endTime = "11:30:00";
			reason = "Плановый визит по звонку";
		}

		if (resolvedPatient) {
			setSelectedPatientId(resolvedPatient.id);
			setNewAppointmentDraft({
				patientId: resolvedPatient.id,
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt: `${targetDate}T${startTime}`,
				endsAt: `${targetDate}T${endTime}`,
				status: "planned",
				reason,
				comment: `Запись по входящему звонку (${formattedPhone})`,
			});
		} else {
			setNewPatientPhone(currentCall.phone);
			setNewAppointmentDraft({
				patientId: "",
				doctorUserId: defaultDoctorId,
				assistantUserId: "",
				chairId: defaultChairId,
				startsAt: `${targetDate}T${startTime}`,
				endsAt: `${targetDate}T${endTime}`,
				status: "planned",
				reason,
				comment: `Новый пациент с телефона ${formattedPhone}`,
			});
		}

		if (activeCall && activeCall.status === "ringing") {
			answerCall();
		}
		showToast(
			`Создана запись: ${isKnownPatient ? resolvedPatient?.fullName : formattedPhone} (${reason})`,
			"info",
		);
	};

	const handleQuickCreatePatient = async (customName?: string) => {
		if (!currentCall?.phone || isCreatingPatient) return;
		setIsCreatingPatient(true);
		try {
			const entered = typeof customName === "string" ? customName : newPatientNameInput;
			const targetName = entered.trim() || `Пациент ${formattedPhone}`;
			const res = await fetch("/api/patients", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": readDenteStaffToken(),
					"x-dente-clinic-token": readDenteClinicToken(),
				},
				body: JSON.stringify({
					fullName: targetName,
					phone: currentCall.phone,
				}),
			});

			if (!res.ok) {
				let errMsg = "Ошибка при создании пациента";
				try {
					const data = await res.json();
					if (data?.message) errMsg = data.message;
				} catch {}
				showToast(errMsg, "error");
				return;
			}

			const createdPatient = await res.json();
			setSelectedPatientId(createdPatient.id);
			setNewPatientNameInput("");

			const active = useTelephonyStore.getState().activeCall;
			if (active) {
				useTelephonyStore.getState().triggerIncomingCall({
					...active,
					patientId: createdPatient.id,
					patientName: createdPatient.fullName,
				});
			}

			if (ctx?.setDashboard) {
				ctx.setDashboard((curr) =>
					curr
						? {
								...curr,
								patients: [
									createdPatient,
									...curr.patients.filter((p) => p.id !== createdPatient.id),
								],
							}
						: curr,
				);
			}

			showToast(
				`Создана амбулаторная карта: ${createdPatient.fullName} (${formattedPhone})`,
				"success",
			);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось сохранить пациента";
			showToast(msg, "error");
		} finally {
			setIsCreatingPatient(false);
		}
	};

	const handleCaptureLead = async () => {
		if (!currentCall || isCapturingLead) return;
		setIsCapturingLead(true);
		try {
			const res = await captureLeadFromIncomingCall(currentCall, {
				customName: newPatientNameInput,
			});
			if (res.success) {
				showToast(res.message, "success");
			} else {
				showToast(res.message, "error");
			}
		} finally {
			setIsCapturingLead(false);
		}
	};

	return createPortal(
		<>
			<section
				className="dnt-telephony-patient-drawer fixed right-0 top-0 bottom-0 w-full sm:w-[480px] max-w-full z-[9995] bg-[var(--paper-strong)] text-[var(--ink)] border-l border-[var(--line)] shadow-2xl flex flex-col pointer-events-auto animate-slide-in-right overflow-hidden"
			style={{ zIndex: 9995 }}
			aria-label="Боковая шторка пациента"
			data-testid="telephony-patient-side-drawer"
		>
			{/* Drawer Header & Consolidated More Menu */}
			<TelephonyDrawerHeader
				onClose={handleClose}
				isKnownPatient={isKnownPatient}
				callAttribution={callAttribution}
				currentCall={currentCall}
				isCapturingLead={isCapturingLead}
				onCaptureLead={handleCaptureLead}
				upcomingAppointment={upcomingAppointment}
				onSendWhatsApp={handleSendWhatsAppConfirmation}
				onCopySms={handleCopySmsConfirmation}
				smsCopied={smsCopied}
				isCallAnswered={isCallAnswered}
				onToggleTransferPanel={() => setShowTransferPanel((p) => !p)}
				onToggleOutcomePanel={() => setShowOutcomePanel((p) => !p)}
				onOpenFullPatientView={handleOpenFullPatientView}
			/>

			{/* Drawer Scrollable Content */}
			<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
				{/* Patient Identity Block */}
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center gap-3">
					<div
						className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black shrink-0 shadow-xs border border-[var(--line)]"
						style={{ backgroundColor: avatarColors.bg, color: avatarColors.text }}
					>
						{initials}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5 flex-wrap">
							<h3 className="text-base font-bold text-[var(--ink)] truncate">
								{callerName}
							</h3>
							{isKnownPatient ? (
								<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
									Пациент
								</span>
							) : (
								<span
									className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1"
									style={{
										backgroundColor:
											callAttribution ? CHANNEL_BADGE_COLORS[callAttribution.channelKey].bg : undefined,
										color:
											callAttribution ? CHANNEL_BADGE_COLORS[callAttribution.channelKey].text : undefined,
										border:
											callAttribution ? `1px solid ${CHANNEL_BADGE_COLORS[callAttribution.channelKey].border}` : undefined,
									}}
									data-testid="telephony-drawer-marketing-channel-badge"
									title={`Канал рекламы: ${callAttribution?.channelLabel || "ВАТС"}${callAttribution?.virtualNumberDisplay ? ` • ВАТС: ${callAttribution.virtualNumberDisplay}` : ""}${callAttribution?.utmSummary ? ` • UTM: [${callAttribution.utmSummary}]` : ""}`}
								>
									{callAttribution ? callAttribution.channelLabel : "Новый лид"}
								</span>
							)}
						</div>
						<div className="flex items-center gap-2 mt-0.5 flex-wrap">
							<span className="font-mono font-bold text-xs text-[var(--teal)]">
								{formattedPhone}
							</span>
							<button
								type="button"
								onClick={() => {
									navigator.clipboard?.writeText(currentCall.phone);
									showToast("Номер телефона скопирован", "info");
								}}
								className="text-[10px] text-[var(--muted)] hover:text-[var(--ink)] inline-flex items-center gap-0.5 cursor-pointer underline"
								title="Скопировать номер"
							>
								<Copy size={11} />
								копировать
							</button>
						</div>
						{(resolvedPatient as any)?.birthDate && (
							<span className="text-[11px] text-[var(--muted)] block mt-0.5">
								Дата рождения: {(resolvedPatient as any).birthDate}
							</span>
						)}
					</div>
				</div>

				{/* 2 Primary Direct Action Buttons (Miller's Law) */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setShowQuickBooking((prev) => !prev)}
						className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
						title="Создать запись на приём (быстрые слоты в 1 клик)"
						data-testid="drawer-action-book"
					>
						<CalendarCheck size={15} />
						<span>Создать запись</span>
						<ChevronDown
							size={14}
							className={`transition-transform duration-200 ${showQuickBooking ? "rotate-180" : ""}`}
						/>
					</button>

					<button
						type="button"
						onClick={handleOpenFullPatientView}
						className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
						title={
							isKnownPatient
								? "Открыть карту пациента в реестре"
								: "Создать нового пациента в реестре"
						}
						data-testid="drawer-action-open-card"
					>
						<UserCheck size={15} className="text-[var(--teal)]" />
						<span>{isKnownPatient ? "Открыть карту" : "+ Новый пациент"}</span>
					</button>
				</div>

				{/* Quick Booking Slots */}
				{showQuickBooking && (
					<IncomingCallQuickBooking onSelectSlot={handleQuickBook} />
				)}

				{/* Somatic & Allergy Alerts */}
				{somaticAlerts.length > 0 && (
					<div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 space-y-1.5">
						<div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
							<AlertTriangle size={14} className="text-rose-600" />
							<span>Медицинские предупреждения:</span>
						</div>
						<div className="space-y-1">
							{somaticAlerts.map((alert, idx) => (
								<div key={idx} className="flex items-start gap-1.5 text-xs">
									<span className="text-rose-500 font-bold">•</span>
									<span>
										<strong>{alert.label}</strong>
										<span className="text-rose-600/80 dark:text-rose-400/80 ml-1">
											(
											{alert.category === "allergy"
												? "Аллергия"
												: alert.category === "pain"
													? "Острая боль"
													: alert.severity}
											)
										</span>
									</span>
								</div>
							))}
						</div>
						{somaticAlerts.some((a) => a.category === "pain") && (
							<button
								type="button"
								onClick={() => handleQuickBook("today_urgent")}
								className="w-full mt-2 min-h-[38px] px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
								data-testid="drawer-action-cito"
								title="Внеочередная экстренная запись пациента с острой болью"
							>
								<Zap size={14} />
								<span>Записать вне очереди (Острая боль / Cito)</span>
							</button>
						)}
					</div>
				)}

				{/* Active Treatment Plan Card */}
				{activeTreatmentPlan && activeTreatmentPlan.hasActivePlan && (
					<div
						className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal-soft)] space-y-2 shadow-xs"
						data-testid="telephony-drawer-active-plan-card"
					>
						<div className="flex items-center justify-between gap-1">
							<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5">
								<Sparkles size={13} className="text-amber-500 shrink-0" />
								<span>План лечения:</span>
							</span>
							<span className="text-[11px] font-bold text-[var(--ink)]">
								{activeTreatmentPlan.formattedTotalCost}
							</span>
						</div>
						<div className="text-xs font-semibold text-[var(--ink)]">
							{activeTreatmentPlan.planTitle}
						</div>
						<div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
							<span>
								Выполнено: {activeTreatmentPlan.completedCount} из {activeTreatmentPlan.itemsCount} ({activeTreatmentPlan.progressPercent}%)
							</span>
							{activeTreatmentPlan.nextService && (
								<span className="truncate max-w-[180px] font-medium text-[var(--teal)]" title={`След. процедура: ${activeTreatmentPlan.nextService}`}>
									След: {activeTreatmentPlan.nextService}
								</span>
							)}
						</div>
						<div className="w-full h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
							<div
								className="h-full bg-[var(--teal)] rounded-full transition-all"
								style={{ width: `${Math.min(100, Math.max(0, activeTreatmentPlan.progressPercent))}%` }}
							/>
						</div>
					</div>
				)}

				{/* Financial Status, Upcoming and Previous Appointments */}
				<TelephonyDrawerFinancialAndUpcoming
					isKnownPatient={isKnownPatient}
					financialSummary={financialSummary}
					upcomingAppointment={upcomingAppointment}
					lastVisitSummary={lastVisitSummary}
					onSendWhatsApp={handleSendWhatsAppConfirmation}
					onCopySms={handleCopySmsConfirmation}
				/>

				{/* Call Past History, SIP Transfer and Outcomes (Reusable Sub-Component) */}
				<IncomingCallPastHistory
					isCallAnswered={isCallAnswered}
					showTransferPanel={showTransferPanel}
					onToggleTransferPanel={() => setShowTransferPanel((p) => !p)}
					transferType={transferType}
					onSelectTransferType={(t) => setTransferType(t)}
					onStartTransfer={(ext, t) => {
						startCallTransfer(ext, t);
						showToast(`Перевод звонка на ${ext} (${t === "blind" ? "Слепой" : "С консультацией"})`, "info");
					}}
					showOutcomePanel={showOutcomePanel}
					onToggleOutcomePanel={() => setShowOutcomePanel((p) => !p)}
					onRecordOutcome={(outcome) => {
						recordCallOutcome(outcome);
						handleClose();
						showToast(`Исход зафиксирован: ${outcome}`, "success");
					}}
					recordingUrl={currentCall.recordingUrl}
					durationSeconds={currentCall.durationSeconds || 0}
					seed={currentCall.callId || currentCall.phone}
					transcript={currentCall.transcript}
				/>

				{/* Unknown Caller: 1-Click Lead Capture with Automatic Marketing Attribution */}
				{!isKnownPatient && callAttribution && (
					<div
						className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal-soft)] space-y-2.5 shadow-xs"
						data-testid="telephony-drawer-lead-capture-card"
					>
						<div className="flex items-center justify-between gap-1 flex-wrap">
							<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
								<Sparkles size={14} className="text-amber-500 shrink-0" />
								<span>Захват в CRM-лиды</span>
							</div>
							<span
								className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0"
								style={{
									backgroundColor:
										CHANNEL_BADGE_COLORS[callAttribution.channelKey].bg,
									color:
										CHANNEL_BADGE_COLORS[callAttribution.channelKey].text,
									border: `1px solid ${CHANNEL_BADGE_COLORS[callAttribution.channelKey].border}`,
								}}
								data-testid="telephony-drawer-attribution-channel-pill"
							>
								{callAttribution.channelLabel}
							</span>
						</div>

						<div className="text-[11px] text-[var(--muted)] space-y-1">
							{callAttribution.virtualNumberDisplay && (
								<div className="flex items-center justify-between">
									<span>Номер ВАТС:</span>
									<span className="font-mono font-semibold text-[var(--ink)]">
										{callAttribution.virtualNumberDisplay}
									</span>
								</div>
							)}
							{callAttribution.utmSummary && (
								<div className="flex items-start justify-between gap-1">
									<span className="shrink-0">UTM-метки:</span>
									<span className="font-mono text-[10px] text-[var(--teal)] text-right break-all">
										{callAttribution.utmSummary}
									</span>
								</div>
							)}
						</div>

						<button
							type="button"
							onClick={() => handleCaptureLead()}
							disabled={isCapturingLead || currentCall.isLeadCaptured}
							className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
							data-testid="drawer-action-capture-lead"
							title="1-Клик захват звонящего в лиды с автоматической разметкой рекламного канала"
						>
							<UserPlus size={15} />
							<span>
								{currentCall.isLeadCaptured
									? `✓ Лид захвачен (${callAttribution.channelLabel})`
									: isCapturingLead
										? "Сохранение лида..."
										: `Захватить в лиды (${callAttribution.channelLabel})`}
							</span>
						</button>
					</div>
				)}

				{/* Unknown Caller: Inline 1-click new patient creation */}
				{!isKnownPatient && (
					<div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-2">
						<div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
							<AlertCircle size={14} className="text-amber-500" />
							<span>Быстрое создание нового пациента (без сброса визита)</span>
						</div>
						<div className="space-y-1.5">
							<input
								type="text"
								value={newPatientNameInput}
								onChange={(e) => setNewPatientNameInput(e.target.value)}
								placeholder="ФИО пациента (по умолчанию: Пациент + телефон)"
								className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-xs font-medium text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
								data-testid="drawer-new-patient-name-input"
							/>
							<button
								type="button"
								onClick={() => handleQuickCreatePatient()}
								disabled={isCreatingPatient}
								className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[var(--teal)] text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
								data-testid="drawer-quick-create-patient-btn"
								title="Создать первичную карту пациента в 1 клик (без обязательного паспорта и СНИЛС)"
							>
								<UserCheck size={15} />
								<span>
									{isCreatingPatient
										? "Создание карты..."
										: "+ Создать пациента за 5 секунд"}
								</span>
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Drawer Footer */}
			<div className="shrink-0 p-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2">
				<button
					type="button"
					onClick={handleClose}
					className="px-4 py-2.5 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] transition-all min-h-[44px] cursor-pointer"
				>
					Закрыть шторку
				</button>

				<button
					type="button"
					onClick={handleOpenFullPatientView}
					className="text-[11px] font-semibold text-[var(--teal)] hover:underline inline-flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
					title="Перейти в полноэкранный раздел Пациенты"
				>
					<span>Открыть в общем списке</span>
					<ExternalLink size={12} />
				</button>
			</div>
		</section>
		<TelephonyDialerModal
			isOpen={isDialerOpen}
			onClose={() => setIsDialerOpen(false)}
		/>
	</>,
	document.body,
);
}
