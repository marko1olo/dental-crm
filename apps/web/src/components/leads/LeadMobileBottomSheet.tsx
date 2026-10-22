/**
 * DENTE Dental CRM — Sovereign Native Apple HIG Bottom Sheet for Lead Details
 * Mandate 8b (<= 120 lines), Apple HIG Natural Thumb Zone First
 */

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { LeadStatus } from "../../store/leadsStore";
import { LeadMobileSheetBottomBar } from "./mobile/LeadMobileSheetBottomBar";
import { LeadMobileSheetClinicalCard } from "./mobile/LeadMobileSheetClinicalCard";
import { LeadMobileSheetContactCard } from "./mobile/LeadMobileSheetContactCard";
import { LeadMobileSheetHeader } from "./mobile/LeadMobileSheetHeader";
import { LeadMobileSheetStagesAndNotes } from "./mobile/LeadMobileSheetStagesAndNotes";
import type { LeadMobileBottomSheetProps } from "./mobile/mobileSheetTypes";
import { useMobileSheetLeadData } from "./mobile/useMobileSheetLeadData";

export type { LeadMobileBottomSheetProps };

export const LeadMobileBottomSheet = ({
	lead,
	isOpen,
	onClose,
	onStatusChange,
	onSchedule,
	onQuickSchedule,
	onCreatePatient,
	onUpdateNotes,
	onOpenPatientCard,
	creatingPatientLeadId,
}: LeadMobileBottomSheetProps) => {
	const [notesText, setNotesText] = useState("");
	const [isSavingNotes, setIsSavingNotes] = useState(false);

	useEffect(() => {
		if (lead) setNotesText(lead.notes || "");
	}, [lead]);

	useEffect(() => {
		document.body.style.overflow = isOpen ? "hidden" : "";
		return () => { document.body.style.overflow = ""; };
	}, [isOpen]);

	if (!isOpen || !lead) return null;

	const { sla, channelBadge, channelLabel, rawPhone, currentColumn } = useMobileSheetLeadData(lead);

	const handleSaveNotes = async () => {
		if (!onUpdateNotes || notesText === (lead.notes || "")) return;
		setIsSavingNotes(true);
		try {
			await onUpdateNotes(lead.id, notesText);
		} finally {
			setIsSavingNotes(false);
		}
	};

	const handleStageClick = (e: React.MouseEvent, targetStatus: LeadStatus) => {
		if (targetStatus === lead.status) return;
		const dropReason = targetStatus === "trash" ? (lead.dropReason || "Отказ / Неактуально") : undefined;
		onStatusChange(e, lead.id, targetStatus, dropReason ? { dropReason } : undefined);
	};

	const sheet = (
		<div
			className="fixed inset-0 z-[10050] flex flex-col justify-end"
			role="dialog"
			aria-modal="true"
			aria-labelledby="lead-bottom-sheet-title"
			data-testid="lead-mobile-bottom-sheet"
		>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
				onClick={onClose}
				aria-hidden="true"
				data-testid="lead-bottom-sheet-backdrop"
			/>
			<div className="relative z-10 w-full max-h-[90dvh] flex flex-col rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl text-[var(--ink)] overflow-hidden">
				<LeadMobileSheetHeader name={lead.name} stageColor={currentColumn?.color} onClose={onClose} />
				<div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain">
					<LeadMobileSheetContactCard name={lead.name} phone={lead.phone} rawPhone={rawPhone} expectedRevenue={lead.expectedRevenue} />
					<LeadMobileSheetClinicalCard lead={lead} sla={sla} channelBadge={channelBadge} channelLabel={channelLabel} onOpenPatientCard={onOpenPatientCard} />
					<LeadMobileSheetStagesAndNotes
						lead={lead}
						notesText={notesText}
						setNotesText={setNotesText}
						isSavingNotes={isSavingNotes}
						onSaveNotes={handleSaveNotes}
						onStageClick={handleStageClick}
					/>
				</div>
				<LeadMobileSheetBottomBar
					lead={lead}
					onClose={onClose}
					onSchedule={onSchedule}
					onQuickSchedule={onQuickSchedule}
					onCreatePatient={onCreatePatient}
					creatingPatientLeadId={creatingPatientLeadId}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(sheet, document.body) : sheet;
};
