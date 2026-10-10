/**
 * @file TelephonyIncomingCallCard.tsx
 * @description Layer 4: Presentation subcomponent for caller patient identification.
 * Displays patient details, balance, visit history, somatic alerts, upcoming appointments, and 1-click booking/intake.
 */

import {
	AlertCircle,
	AlertTriangle,
	CalendarCheck,
	Check,
	Clock,
	Copy,
	MessageSquare,
	MoreHorizontal,
	Phone,
	PhoneOutgoing,
	User,
	UserCheck,
	UserPlus,
	Wallet,
	Zap,
} from "lucide-react";
import React, { useState } from "react";
import { TelephonyWidgetMoreMenu } from "../TelephonyWidgetMoreMenu";
import type { TelephonyIncomingCallCardProps } from "./types";

export function TelephonyIncomingCallCard({
	activeCall,
	resolvedPatient,
	financialSummary,
	lastVisitSummary,
	callerName,
	formattedPhone,
	initials,
	avatarColors,
	allergyAlerts,
	acutePainAlerts,
	upcomingAppointment,
	callAttribution,
	whatsappSent,
	onSendWhatsApp,
	onQuickBook,
	onOpenCard,
	showWidgetMoreMenu,
	onToggleWidgetMoreMenu,
	onCloseWidgetMoreMenu,
	isCapturingLead,
	onCaptureLead,
	isHeld,
	onToggleHold,
	onCopyPhone,
	isCreatingPatient,
	onQuickCreatePatient,
	isWsConnected,
	onSwitchToDialer,
}: TelephonyIncomingCallCardProps) {
	const [customPatientName, setCustomPatientName] = useState("");
	const [showNameInput, setShowNameInput] = useState(false);

	if (!activeCall) {
		return (
			<div
				className="dnt-caller-card text-center py-6 space-y-3"
				data-testid="telephony-fallback-waiting-webhook"
			>
				<div className="dnt-widget-brand-icon mx-auto">
					<Phone size={20} />
				</div>
				<div>
					<h4 className="text-sm font-bold text-[var(--ink,#0f172a)]">
						Линия свободна
					</h4>
					<p className="text-xs text-[var(--muted,#64748b)] mt-1">
						При поступлении звонка карточка пациента и быстрая запись откроются автоматически.
					</p>
				</div>
				<button
					type="button"
					onClick={onSwitchToDialer}
					className="dnt-cta-primary mx-auto"
				>
					<PhoneOutgoing size={14} />
					<span>Открыть номеронабиратель</span>
				</button>
			</div>
		);
	}

	const isKnownPatient = Boolean(resolvedPatient);

	return (
		<div className="space-y-2.5" data-testid="telephony-incoming-call-card">
			{/* Caller Identification & Clinical Summary Card */}
			<div className="dnt-caller-card space-y-2.5">
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-center gap-2.5 min-w-0">
						<div
							className="dnt-caller-avatar"
							style={{
								backgroundColor: avatarColors.bg,
								color: avatarColors.text,
								borderColor: avatarColors.border || "var(--line)",
							}}
						>
							{initials}
						</div>
						<div className="min-w-0">
							<h3
								className="font-bold text-sm text-[var(--ink,#0f172a)] leading-snug"
								title={callerName}
							>
								{callerName}
							</h3>
							<div className="flex items-center gap-1.5 text-xs font-mono text-[var(--muted,#64748b)] mt-0.5">
								<span>{formattedPhone}</span>
							</div>
						</div>
					</div>

					<div className="flex flex-col items-end gap-1 shrink-0">
						{isKnownPatient ? (
							<span className="dnt-badge-patient">
								<UserCheck size={11} />
								<span>Пациент клиники</span>
							</span>
						) : (
							<span className="dnt-badge-lead">
								<AlertCircle size={11} />
								<span>Новое обращение</span>
							</span>
						)}
						{callAttribution && (
							<span className="dnt-badge-source">
								{callAttribution.sourceName}
							</span>
						)}
					</div>
				</div>

				{/* Patient Balance & Visit History Metrics */}
				{isKnownPatient && (
					<div className="dnt-patient-metrics-row">
						<div className="dnt-metric-box">
							<div className="dnt-metric-label">
								<Wallet size={11} />
								<span>Баланс счёта</span>
							</div>
							<div
								className={`dnt-metric-value ${
									financialSummary?.hasDebt ? "dnt-metric-value--debt" : ""
								}`}
							>
								{financialSummary?.hasDebt
									? `Долг ${financialSummary.formattedDebt}`
									: financialSummary?.formattedBalance || "0 ₽"}
							</div>
						</div>
						<div className="dnt-metric-box">
							<div className="dnt-metric-label">
								<Clock size={11} />
								<span>История визитов</span>
							</div>
							<div className="dnt-metric-value">
								{lastVisitSummary?.lastVisitDate
									? lastVisitSummary.formattedLastVisit
									: "Постоянный пациент"}
							</div>
						</div>
					</div>
				)}

				{/* Somatic Alerts (Allergies & Acute Pain) */}
				{(allergyAlerts.length > 0 || acutePainAlerts.length > 0) && (
					<div className="flex flex-wrap gap-1.5 pt-1">
						{allergyAlerts.map((alert) => (
							<span
								key={alert.id}
								className="dnt-alert-pill dnt-alert-pill--allergy"
								data-testid="telephony-widget-allergy-alert"
							>
								<AlertTriangle size={12} />
								<span>Аллергия: {alert.label}</span>
							</span>
						))}
						{acutePainAlerts.map((alert) => (
							<span
								key={alert.id}
								className="dnt-alert-pill dnt-alert-pill--pain"
								data-testid="telephony-widget-acute-pain-alert"
							>
								<Zap size={12} />
								<span>Острая боль: {alert.label}</span>
							</span>
						))}
					</div>
				)}

				{/* Upcoming Appointment Info & WhatsApp Confirmation */}
				{upcomingAppointment && (
					<div className="dnt-upcoming-box">
						<div className="flex items-center justify-between gap-2 text-xs">
							<div className="flex items-center gap-1.5 font-bold text-[var(--teal)]">
								<CalendarCheck size={14} />
								<span>
									{upcomingAppointment.isToday
										? "Запись сегодня"
										: upcomingAppointment.isTomorrow
											? "Запись завтра"
											: upcomingAppointment.formattedDate}
									{" в "}
									{upcomingAppointment.formattedTime}
								</span>
							</div>
							{upcomingAppointment.doctorName && (
								<span className="text-[11px] font-semibold text-[var(--ink,#0f172a)]">
									{upcomingAppointment.doctorName}
								</span>
							)}
						</div>
						<button
							type="button"
							onClick={onSendWhatsApp}
							className="dnt-whatsapp-btn"
						>
							{whatsappSent ? <Check size={13} /> : <MessageSquare size={13} />}
							<span>
								{whatsappSent
									? "Подтверждение отправлено"
									: "Написать в WhatsApp"}
							</span>
						</button>
					</div>
				)}

				{/* Quick 1-Click Patient Intake for Unknown Callers */}
				{!isKnownPatient && (
					<div className="pt-1">
						{!showNameInput ? (
							<button
								type="button"
								onClick={() => setShowNameInput(true)}
								className="dnt-cta-secondary w-full"
							>
								<UserPlus size={14} />
								<span>Зарегистрировать нового пациента</span>
							</button>
						) : (
							<div className="flex items-center gap-1.5">
								<input
									type="text"
									value={customPatientName}
									onChange={(e) => setCustomPatientName(e.target.value)}
									placeholder="ФИО пациента"
									className="dnt-text-input flex-1"
								/>
								<button
									type="button"
									onClick={() => {
										if (isCreatingPatient) return;
										onQuickCreatePatient(customPatientName);
										setShowNameInput(false);
									}}
									className="dnt-cta-primary"
								>
									<Check size={13} />
									<span>Сохранить</span>
								</button>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Primary Transactional Buttons (Miller's Law <= 2 Direct Actions + '...') */}
			<div className="dnt-actions-footer">
				<button
					type="button"
					onClick={() => onQuickBook("urgent")}
					className="dnt-cta-primary flex-1"
					data-testid="widget-action-book"
					title="Записать пациента на приём в расписание"
				>
					<CalendarCheck size={14} />
					<span>Записать на приём</span>
				</button>

				<button
					type="button"
					onClick={onOpenCard}
					className="dnt-cta-secondary flex-1"
					data-testid="widget-action-open-card"
					title="Открыть электронную медкарту пациента"
				>
					<User size={14} />
					<span>{isKnownPatient ? "Открыть карту" : "Создать карту"}</span>
				</button>

				<div className="relative">
					<button
						type="button"
						onClick={onToggleWidgetMoreMenu}
						className="dnt-btn-icon dnt-btn-more"
						data-testid="widget-more-menu-btn"
						title="Дополнительные действия"
						aria-label="Дополнительные действия"
					>
						<MoreHorizontal size={16} />
					</button>

					{showWidgetMoreMenu && (
						<TelephonyWidgetMoreMenu
							activeCall={activeCall}
							isHeld={isHeld}
							onToggleHold={onToggleHold}
							whatsappSent={whatsappSent}
							onSendWhatsApp={onSendWhatsApp}
							onQuickBook={onQuickBook}
							onCopyPhone={onCopyPhone}
							isCapturingLead={isCapturingLead}
							onCaptureLead={onCaptureLead}
							onClose={onCloseWidgetMoreMenu}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
