/**
 * MarketingDashboardView.tsx — Comprehensive 2-Column Dental Marketing & Funnel Analytics Dashboard.
 *
 * Mandate 8c (Visual Quality & Design System Tokens)
 * Mandate 8d (Quiet Telemetry & 0 Carnival Colors)
 * Mandate 8e & 8n (Solo Doctor Autonomy & Zero Dead-Ends)
 *
 * STRUCTURE (Layer 5 Canonical Facade <= 250 lines):
 * 1. Single-Row Quiet Header (Hick's Law) & Telemetry Status -> MarketingDashboardHeader
 * 2. 4-Metric Key Performance Indicator (KPI) Strip -> MarketingKpiCardsGrid
 * 3. Two-Column Balanced Grid:
 *    - Left Column: Acquisition Channels & End-to-End Conversion Funnel
 *    - Right Column: Ad ROI (ROMI & CAC) & Segmented Patient Base
 * 4. Modals (Analytics, Leak Detector, Promo Creator)
 */

import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { showToast } from "../components/GlobalToast";
import { useLeadsStore } from "../store/leadsStore";
import {
	type FunnelTimePeriod,
	calculateFunnelAnalysis,
	exportFunnelReportCsv,
	normalizeMarketingChannel,
} from "../components/leads/leadsFunnelEngine";
import { MarketingNewPromoModal } from "../components/marketing/MarketingNewPromoModal";
import {
	type MarketingDashboardViewProps,
	MarketingChannelAttributionTable,
	MarketingDashboardHeader,
	MarketingFunnelStagesChart,
	MarketingKpiCardsGrid,
	MarketingRoiAndSegmentsPanel,
	useMarketingLiveSpends,
} from "./marketingDashboardModules";
import "./MarketingDashboardView.css";

const LeadsFunnelAnalyticsModal = lazy(() =>
	import("../components/leads/LeadsFunnelAnalyticsModal").then((module) => ({
		default: module.LeadsFunnelAnalyticsModal,
	})),
);

const CrmLeakDetectorDrawer = lazy(() =>
	import("../components/crm/CrmLeakDetectorDrawer").then((module) => ({
		default: module.CrmLeakDetectorDrawer,
	})),
);

export type { MarketingDashboardViewProps };

export function MarketingDashboardView({
	clinicName = "Стоматология ДЕНТЕ",
	onNavigateToRecalls,
	embedded = false,
}: MarketingDashboardViewProps) {
	const { leads, fetchLeads } = useLeadsStore();
	const [period, setPeriod] = useState<FunnelTimePeriod>("all");
	const { customSpends, attributionSummary } = useMarketingLiveSpends();

	// Modals
	const [isFullAnalyticsOpen, setIsFullAnalyticsOpen] = useState(false);
	const [isLeakDetectorOpen, setIsLeakDetectorOpen] = useState(false);
	const [isNewPromoModalOpen, setIsNewPromoModalOpen] = useState(false);

	useEffect(() => {
		fetchLeads();
	}, [fetchLeads]);

	// Funnel and ROI metrics computation via engine
	const analysis = useMemo(() => {
		return calculateFunnelAnalysis(leads, period, customSpends);
	}, [leads, period, customSpends]);

	// Dynamic Intake Split: backend attribution summary or computed from leads
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

	// Export CSV action
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

	// Best performing channel by ROMI
	const topChannel = useMemo(() => {
		const profitable = channels
			.filter((c) => c.spendRub > 0 && c.revenueRub > 0)
			.sort((a, b) => b.romiPercent - a.romiPercent);
		return profitable[0] ?? channels[0];
	}, [channels]);

	return (
		<section
			className={`marketing-dashboard-page ${embedded ? "marketing-dashboard-page--embedded" : ""}`}
			data-testid="marketing-dashboard-page"
			aria-label="Маркетинговая аналитика и воронка"
		>
			{/* ── 1. QUIET HEADER (1 ROW, HICK'S LAW) ─────────────────────────── */}
			<MarketingDashboardHeader
				embedded={embedded}
				period={period}
				onPeriodChange={setPeriod}
				onExportCsv={handleExportCsv}
				onOpenNewPromoModal={() => setIsNewPromoModalOpen(true)}
			/>

			{/* ── 2. TOP METRIC STRIP (4 BALANCED KPI CARDS) ─────────────────── */}
			<MarketingKpiCardsGrid summary={summary} />

			{/* ── 3. TWO-COLUMN BALANCED DASHBOARD GRID ───────────────────────── */}
			<div className="marketing-dashboard-grid">
				<div className="marketing-col">
					<MarketingChannelAttributionTable channels={channels} />
					<MarketingFunnelStagesChart
						stages={stages}
						intakeSplit={intakeSplit}
						onOpenDetailedAudit={() => setIsFullAnalyticsOpen(true)}
					/>
				</div>

				<MarketingRoiAndSegmentsPanel
					summary={summary}
					topChannel={topChannel}
					onOpenLeakDetector={() => setIsLeakDetectorOpen(true)}
					onNavigateToRecalls={onNavigateToRecalls}
				/>
			</div>

			{/* ── 4. MODALS INTEGRATION ───────────────────────────────────────── */}
			{isFullAnalyticsOpen && (
				<Suspense fallback={null}>
					<LeadsFunnelAnalyticsModal
						isOpen={isFullAnalyticsOpen}
						onClose={() => setIsFullAnalyticsOpen(false)}
						leads={leads}
					/>
				</Suspense>
			)}

			{isLeakDetectorOpen && (
				<Suspense fallback={null}>
					<CrmLeakDetectorDrawer
						isOpen={isLeakDetectorOpen}
						onClose={() => setIsLeakDetectorOpen(false)}
					/>
				</Suspense>
			)}

			<MarketingNewPromoModal
				isOpen={isNewPromoModalOpen}
				onClose={() => setIsNewPromoModalOpen(false)}
				onSave={(newPromo) => {
					showToast(`Акция «${newPromo.title}» сохранена`, "success");
				}}
			/>
		</section>
	);
}

export default MarketingDashboardView;
