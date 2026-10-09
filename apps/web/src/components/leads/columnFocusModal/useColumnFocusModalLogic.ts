/**
 * DENTE Dental CRM — Column Focus Workspace State & Operations Hook (Layer 3)
 *
 * Mandate 8n (Clinical Ergonomics, Scale Sovereignty & Solo Doctor Autonomy)
 * Manages local view mode, filtering, sorting, batch operations, pagination,
 * keyboard dismiss listeners, and CSV export.
 */

import { useEffect, useMemo, useState } from "react";
import type { LeadStatus } from "../../../store/leadsStore";
import {
	exportLeadsToCsv,
	getLeadSlaStatus,
	LeadSlaUrgency,
	LeadSortOption,
	NEXT_STAGE_MAP,
	sortLeads,
} from "../leadsKanbanTypes";
import type {
	ColumnMetrics,
	ExpandedColumnFocusModalProps,
	NextStageInfo,
	ViewMode,
} from "./types";

export function useColumnFocusModalLogic(props: ExpandedColumnFocusModalProps) {
	const {
		isOpen,
		onClose,
		column,
		leads,
		onBatchStatusChange,
		onBatchAssignDoctor,
	} = props;

	// View mode: 'cards' (3-col wide) vs 'table' (32px dense spreadsheet)
	const [viewMode, setViewMode] = useState<ViewMode>("cards");

	// Local search and filter states
	const [searchQuery, setSearchQuery] = useState("");
	const [urgencyFilter, setUrgencyFilter] = useState<"all" | LeadSlaUrgency>(
		"all",
	);
	const [sortOption, setSortOption] =
		useState<LeadSortOption>("sla_urgent");

	// Multi-select for bulk actions
	const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
		new Set(),
	);
	const [batchTargetDoctorId, setBatchTargetDoctorId] = useState<string>("");
	const [isProcessingBatch, setIsProcessingBatch] = useState(false);

	// ESC key listener to dismiss
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Filter leads belonging to this column
	const columnLeads = useMemo(() => {
		return leads.filter((l) => l.status === column.id);
	}, [leads, column.id]);

	// Compute telemetry & metrics
	const metrics: ColumnMetrics = useMemo(() => {
		const totalRevenue = columnLeads.reduce(
			(acc, l) => acc + (Number(l.expectedRevenue) || 0),
			0,
		);
		let breachedCount = 0;
		let warningCount = 0;
		let freshCount = 0;
		let totalMinutes = 0;

		columnLeads.forEach((lead) => {
			const sla = getLeadSlaStatus(lead);
			totalMinutes += sla.minutesElapsed;
			if (sla.urgency === "breached") breachedCount++;
			else if (sla.urgency === "warning") warningCount++;
			else freshCount++;
		});

		const avgWaitMinutes =
			columnLeads.length > 0
				? Math.round(totalMinutes / columnLeads.length)
				: 0;

		return {
			totalCount: columnLeads.length,
			totalRevenue,
			breachedCount,
			warningCount,
			freshCount,
			avgWaitMinutes,
		};
	}, [columnLeads]);

	// Filtered & sorted leads for display
	const displayLeads = useMemo(() => {
		const result = columnLeads.filter((lead) => {
			const q = searchQuery.toLowerCase().trim();
			const matchesQuery =
				!q ||
				lead.name?.toLowerCase().includes(q) ||
				lead.phone?.includes(q) ||
				lead.notes?.toLowerCase().includes(q) ||
				lead.source?.toLowerCase().includes(q);

			if (!matchesQuery) return false;

			if (urgencyFilter !== "all") {
				const sla = getLeadSlaStatus(lead);
				if (sla.urgency !== urgencyFilter) return false;
			}

			return true;
		});

		return sortLeads(result, sortOption);
	}, [columnLeads, searchQuery, urgencyFilter, sortOption]);

	// Pagination limit for massive datasets (prevents DOM freeze on 300+ leads)
	const [visibleLimit, setVisibleLimit] = useState(60);

	useEffect(() => {
		setVisibleLimit(60);
	}, [searchQuery, urgencyFilter, sortOption, column.id]);

	const visibleLeads = useMemo(() => {
		return displayLeads.slice(0, visibleLimit);
	}, [displayLeads, visibleLimit]);

	// Toggle selection for a single lead
	const toggleSelectLead = (id: string, e?: React.MouseEvent) => {
		if (e) e.stopPropagation();
		setSelectedLeadIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	// Toggle select all visible
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

	const nextStageInfo: NextStageInfo | undefined =
		NEXT_STAGE_MAP[column.id] as NextStageInfo | undefined;

	// Bulk actions
	const handleBatchAdvance = async () => {
		const nextStage = nextStageInfo?.status;
		if (!nextStage || selectedLeadIds.size === 0 || isProcessingBatch) return;

		setIsProcessingBatch(true);
		try {
			await onBatchStatusChange(Array.from(selectedLeadIds), nextStage);
			setSelectedLeadIds(new Set());
		} finally {
			setIsProcessingBatch(false);
		}
	};

	const handleBatchMoveToStage = async (nextStatus: LeadStatus) => {
		if (selectedLeadIds.size === 0 || isProcessingBatch) return;

		setIsProcessingBatch(true);
		try {
			await onBatchStatusChange(Array.from(selectedLeadIds), nextStatus);
			setSelectedLeadIds(new Set());
		} finally {
			setIsProcessingBatch(false);
		}
	};

	const handleBatchAssign = async () => {
		if (
			!batchTargetDoctorId ||
			selectedLeadIds.size === 0 ||
			isProcessingBatch
		)
			return;

		setIsProcessingBatch(true);
		try {
			await onBatchAssignDoctor(
				Array.from(selectedLeadIds),
				batchTargetDoctorId,
			);
			setSelectedLeadIds(new Set());
			setBatchTargetDoctorId("");
		} finally {
			setIsProcessingBatch(false);
		}
	};

	const handleExportCsv = (onlySelected = false) => {
		const targetLeads = onlySelected
			? displayLeads.filter((l) => selectedLeadIds.has(l.id))
			: displayLeads;

		const csvContent = exportLeadsToCsv(targetLeads, column.label);
		const blob = new Blob([csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `leads_${column.id}_${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const handleLoadMore = () => {
		setVisibleLimit((prev) => prev + 60);
	};

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
		batchTargetDoctorId,
		setBatchTargetDoctorId,
		isProcessingBatch,
		columnLeads,
		metrics,
		displayLeads,
		visibleLimit,
		visibleLeads,
		nextStageInfo,
		toggleSelectLead,
		toggleSelectAll,
		handleBatchAdvance,
		handleBatchMoveToStage,
		handleBatchAssign,
		handleExportCsv,
		handleLoadMore,
	};
}
