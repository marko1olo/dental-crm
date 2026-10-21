import React from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	FUNNEL_MODAL_BODY_STYLE,
	FUNNEL_MODAL_CONTAINER_STYLE,
	FUNNEL_MODAL_OVERLAY_STYLE,
	FunnelBudgetAdjusterPanel,
	FunnelConversionInsightsPanel,
	FunnelModalFooter,
	FunnelModalHeaderBar,
	FunnelSourcesBreakdownTable,
	FunnelStagesOverviewSection,
	type LeadsFunnelAnalyticsModalProps,
	useLeadsFunnelAnalyticsController,
} from "./leadsFunnelAnalyticsModules";

export * from "./leadsFunnelAnalyticsModules";
export type { LeadsFunnelAnalyticsModalProps };

/**
 * Модальное окно сквозной воронки лидов CRM ДЕНТЕ, юнит-экономики CAC/ROMI
 * и конверсии планов на консультации врача у кресла.
 */
export function LeadsFunnelAnalyticsModal(
	props: LeadsFunnelAnalyticsModalProps,
) {
	const ctrl = useLeadsFunnelAnalyticsController({
		...props,
		attributionEndpoint: "/api/marketing/attribution",
		getRequestHeaders: denteAdminSecretRequestHeaders,
	});

	if (!props.isOpen) return null;
	const { summary, stages, channels } = ctrl.analysis;

	const modalContent = (
		<div
			style={FUNNEL_MODAL_OVERLAY_STYLE}
			onClick={(e) => {
				if (e.target === e.currentTarget) props.onClose();
			}}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.96, y: 15 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.96, y: 15 }}
				transition={{ duration: 0.2 }}
				style={FUNNEL_MODAL_CONTAINER_STYLE as any}
			>
				<FunnelModalHeaderBar
					period={ctrl.period}
					onSelectPeriod={ctrl.setPeriod}
					isBudgetDrawerOpen={ctrl.isBudgetDrawerOpen}
					onToggleBudgetDrawer={ctrl.toggleBudgetDrawer}
					onCopySummary={ctrl.handleCopySummary}
					onExportCsv={ctrl.handleExportCsv}
					onClose={props.onClose}
					onOpenLeakDetector={props.onOpenLeakDetector}
				/>
				<FunnelBudgetAdjusterPanel
					isOpen={ctrl.isBudgetDrawerOpen}
					customSpends={ctrl.customSpends}
					onBudgetChange={ctrl.handleBudgetChange}
					onResetBudgets={ctrl.handleResetBudgets}
				/>
				<div style={FUNNEL_MODAL_BODY_STYLE}>
					<FunnelStagesOverviewSection
						summary={summary}
						stages={stages}
						isWaterfallOpen={ctrl.isWaterfallOpen}
						onToggleWaterfall={ctrl.toggleWaterfall}
					/>
					<FunnelSourcesBreakdownTable
						channels={channels}
						summary={summary}
						isOpen={ctrl.isChannelsTableOpen}
						onToggle={ctrl.toggleChannelsTable}
					/>
					<FunnelConversionInsightsPanel
						summary={summary}
						onOpenLeakDetector={props.onOpenLeakDetector}
					/>
				</div>
				<FunnelModalFooter onClose={props.onClose} />
			</motion.div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}

export default LeadsFunnelAnalyticsModal;
