import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import {
	type Notice,
	failNotice,
} from "../deliveryReportNotice.js";
import {
	type CampaignCriteria,
	type CampaignItem,
	type CampaignPanelProps,
	type CampaignPreview,
	type CampaignProgress,
	type TemplateOption,
	type TemplateVariable,
	readJson,
} from "./types.js";

export function useCampaignPanel({
	initialTemplates,
	initialCampaigns,
}: CampaignPanelProps = {}) {
	const commQueries = useAppLogicContext();

	const [campaigns, setCampaigns] = useState<CampaignItem[]>(
		() => initialCampaigns ?? [],
	);
	const [templates, setTemplates] = useState<TemplateOption[]>(
		() => initialTemplates ?? [],
	);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [notice, setNotice] = useState<Notice | null>(null);
	const [busy, setBusy] = useState(false);

	const [title, setTitle] = useState("");
	const [templateId, setTemplateId] = useState("");
	const [scope, setScope] = useState<"service" | "marketing">("service");
	const [monthsSinceVisit, setMonthsSinceVisit] = useState("6");
	const [excludeBooked, setExcludeBooked] = useState(true);

	const [previewFor, setPreviewFor] = useState<string | null>(null);
	const [preview, setPreview] = useState<CampaignPreview | null>(null);
	const [previewError, setPreviewError] = useState<string | null>(null);

	const [progressFor, setProgressFor] = useState<string | null>(null);
	const [progress, setProgress] = useState<CampaignProgress | null>(null);
	const [progressError, setProgressError] = useState<string | null>(null);
	const [progressLoading, setProgressLoading] = useState(false);

	const [variables, setVariables] = useState<TemplateVariable[]>([]);

	const load = useCallback(async () => {
		setLoadError(null);
		try {
			const [campaignResponse, templateResponse, variablesResponse] =
				await Promise.all([
					commQueries.getCampaigns(),
					commQueries.getCampaignsTemplates(),
					commQueries.getCampaignsVariables(),
				]);
			const campaignData = await readJson<{ campaigns: CampaignItem[] }>(
				campaignResponse,
			);
			const templateData = await readJson<{ templates: TemplateOption[] }>(
				templateResponse,
			);
			const variablesData = await readJson<{ variables: TemplateVariable[] }>(
				variablesResponse,
			);
			setCampaigns(campaignData.campaigns);
			setTemplates(
				(templateData.templates || []).filter((template) => template.isActive),
			);
			setVariables(variablesData.variables ?? []);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setLoadError(error instanceof Error ? error.message : String(error));
		}
	}, [
		commQueries.getCampaigns,
		commQueries.getCampaignsVariables,
		commQueries.getCampaignsTemplates,
	]);

	useEffect(() => {
		void load();
	}, [load]);

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
			const firstTemplate = templates[0];
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
				title: campaignTitle,
				templateId: selectedTemplateId,
				scope,
				criteria: buildCriteria(),
			});
			const data = await readJson<{ campaign: CampaignItem }>(response);
			setNotice({
				kind: "done",
				text: "Рассылка создана. Проверьте предпросмотр перед запуском.",
			});
			setTitle("");
			await load();
			await openPreview(data.campaign.id);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setNotice(
				failNotice(
					error,
					"Рассылка не создана, никому ничего не отправлено. Заполненное ниже не пропало — исправьте и нажмите ещё раз.",
				),
			);
		} finally {
			setBusy(false);
		}
	}

	const loadProgress = useCallback(
		async (campaignId: string) => {
			setProgressFor(campaignId);
			setProgressLoading(true);
			setProgressError(null);
			try {
				const response = await commQueries.getCampaignProgress(campaignId);
				const data = await readJson<{
					byStatus?: Record<string, number>;
					total?: number;
				}>(response);
				setProgress({
					byStatus: data.byStatus ?? {},
					total: typeof data.total === "number" ? data.total : 0,
				});
			} catch (error) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(error as { status?: number })?.status ?? null,
					),
					"error",
				);
				setProgress(null);
				setProgressError(
					error instanceof Error ? error.message : String(error),
				);
			} finally {
				setProgressLoading(false);
			}
		},
		[commQueries.getCampaignProgress],
	);

	async function openPreview(campaignId: string) {
		setPreviewFor(campaignId);
		setPreview(null);
		setPreviewError(null);
		try {
			const response = await commQueries.previewCampaign(campaignId);
			setPreview(await readJson<CampaignPreview>(response));
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setPreviewError(error instanceof Error ? error.message : String(error));
		}
		void loadProgress(campaignId);
	}

	useEffect(() => {
		if (!progressFor) return;
		const row = campaigns.find((c) => c.id === progressFor);
		if (row?.status !== "running") return;
		const timer = window.setInterval(() => {
			void loadProgress(progressFor);
		}, 8000);
		return () => window.clearInterval(timer);
	}, [progressFor, campaigns, loadProgress]);

	async function campaignAction(
		campaignId: string,
		action: "launch" | "cancel",
	) {
		setBusy(true);
		setNotice(null);
		try {
			const response = await commQueries.campaignAction(campaignId, action);
			const data = await readJson<{
				queued?: number;
				alreadyQueued?: number;
				cancelledMessages?: number;
			}>(response);
			setNotice({
				kind: "done",
				text:
					action === "launch"
						? `Поставлено в очередь: ${data.queued ?? 0}. Уже стояли: ${data.alreadyQueued ?? 0}. ` +
							"Отправка идёт через общую очередь и подчиняется тихим часам."
						: `Снято с очереди: ${data.cancelledMessages ?? 0}. Уже отправленное осталось в журнале.`,
			});
			await load();
			if (previewFor === campaignId) await openPreview(campaignId);
			else void loadProgress(campaignId);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setNotice(
				failNotice(
					error,
					action === "launch"
						? "Рассылка не запущена: в очередь ничего не поставлено, пациентам ничего не ушло. Проверьте предпросмотр и попробуйте ещё раз."
						: "Рассылка не остановлена — она продолжает отправляться. Попробуйте ещё раз.",
				),
			);
		} finally {
			setBusy(false);
		}
	}

	function closeProgress() {
		setProgressFor(null);
		setProgress(null);
		setProgressError(null);
	}

	function closePreview() {
		setPreviewFor(null);
	}

	return {
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
	};
}

export type UseCampaignPanelReturn = ReturnType<typeof useCampaignPanel>;
