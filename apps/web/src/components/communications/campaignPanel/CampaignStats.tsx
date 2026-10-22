import { CampaignPreviewPanel } from "./CampaignPreviewPanel.js";
import { CampaignProgressPanel } from "./CampaignProgressPanel.js";
import type { CampaignPreview, CampaignProgress } from "./types.js";

export { CampaignPreviewPanel, CampaignProgressPanel };

export type CampaignStatsProps = {
	progressFor: string | null;
	progress: CampaignProgress | null;
	progressError: string | null;
	progressLoading: boolean;
	isCampaignRunning: boolean;
	loadProgress: (campaignId: string) => Promise<void>;
	closeProgress: () => void;
	previewFor: string | null;
	preview: CampaignPreview | null;
	previewError: string | null;
	openPreview: (campaignId: string) => Promise<void>;
	closePreview: () => void;
};

export function CampaignStats({
	progressFor, progress, progressError, progressLoading, isCampaignRunning,
	loadProgress, closeProgress, previewFor, preview, previewError,
	openPreview, closePreview,
}: CampaignStatsProps) {
	return (
		<>
			{progressFor && (
				<CampaignProgressPanel
					progressFor={progressFor} progress={progress} progressError={progressError}
					progressLoading={progressLoading} isCampaignRunning={isCampaignRunning}
					loadProgress={loadProgress} closeProgress={closeProgress}
				/>
			)}
			{previewFor && (
				<CampaignPreviewPanel
					previewFor={previewFor} preview={preview} previewError={previewError}
					openPreview={openPreview} closePreview={closePreview}
				/>
			)}
		</>
	);
}

export default CampaignStats;
