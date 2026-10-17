/**
 * DENTE Dental CRM — Leads Kanban SSOT Lead Card Component
 * Mandate 8s (SSOT Componentization), Mandate 8n, Mandate 8b (<= 120 lines)
 */

import React from "react";
import { motion } from "framer-motion";
import type { Lead } from "../../store/leadsStore";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { getLeadSlaStatus } from "./leadsKanbanSla";
import { LeadCardHeader } from "./card/LeadCardHeader";
import { LeadCardBadges } from "./card/LeadCardBadges";
import { LeadCardContactBar } from "./card/LeadCardContactBar";
import { LeadCardStageSelect } from "./card/LeadCardStageSelect";
import { LeadCardActionButtons } from "./card/LeadCardActionButtons";
import { formatLeadTimestamp } from "./card/leadCardFormatters";

export interface LeadCardProps {
	lead: Lead;
	isDragged: boolean;
	creatingPatientLeadId: string | null;
	borderColor: string;
	cardBg: string;
	onDragStart: (e: React.DragEvent, id: string) => void;
	onEdit: (lead: Lead) => void;
	onStatusChange: (
		e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>,
		leadId: string,
		nextStatus: Lead["status"],
		options?: { reason?: string; dropReason?: string },
	) => void;
	onCreatePatient: (lead: Lead) => Promise<void> | void;
	onSchedule: (leadId: string) => void;
	onQuickSchedule?: (leadId: string) => Promise<void> | void;
	onOpenPatientCard?: (patientId: string) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
	lead,
	isDragged,
	creatingPatientLeadId,
	borderColor,
	cardBg,
	onDragStart,
	onEdit,
	onStatusChange,
	onCreatePatient,
	onSchedule,
	onOpenPatientCard,
}) => {
	const sla = getLeadSlaStatus(lead);
	const dropReasonMatch =
		lead.dropReason || (lead.notes ? lead.notes.match(/\[Причина срыва\]:\s*([^\n\r]+)/)?.[1] : null);

	const handleOpenPatient = (e: React.MouseEvent, patientId: string) => {
		e.stopPropagation();
		if (onOpenPatientCard) {
			onOpenPatientCard(patientId);
			return;
		}
		try {
			usePatientStore.getState().setSelectedPatientId(patientId);
			useAppStore.getState().setCurrentView("patients");
			if (typeof window !== "undefined") window.location.hash = "patients";
		} catch {
			// fallback
		}
	};

	return (
		<motion.div
			className="lead-kanban-card"
			data-testid={`lead-card-${lead.id}`}
			layout
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.95 }}
			draggable
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			onDragStart={(e: any) => onDragStart(e, lead.id)}
			onClick={() => onEdit(lead)}
			style={{
				background: cardBg,
				padding: "12px 14px",
				borderRadius: "10px",
				cursor: "grab",
				border: sla.isBreached ? "1px solid var(--rust-soft, rgba(239, 68, 68, 0.4))" : `1px solid ${borderColor}`,
				borderLeft: sla.isBreached ? "4px solid var(--rust, #ef4444)" : `1px solid ${borderColor}`,
				boxShadow: sla.isBreached ? "0 2px 12px rgba(239, 68, 68, 0.12)" : "0 2px 8px rgba(0,0,0,0.05)",
				opacity: isDragged ? 0.5 : 1,
				transform: isDragged ? "scale(0.98)" : "scale(1)",
				transition: "box-shadow 0.2s, border 0.2s",
			}}
			whileHover={{
				y: -2,
				boxShadow: sla.isBreached ? "0 8px 18px rgba(239, 68, 68, 0.18)" : "0 8px 16px rgba(0,0,0,0.08)",
			}}
		>
			<LeadCardHeader lead={lead} onEdit={onEdit} />
			<LeadCardBadges
				lead={lead}
				sla={sla}
				dropReasonMatch={dropReasonMatch ?? null}
				onOpenPatient={handleOpenPatient}
				formatTimestamp={formatLeadTimestamp}
			/>
			<LeadCardContactBar lead={lead} />
			<LeadCardStageSelect lead={lead} borderColor={borderColor} onStatusChange={onStatusChange} />
			<LeadCardActionButtons
				lead={lead}
				creatingPatientLeadId={creatingPatientLeadId}
				onSchedule={onSchedule}
				onCreatePatient={onCreatePatient}
				onOpenPatient={handleOpenPatient}
			/>
		</motion.div>
	);
};
