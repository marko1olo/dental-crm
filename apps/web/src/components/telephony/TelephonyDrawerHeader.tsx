import {
	Check,
	Copy,
	ExternalLink,
	MoreHorizontal,
	PhoneForwarded,
	Send,
	User,
	UserPlus,
	X,
} from "lucide-react";
import React, { useState } from "react";
import type {
	IncomingCallPayload,
	PatientUpcomingAppointmentSummary,
} from "../../store/telephonyTypes";
import type { CallAttribution } from "./telephonyAttribution";
import { showToast } from "../GlobalToast";

export interface TelephonyDrawerHeaderProps {
	onClose: () => void;
	isKnownPatient: boolean;
	callAttribution: CallAttribution | null;
	currentCall: IncomingCallPayload;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	onSendWhatsApp: () => void;
	onCopySms: () => void;
	smsCopied: boolean;
	isCallAnswered: boolean;
	onToggleTransferPanel: () => void;
	onToggleOutcomePanel: () => void;
	onOpenFullPatientView: () => void;
}

/**
 * TelephonyDrawerHeader: Drawer title, doctor sterile-zone confirmation pill,
 * and consolidated more menu dropdown (WhatsApp, SMS, SIP transfer, outcome, full view).
 * Mandates 8b (<=800 lines), 8d (zero emojis).
 */
export function TelephonyDrawerHeader({
	onClose,
	isKnownPatient,
	callAttribution,
	currentCall,
	isCapturingLead,
	onCaptureLead,
	upcomingAppointment,
	onSendWhatsApp,
	onCopySms,
	smsCopied,
	isCallAnswered,
	onToggleTransferPanel,
	onToggleOutcomePanel,
	onOpenFullPatientView,
}: TelephonyDrawerHeaderProps) {
	const [showMoreMenu, setShowMoreMenu] = useState(false);

	return (
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
						<span className="text-[10px] text-[var(--muted)]">(без сброса формы)</span>
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
										onCaptureLead();
										setShowMoreMenu(false);
									}}
									disabled={isCapturingLead || currentCall.isLeadCaptured}
									className="w-full text-left px-2.5 py-2 rounded-lg bg-[var(--teal-surface)] hover:opacity-90 text-[var(--teal)] font-bold flex items-center gap-2 transition-colors cursor-pointer border border-[var(--teal-soft)] mb-1"
									data-testid="drawer-more-action-capture-lead"
									title={`1-Клик захват в лиды с авторазметкой канала (${callAttribution.channelLabel})`}
								>
									{currentCall.isLeadCaptured ? (
										<Check size={14} className="text-emerald-500 shrink-0" />
									) : (
										<UserPlus size={14} className="text-[var(--teal)] shrink-0" />
									)}
									<span className="truncate">
										{currentCall.isLeadCaptured
											? "Лид захвачен"
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
										onToggleTransferPanel();
										setShowMoreMenu(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
								>
									<PhoneForwarded size={13} className="text-[var(--teal)]" />
									<span>Перевод на врача</span>
								</button>
							)}
							<button
								type="button"
								onClick={() => {
									onToggleOutcomePanel();
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
									onOpenFullPatientView();
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
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer"
					title="Закрыть боковую шторку (Esc)"
					aria-label="Закрыть шторку"
				>
					<X size={20} />
				</button>
			</div>
		</div>
	);
}
