/**
 * DENTE Dental CRM — Leads Mobile Cards Section & Empty State
 * Mandate 8b (<= 120 lines)
 */

import { Plus, Sparkles } from "lucide-react";
import React from "react";
import type { Lead, LeadStatus } from "../../../store/leadsStore";
import { LeadMobileFeedCard } from "../LeadMobileFeedCard";
import { STAGE_DISPLAY_LABELS } from "../leadsKanbanTypes";

interface LeadsMobileCardsSectionProps {
	leads: Lead[];
	onSelect: (id: string) => void;
	onSchedule: (id: string) => void;
	onQuickSchedule?: ((id: string) => Promise<void> | void) | undefined;
	onOpenPatientCard?: ((patientId: string) => void) | undefined;
	onNewLead: () => void;
	searchQuery: string;
	activeTab: LeadStatus | "all";
}

export const LeadsMobileCardsSection: React.FC<
	LeadsMobileCardsSectionProps
> = ({
	leads,
	onSelect,
	onSchedule,
	onQuickSchedule,
	onOpenPatientCard,
	onNewLead,
	searchQuery,
	activeTab,
}) => {
	if (leads.length > 0) {
		return (
			<div className="leads-mobile-cards-list">
				{leads.map((lead) => (
					<LeadMobileFeedCard
						key={lead.id}
						lead={lead}
						onSelect={onSelect}
						onSchedule={onSchedule}
						{...(onQuickSchedule ? { onQuickSchedule } : {})}
						{...(onOpenPatientCard ? { onOpenPatientCard } : {})}
					/>
				))}
			</div>
		);
	}

	return (
		<div className="leads-mobile-empty" data-testid="leads-mobile-empty-state">
			<Sparkles size={36} className="text-[var(--teal)] opacity-60 mb-1" />
			<h4 className="leads-mobile-empty-title">Обращений не найдено</h4>
			<p className="leads-mobile-empty-desc">
				{searchQuery
					? "По вашему поисковому запросу ничего не найдено."
					: activeTab === "all"
						? "Список входящих обращений пока пуст."
						: `В этапе «${STAGE_DISPLAY_LABELS[activeTab] || activeTab}» нет активных лидов.`}
			</p>
		</div>
	);
};
