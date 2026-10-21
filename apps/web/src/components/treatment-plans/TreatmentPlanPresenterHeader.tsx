/**
 * TreatmentPlanPresenterHeader.tsx — шапка презентации планов лечения и навигационная панель табов.
 */

import React from "react";
import type { PresenterTabId } from "./presenterHeader/presenterTabTypes.js";
import { PresenterHeaderTitleGroup } from "./presenterHeader/PresenterHeaderTitleGroup.js";
import { PresenterHeaderActions } from "./presenterHeader/PresenterHeaderActions.js";
import { PresenterHeaderNavRow } from "./presenterHeader/PresenterHeaderNavRow.js";

export type { PresenterTabId } from "./presenterHeader/presenterTabTypes.js";

export interface TreatmentPlanPresenterHeaderProps {
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly planAgeDays: number;
	readonly isFullscreen: boolean;
	readonly onToggleFullscreen: () => void;
	readonly activeTab: PresenterTabId;
	readonly onSelectTab: (tab: PresenterTabId) => void;
	readonly onCopyTiersSummary: () => void;
	readonly onPrintAppendix: () => void;
	readonly onClose: () => void;
	readonly aiAuditResult?: unknown | undefined;
	readonly isAiAuditing?: boolean | undefined;
	readonly onRunAiAudit?: (() => void) | undefined;
	readonly toolsBarSlot?: React.ReactNode | undefined;
}

export const TreatmentPlanPresenterHeader: React.FC<TreatmentPlanPresenterHeaderProps> = ({
	patientName,
	doctorFullName,
	planAgeDays,
	isFullscreen,
	onToggleFullscreen,
	activeTab,
	onSelectTab,
	onCopyTiersSummary,
	onPrintAppendix,
	onClose,
	toolsBarSlot,
}) => {
	return (
		<header className="treatment-presenter-header">
			<div className="treatment-presenter-header-main">
				<PresenterHeaderTitleGroup
					patientName={patientName}
					doctorFullName={doctorFullName}
					planAgeDays={planAgeDays}
				/>

				<PresenterHeaderActions
					isFullscreen={isFullscreen}
					onToggleFullscreen={onToggleFullscreen}
					onCopyTiersSummary={onCopyTiersSummary}
					onPrintAppendix={onPrintAppendix}
					onClose={onClose}
				/>
			</div>

			<PresenterHeaderNavRow
				activeTab={activeTab}
				onSelectTab={onSelectTab}
				toolsBarSlot={toolsBarSlot}
			/>
		</header>
	);
};
