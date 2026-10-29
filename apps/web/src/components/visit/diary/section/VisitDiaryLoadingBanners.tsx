import type React from "react";
import { PanelLoadFailure } from "../../../PanelLoadFailure";

export interface VisitDiaryLoadingBannersProps {
	readonly loadState: any;
	readonly loadStateText: any;
	readonly diarySubject: any;
	readonly onRetry: () => void;
}

export const VisitDiaryLoadingBanners: React.FC<VisitDiaryLoadingBannersProps> = ({
	loadState,
	loadStateText,
	diarySubject,
	onRetry,
}) => {
	return (
		<>
			{loadState.phase === "loading" && loadStateText && (
				<div
					className="clinical-diary__load-banner p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)]"
					data-testid="diary-load-loading"
					role="status"
					aria-live="polite"
				>
					<div className="font-semibold">{loadStateText.title}</div>
					{loadStateText.hint ? (
						<div className="mt-0.5">{loadStateText.hint}</div>
					) : null}
				</div>
			)}
			{loadState.phase === "failed" && (
				<div
					className="clinical-diary__load-banner p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)]"
					data-testid="diary-load-failed"
				>
					<PanelLoadFailure
						subject={diarySubject}
						status={loadState.status}
						onRetry={onRetry}
					/>
				</div>
			)}
		</>
	);
};
