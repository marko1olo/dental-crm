/**
 * DENTE Dental CRM — Column Focus Workspace State & Operations Hook (Layer 3)
 * Mandate 8b (<= 120 lines)
 */

import { useEffect, useMemo, useState } from "react";
import {
	getLeadSlaStatus,
	type LeadSlaUrgency,
	type LeadSortOption,
	NEXT_STAGE_MAP,
	sortLeads,
} from "../leadsKanbanTypes";
import type {
	ExpandedColumnFocusModalProps,
	NextStageInfo,
	ViewMode,
} from "./types";
import { useColumnFocusBatchActions } from "./useColumnFocusBatchActions";
import { useColumnFocusDisplayLeads } from "./useColumnFocusDisplayLeads";
import { useColumnFocusMetrics } from "./useColumnFocusMetrics";
import { useColumnFocusSelection } from "./useColumnFocusSelection";

export function useColumnFocusModalLogic(props: ExpandedColumnFocusModalProps) {
	const {
		isOpen,
		onClose,
		column,
		leads,
		onBatchStatusChange,
		onBatchAssignDoctor,
	} = props;

	const [viewMode, setViewMode] = useState<ViewMode>("cards");
	const [searchQuery, setSearchQuery] = useState("");
	const [urgencyFilter, setUrgencyFilter] = useState<"all" | LeadSlaUrgency>("all");
	const [sortOption, setSortOption] = useState<LeadSortOption>("sla_urgent");
	const [visibleLimit, setVisibleLimit] = useState(60);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const columnLeads = useMemo(
		() => leads.filter((l) => l.status === column.id),
		[leads, column.id],
	);
	const metrics = useColumnFocusMetrics(columnLeads);
	const displayLeads = useColumnFocusDisplayLeads(
		columnLeads,
		searchQuery,
		urgencyFilter,
		sortOption,
	);

	useEffect(() => {
		setVisibleLimit(60);
	}, []);
	const visibleLeads = useMemo(
		() => displayLeads.slice(0, visibleLimit),
		[displayLeads, visibleLimit],
	);

	const {
		selectedLeadIds,
		setSelectedLeadIds,
		toggleSelectLead,
		toggleSelectAll,
	} = useColumnFocusSelection(displayLeads);

	const nextStageInfo: NextStageInfo | undefined = NEXT_STAGE_MAP[column.id] as
		| NextStageInfo
		| undefined;
	const batch = useColumnFocusBatchActions({
		selectedLeadIds,
		setSelectedLeadIds,
		nextStageInfo,
		onBatchStatusChange,
		onBatchAssignDoctor,
		columnId: column.id,
		columnLabel: column.label,
		displayLeads,
	});

	return {
		viewMode,
		setViewMode,
		searchQuery,
		setSearchQuery,
		urgencyFilter,
		setUrgencyFilter,
		sortOption,
		setSortOption,
		selectedLeadIds,
		setSelectedLeadIds,
		batchTargetDoctorId: batch.batchTargetDoctorId,
		setBatchTargetDoctorId: batch.setBatchTargetDoctorId,
		isProcessingBatch: batch.isProcessingBatch,
		columnLeads,
		metrics,
		displayLeads,
		visibleLimit,
		visibleLeads,
		nextStageInfo,
		toggleSelectLead,
		toggleSelectAll,
		handleBatchAdvance: batch.handleBatchAdvance,
		handleBatchMoveToStage: batch.handleBatchMoveToStage,
		handleBatchAssign: batch.handleBatchAssign,
		handleExportCsv: batch.handleExportCsv,
		handleLoadMore: () => setVisibleLimit((prev) => prev + 60),
	};
}
