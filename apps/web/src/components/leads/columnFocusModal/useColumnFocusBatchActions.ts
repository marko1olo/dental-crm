/**
 * DENTE Dental CRM — Column Focus Batch Operations Hook
 * Mandate 8b (<= 120 lines)
 */

import { useState } from "react";
import type { Lead, LeadStatus } from "../../../store/leadsStore";
import { exportLeadsToCsv } from "../leadsKanbanTypes";
import type { NextStageInfo } from "./types";

interface UseColumnFocusBatchActionsParams {
	selectedLeadIds: Set<string>;
	setSelectedLeadIds: React.Dispatch<React.SetStateAction<Set<string>>>;
	nextStageInfo?: NextStageInfo | undefined;
	onBatchStatusChange: (
		leadIds: string[],
		status: LeadStatus,
	) => Promise<void> | void;
	onBatchAssignDoctor: (
		leadIds: string[],
		doctorId: string,
	) => Promise<void> | void;
	columnId: LeadStatus;
	columnLabel: string;
	displayLeads: Lead[];
}

export function useColumnFocusBatchActions(
	params: UseColumnFocusBatchActionsParams,
) {
	const {
		selectedLeadIds,
		setSelectedLeadIds,
		nextStageInfo,
		onBatchStatusChange,
		onBatchAssignDoctor,
		columnId,
		columnLabel,
		displayLeads,
	} = params;

	const [batchTargetDoctorId, setBatchTargetDoctorId] = useState<string>("");
	const [isProcessingBatch, setIsProcessingBatch] = useState(false);

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
		if (!batchTargetDoctorId || selectedLeadIds.size === 0 || isProcessingBatch)
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
		const csvContent = exportLeadsToCsv(targetLeads, columnLabel);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `leads_${columnId}_${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return {
		batchTargetDoctorId,
		setBatchTargetDoctorId,
		isProcessingBatch,
		handleBatchAdvance,
		handleBatchMoveToStage,
		handleBatchAssign,
		handleExportCsv,
	};
}
