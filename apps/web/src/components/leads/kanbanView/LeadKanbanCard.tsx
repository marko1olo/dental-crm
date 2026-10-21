/**
 * DENTE Dental CRM — Leads Kanban Card Component (SSOT Re-export)
 * Mandate 8s: Single Source of Truth, no duplicate card implementations.
 */

import React from "react";
import { LeadCard } from "../LeadCard";
import type { LeadKanbanCardProps } from "./types";

export const LeadKanbanCard: React.FC<LeadKanbanCardProps> = (props) => {
	return <LeadCard {...props} />;
};

export default LeadKanbanCard;
