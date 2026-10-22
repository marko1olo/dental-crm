import { useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import { failNotice, type Notice } from "../deliveryReportNotice.js";
import { type CampaignCriteria, type CampaignItem, type CampaignPanelProps, readJson } from "./types.js";
import { useCampaignDataLoader } from "./useCampaignDataLoader.js";
import { useCampaignExecution } from "./useCampaignExecution.js";

export function useCampaignPanel(initialProps: CampaignPanelProps = {}) {
	const commQueries = useAppLogicContext();
	const [notice, setNotice] = useState<Notice | null>(null);
	const [busy, setBusy] = useState(false);

	const [title, setTitle] = useState("");
	const [templateId, setTemplateId] = useState("");
	const [scope, setScope] = useState<"service" | "marketing">("service");
	const [monthsSinceVisit, setMonthsSinceVisit] = useState("6");
	const [excludeBooked, setExcludeBooked] = useState(true);

	const data = useCampaignDataLoader(commQueries, initialProps);
	const exec = useCampaignExecution(commQueries, data.campaigns, data.load, setNotice, setBusy);

	function buildCriteria(): CampaignCriteria {
		const criteria: CampaignCriteria = { status: "active" };
		const months = Number.parseInt(monthsSinceVisit, 10);
		if (Number.isFinite(months) && months > 0) {
			const cutoff = new Date();
			cutoff.setMonth(cutoff.getMonth() - months);
			criteria.lastVisitBefore = cutoff.toISOString();
		}
		if (excludeBooked) criteria.hasFutureAppointment = false;
		return criteria;
	}

	async function createCampaign() {
		let campaignTitle = title.trim();
		if (!campaignTitle) {
			campaignTitle = `Сервисная рассылка ${new Date().toLocaleDateString("ru-RU")}`;
			setTitle(campaignTitle);
		}
		let selectedTemplateId = templateId;
		if (!selectedTemplateId) {
			const firstTemplate = data.templates[0];
			if (firstTemplate) {
				selectedTemplateId = firstTemplate.id;
				setTemplateId(selectedTemplateId);
			} else {
				showToast("Сначала создайте шаблон сообщения", "info");
				return;
			}
		}
		setBusy(true);
		setNotice(null);
		try {
			const response = await commQueries.createCampaign({
				title: campaignTitle, templateId: selectedTemplateId, scope, criteria: buildCriteria(),
			});
			const resData = await readJson<{ campaign: CampaignItem }>(response);
			setNotice({ kind: "done", text: "Рассылка создана. Проверьте предпросмотр перед запуском." });
			setTitle("");
			await data.load();
			await exec.openPreview(resData.campaign.id);
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			setNotice(failNotice(error, "Рассылка не создана, никому ничего не отправлено. Заполненное ниже не пропало — исправьте и нажмите ещё раз."));
		} finally {
			setBusy(false);
		}
	}

	return {
		campaigns: data.campaigns, templates: data.templates, loadError: data.loadError,
		notice, busy, title, setTitle, templateId, setTemplateId,
		scope, setScope, monthsSinceVisit, setMonthsSinceVisit,
		excludeBooked, setExcludeBooked,
		previewFor: exec.previewFor, preview: exec.preview, previewError: exec.previewError,
		progressFor: exec.progressFor, progress: exec.progress,
		progressError: exec.progressError, progressLoading: exec.progressLoading,
		variables: data.variables, load: data.load, createCampaign,
		openPreview: exec.openPreview, loadProgress: exec.loadProgress,
		closeProgress: exec.closeProgress, closePreview: exec.closePreview,
		campaignAction: exec.campaignAction,
	};
}

export type UseCampaignPanelReturn = ReturnType<typeof useCampaignPanel>;
