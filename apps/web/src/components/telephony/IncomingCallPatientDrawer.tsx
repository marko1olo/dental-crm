import {
	AlertCircle,
	CalendarCheck,
	Check,
	ChevronDown,
	Copy,
	ExternalLink,
	MoreHorizontal,
	PhoneForwarded,
	Send,
	User,
	UserCheck,
	X,
	Zap,
} from "lucide-react";
import React, { useState } from "react";
import type {
	CallOutcome,
	IncomingCallPayload,
	PatientFinancialSummary,
	PatientSomaticAlert,
	PatientUpcomingAppointmentSummary,
	PatientLastVisitSummary,
	TelephonyPatientCategory,
} from "../../store/telephonyTypes";
import { showToast } from "../GlobalToast";
import {
	IncomingCallQuickBooking,
	type QuickSlotOption,
	type QuickSlotType,
} from "./IncomingCallQuickBooking";
import { IncomingCallerCard } from "./IncomingCallerCard";
import { IncomingCallPastHistory } from "./IncomingCallPastHistory";
import type { CallAttribution } from "./telephonyAttribution";

export interface IncomingCallPatientDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	currentCall: IncomingCallPayload;
	callerName: string;
	formattedPhone: string;
	initials: string;
	avatarColors: { bg: string; text: string };
	isKnownPatient: boolean;
	patientCategory?: TelephonyPatientCategory | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: patient like compatibility
	resolvedPatient: any | null;
	financialSummary: PatientFinancialSummary;
	somaticAlerts: PatientSomaticAlert[];
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	lastVisitSummary: PatientLastVisitSummary | null;
	callAttribution: CallAttribution | null;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	onSendWhatsApp: () => void;
	onCopySms: () => void;
	smsCopied: boolean;
	showQuickBooking: boolean;
	onToggleQuickBooking: () => void;
	onQuickBook: (slot: QuickSlotType) => void;
	quickSlots?: readonly QuickSlotOption[];
	onOpenFullPatientView: () => void;
	isCallAnswered: boolean;
	showTransferPanel: boolean;
	onToggleTransferPanel: () => void;
	transferType: "blind" | "attended";
	onSelectTransferType: (type: "blind" | "attended") => void;
	onStartTransfer: (ext: string, type: "blind" | "attended") => void;
	showOutcomePanel: boolean;
	onToggleOutcomePanel: () => void;
	onRecordOutcome: (outcome: CallOutcome) => void;
	newPatientNameInput: string;
	onChangeNewPatientNameInput: (val: string) => void;
	isCreatingPatient: boolean;
	onQuickCreatePatient: () => void;
}

