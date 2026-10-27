/**
 * Рендер списка кандидатов листа ожидания с разделением десктоп / мобайл.
 */
import React from "react";
import { WaitlistCandidateMobileCard } from "./WaitlistCandidateMobileCard";
import { WaitlistCandidateRow } from "./WaitlistCandidateRow";
import type { WaitlistMatchReport, WaitlistMatchRow } from "./waitlistTypes";

export type WaitlistCandidatesListProps = {
	report: WaitlistMatchReport;
	called: Set<string>;
	contactedPatients: Set<string>;
	bookingId: string | null;
	activeMenuEntryId: string | null;
	setActiveMenuEntryId: (id: string | null) => void;
	onTakeSlot: (match: WaitlistMatchRow) => void;
	onSendWhatsApp: (match: WaitlistMatchRow) => void;
	onCopySms: (match: WaitlistMatchRow) => void;
	onToggleCalled: (patientId: string) => void;
};

export const WaitlistCandidatesList: React.FC<WaitlistCandidatesListProps> = ({
	report,
	called,
	contactedPatients,
	bookingId,
	activeMenuEntryId,
	setActiveMenuEntryId,
	onTakeSlot,
	onSendWhatsApp,
	onCopySms,
	onToggleCalled,
}) => {
	const matches = report.matches ?? [];

	return (
		<div className="flex flex-col gap-2.5 min-w-0 w-full">
			{report.slot?.from && (
				<div className="ops-note text-xs px-2.5 py-1.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle,var(--line))] text-[var(--muted)]">
					Свободное окно {report.slot.from}–{report.slot.to}
					{report.slot.doctorName ? ` · ${report.slot.doctorName}` : ""}
				</div>
			)}

			<ul data-testid="waitlist-matches-list" className="list-none m-0 p-0 flex flex-col gap-2.5 w-full min-w-0">
				{matches.map((match, index) => {
					const isCalled = called.has(match.patientId);
					const isContacted = contactedPatients.has(match.patientId);
					const isBooking = bookingId === match.entryId;
					const isMenuOpen = activeMenuEntryId === match.entryId;

					return (
						<React.Fragment key={match.entryId}>
							{/* Десктопная строка */}
							<div className="hidden sm:block">
								<WaitlistCandidateRow
									match={match}
									index={index}
									isCalled={isCalled}
									isContacted={isContacted}
									isBooking={isBooking}
									isMenuOpen={isMenuOpen}
									onToggleMenu={() => setActiveMenuEntryId(isMenuOpen ? null : match.entryId)}
									onTakeSlot={() => onTakeSlot(match)}
									onSendWhatsApp={() => onSendWhatsApp(match)}
									onCopySms={() => onCopySms(match)}
									onToggleCalled={() => onToggleCalled(match.patientId)}
								/>
							</div>

							{/* Мобильная карточка Apple HIG Grouped List */}
							<div className="block sm:hidden">
								<WaitlistCandidateMobileCard
									match={match}
									index={index}
									isCalled={isCalled}
									isContacted={isContacted}
									isBooking={isBooking}
									isMenuOpen={isMenuOpen}
									onToggleMenu={() => setActiveMenuEntryId(isMenuOpen ? null : match.entryId)}
									onTakeSlot={() => onTakeSlot(match)}
									onSendWhatsApp={() => onSendWhatsApp(match)}
									onCopySms={() => onCopySms(match)}
									onToggleCalled={() => onToggleCalled(match.patientId)}
								/>
							</div>
						</React.Fragment>
					);
				})}
			</ul>
		</div>
	);
};
