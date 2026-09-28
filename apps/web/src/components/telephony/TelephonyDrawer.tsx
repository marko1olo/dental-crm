import {
	AlertCircle,
	AlertTriangle,
	CalendarCheck,
	Check,
	ChevronDown,
	Clock,
	Copy,
	CreditCard,
	ExternalLink,
	MoreHorizontal,
	PhoneCall,
	PhoneForwarded,
	Send,
	Shield,
	Sparkles,
	User,
	UserCheck,
	UserPlus,
	X,
	Zap,
} from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import {
	resolveCallAdvertisingAttribution,
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
	type CallOutcome,
	calculatePatientFinancialStatus,
	formatPatientInitials,
	formatPhoneDisplay,
	generateAppointmentConfirmationMessage,
	getAvatarColor,
	openWhatsAppChat,
	resolvePatientFromPhone,
	resolvePatientLastVisit,
	resolvePatientSomaticAlerts,
	resolvePatientUpcomingAppointment,
	resolvePatientActiveTreatmentPlan,
	type IncomingCallPayload,
	useTelephonyStore,
} from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";
import { CallAudioPlayer } from "./IncomingCallPopup";

export interface TelephonyDrawerProps {
	isOpen?: boolean;
	onClose?: () => void;
	call?: IncomingCallPayload | null;
}

