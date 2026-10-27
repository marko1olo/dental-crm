/**
 * Мобильная карточка кандидата из листа ожидания (Apple HIG Grouped List).
 */
import { Check, Clock, PhoneCall, UserCheck } from "lucide-react";
import React from "react";
import { WaitlistCandidateActions } from "./WaitlistCandidateActions";
import { PRIORITY_LABELS, type WaitlistMatchRow } from "./waitlistTypes";

export type WaitlistCandidateMobileCardProps = {
	match: WaitlistMatchRow;
	index: number;
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

export const WaitlistCandidateMobileCard: React.FC<WaitlistCandidateMobileCardProps> = ({
	match,
	index,
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
	const priorityLabel = PRIORITY_LABELS[match.priorityLevel] ?? match.priorityLevel;

	return (
		<div
			data-testid={`waitlist-match-card-mobile-${match.entryId}`}
			className="rounded-2xl p-3.5 bg-[var(--paper)] border border-[var(--line)] shadow-xs flex flex-col gap-2.5 w-full min-w-0 max-w-full"
		>
			<div className="flex items-start justify-between gap-2 min-w-0">
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-xs font-semibold text-[var(--muted)] shrink-0">{index + 1}.</span>
					<h4 className="font-semibold text-sm text-[var(--ink)] truncate min-w-0 m-0" title={match.patientName}>
						{match.patientName}
					</h4>
				</div>
				<span
					className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
						match.priorityLevel === "urgent" || match.priorityLevel === "high"
							? "bg-[var(--bad-bg)] text-[var(--bad-fg)] border-[var(--bad-fg)]"
							: match.priorityLevel === "treatment_plan"
								? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30"
								: match.priorityLevel === "normal" || match.priorityLevel === "medium"
									? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
									: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
					}`}
				>
					{priorityLabel}
				</span>
			</div>

			<div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted)] bg-[var(--paper-soft)] p-2.5 rounded-xl border border-[var(--line-subtle,var(--line))]">
				<div className="flex items-center gap-1.5 min-w-0">
					<PhoneCall className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
					<span className="truncate font-medium text-[var(--ink)]">{match.phone || "Без телефона"}</span>
				</div>
				<div className="flex items-center gap-1.5 min-w-0 justify-end">
					<Clock className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
					<span className="truncate">{match.waitingDays > 0 ? `${match.waitingDays} дн. в очереди` : "Сегодня в очереди"}</span>
				</div>
				{match.sameDoctor && (
					<div className="col-span-2 flex items-center gap-1.5 min-w-0 text-emerald-600 dark:text-emerald-400 font-medium">
						<UserCheck className="w-3.5 h-3.5 shrink-0" />
						<span className="truncate">Записан к этому врачу</span>
					</div>
				)}
			</div>

			{match.reason && (
				<p className="text-xs text-[var(--muted)] line-clamp-2 m-0" title={match.reason}>
					{match.reason}
				</p>
			)}

			<div className="pt-1 border-t border-[var(--line-subtle,var(--line))]">
				<WaitlistCandidateActions
					match={match}
					isCalled={isCalled}
					isContacted={isContacted}
					isBooking={isBooking}
					isMenuOpen={isMenuOpen}
					onToggleMenu={onToggleMenu}
					onTakeSlot={onTakeSlot}
					onSendWhatsApp={onSendWhatsApp}
					onCopySms={onCopySms}
					onToggleCalled={onToggleCalled}
				/>
			</div>
		</div>
	);
};
