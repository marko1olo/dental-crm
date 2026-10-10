import { CampaignEditor } from "./CampaignEditor.js";
import { CampaignList } from "./CampaignList.js";
import { CampaignStats } from "./CampaignStats.js";
import type { CampaignPanelProps } from "./types.js";
import { useCampaignPanel } from "./useCampaignPanel.js";

export function CampaignPanel(props: CampaignPanelProps = {}) {
	const {
		campaigns,
		templates,
		loadError,
		notice,
		busy,
		title,
		setTitle,
		templateId,
		setTemplateId,
		scope,
		setScope,
		monthsSinceVisit,
		setMonthsSinceVisit,
		excludeBooked,
		setExcludeBooked,
		previewFor,
		preview,
		previewError,
		progressFor,
		progress,
		progressError,
		progressLoading,
		variables,
		load,
		createCampaign,
		openPreview,
		loadProgress,
		closeProgress,
		closePreview,
		campaignAction,
	} = useCampaignPanel(props);

	if (loadError) {
		return (
			<section className="panel ops-panel" data-testid="campaign-panel">
				<div className="panel-heading">
					<h2>Рассылки</h2>
				</div>
				<p className="ops-notice ops-notice--error" role="alert">
					Не удалось получить рассылки: {loadError}
				</p>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void load()}
				>
					Повторить
				</button>
			</section>
		);
	}

	const isRunning =
		Boolean(progressFor) &&
		campaigns.find((c) => c.id === progressFor)?.status === "running";

	return (
		<section className="panel ops-panel" data-testid="campaign-panel">
			<div className="panel-heading">
				<h2>Рассылки</h2>
			</div>

			<CampaignList
				campaigns={campaigns}
				busy={busy}
				notice={notice}
				openPreview={openPreview}
				loadProgress={loadProgress}
				campaignAction={campaignAction}
			/>

			<CampaignStats
				progressFor={progressFor}
				progress={progress}
				progressError={progressError}
				progressLoading={progressLoading}
				isCampaignRunning={isRunning}
				loadProgress={loadProgress}
				closeProgress={closeProgress}
				previewFor={previewFor}
				preview={preview}
				previewError={previewError}
				openPreview={openPreview}
				closePreview={closePreview}
			/>

			<CampaignEditor
				templates={templates}
				title={title}
				setTitle={setTitle}
				templateId={templateId}
				setTemplateId={setTemplateId}
				scope={scope}
				setScope={setScope}
				monthsSinceVisit={monthsSinceVisit}
				setMonthsSinceVisit={setMonthsSinceVisit}
				excludeBooked={excludeBooked}
				setExcludeBooked={setExcludeBooked}
				busy={busy}
				createCampaign={createCampaign}
				variables={variables}
			/>
		</section>
	);
}

export default CampaignPanel;
export * from "./types.js";
export * from "./useCampaignPanel.js";
export * from "./CampaignList.js";
export * from "./CampaignEditor.js";
export * from "./CampaignAudienceFilter.js";
export * from "./CampaignStats.js";