/**
 * TelephonyDrawer: Patient Side-Drawer for Telephony Cockpit.
 * Slides over smoothly from the right edge with zero disruption to active Form 043/u diary or chairside treatments.
 * Strictly adheres to Mandates 8d, 8e, 8n (Zero-occlusion, doctor autonomy, 1-click caller match).
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

	const ctx = useOptionalAppLogicContext();
	const dashboard = ctx?.dashboard;

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setCurrentView = useAppStore((s) => s.setCurrentView);
	const currentView = useAppStore((s) => s.currentView);
	const setNewAppointmentDraft = useScheduleStore(
		(s) => s.setNewAppointmentDraft,
	);

	const [showMoreMenu, setShowMoreMenu] = useState(false);
	const [showQuickBooking, setShowQuickBooking] = useState(false);
	const [showTransferPanel, setShowTransferPanel] = useState(false);
	const [transferType, setTransferType] = useState<"blind" | "attended">("blind");
	const [showOutcomePanel, setShowOutcomePanel] = useState(false);
	const [newPatientNameInput, setNewPatientNameInput] = useState("");
	const [isCreatingPatient, setIsCreatingPatient] = useState(false);
	const [isCapturingLead, setIsCapturingLead] = useState(false);
	const [smsCopied, setSmsCopied] = useState(false);

	// Escape key listener for side drawer
	useEffect(() => {
		if (!isDrawerOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (showMoreMenu) {
					setShowMoreMenu(false);
				} else {
					handleClose();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isDrawerOpen, handleClose, showMoreMenu]);

	// Resolve Patient Info from Phone
	const resolvedPatient = useMemo(() => {
		if (!currentCall || !dashboard?.patients) return null;
		if (currentCall.patientId) {
			const found = dashboard.patients.find(
				(p) => p.id === currentCall.patientId,
			);
			if (found) return found;
		}
		return resolvePatientFromPhone(dashboard.patients, currentCall.phone);
	}, [currentCall, dashboard?.patients]);

	const patientInsight = useMemo(() => {
		if (!resolvedPatient || !dashboard?.patientInsights) return null;
		return (
			dashboard.patientInsights.find(
				(pi) => pi.patientId === resolvedPatient.id,
			) || null
		);
	}, [resolvedPatient, dashboard?.patientInsights]);

	const financialSummary = useMemo(() => {
		return calculatePatientFinancialStatus(
			resolvedPatient,
			patientInsight,
			dashboard?.insuranceContracts,
		);
	}, [resolvedPatient, patientInsight, dashboard?.insuranceContracts]);

	const lastVisitSummary = useMemo(() => {
		return resolvePatientLastVisit(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const upcomingAppointment = useMemo(() => {
		return resolvePatientUpcomingAppointment(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const somaticAlerts = useMemo(() => {
		return resolvePatientSomaticAlerts(resolvedPatient, patientInsight);
	}, [resolvedPatient, patientInsight]);

	const activeTreatmentPlan = useMemo(() => {
		return resolvePatientActiveTreatmentPlan(
			resolvedPatient?.id || null,
			dashboard?.treatmentPlanItems,
			dashboard?.treatmentPlanScenarios,
		);
	}, [
		resolvedPatient?.id,
		dashboard?.treatmentPlanItems,
		dashboard?.treatmentPlanScenarios,
	]);

	const callAttribution = useMemo(() => {
		if (!currentCall) return null;
		return resolveCallAdvertisingAttribution(currentCall);
	}, [currentCall]);

	if (typeof document === "undefined" || !isDrawerOpen) return null;

	const callerName =
		resolvedPatient?.fullName || currentCall?.patientName || "Неизвестный номер";
	const formattedPhone = currentCall?.phone
		? formatPhoneDisplay(currentCall.phone)
		: "";
	const initials = formatPatientInitials(callerName);
	const avatarColors = getAvatarColor(callerName);
	const isKnownPatient = Boolean(resolvedPatient);
	const hasDms = financialSummary.hasInsurance;
	const hasDebt = financialSummary.hasDebt;
	const isCallAnswered = currentCall
		? currentCall.status === "answered" ||
			currentCall.status === "connected" ||
			currentCall.status === "ended"
		: false;

	const handleSendWhatsAppConfirmation = () => {
		if (!upcomingAppointment || !currentCall) {
			showToast(
				"Нет предстоящих запланированных записей для подтверждения",
				"info",
			);
			return;
		}

		const msg = generateAppointmentConfirmationMessage({
			patientName: callerName,
			doctorName: upcomingAppointment.doctorName,
			appointmentStartsAt: upcomingAppointment.startsAt,
			clinicName: dashboard?.clinicSettings?.name || "DENTE",
		});

		openWhatsAppChat(currentCall.phone, msg);
		showToast(
			`Подтверждение приёма отправлено в WhatsApp (${callerName})`,
			"success",
		);
	};

	const handleCopySmsConfirmation = () => {
		if (!upcomingAppointment) {
			showToast(
				"Нет предстоящих запланированных записей для подтверждения",
				"info",
			);
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
				"Приём пациента активен (форма 043/у). Карта доступна в текущей шторке без сброса визита.",
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
		} else if (currentCall?.phone) {
			setNewPatientPhone(currentCall.phone);
			setCurrentView("patients");
			if (activeCall && activeCall.status === "ringing") {
				connectCall();
			}
			showToast(
				`Регистрация нового пациента с номером ${formattedPhone}`,
				"info",
			);
		}
		handleClose();
	};

	const handleQuickBook = (
		slotType: "today_urgent" | "today_standard" | "tomorrow",
	) => {
		if (!currentCall) return;
		const todayIso =
			dashboard?.todayIso || new Date().toISOString().split("T")[0]!;
		const defaultDoctorId =
			dashboard?.clinicSettings?.staff?.find((s) => s.role === "doctor")?.id ||
			"";
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
		if (!currentCall?.phone) return;
		if (isCreatingPatient) return;
		setIsCreatingPatient(true);
		try {
			const entered =
				typeof customName === "string" ? customName : newPatientNameInput;
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
			const msg =
				err instanceof Error ? err.message : "Не удалось сохранить пациента";
			showToast(msg, "error");
		} finally {
			setIsCreatingPatient(false);
		}
	};

	// 1-Click Lead Capture with Automatic Marketing Attribution (Mandate 8e, 8n)
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

	// Fallback empty view when no call is active
	if (!currentCall) {
		return createPortal(
			<section
				className="dnt-telephony-patient-drawer fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[var(--paper-strong)] border-l border-[var(--line)] shadow-2xl flex flex-col transition-all duration-200 animate-in slide-in-from-right"
				aria-label="Шторка телефонии"
				data-testid="telephony-drawer-empty-fallback"
			>
				<div className="shrink-0 p-4 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center">
							<PhoneCall size={16} />
						</div>
						<div>
							<h2 className="text-sm font-bold text-[var(--ink)] leading-tight">
								Шторка телефонии
							</h2>
							<span
								className="text-[10px] font-semibold text-[var(--muted)] flex items-center gap-1 mt-0.5"
								data-testid="telephony-fallback-waiting-webhook"
							>
								<span
									className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
								/>
								<span>
									{isConnected
										? "Шлюз АТС: Онлайн (WebSocket)"
										: "Шлюз АТС: Ожидание вебхука (UIS / Mango / Zadarma / Asterisk)"}
								</span>
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer"
						title="Закрыть боковую шторку (Esc)"
						aria-label="Закрыть шторку"
					>
						<X size={20} />
					</button>
				</div>

				<div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
					<div className="w-16 h-16 rounded-2xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center">
						<PhoneCall size={28} />
					</div>
					<div className="space-y-1.5 max-w-xs">
						<h3 className="text-base font-bold text-[var(--ink)]">
							Ожидание вебхука АТС UIS/Mango/Zadarma/Asterisk
						</h3>
						<p className="text-xs text-[var(--muted)] leading-relaxed">
							Шлюз телефонии (UIS / Mango / Zadarma / Asterisk) подключен и
							ожидает входящих звонков. При поступлении вызова карточка пациента
							и быстрая запись откроются автоматически.
						</p>
					</div>
					<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] font-medium text-[var(--ink)]">
						<span
							className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-500"}`}
						/>
						<span>Провайдер: UIS / Mango / Asterisk / Zadarma</span>
					</div>
				</div>

				<div className="shrink-0 p-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-end">
					<button
						type="button"
						onClick={handleClose}
						className="px-4 py-2.5 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] transition-all min-h-[44px] cursor-pointer"
					>
						Закрыть шторку
					</button>
				</div>
			</section>,
			document.body,
		);
	}

	return createPortal(
		<section
			className="dnt-telephony-patient-drawer fixed right-0 top-0 bottom-0 w-full sm:w-[480px] max-w-full z-[9995] bg-[var(--paper-strong)] text-[var(--ink)] border-l border-[var(--line)] shadow-2xl flex flex-col pointer-events-auto animate-slide-in-right overflow-hidden"
			style={{ zIndex: 9995 }}
			aria-label="Боковая шторка пациента"
			data-testid="telephony-patient-side-drawer"
		>
			{/* Drawer Header */}
			<div className="shrink-0 p-4 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)]">
				<div className="flex items-center gap-2">
					<User className="text-[var(--teal)] shrink-0" size={18} />
					<div>
						<h2 className="text-sm font-bold text-[var(--ink)] leading-none">
							Карточка звонящего
						</h2>
						<div className="flex items-center gap-1.5 mt-1">
							<span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
								<Check size={10} />
								Визит сохранён
							</span>
							<span className="text-[10px] text-[var(--muted)]">
								(без сброса формы)
							</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-1">
					<div className="relative">
						<button
							type="button"
							onClick={() => setShowMoreMenu((prev) => !prev)}
							className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer"
							title="Дополнительные действия"
							aria-label="Дополнительные действия"
						>
							<MoreHorizontal size={20} />
						</button>
						{showMoreMenu && (
							<div className="absolute right-0 top-full mt-1 w-60 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 space-y-0.5">
								{!isKnownPatient && callAttribution && (
									<button
										type="button"
										onClick={() => {
											handleCaptureLead();
											setShowMoreMenu(false);
										}}
										disabled={isCapturingLead || currentCall?.isLeadCaptured}
										className="w-full text-left px-2.5 py-2 rounded-lg bg-[var(--teal-surface)] hover:opacity-90 text-[var(--teal)] font-bold flex items-center gap-2 transition-colors cursor-pointer border border-[var(--teal-soft)] mb-1"
										data-testid="drawer-more-action-capture-lead"
										title={`1-Клик захват в лиды с авторазметкой канала (${callAttribution.channelLabel})`}
									>
										<UserPlus size={14} className="text-[var(--teal)] shrink-0" />
										<span className="truncate">
											{currentCall?.isLeadCaptured
												? "✓ Лид захвачен"
												: isCapturingLead
													? "Захват лида..."
													: `В лиды: ${callAttribution.channelLabel}`}
										</span>
									</button>
								)}
								{upcomingAppointment && (
									<>
										<button
											type="button"
											onClick={() => {
												handleSendWhatsAppConfirmation();
												setShowMoreMenu(false);
											}}
											className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 transition-colors cursor-pointer"
										>
											<Send size={13} className="text-emerald-600" />
											<span>1-Click WhatsApp</span>
										</button>
										<button
											type="button"
											onClick={() => {
												handleCopySmsConfirmation();
												setShowMoreMenu(false);
											}}
											className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
										>
											{smsCopied ? (
												<Check size={13} className="text-emerald-500" />
											) : (
												<Copy size={13} className="text-[var(--muted)]" />
											)}
											<span>
												{smsCopied ? "SMS скопировано" : "Скопировать SMS"}
											</span>
										</button>
									</>
								)}
								<button
									type="button"
									onClick={() => {
										navigator.clipboard?.writeText(currentCall.phone);
										showToast("Номер телефона скопирован", "info");
										setShowMoreMenu(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
								>
									<Copy size={13} className="text-[var(--muted)]" />
									<span>Копировать номер</span>
								</button>
								{isCallAnswered && (
									<button
										type="button"
										onClick={() => {
											setShowTransferPanel((prev) => !prev);
											setShowMoreMenu(false);
										}}
										className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
									>
										<PhoneForwarded size={13} className="text-[var(--teal)]" />
										<span>Перевод звонка (SIP)</span>
									</button>
								)}
								<button
									type="button"
									onClick={() => {
										setShowOutcomePanel((prev) => !prev);
										setShowMoreMenu(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
								>
									<Check size={13} className="text-[var(--teal)]" />
									<span>Фиксация исхода</span>
								</button>
								<div className="my-1 border-t border-[var(--line)]" />
								<button
									type="button"
									onClick={() => {
										handleOpenFullPatientView();
										setShowMoreMenu(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--teal)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
								>
									<ExternalLink size={13} />
									<span>Открыть в общем списке</span>
								</button>
							</div>
						)}
					</div>

					<button
						type="button"
						onClick={handleClose}
						className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer"
						title="Закрыть боковую шторку (Esc)"
						aria-label="Закрыть шторку"
					>
						<X size={20} />
					</button>
				</div>
			</div>

			{/* Drawer Scrollable Content */}
			<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
				{/* Patient Identity Block */}
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center gap-3">
					<div
						className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black shrink-0 shadow-xs border border-[var(--line)]"
						style={{
							backgroundColor: avatarColors.bg,
							color: avatarColors.text,
						}}
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
						{resolvedPatient?.birthDate && (
							<span className="text-[11px] text-[var(--muted)] block mt-0.5">
								Дата рождения: {resolvedPatient.birthDate}
							</span>
						)}
					</div>
				</div>

				{/* 2 Primary Direct Action Buttons */}
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
						<span>
							{isKnownPatient ? "Открыть карту" : "+ Новый пациент"}
						</span>
					</button>
				</div>

				{/* Quick Booking Slots */}
				{showQuickBooking && (
					<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal-soft)] space-y-2 animate-in fade-in">
						<div className="flex items-center justify-between">
							<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--teal)] flex items-center gap-1">
								<Zap size={12} className="text-amber-500" />
								Слоты быстрой записи:
							</span>
							<span className="text-[10px] text-[var(--muted)]">В 1 клик</span>
						</div>
						<div className="grid grid-cols-3 gap-1.5">
							<button
								type="button"
								onClick={() => handleQuickBook("today_urgent")}
								className="min-h-[44px] px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer"
								title="Записать сегодня на 10:00 (Острая боль)"
							>
								<span>Сегодня 10:00</span>
								<span className="text-[9px] font-normal text-amber-700 dark:text-amber-300">
									Острая боль
								</span>
							</button>
							<button
								type="button"
								onClick={() => handleQuickBook("today_standard")}
								className="min-h-[44px] px-2 py-1.5 rounded-lg bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] border border-[var(--teal-soft)] text-[var(--teal)] text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer"
								title="Записать сегодня на 14:30 (Консультация)"
							>
								<span>Сегодня 14:30</span>
								<span className="text-[9px] font-normal">Консультация</span>
							</button>
							<button
								type="button"
								onClick={() => handleQuickBook("tomorrow")}
								className="min-h-[44px] px-2 py-1.5 rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer"
								title="Записать завтра на 11:00 (Плановый)"
							>
								<span>Завтра 11:00</span>
								<span className="text-[9px] font-normal text-[var(--muted)]">
									Плановый
								</span>
							</button>
						</div>
					</div>
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
						{/* Progress Bar */}
						<div className="w-full h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
							<div
								className="h-full bg-[var(--teal)] rounded-full transition-all"
								style={{ width: `${Math.min(100, Math.max(0, activeTreatmentPlan.progressPercent))}%` }}
							/>
						</div>
					</div>
				)}

				{/* Financial Status Card */}
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
					<div className="flex items-center justify-between">
						<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
							<CreditCard size={12} className="text-[var(--teal)]" />
							Финансовый статус:
						</span>
						{hasDms && (
							<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
								<Shield size={10} className="text-sky-500" />
								ДМС активен
							</span>
						)}
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)]">
							<span className="text-[10px] text-[var(--muted)] block">Баланс</span>
							<span
								className={`text-sm font-bold ${
									hasDebt
										? "text-rose-600"
										: financialSummary.balanceRub > 0
											? "text-emerald-600"
											: "text-[var(--ink)]"
								}`}
							>
								{hasDebt
									? `-${financialSummary.formattedDebt}`
									: financialSummary.formattedBalance}
							</span>
						</div>
						<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)]">
							<span className="text-[10px] text-[var(--muted)] block">
								Статус договора
							</span>
							<span className="text-sm font-bold text-[var(--ink)]">
								{isKnownPatient ? "Договор заключен" : "Без договора"}
							</span>
						</div>
					</div>
				</div>

				{/* Upcoming Appointment */}
				{upcomingAppointment && (
					<div className="p-3.5 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] space-y-2">
						<div className="flex items-center justify-between">
							<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5">
								<CalendarCheck size={13} />
								Предстоящий приём:
							</span>
							<div className="flex items-center gap-1">
								<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal)] text-white">
									{upcomingAppointment.isToday
										? "Сегодня"
										: upcomingAppointment.isTomorrow
											? "Завтра"
											: upcomingAppointment.formattedDate}
								</span>
								<button
									type="button"
									onClick={handleSendWhatsAppConfirmation}
									className="min-h-[32px] min-w-[32px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
									title="Отправить подтверждение в WhatsApp"
								>
									<Send size={13} />
								</button>
								<button
									type="button"
									onClick={handleCopySmsConfirmation}
									className="min-h-[32px] min-w-[32px] rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer shadow-xs"
									title="Скопировать SMS"
								>
									<Copy size={13} />
								</button>
							</div>
						</div>
						<div className="text-xs text-[var(--ink)] space-y-0.5">
							<div className="font-bold">
								Время: {upcomingAppointment.formattedTime}
							</div>
							<div className="text-[var(--muted)]">
								Врач: {upcomingAppointment.doctorName}
							</div>
						</div>
					</div>
				)}

				{/* Previous Visit Summary */}
				{lastVisitSummary && (
					<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1">
						<span className="font-bold text-[10px] uppercase tracking-wider text-[var(--muted)] flex items-center gap-1">
							<Clock size={11} className="text-[var(--teal)]" />
							Предыдущий визит:
						</span>
						<div className="text-xs text-[var(--ink)]">
							<span className="font-semibold">
								{lastVisitSummary.formattedLastVisit}
							</span>
							{lastVisitSummary.doctorName && (
								<span className="text-[var(--muted)]">
									{" "}
									· Врач: {lastVisitSummary.doctorName}
								</span>
							)}
						</div>
					</div>
				)}

				{/* Call Transfer Panel */}
				{isCallAnswered && (
					<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
						<button
							type="button"
							onClick={() => setShowTransferPanel((prev) => !prev)}
							className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--teal-surface)] border border-[var(--line)] text-xs font-bold text-[var(--teal)] transition-all flex items-center justify-between cursor-pointer"
						>
							<div className="flex items-center gap-2">
								<PhoneForwarded size={15} className="text-[var(--teal)]" />
								<span>
									{showTransferPanel
										? "Скрыть перевод"
										: "Перевод звонка (SIP Transfer)"}
								</span>
							</div>
							<ChevronDown
								size={16}
								className={`transition-transform duration-200 ${showTransferPanel ? "rotate-180" : ""}`}
							/>
						</button>

						{showTransferPanel && (
							<div className="space-y-2 pt-1 animate-fade-in">
								<div className="flex items-center gap-1 bg-[var(--paper-strong)] rounded-lg p-1 border border-[var(--line)]">
									<button
										type="button"
										onClick={() => setTransferType("blind")}
										className={`flex-1 min-h-[40px] py-1 px-2 rounded-md font-bold text-xs transition-all ${
											transferType === "blind"
												? "bg-[var(--teal)] text-white"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										Слепой (Blind)
									</button>
									<button
										type="button"
										onClick={() => setTransferType("attended")}
										className={`flex-1 min-h-[40px] py-1 px-2 rounded-md font-bold text-xs transition-all ${
											transferType === "attended"
												? "bg-[var(--teal)] text-white"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										С консультацией
									</button>
								</div>

								<div className="grid grid-cols-4 gap-1.5">
									{[
										{ ext: "101", label: "101 Терапевт" },
										{ ext: "102", label: "102 Хирург" },
										{ ext: "103", label: "103 Ортопед" },
										{ ext: "104", label: "104 Ресепшн" },
									].map((item) => (
										<button
											key={item.ext}
											type="button"
											onClick={() => {
												startCallTransfer(item.ext, transferType);
												showToast(
													`Перевод звонка на ${item.label} (${transferType === "blind" ? "Слепой" : "С консультацией"})`,
													"info",
												);
											}}
											className="min-h-[44px] px-1 py-1.5 rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--teal-surface)] border border-[var(--line)] text-[var(--ink)] text-[10px] font-bold text-center flex flex-col items-center justify-center transition-all cursor-pointer shadow-xs"
										>
											<span className="font-mono text-[var(--teal)]">
												{item.ext}
											</span>
											<span className="text-[9px] font-normal text-[var(--muted)] truncate w-full">
												{item.label.split(" ")[1]}
											</span>
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				)}

				{/* Audio Recording Player */}
				{currentCall.recordingUrl && (
					<CallAudioPlayer
						recordingUrl={currentCall.recordingUrl}
						durationSeconds={currentCall.durationSeconds || 0}
						seed={currentCall.callId || currentCall.phone}
						transcript={currentCall.transcript}
					/>
				)}

				{/* Call Outcome Logging */}
				<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden">
					<button
						type="button"
						onClick={() => setShowOutcomePanel((prev) => !prev)}
						className="w-full min-h-[40px] px-3 py-2 flex items-center justify-between text-[11px] font-bold text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
					>
						<span className="uppercase tracking-wider">
							Фиксация исхода звонка
						</span>
						<ChevronDown
							size={14}
							className={`transition-transform duration-200 ${showOutcomePanel ? "rotate-180" : ""}`}
						/>
					</button>
					{showOutcomePanel && (
						<div className="p-2.5 pt-0 grid grid-cols-2 gap-1.5 animate-in fade-in">
							{[
								{ action: "booked", label: "Записан на приём" },
								{ action: "callback_15m", label: "Перезвонить 15м" },
								{ action: "consulted", label: "Консультация" },
								{ action: "spam", label: "Спам / Ошибка" },
							].map((item) => (
								<button
									key={item.action}
									type="button"
									onClick={() => {
										recordCallOutcome(item.action as CallOutcome);
										handleClose();
										showToast(
											`Исход зафиксирован: ${item.label}`,
											"success",
										);
									}}
									className="min-h-[40px] px-2 py-1.5 rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--teal-surface)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] text-center transition-all cursor-pointer"
								>
									{item.label}
								</button>
							))}
						</div>
					)}
				</div>

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
							disabled={isCapturingLead || currentCall?.isLeadCaptured}
							className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
							data-testid="drawer-action-capture-lead"
							title="1-Клик захват звонящего в лиды с автоматической разметкой рекламного канала"
						>
							<UserPlus size={15} />
							<span>
								{currentCall?.isLeadCaptured
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
							<span>
								Быстрое создание нового пациента (без сброса визита)
							</span>
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
		</section>,
		document.body,
	);
}
