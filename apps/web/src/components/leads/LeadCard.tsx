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
import {
	computeLeadCardHover,
	computeLeadCardStyle,
} from "./card/leadCardStyles";
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
	const targetPatientId =
		lead.patientId ||
		(lead as unknown as { patientId?: string | null }).patientId ||
		lead.existingPatient?.id;

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
		if (targetPatientId) handleOpenPatient(e, targetPatientId);
		else onEdit(lead);
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
			style={computeLeadCardStyle({ cardBg, borderColor, sla, isDragged })}
			whileHover={computeLeadCardHover(sla)}
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
