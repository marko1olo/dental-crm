import React from "react";
import type { SomaticSafetyAlertWidgetProps } from "./types";
import { useSomaticSafetyState } from "./useSomaticSafetyState";
import { SomaticNormButton } from "./SomaticNormButton";
import { SomaticAlertTriggerBadge } from "./SomaticAlertTriggerBadge";
import { SomaticSafetyPopover } from "./SomaticSafetyPopover";

export const SomaticSafetyAlertWidgetView: React.FC<SomaticSafetyAlertWidgetProps> = (props) => {
	const { variant = "header", className = "", hideNormButton = false, onOpenAnamnesisModal } = props;
	const state = useSomaticSafetyState(props);

	if (state.evaluation.isHealthyNorm) {
		if (hideNormButton) return null;
		return (
			<SomaticNormButton
				onApplyNorm={state.handleApplyNormClick}
				triggerRef={state.triggerRef}
				className={className}
			/>
		);
	}

	return (
		<div className={`relative inline-flex items-center shrink-0 ${className}`}>
			<SomaticAlertTriggerBadge
				evaluation={state.evaluation}
				isPopoverOpen={state.isPopoverOpen}
				onTogglePopover={() => state.setIsPopoverOpen((prev) => !prev)}
				triggerRef={state.triggerRef}
			/>

			{variant !== "header" && (
				<SomaticNormButton
					onApplyNorm={state.handleApplyNormClick}
					isCompactSecondary
				/>
			)}

			{state.isPopoverOpen && (
				<SomaticSafetyPopover
					evaluation={state.evaluation}
					popoverRef={state.popoverRef}
					onClose={() => state.setIsPopoverOpen(false)}
					onSyncToDiary={state.handleSyncToDiaryClick}
					onApplyNorm={state.handleApplyNormClick}
					onOpenAnamnesisModal={onOpenAnamnesisModal}
				/>
			)}
		</div>
	);
};
