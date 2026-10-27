/**
 * Блок быстрых действий по кандидату из листа ожидания (Apple HIG эргономика).
 */
import { Check, Copy, MessageSquare, MoreVertical, Phone, Zap } from "lucide-react";
import React from "react";
import { sanitizePhoneForCall } from "./waitlistOfferMessage";
import type { WaitlistMatchRow } from "./waitlistTypes";

export type WaitlistCandidateActionsProps = {
	match: WaitlistMatchRow;
	isCalled: boolean;
	isContacted: boolean;
	isBooking: boolean;
	isMenuOpen: boolean;
	onToggleMenu: () => void;
	onTakeSlot: () => void;
	onSendWhatsApp: () => void;
	onCopySms: () => void;
	onToggleCalled: () => void;
};

export const WaitlistCandidateActions: React.FC<WaitlistCandidateActionsProps> = ({
	match,
	isCalled,
	isContacted,
	isBooking,
	isMenuOpen,
	onToggleMenu,
	onTakeSlot,
	onSendWhatsApp,
	onCopySms,
	onToggleCalled,
}) => {
	const phoneLink = sanitizePhoneForCall(match.phone);

	return (
		<div className="flex items-center gap-2 mt-2 flex-wrap shrink-0 relative" data-menu-container={match.entryId}>
			<button
				type="button"
				aria-busy={isBooking || undefined}
				onClick={onTakeSlot}
				className="h-9 sm:h-8 px-3 rounded-xl bg-[var(--teal,#0d9488)] hover:brightness-110 active:scale-[0.98] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs pointer-coarse:min-h-[44px]"
				data-testid={`waitlist-match-take-slot-${match.entryId}`}
				title={match.alreadyBooked ? "Перенести приём на это окно" : `Занять окно (${match.patientName})`}
			>
				<Zap size={14} className="fill-current text-amber-300 shrink-0" />
				<span>{isBooking ? "Записываем…" : match.alreadyBooked ? "Перенести в окно" : "Занять окно"}</span>
			</button>

			{match.phone && (
				<button
					type="button"
					onClick={onSendWhatsApp}
					className={`h-9 sm:h-8 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all border pointer-coarse:min-h-[44px] ${
						isContacted
							? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
							: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
					}`}
					title="Предложить окно через WhatsApp"
					data-testid={`waitlist-match-whatsapp-${match.entryId}`}
				>
					{isContacted ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
					<span>{isContacted ? "Предложено" : "WhatsApp"}</span>
				</button>
			)}

			<div className="relative">
				<button
					type="button"
					onClick={onToggleMenu}
					className="h-9 w-9 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-xl bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition-all shadow-xs pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px]"
					title="Другие действия"
					aria-label="Другие действия"
					aria-haspopup="true"
					aria-expanded={isMenuOpen}
					data-testid={`waitlist-match-more-${match.entryId}`}
				>
					<MoreVertical className="w-4 h-4 shrink-0" />
				</button>

				{isMenuOpen && (
					<div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 min-w-[200px] p-1.5 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xl z-30 flex flex-col gap-1">
						{phoneLink && (
							<a
								className="w-full px-3 py-2 min-h-[40px] pointer-coarse:min-h-[44px] rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--teal,#0d9488)] transition-all text-left"
								href={`tel:${phoneLink}`}
								onClick={onToggleMenu}
								data-testid={`waitlist-match-call-${match.entryId}`}
							>
								<Phone className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
								<span>Позвонить</span>
							</a>
						)}
						<button
							type="button"
							className="w-full px-3 py-2 min-h-[40px] pointer-coarse:min-h-[44px] rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-all text-left"
							data-testid={`waitlist-match-mark-called-${match.entryId}`}
							onClick={() => { onToggleCalled(); onToggleMenu(); }}
						>
							<Check className="w-4 h-4 text-emerald-500 shrink-0" />
							<span>{isCalled ? "Отметить повторно" : "Отметить звонок"}</span>
						</button>
						<button
							type="button"
							onClick={() => { onCopySms(); onToggleMenu(); }}
							className="w-full px-3 py-2 min-h-[40px] pointer-coarse:min-h-[44px] rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-all text-left"
						>
							<Copy className="w-4 h-4 text-[var(--muted)] shrink-0" />
							<span>Скопировать текст</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
