import { useCallback, useEffect, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import { type CampaignItem, type CampaignPanelProps, type TemplateOption, type TemplateVariable, readJson } from "./types.js";

export function useCampaignDataLoader(commQueries: any, initialProps: CampaignPanelProps = {}) {
	const [campaigns, setCampaigns] = useState<CampaignItem[]>(() => initialProps.initialCampaigns ?? []);
	const [templates, setTemplates] = useState<TemplateOption[]>(() => initialProps.initialTemplates ?? []);
	const [variables, setVariables] = useState<TemplateVariable[]>([]);
	const [loadError, setLoadError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoadError(null);
		try {
			const [campRes, tplRes, varRes] = await Promise.all([
				commQueries.getCampaigns(),
				commQueries.getCampaignsTemplates(),
				commQueries.getCampaignsVariables(),
			]);
			const campData = await readJson<{ campaigns: CampaignItem[] }>(campRes);
			const tplData = await readJson<{ templates: TemplateOption[] }>(tplRes);
			const varData = await readJson<{ variables: TemplateVariable[] }>(varRes);
			setCampaigns(campData.campaigns);
			setTemplates((tplData.templates || []).filter((t) => t.isActive));
			setVariables(varData.variables ?? []);
		} catch (error) {
			if (isDemoShowcaseMode()) {
				setTemplates([
					{ id: "demo-tpl-recall-6m", title: "Профосмотр раз в 6 месяцев", channel: "whatsapp", intent: "recall_reminder", isActive: true },
					{ id: "demo-tpl-hygiene-3m", title: "Профгигиена (ортодонтия и имплантаты)", channel: "telegram", intent: "hygiene_recall", isActive: true },
				]);
				setCampaigns([]);
				setLoadError(null);
				return;
			}
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			setLoadError(error instanceof Error ? error.message : String(error));
		}
	}, [commQueries]);

	useEffect(() => { void load(); }, [load]);

	return { campaigns, setCampaigns, templates, setTemplates, variables, loadError, load };
}
