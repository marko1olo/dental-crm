import { AlertTriangle } from "lucide-react";
import type React from "react";
import { panelStateText } from "../../../lib/panelStateText";
import { PanelLoadFailure } from "../../PanelLoadFailure";
import { PROFILE_PANEL_SUBJECT, type ProfileLoadState } from "../settingsProfileLoad";

interface Props {
	loadState: ProfileLoadState;
	onRetry: () => void;
}

export const ProfileLoadingStates: React.FC<Props> = ({ loadState, onRetry }) => {
	if (loadState.phase === "loading") {
		return (
			<div className="settings-tab-pane p-6 flex flex-col items-center justify-center text-center">
				<div className="animate-spin h-8 w-8 text-[var(--teal)] border-2 border-[var(--line)] border-t-[var(--teal)] rounded-full" />
				<p className="text-[var(--muted)] mt-3 text-sm font-medium">
					{panelStateText(PROFILE_PANEL_SUBJECT, { phase: "loading" }).title}
				</p>
			</div>
		);
	}

	if (loadState.phase === "failed") {
		return (
			<div className="settings-tab-pane p-6">
				<PanelLoadFailure subject={PROFILE_PANEL_SUBJECT} status={loadState.status} onRetry={onRetry} />
			</div>
		);
	}

	return (
		<div className="settings-tab-pane p-6 flex flex-col items-center justify-center text-center">
			<AlertTriangle size={32} className="text-amber-500" aria-hidden="true" />
			<p className="mt-2 text-sm font-medium text-[var(--ink)]">{PROFILE_PANEL_SUBJECT.emptyTitle}</p>
			<p className="mt-1 text-sm text-[var(--muted)]">{PROFILE_PANEL_SUBJECT.emptyHint}</p>
		</div>
	);
};
