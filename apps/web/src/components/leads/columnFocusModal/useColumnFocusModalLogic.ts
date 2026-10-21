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
import { useColumnFocusMetrics } from "./useColumnFocusMetrics";

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
	const [urgencyFilter, setUrgencyFilter] = useState<"all" | LeadSlaUrgency>(
		"all",
	);
	const [sortOption, setSortOption] = useState<LeadSortOption>("sla_urgent");
	const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
		new Set(),
	);
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

	const displayLeads = useMemo(() => {
		const result = columnLeads.filter((lead) => {
			const q = searchQuery.toLowerCase().trim();
			const matches =
				!q ||
				lead.name?.toLowerCase().includes(q) ||
				lead.phone?.includes(q) ||
				lead.notes?.toLowerCase().includes(q) ||
				lead.source?.toLowerCase().includes(q);
			if (!matches) return false;
			if (
				urgencyFilter !== "all" &&
				getLeadSlaStatus(lead).urgency !== urgencyFilter
			)
				return false;
			return true;
		});
		return sortLeads(result, sortOption);
	}, [columnLeads, searchQuery, urgencyFilter, sortOption]);

	useEffect(() => {
		setVisibleLimit(60);
	}, []);
	const visibleLeads = useMemo(
		() => displayLeads.slice(0, visibleLimit),
		[displayLeads, visibleLimit],
	);

	const toggleSelectLead = (id: string, e?: React.MouseEvent) => {
		if (e) e.stopPropagation();
		setSelectedLeadIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleSelectAll = () => {
		if (
			selectedLeadIds.size >= displayLeads.length &&
			displayLeads.length > 0
		) {
			setSelectedLeadIds(new Set());
		} else {
			setSelectedLeadIds(new Set(displayLeads.map((l) => l.id)));
		}
	};

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
