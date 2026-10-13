import {
	AlertCircle,
	AlertTriangle,
	CalendarCheck,
	Check,
	ChevronDown,
	Copy,
	Sparkles,
	UserCheck,
	UserPlus,
	Zap,
} from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import { IncomingCallPastHistory } from "../IncomingCallPastHistory";
import { IncomingCallQuickBooking } from "../IncomingCallQuickBooking";
import { TelephonyDrawerFinancialAndUpcoming } from "../TelephonyDrawerFinancialAndUpcoming";
import { CHANNEL_BADGE_COLORS } from "../telephonyAttribution";
import type { useTelephonyDrawerController } from "./useTelephonyDrawerController";

export interface TelephonyActiveCallPanelProps {
	ctrl: ReturnType<typeof useTelephonyDrawerController>;
}

export function TelephonyActiveCallPanel({
	ctrl,
}: TelephonyActiveCallPanelProps): React.JSX.Element {
	const {
		currentCall,
		callData,
		showQuickBooking,
		setShowQuickBooking,
		showTransferPanel,
		setShowTransferPanel,
		transferType,
		setTransferType,
		showOutcomePanel,
		setShowOutcomePanel,
		newPatientNameInput,
		setNewPatientNameInput,
		isCreatingPatient,
		isCapturingLead,
		isCallAnswered,
		handleOpenFullPatientView,
		handleQuickBook,
		handleQuickCreatePatient,
		handleCaptureLead,
		handleSendWhatsAppConfirmation,
		handleCopySmsConfirmation,
		startCallTransfer,
		recordCallOutcome,
		handleClose,
	} = ctrl;

	if (!currentCall) return <></>;

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

	return (
		<div className="space-y-3.5" data-testid="telephony-active-call-panel">
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
								title={`Канал рекламы: ${callAttribution?.channelLabel || "ВАТС"}`}
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
				</div>
			</div>

			{/* 2 Primary Direct Action Buttons (Miller's Law) */}
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => setShowQuickBooking((prev) => !prev)}
					className="dnt-telephony-primary-btn flex-1 min-h-[44px] px-3.5 py-2 rounded-xl text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
					title="Создать запись на приём (быстрые слоты)"
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
					title={isKnownPatient ? "Открыть карту пациента" : "Создать нового пациента"}
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
										({alert.category === "allergy" ? "Аллергия" : alert.category === "pain" ? "Острая боль" : "Внимание"})
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
					</div>
					<div className="w-full h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
						<div
							className="h-full bg-[var(--teal)] rounded-full transition-all"
							style={{ width: `${Math.min(100, Math.max(0, activeTreatmentPlan.progressPercent))}%` }}
						/>
					</div>
				</div>
			)}

			{/* Financial Status & Upcoming Visits */}
			<TelephonyDrawerFinancialAndUpcoming
				isKnownPatient={isKnownPatient}
				financialSummary={financialSummary}
				upcomingAppointment={upcomingAppointment}
				lastVisitSummary={lastVisitSummary}
				onSendWhatsApp={handleSendWhatsAppConfirmation}
				onCopySms={handleCopySmsConfirmation}
			/>

			{/* Past History & SIP Controls */}
			<IncomingCallPastHistory
				isCallAnswered={isCallAnswered}
				showTransferPanel={showTransferPanel}
				onToggleTransferPanel={() => setShowTransferPanel((p) => !p)}
				transferType={transferType}
				onSelectTransferType={(t) => setTransferType(t)}
				onStartTransfer={(ext, t) => {
					startCallTransfer(ext, t);
					showToast(`Перевод звонка на ${ext}`, "info");
				}}
				showOutcomePanel={showOutcomePanel}
				onToggleOutcomePanel={() => setShowOutcomePanel((p) => !p)}
				onRecordOutcome={(outcome) => {
					recordCallOutcome(outcome);
					handleClose();
					showToast(`Исход: ${outcome}`, "success");
				}}
				recordingUrl={currentCall.recordingUrl}
				durationSeconds={currentCall.durationSeconds || 0}
				seed={currentCall.callId || currentCall.phone}
				transcript={currentCall.transcript}
			/>

			{/* Unknown Caller: 1-Click Lead Capture */}
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
						<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--paper-strong)] border border-[var(--line)]">
							{callAttribution.channelLabel}
						</span>
					</div>
					<button
						type="button"
						onClick={() => handleCaptureLead()}
						disabled={isCapturingLead || currentCall.isLeadCaptured}
						className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
						data-testid="drawer-action-capture-lead"
					>
						{currentCall.isLeadCaptured ? <Check size={15} /> : <UserPlus size={15} />}
						<span>
							{currentCall.isLeadCaptured
								? `Лид захвачен (${callAttribution.channelLabel})`
								: isCapturingLead
									? "Сохранение лида..."
									: `Захватить в лиды (${callAttribution.channelLabel})`}
						</span>
					</button>
				</div>
			)}

			{/* Unknown Caller: 5-second Quick Patient Creation */}
			{!isKnownPatient && (
				<div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-2">
					<div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
						<AlertCircle size={14} className="text-amber-500" />
						<span>Быстрое создание нового пациента</span>
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
							className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-500 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
							data-testid="drawer-quick-create-patient-btn"
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
	);
}
