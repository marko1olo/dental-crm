import React, { useState } from "react";
import { Check, Copy, ExternalLink, MoreHorizontal, PhoneForwarded, Send, User, X } from "lucide-react";
import type { IncomingCallPayload, PatientUpcomingAppointmentSummary } from "../../../store/telephonyTypes";
import { showToast } from "../../GlobalToast";

interface IncomingCallDrawerHeaderProps {
	onClose: () => void;
	currentCall: IncomingCallPayload;
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	isCallAnswered: boolean;
	smsCopied: boolean;
	onSendWhatsApp: () => void;
	onCopySms: () => void;
	onToggleTransferPanel: () => void;
	onToggleOutcomePanel: () => void;
	onOpenFullPatientView: () => void;
}

export const IncomingCallDrawerHeader: React.FC<IncomingCallDrawerHeaderProps> = ({
	onClose,
	currentCall,
	upcomingAppointment,
	isCallAnswered,
	smsCopied,
	onSendWhatsApp,
	onCopySms,
	onToggleTransferPanel,
	onToggleOutcomePanel,
	onOpenFullPatientView,
}) => {
	const [showMoreMenu, setShowMoreMenu] = useState(false);

	return (
		<div className="shrink-0 p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-3 bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))]">
			<div className="flex items-center gap-2">
				<User className="text-[var(--teal)] shrink-0" size={18} />
				<div>
					<h2 className="text-sm font-bold text-[var(--ink,#0f172a)] leading-none">Карточка звонящего</h2>
					<div className="flex items-center gap-1.5 mt-1">
						<span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
							<Check size={10} /> Визит сохранён
						</span>
						<span className="text-[10px] text-[var(--muted,#64748b)]">(без сброса формы)</span>
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
									<button type="button" onClick={() => { onSendWhatsApp(); setShowMoreMenu(false); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 transition-colors cursor-pointer">
										<Send size={13} className="text-emerald-600" /><span>1-Click WhatsApp</span>
									</button>
									<button type="button" onClick={() => { onCopySms(); setShowMoreMenu(false); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
										{smsCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-[var(--muted,#64748b)]" />}
										<span>{smsCopied ? "SMS скопировано" : "Скопировать SMS"}</span>
									</button>
								</>
							)}
							<button type="button" onClick={() => { navigator.clipboard?.writeText(currentCall.phone); showToast("Номер телефона скопирован", "info"); setShowMoreMenu(false); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
								<Copy size={13} className="text-[var(--muted,#64748b)]" /><span>Копировать номер</span>
							</button>
							{isCallAnswered && (
								<button type="button" onClick={() => { onToggleTransferPanel(); setShowMoreMenu(false); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
									<PhoneForwarded size={13} className="text-[var(--teal)]" /><span>Перевод на врача</span>
								</button>
							)}
							<button type="button" onClick={() => { onToggleOutcomePanel(); setShowMoreMenu(false); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
								<Check size={13} className="text-[var(--teal)]" /><span>Фиксация исхода</span>
							</button>
							<div className="my-1 border-t border-[var(--line,#e2e8f0)]" />
							<button type="button" onClick={() => { onOpenFullPatientView(); setShowMoreMenu(false); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--teal)] font-medium flex items-center gap-2 transition-colors cursor-pointer">
								<ExternalLink size={13} /><span>Открыть в общем списке</span>
							</button>
						</div>
					)}
				</div>

				<button type="button" onClick={onClose} className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg border border-[var(--line-subtle,var(--line,#e2e8f0))] hover:border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-all cursor-pointer" title="Закрыть боковую шторку (Esc)" aria-label="Закрыть шторку">
					<X size={16} />
				</button>
			</div>
		</div>
	);
};
