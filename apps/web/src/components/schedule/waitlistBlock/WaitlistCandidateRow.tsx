/**
 * Десктопная строка кандидата из листа ожидания.
 */
import { Check } from "lucide-react";
import React from "react";
import { WaitlistCandidateActions } from "./WaitlistCandidateActions";
import { PRIORITY_LABELS, type WaitlistMatchRow } from "./waitlistTypes";

export type WaitlistCandidateRowProps = {
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

export const WaitlistCandidateRow: React.FC<WaitlistCandidateRowProps> = ({
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
		<li
			data-testid={`waitlist-match-row-${match.entryId}`}
			className="rounded-xl p-3 bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2 min-w-0"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-xs font-bold text-[var(--muted)] shrink-0">{index + 1}.</span>
					<span className="font-bold text-sm text-[var(--ink)] truncate min-w-0 max-w-[240px] sm:max-w-[320px]" title={match.patientName}>
						{match.patientName}
					</span>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					{isCalled && (
						<span
							className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1"
							data-testid={`waitlist-match-called-${match.entryId}`}
						>
							<Check className="w-3 h-3 text-emerald-500 shrink-0" />
							<span>Позвонили</span>
						</span>
					)}
					<span
						className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
							match.priorityLevel === "urgent" || match.priorityLevel === "high"
								? "bg-[var(--bad-bg)] text-[var(--bad-fg)] border-[var(--bad-fg)]"
								: match.priorityLevel === "treatment_plan"
									? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30"
									: match.priorityLevel === "normal" || match.priorityLevel === "medium"
										? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
										: "bg-[var(--paper-strong)] text-[var(--muted)] border-[var(--line)]"
						}`}
					>
						{priorityLabel}
					</span>
				</div>
			</div>

			<div className="text-xs text-[var(--muted)] flex flex-wrap items-center gap-x-2.5 gap-y-1">
				<span className="font-medium text-[var(--ink-2,var(--ink))] shrink-0">{match.phone ?? "телефон не указан"}</span>
				{match.sameDoctor && <span className="shrink-0">· тот же врач</span>}
				{match.timeFits && <span className="shrink-0">· время подходит</span>}
				{match.alreadyBooked && <span className="shrink-0 font-semibold text-amber-600 dark:text-amber-400">· уже записан</span>}
				<span className="shrink-0">{match.waitingDays > 0 ? `· ждёт ${match.waitingDays} дн.` : "· сегодня в очереди"}</span>
			</div>

			{match.reason && (
				<p className="text-xs text-[var(--muted)] truncate min-w-0 m-0" title={match.reason}>
					{match.reason}
				</p>
			)}

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
		</li>
	);
};
