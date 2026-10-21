/**
 * DENTE Dental CRM — Leads Funnel Analytics Controller Hook
 * Mandate 8b (<= 120 lines)
 */

import { useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { calculateFunnelAnalysis } from "./funnelAnalyticsUtils";
import type {
	FunnelTimePeriod,
	LeadsFunnelAnalyticsControllerState,
	LeadsFunnelControllerOptions,
} from "./types";
import { useFunnelExportActions } from "./useFunnelExportActions";
import { useFunnelSpendState } from "./useFunnelSpendState";

export function useLeadsFunnelAnalyticsController({
	isOpen,
	onClose,
	leads,
	attributionEndpoint = "/api/marketing/attribution",
	getRequestHeaders = denteAdminSecretRequestHeaders,
}: LeadsFunnelControllerOptions): LeadsFunnelAnalyticsControllerState {
	const [period, setPeriod] = useState<FunnelTimePeriod>("all");
	const [isWaterfallOpen, setIsWaterfallOpen] = useState(false);
	const [isChannelsTableOpen, setIsChannelsTableOpen] = useState(false);

	const {
		customSpends,
		isBudgetDrawerOpen,
		toggleBudgetDrawer,
		handleBudgetChange,
		handleResetBudgets,
	} = useFunnelSpendState({
		isOpen,
		attributionEndpoint,
		getRequestHeaders,
	});

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

	const analysis = useMemo(() => {
		return calculateFunnelAnalysis(leads, period, customSpends);
	}, [leads, period, customSpends]);

	const { handleExportCsv, handleCopySummary } = useFunnelExportActions(
		analysis,
		period,
	);

	const toggleWaterfall = () => setIsWaterfallOpen((prev) => !prev);
	const toggleChannelsTable = () => setIsChannelsTableOpen((prev) => !prev);

	return {
		period,
		setPeriod,
		customSpends,
		isBudgetDrawerOpen,
		toggleBudgetDrawer,
		isWaterfallOpen,
		toggleWaterfall,
		isChannelsTableOpen,
		toggleChannelsTable,
		analysis,
		handleBudgetChange,
		handleResetBudgets,
		handleExportCsv,
		handleCopySummary,
	};
}
