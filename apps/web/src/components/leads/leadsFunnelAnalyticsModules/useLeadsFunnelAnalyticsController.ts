import { useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type {
	CanonicalMarketingChannelKey,
	ChannelSpendMap,
	FunnelTimePeriod,
	LeadsFunnelAnalyticsControllerState,
	LeadsFunnelControllerOptions,
	LiveMarketingAttributionPayload,
} from "./types";
import {
	buildFunnelCsvFilename,
	calculateFunnelAnalysis,
	exportFunnelReportCsv,
	exportFunnelReportSummaryText,
	getDefaultChannelSpendMap,
	mapLiveAttributionToChannelSpends,
	parseSanitizedBudgetRub,
} from "./funnelAnalyticsUtils";

/**
 * Encapsulated state machine & business logic hook for Leads Funnel Analytics.
 * Handles period selection, attribution spend loading, budget customization,
 * collapsible section visibility, and keyboard shortcuts.
 */
export function useLeadsFunnelAnalyticsController({
	isOpen,
	onClose,
	leads,
	attributionEndpoint = "/api/marketing/attribution",
	getRequestHeaders = denteAdminSecretRequestHeaders,
}: LeadsFunnelControllerOptions): LeadsFunnelAnalyticsControllerState {
	// Selected time period
	const [period, setPeriod] = useState<FunnelTimePeriod>("all");

	// Channel spend customizations
	const [customSpends, setCustomSpends] = useState<ChannelSpendMap>(() =>
		getDefaultChannelSpendMap(),
	);
	const [isBudgetDrawerOpen, setIsBudgetDrawerOpen] = useState(false);

	// Collapsible analytics panels (Frontend Rule 3.1 & Mandate 8d)
	const [isWaterfallOpen, setIsWaterfallOpen] = useState(false);
	const [isChannelsTableOpen, setIsChannelsTableOpen] = useState(false);

	// Fetch live marketing attribution spends
	useEffect(() => {
		if (!isOpen) return;
		let cancelled = false;

		async function fetchLiveSpends() {
			try {
				const headers = getRequestHeaders ? getRequestHeaders() : undefined;
				const res = await fetch(attributionEndpoint, {
					...(headers ? { headers } : {}),
				});
				if (!res.ok) return;
				const data = (await res.json()) as LiveMarketingAttributionPayload;
				if (cancelled || !data) return;

				const liveSpends = mapLiveAttributionToChannelSpends(data);
				if (!cancelled && Object.keys(liveSpends).length > 0) {
					setCustomSpends((prev) => ({
						...prev,
						...liveSpends,
					}));
				}
			} catch {
				// Silently fallback to default spend map on network hiccups
			}
		}

		fetchLiveSpends();
		return () => {
			cancelled = true;
		};
	}, [isOpen, attributionEndpoint, getRequestHeaders]);

	// Keyboard ESC listener
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

	// Recalculate analysis
	const analysis = useMemo(() => {
		return calculateFunnelAnalysis(leads, period, customSpends);
	}, [leads, period, customSpends]);

	// Update individual channel budget
	const handleBudgetChange = (
		channelKey: CanonicalMarketingChannelKey,
		valueStr: string,
	) => {
		const num = parseSanitizedBudgetRub(valueStr);
		setCustomSpends((prev) => ({
			...prev,
			[channelKey]: num,
		}));
	};

	// Reset budgets to defaults
	const handleResetBudgets = () => {
		setCustomSpends(getDefaultChannelSpendMap());
		showToast("Рекламные бюджеты сброшены к стандартным", "info");
	};

	// Export CSV action
	const handleExportCsv = () => {
		try {
			const csvData = exportFunnelReportCsv(analysis);
			const blob = new Blob([csvData], {
				type: "text/csv;charset=utf-8;",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", buildFunnelCsvFilename(period));
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			showToast("Отчет успешно экспортирован в CSV (Excel)", "success");
		} catch {
			showToast("Не удалось экспортировать отчет", "error");
		}
	};

	// Copy Text summary
	const handleCopySummary = async () => {
		try {
			const text = exportFunnelReportSummaryText(analysis);
			await navigator.clipboard.writeText(text);
			showToast("Дайджест воронки скопирован в буфер обмена", "success");
		} catch {
			showToast("Не удалось скопировать сводку", "error");
		}
	};

	const toggleBudgetDrawer = () => setIsBudgetDrawerOpen((prev) => !prev);
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
