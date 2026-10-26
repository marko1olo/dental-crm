import React from "react";
import type { SomaticAnamnesisCardProps } from "./types";
import { useSomaticCardState } from "./useSomaticCardState";
import { SomaticCardTopBar } from "./SomaticCardTopBar";
import { SomaticStatusBanner } from "./SomaticStatusBanner";
import { SomaticAllergiesSection } from "./SomaticAllergiesSection";
import { SomaticHemostasisSection } from "./SomaticHemostasisSection";
import { SomaticConditionsSection } from "./SomaticConditionsSection";
import { SomaticNotesAndActions } from "./SomaticNotesAndActions";

export const SomaticAnamnesisCardView: React.FC<SomaticAnamnesisCardProps> = (props) => {
	const { patientId, patientName, className = "", isCompact = false } = props;
	const state = useSomaticCardState(props);

	return (
		<div
			className={`somatic-anamnesis-card flex flex-col gap-4 w-full p-4 sm:p-5 rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper,#ffffff)] dark:bg-slate-900 shadow-sm ${className}`}
			data-testid="somatic-anamnesis-card"
			data-patient-id={patientId ?? undefined}
		>
			<SomaticCardTopBar
				isNorm={state.isNorm}
				evaluation={state.evaluation}
				patientName={patientName}
				onApplyNorm={state.handleApplyPhysiologicalNorm}
			/>

			<SomaticStatusBanner
				isNorm={state.isNorm}
				evaluation={state.evaluation}
			/>

			<div className="flex flex-col gap-3">
				<SomaticAllergiesSection
					profile={state.profile}
					onToggle={state.toggleFlag}
				/>

				<SomaticHemostasisSection
					profile={state.profile}
					setProfile={state.setProfile}
					onToggle={state.toggleFlag}
				/>

				<SomaticConditionsSection
					profile={state.profile}
					setProfile={state.setProfile}
					onToggle={state.toggleFlag}
				/>
			</div>

			<SomaticNotesAndActions
				isCompact={isCompact}
				profile={state.profile}
				setProfile={state.setProfile}
				onApplyPhysiologicalNorm={state.handleApplyPhysiologicalNorm}
				onSyncToDiary={state.handleSyncToDiary}
				onSave={state.handleSave}
			/>
		</div>
	);
};
