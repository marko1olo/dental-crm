import type { Dashboard } from "@dental/shared";
import React, { useState } from "react";
import { ShiftIntelligenceHeader } from "./intelligence/ShiftIntelligenceHeader";
import { ShiftIntelligenceAnalyticsGrid } from "./intelligence/ShiftIntelligenceAnalyticsGrid";
import { ShiftIntelligenceRoleQueuesGrid } from "./intelligence/ShiftIntelligenceRoleQueuesGrid";

export interface ShiftIntelligenceSectionProps {
	readonly dashboard?: Dashboard | undefined;
	readonly mostLoadedResource?: any | undefined;
	readonly activeQueueRole?: any | undefined;
	readonly rolesWorthShowing?: boolean | undefined;
	readonly staffRoleLabels?: Record<string, string> | undefined;
	readonly className?: string | undefined;
}

export const ShiftIntelligenceSection: React.FC<ShiftIntelligenceSectionProps> = ({
	dashboard,
	mostLoadedResource,
	activeQueueRole,
	rolesWorthShowing = false,
	staffRoleLabels,
	className = "",
}) => {
	const [showAnalytics, setShowAnalytics] = useState<boolean>(false);

	return (
		<section
			className={`shift-intelligence ${className}`.trim()}
			aria-label="Операционный контроль смены"
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "14px",
				padding: "18px 20px",
				boxShadow: "var(--shadow-1)",
				display: "flex",
				flexDirection: "column",
				gap: "16px",
			}}
			data-testid="shift-intelligence-section"
		>
			<ShiftIntelligenceHeader
				showAnalytics={showAnalytics}
				onToggleAnalytics={() => setShowAnalytics((v) => !v)}
			/>

			{showAnalytics && (
				<ShiftIntelligenceAnalyticsGrid
					modeFit={dashboard?.shiftIntelligence?.modeFit}
					mostLoadedResource={mostLoadedResource}
				/>
			)}

			{rolesWorthShowing && (
				<ShiftIntelligenceRoleQueuesGrid
					roleQueues={dashboard?.shiftIntelligence?.roleQueues}
					activeQueueRole={activeQueueRole}
					staffRoleLabels={staffRoleLabels}
				/>
			)}
		</section>
	);
};
