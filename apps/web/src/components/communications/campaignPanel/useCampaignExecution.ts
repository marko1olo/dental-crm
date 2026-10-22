import { useCallback, useEffect, useState } from "react";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import { failNotice, type Notice } from "../deliveryReportNotice.js";
import { type CampaignItem, type CampaignPreview, type CampaignProgress, readJson } from "./types.js";

export function useCampaignExecution(
	commQueries: any,
	campaigns: CampaignItem[],
	loadAll: () => Promise<void>,
	setNotice: (n: Notice | null) => void,
	setBusy: (b: boolean) => void,
) {
	const [previewFor, setPreviewFor] = useState<string | null>(null);
	const [preview, setPreview] = useState<CampaignPreview | null>(null);
	const [previewError, setPreviewError] = useState<string | null>(null);

	const [progressFor, setProgressFor] = useState<string | null>(null);
	const [progress, setProgress] = useState<CampaignProgress | null>(null);
	const [progressError, setProgressError] = useState<string | null>(null);
	const [progressLoading, setProgressLoading] = useState(false);

	const loadProgress = useCallback(async (campaignId: string) => {
		setProgressFor(campaignId);
		setProgressLoading(true);
		setProgressError(null);
		try {
			const response = await commQueries.getCampaignProgress(campaignId);
			const data = await readJson<{ byStatus?: Record<string, number>; total?: number }>(response);
			setProgress({ byStatus: data.byStatus ?? {}, total: typeof data.total === "number" ? data.total : 0 });
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			setProgress(null);
			setProgressError(error instanceof Error ? error.message : String(error));
		} finally {
			setProgressLoading(false);
		}
	}, [commQueries]);

	const openPreview = useCallback(async (campaignId: string) => {
		setPreviewFor(campaignId);
		setPreview(null);
		setPreviewError(null);
		try {
			const response = await commQueries.previewCampaign(campaignId);
			setPreview(await readJson<CampaignPreview>(response));
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			setPreviewError(error instanceof Error ? error.message : String(error));
		}
		void loadProgress(campaignId);
	}, [commQueries, loadProgress]);

	useEffect(() => {
		if (!progressFor) return;
		const row = campaigns.find((c) => c.id === progressFor);
		if (row?.status !== "running") return;
		const timer = window.setInterval(() => void loadProgress(progressFor), 8000);
		return () => window.clearInterval(timer);
	}, [progressFor, campaigns, loadProgress]);

	const campaignAction = useCallback(async (campaignId: string, action: "launch" | "cancel") => {
		setBusy(true);
		setNotice(null);
		try {
			const res = await commQueries.campaignAction(campaignId, action);
			const data = await readJson<{ queued?: number; alreadyQueued?: number; cancelledMessages?: number }>(res);
			setNotice({
				kind: "done",
				text: action === "launch"
					? `Поставлено в очередь: ${data.queued ?? 0}. Уже стояли: ${data.alreadyQueued ?? 0}. Отправка идёт через общую очередь и подчиняется тихим часам.`
					: `Снято с очереди: ${data.cancelledMessages ?? 0}. Уже отправленное осталось в журнале.`,
			});
			await loadAll();
			if (previewFor === campaignId) await openPreview(campaignId);
			else void loadProgress(campaignId);
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			setNotice(failNotice(error, action === "launch"
				? "Рассылка не запущена: в очередь ничего не поставлено, пациентам ничего не ушло. Проверьте предпросмотр и попробуйте ещё раз."
				: "Рассылка не остановлена — она продолжает отправляться. Попробуйте ещё раз."));
		} finally {
			setBusy(false);
		}
	}, [commQueries, previewFor, loadAll, openPreview, loadProgress, setBusy, setNotice]);

	return {
		previewFor, preview, previewError, progressFor, progress, progressError, progressLoading,
		loadProgress, openPreview, campaignAction,
		closeProgress: () => { setProgressFor(null); setProgress(null); setProgressError(null); },
		closePreview: () => setPreviewFor(null),
	};
}
