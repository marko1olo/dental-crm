import type React from "react";
import { SoapMobileActionBar } from "./SoapMobileActionBar";
import { SoapToolbarActions } from "./SoapToolbarActions";
import { SoapToolbarContextSelectors } from "./SoapToolbarContextSelectors";
import { SoapToolbarDraftNotice } from "./SoapToolbarDraftNotice";
import { SoapToolbarMoreMenu } from "./SoapToolbarMoreMenu";
import type { SoapToolbarProps } from "./types";

export type { SoapMobileActionBarProps } from "./SoapMobileActionBar";
export { SoapMobileActionBar };

export const SoapToolbar: React.FC<SoapToolbarProps> = ({
	selectedTooth,
	onSelectTooth,
	selectedSurfaces,
	onChangeSurfaces,
	isLocked,
	isCorrectionMode,
	onEnableCorrection,
	onToggleTemplates,
	onApplyNorm,
	activeViewMode,
	onChangeViewMode,
	copied,
	onCopyFullText,
	onExplicitSave,
	isSoapMoreOpen,
	onToggleSoapMore,
	soapMoreRef,
	saveStatus,
	unsavedDraftNotice,
	onRestoreDraft,
	onDiscardDraft,
}) => {
	return (
		<>
			<div className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] overflow-x-auto scrollbar-none flex-nowrap min-h-[36px]">
				<SoapToolbarContextSelectors
					selectedTooth={selectedTooth}
					onSelectTooth={onSelectTooth}
					selectedSurfaces={selectedSurfaces}
					onChangeSurfaces={onChangeSurfaces}
				/>
				<div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
					<SoapToolbarActions
						isLocked={isLocked}
						isCorrectionMode={isCorrectionMode}
						onEnableCorrection={onEnableCorrection}
						onToggleTemplates={onToggleTemplates}
						onApplyNorm={onApplyNorm}
						activeViewMode={activeViewMode}
						onChangeViewMode={onChangeViewMode}
						copied={copied}
						onCopyFullText={onCopyFullText}
						onExplicitSave={onExplicitSave}
					/>
					<SoapToolbarMoreMenu
						isSoapMoreOpen={isSoapMoreOpen}
						onToggleSoapMore={onToggleSoapMore}
						soapMoreRef={soapMoreRef}
						onExplicitSave={onExplicitSave}
						onCopyFullText={onCopyFullText}
						onChangeViewMode={onChangeViewMode}
						saveStatus={saveStatus}
					/>
				</div>
			</div>
			<SoapToolbarDraftNotice
				unsavedDraftNotice={unsavedDraftNotice}
				onRestoreDraft={onRestoreDraft}
				onDiscardDraft={onDiscardDraft}
			/>
		</>
	);
};
