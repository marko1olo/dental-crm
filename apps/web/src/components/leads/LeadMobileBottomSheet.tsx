/**
 * DENTE Dental CRM — Sovereign Native Apple HIG Bottom Sheet for Lead Details
 * Mandate 8b (<= 120 lines), Apple HIG Natural Thumb Zone First
 */

import type React from "react";
import { useEffect, useState } from "react";
import type { Lead, LeadStatus } from "../../store/leadsStore";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../telephony/telephonyAttribution";
import { normalizeMarketingChannel } from "./leadsFunnelTypes";
import {
	COLUMNS,
	getKanbanColumnForLeadStatus,
	getLeadSlaStatus,
} from "./leadsKanbanTypes";
import { LeadMobileSheetBottomBar } from "./mobile/LeadMobileSheetBottomBar";
import { LeadMobileSheetClinicalCard } from "./mobile/LeadMobileSheetClinicalCard";
import { LeadMobileSheetContactCard } from "./mobile/LeadMobileSheetContactCard";
import { LeadMobileSheetHeader } from "./mobile/LeadMobileSheetHeader";
import { LeadMobileSheetStagesAndNotes } from "./mobile/LeadMobileSheetStagesAndNotes";

export interface LeadMobileBottomSheetProps {
	lead: Lead | null;
	isOpen: boolean;
	onClose: () => void;
	onStatusChange: (
		e: React.MouseEvent,
		leadId: string,
		nextStatus: LeadStatus,
		options?: { reason?: string; dropReason?: string },
	) => void;
	onSchedule?: ((leadId: string) => void) | undefined;
	onQuickSchedule?: ((leadId: string) => Promise<void> | void) | undefined;
	onCreatePatient?: ((lead: Lead) => Promise<void> | void) | undefined;
	onUpdateNotes?:
		| ((leadId: string, notes: string) => Promise<void> | void)
		| undefined;
	onOpenPatientCard?: ((patientId: string) => void) | undefined;
	creatingPatientLeadId?: string | null | undefined;
}

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
		if (isOpen) document.body.style.overflow = "hidden";
		else document.body.style.overflow = "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	if (!isOpen || !lead) return null;

	const sla = getLeadSlaStatus(lead);
	const channelKey = lead.source
		? normalizeMarketingChannel(lead.source)
		: null;
	const channelBadge =
		channelKey && CHANNEL_BADGE_COLORS[channelKey]
			? CHANNEL_BADGE_COLORS[channelKey]
			: {
					bg: "var(--teal-soft)",
					color: "var(--teal-dark, var(--teal))",
					border: "var(--teal)",
				};
	const channelLabel =
		channelKey && CHANNEL_DISPLAY_NAMES[channelKey]
			? CHANNEL_DISPLAY_NAMES[channelKey]
			: lead.source || "Прямое обращение";
	const rawPhone = lead.phone ? lead.phone.replace(/[^\d+]/g, "") : "";
	const currentColumn =
		COLUMNS.find((c) => c.id === lead.status) ||
		getKanbanColumnForLeadStatus(lead.status);

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
		if (targetStatus === "trash")
			onStatusChange(e, lead.id, targetStatus, {
				dropReason: lead.dropReason || "Отказ / Неактуально",
			});
		else onStatusChange(e, lead.id, targetStatus);
	};

	return (
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
				<LeadMobileSheetHeader
					name={lead.name}
					stageColor={currentColumn?.color}
					onClose={onClose}
				/>
				<div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain">
					<LeadMobileSheetContactCard
						name={lead.name}
						phone={lead.phone}
						rawPhone={rawPhone}
						expectedRevenue={lead.expectedRevenue}
					/>
					<LeadMobileSheetClinicalCard
						lead={lead}
						sla={sla}
						channelBadge={channelBadge}
						channelLabel={channelLabel}
						onOpenPatientCard={onOpenPatientCard}
					/>
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
};
