/**
 * DENTE Dental CRM — Leads Kanban SSOT Lead Card Component
 * Mandate 8s (SSOT Componentization), Mandate 8n, Mandate 8b (<= 120 lines)
 */

import { motion } from "framer-motion";
import React from "react";
import { useAppStore } from "../../store/appStore";
import type { Lead } from "../../store/leadsStore";
import { usePatientStore } from "../../store/patientStore";
import { LeadCardActionButtons } from "./card/LeadCardActionButtons";
import { LeadCardBadges } from "./card/LeadCardBadges";
import { LeadCardContactBar } from "./card/LeadCardContactBar";
import { LeadCardHeader } from "./card/LeadCardHeader";
import { LeadCardStageSelect } from "./card/LeadCardStageSelect";
import type { LeadCardProps } from "./card/cardTypes";
import { formatLeadTimestamp } from "./card/leadCardFormatters";
import { getLeadSlaStatus } from "./leadsKanbanSla";

export type { LeadCardProps };

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
	onQuickSchedule,
	onOpenPatientCard,
}) => {
	const sla = getLeadSlaStatus(lead);
	const dropReasonMatch = lead.dropReason || null;
	const targetPatientId = lead.patientId || lead.existingPatient?.id;

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

	const handleCardClick = (e: React.MouseEvent) => {
		if (targetPatientId) {
			handleOpenPatient(e, targetPatientId);
		} else {
			onEdit(lead);
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
			onClick={handleCardClick}
			title={targetPatientId ? "Открыть карту пациента в 1 клик" : "Открыть детали обращения"}
			style={{
				background: cardBg,
				padding: "12px 14px",
				borderRadius: "10px",
				cursor: "grab",
				border: sla.isBreached
					? "1px solid var(--rust-soft, rgba(239, 68, 68, 0.4))"
					: `1px solid ${borderColor}`,
				borderLeft: sla.isBreached
					? "4px solid var(--rust, #ef4444)"
					: `1px solid ${borderColor}`,
				boxShadow: sla.isBreached
					? "0 2px 12px rgba(239, 68, 68, 0.12)"
					: "0 2px 8px rgba(0,0,0,0.05)",
				opacity: isDragged ? 0.5 : 1,
				transform: isDragged ? "scale(0.98)" : "scale(1)",
				transition: "box-shadow 0.2s, border 0.2s",
			}}
			whileHover={{
				y: -2,
				boxShadow: sla.isBreached
					? "0 8px 18px rgba(239, 68, 68, 0.18)"
					: "0 8px 16px rgba(0,0,0,0.08)",
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
			<LeadCardStageSelect
				lead={lead}
				borderColor={borderColor}
				onStatusChange={onStatusChange}
			/>
			<LeadCardActionButtons
				lead={lead}
				creatingPatientLeadId={creatingPatientLeadId}
				onSchedule={onSchedule}
				onQuickSchedule={onQuickSchedule}
				onCreatePatient={onCreatePatient}
				onOpenPatient={handleOpenPatient}
			/>
		</motion.div>
	);
};
