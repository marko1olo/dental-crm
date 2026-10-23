/**
 * useMarketingDashboardData.ts
 *
 * Data layer & business logic for MarketingDashboardView.
 * Strict <= 120 lines. UTF-8 without BOM.
 */

import { useEffect, useMemo, useState } from "react";
import { showToast } from "../../components/GlobalToast";
import { useLeadsStore } from "../../store/leadsStore";
import {
	type FunnelTimePeriod,
	calculateFunnelAnalysis,
	exportFunnelReportCsv,
	normalizeMarketingChannel,
} from "../../components/leads/leadsFunnelEngine";
import { useMarketingLiveSpends } from "./useMarketingLiveSpends";

export function useMarketingDashboardData() {
	const { leads, fetchLeads } = useLeadsStore();
	const [period, setPeriod] = useState<FunnelTimePeriod>("all");
	const { customSpends, attributionSummary } = useMarketingLiveSpends();

	const [isFullAnalyticsOpen, setIsFullAnalyticsOpen] = useState(false);
	const [isLeakDetectorOpen, setIsLeakDetectorOpen] = useState(false);
	const [isNewPromoModalOpen, setIsNewPromoModalOpen] = useState(false);

	useEffect(() => {
		fetchLeads();
	}, [fetchLeads]);

	const analysis = useMemo(() => {
		return calculateFunnelAnalysis(leads, period, customSpends);
	}, [leads, period, customSpends]);

	const intakeSplit = useMemo(() => {
		if (attributionSummary) {
			return {
				onlinePercent: attributionSummary.onlineSharePercent,
				adminPercent: attributionSummary.adminSharePercent,
			};
		}
		if (leads.length === 0) {
			return { onlinePercent: 0, adminPercent: 0 };
		}
		const onlineLeads = leads.filter((l) => {
			const ch = normalizeMarketingChannel(l.source);
			return (
				ch === "site_seo" ||
				ch === "gis_2" ||
				ch === "prodoctorov" ||
				ch === "napopravku" ||
				ch === "social_media"
			);
		}).length;
		const onlinePercent = Math.round((onlineLeads / leads.length) * 100);
		return {
			onlinePercent,
			adminPercent: Math.max(0, 100 - onlinePercent),
		};
	}, [attributionSummary, leads]);

	const { summary, channels, stages } = analysis;

	const handleExportCsv = () => {
		try {
			const csvData = exportFunnelReportCsv(analysis);
			const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute(
				"download",
				`Marketing_Funnel_Report_${period}_${new Date().toISOString().slice(0, 10)}.csv`,
			);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			showToast("Отчет по маркетингу экспортирован в CSV", "success");
		} catch {
			showToast("Не удалось экспортировать отчет", "error");
		}
	};

	const topChannel = useMemo(() => {
		const profitable = channels
			.filter((c) => c.spendRub > 0 && c.revenueRub > 0)
			.sort((a, b) => b.romiPercent - a.romiPercent);
		return profitable[0] ?? channels[0];
	}, [channels]);

	return {
		period,
		setPeriod,
		summary,
		channels,
		stages,
		intakeSplit,
		topChannel,
		handleExportCsv,
		leads,
		isFullAnalyticsOpen,
		setIsFullAnalyticsOpen,
		isLeakDetectorOpen,
		setIsLeakDetectorOpen,
		isNewPromoModalOpen,
		setIsNewPromoModalOpen,
	};
}
