import { Check, MoreHorizontal, User, X } from "lucide-react";
import React, { useState } from "react";
import type { IncomingCallPayload, PatientUpcomingAppointmentSummary } from "../../store/telephonyTypes";
import type { CallAttribution } from "./telephonyAttribution";
import { TelephonyDrawerMoreMenu } from "./drawerModules/TelephonyDrawerMoreMenu";

export * from "./drawerModules/TelephonyDrawerMoreMenu";

export interface TelephonyDrawerHeaderProps {
	onClose: () => void;
	isKnownPatient: boolean;
	callAttribution: CallAttribution | null;
	currentCall: IncomingCallPayload | null;
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

export function TelephonyDrawerHeader({
	onClose, isKnownPatient, callAttribution, currentCall, isCapturingLead,
	onCaptureLead, upcomingAppointment, onSendWhatsApp, onCopySms, smsCopied,
	isCallAnswered, onToggleTransferPanel, onToggleOutcomePanel, onOpenFullPatientView,
}: TelephonyDrawerHeaderProps) {
	const [showMoreMenu, setShowMoreMenu] = useState(false);

	return (
		<div className="shrink-0 p-4 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)]">
			<div className="flex items-center gap-2">
				<User className="text-[var(--teal)] shrink-0" size={18} />
				<div>
					<h2 className="text-sm font-bold text-[var(--ink)] leading-none">Карточка звонящего</h2>
					<div className="flex items-center gap-1.5 mt-1">
						<span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
							<Check size={10} />Визит сохранён
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
						<TelephonyDrawerMoreMenu
							isKnownPatient={isKnownPatient}
							callAttribution={callAttribution}
							currentCall={currentCall}
							isCapturingLead={isCapturingLead}
							onCaptureLead={onCaptureLead}
							upcomingAppointment={upcomingAppointment}
							onSendWhatsApp={onSendWhatsApp}
							onCopySms={onCopySms}
							smsCopied={smsCopied}
							isCallAnswered={isCallAnswered}
							onToggleTransferPanel={onToggleTransferPanel}
							onToggleOutcomePanel={onToggleOutcomePanel}
							onOpenFullPatientView={onOpenFullPatientView}
							onClose={() => setShowMoreMenu(false)}
						/>
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