export function IncomingCallPatientDrawer({
	isOpen,
	onClose,
	currentCall,
	callerName,
	formattedPhone,
	initials,
	avatarColors,
	isKnownPatient,
	patientCategory,
	resolvedPatient,
	financialSummary,
	somaticAlerts,
	upcomingAppointment,
	lastVisitSummary,
	callAttribution,
	isCapturingLead,
	onCaptureLead,
	onSendWhatsApp,
	onCopySms,
	smsCopied,
	showQuickBooking,
	onToggleQuickBooking,
	onQuickBook,
	quickSlots,
	onOpenFullPatientView,
	isCallAnswered,
	showTransferPanel,
	onToggleTransferPanel,
	transferType,
	onSelectTransferType,
	onStartTransfer,
	showOutcomePanel,
	onToggleOutcomePanel,
	onRecordOutcome,
	newPatientNameInput,
	onChangeNewPatientNameInput,
	isCreatingPatient,
	onQuickCreatePatient,
}: IncomingCallPatientDrawerProps) {
	const [showMoreMenu, setShowMoreMenu] = useState(false);

	if (!isOpen) return null;

	return (
		<section
			className="dnt-telephony-patient-drawer fixed right-0 top-0 bottom-0 w-full sm:w-[480px] max-w-full z-[9995] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border-l border-[var(--line-strong,var(--line,#e2e8f0))] shadow-2xl flex flex-col pointer-events-auto animate-slide-in-right overflow-hidden"
			style={{ zIndex: 9995 }}
			aria-label="Боковая шторка пациента"
			data-testid="telephony-patient-side-drawer"
		>
			{/* Drawer Header */}
			<div className="shrink-0 p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-3 bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))]">
				<div className="flex items-center gap-2">
					<User className="text-[var(--teal)] shrink-0" size={18} />
					<div>
						<h2 className="text-sm font-bold text-[var(--ink,#0f172a)] leading-none">
							Карточка звонящего
						</h2>
						<div className="flex items-center gap-1.5 mt-1">
							<span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
								<Check size={10} />
								Визит сохранён
							</span>
							<span className="text-[10px] text-[var(--muted,#64748b)]">
								(без сброса формы)
							</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-1.5">
					<div className="relative" data-drawer-more-container="true">
						<button
							type="button"
							onClick={() => setShowMoreMenu((prev) => !prev)}
							className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg border border-[var(--line-subtle,var(--line,#e2e8f0))] hover:border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-all cursor-pointer"
							title="Дополнительные действия (WhatsApp, SMS, перевод, исходы)"
							aria-label="Дополнительные действия"
							data-testid="drawer-more-menu-btn"
						>
							<MoreHorizontal size={16} />
						</button>
						{showMoreMenu && (
							<div className="absolute right-0 top-full mt-1 w-60 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line-strong,var(--line,#e2e8f0))] shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 space-y-0.5">
								{upcomingAppointment && (
									<>
										<button
											type="button"
											onClick={() => {
												onSendWhatsApp();
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
												onCopySms();
												setShowMoreMenu(false);
											}}
											className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
										>
											{smsCopied ? (
												<Check size={13} className="text-emerald-500" />
											) : (
												<Copy
													size={13}
													className="text-[var(--muted,#64748b)]"
												/>
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
									className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
								>
									<Copy size={13} className="text-[var(--muted,#64748b)]" />
									<span>Копировать номер</span>
								</button>
								{isCallAnswered && (
									<button
										type="button"
										onClick={() => {
											onToggleTransferPanel();
											setShowMoreMenu(false);
										}}
										className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
									>
										<PhoneForwarded
											size={13}
											className="text-[var(--teal)]"
										/>
										<span>Перевод на врача</span>
									</button>
								)}
								<button
									type="button"
									onClick={() => {
										onToggleOutcomePanel();
										setShowMoreMenu(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
								>
									<Check size={13} className="text-[var(--teal)]" />
									<span>Фиксация исхода</span>
								</button>
								<div className="my-1 border-t border-[var(--line,#e2e8f0)]" />
								<button
									type="button"
									onClick={() => {
										onOpenFullPatientView();
										setShowMoreMenu(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--teal)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
								>
									<ExternalLink size={13} />
									<span>Открыть в общем списке</span>
								</button>
							</div>
						)}
					</div>

					<button
						type="button"
						onClick={onClose}
						className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg border border-[var(--line-subtle,var(--line,#e2e8f0))] hover:border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-all cursor-pointer"
						title="Закрыть боковую шторку (Esc)"
						aria-label="Закрыть шторку"
					>
						<X size={16} />
					</button>
				</div>
			</div>

			{/* Drawer Scrollable Content */}
			<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
				{/* 2 Primary Direct Action Buttons (Miller & Hick Law Invariant) */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onToggleQuickBooking}
						className="flex-1 h-9 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white text-[13px] font-semibold transition-all inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
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
						onClick={onOpenFullPatientView}
						className="flex-1 h-9 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] text-[13px] font-semibold transition-all inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
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

				{/* Emergency Acute Pain (Cito) Fast Intake Action */}
				{somaticAlerts.some((a) => a.category === "pain") && (
					<button
						type="button"
						onClick={() => onQuickBook("today_urgent")}
						className="w-full min-h-[38px] px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-xs active:scale-95"
						style={{ backgroundColor: "#e11d48", color: "#ffffff" }}
						data-testid="drawer-action-cito"
						title="Внеочередная экстренная запись пациента с острой болью"
					>
						<div className="flex items-center gap-1.5">
							<Zap size={14} className="text-amber-300" />
							<span>Острая боль! Внеочередной приём (Cito)</span>
						</div>
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: "#be123c" }}>
							{quickSlots?.[0]?.time || "Срочно"}
						</span>
					</button>
				)}

				{/* Collapsible 1-Click Quick Booking Slots */}
				{showQuickBooking && (
					<IncomingCallQuickBooking
						onSelectSlot={onQuickBook}
						slots={quickSlots}
					/>
				)}

				{/* Caller Card: Detailed Information */}
				<IncomingCallerCard
					callerName={callerName}
					formattedPhone={formattedPhone}
					rawPhone={currentCall.phone}
					initials={initials}
					avatarColors={avatarColors}
					isKnownPatient={isKnownPatient}
					patientCategory={patientCategory}
					birthDate={resolvedPatient?.birthDate}
					financialSummary={financialSummary}
					somaticAlerts={somaticAlerts}
					upcomingAppointment={upcomingAppointment}
					lastVisitSummary={lastVisitSummary}
					callAttribution={callAttribution}
					isLeadCaptured={currentCall.isLeadCaptured}
					isCapturingLead={isCapturingLead}
					onCopyPhone={() => {
						navigator.clipboard?.writeText(currentCall.phone);
						showToast("Номер телефона скопирован", "info");
					}}
					onSendWhatsApp={onSendWhatsApp}
					onCopySms={onCopySms}
					onCaptureLead={onCaptureLead}
					smsCopied={smsCopied}
					compact={false}
				/>

				{/* Call Past History, SIP Transfer and Outcomes */}
				<IncomingCallPastHistory
					isCallAnswered={isCallAnswered}
					showTransferPanel={showTransferPanel}
					onToggleTransferPanel={onToggleTransferPanel}
					transferType={transferType}
					onSelectTransferType={onSelectTransferType}
					onStartTransfer={onStartTransfer}
					showOutcomePanel={showOutcomePanel}
					onToggleOutcomePanel={onToggleOutcomePanel}
					onRecordOutcome={onRecordOutcome}
					recordingUrl={currentCall.recordingUrl}
					durationSeconds={currentCall.durationSeconds || 0}
					seed={currentCall.callId || currentCall.phone}
					transcript={currentCall.transcript}
				/>

				{/* Unknown Caller: Inline quick patient registration without navigating away */}
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
								onChange={(e) => onChangeNewPatientNameInput(e.target.value)}
								placeholder="ФИО пациента (по умолчанию: Пациент + телефон)"
								className="w-full h-8 min-h-[32px] px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-xs font-medium text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
								data-testid="popup-drawer-new-patient-name-input"
							/>
							<button
								type="button"
								onClick={onQuickCreatePatient}
								disabled={isCreatingPatient}
								className="w-full h-9 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[var(--teal)] text-white text-[13px] font-semibold hover:opacity-90 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
								data-testid="popup-drawer-quick-create-patient-btn"
								title="Создать первичную карту пациента за 5 секунд (без обязательного паспорта и СНИЛС)"
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
			<div className="shrink-0 p-3.5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] flex items-center justify-between gap-2">
				<button
					type="button"
					onClick={onClose}
					className="h-8 min-h-[32px] px-3.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#e2e8f0)] border border-[var(--line,#e2e8f0)] text-xs font-semibold text-[var(--ink,#0f172a)] transition-all cursor-pointer inline-flex items-center justify-center"
				>
					Закрыть шторку
				</button>

				<button
					type="button"
					onClick={onOpenFullPatientView}
					className="h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold text-[var(--teal)] hover:bg-[var(--teal-soft)] border border-transparent hover:border-[var(--teal)] inline-flex items-center gap-1 cursor-pointer transition-all"
					title="Перейти в полноэкранный раздел Пациенты"
				>
					<span>Открыть в общем списке</span>
					<ExternalLink size={12} />
				</button>
			</div>
		</section>
	);
}
