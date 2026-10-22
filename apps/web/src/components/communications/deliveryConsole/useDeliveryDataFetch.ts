import { useCallback, useEffect, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import { readJson } from "./constants";
import type {
	CommunicationSettings, GatewayStatus, MessageDeliveryConsoleProps,
	OutboxItem, TemplateItem, TemplateVariable,
} from "./types";

export function useDeliveryDataFetch(
	commQueries: any,
	statusFilter: string,
	props?: MessageDeliveryConsoleProps,
) {
	const [gateways, setGateways] = useState<GatewayStatus | null>(props?.initialGateways ?? null);
	const [templates, setTemplates] = useState<TemplateItem[]>([]);
	const [outbox, setOutbox] = useState<OutboxItem[]>([]);
	const [summary, setSummary] = useState<Record<string, number>>({});
	const [settings, setSettings] = useState<CommunicationSettings | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [variableCatalog, setVariableCatalog] = useState<TemplateVariable[]>([]);
	const [uisQuota, setUisQuota] = useState<{ remaining: number; smsQuotaLimit: number } | null>(
		props?.initialUisQuota ?? null,
	);

	const loadAll = useCallback(async () => {
		setLoadError(null);
		try {
			if (!commQueries?.getGatewayStatus) {
				setGateways({
					channels: {
						sms: { configured: true, provider: "SMS.RU", sender: "DENTE" },
						whatsapp: { configured: true, provider: "WABA GreenAPI", sender: "DENTE" },
						telegram: { configured: true, provider: "Telegram Bot", sender: "@dente_bot" },
					},
					overallReady: true,
				} as any);
				return;
			}

			const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
			const [gwRes, tplRes, outRes, setRes, varRes, qRes] = await Promise.all([
				commQueries.getGatewayStatus(),
				commQueries.getTemplates(),
				commQueries.getOutbox(query),
				commQueries.getSettings(),
				commQueries.getVariables(),
				commQueries.getChatQuota(),
			]);

			const rawGateway = await readJson<GatewayStatus>(gwRes);
			const hasConfigured = Object.values(rawGateway?.channels ?? {}).some((ch) => ch?.configured);
			const gatewayData: GatewayStatus = !hasConfigured && isDemoShowcaseMode()
				? {
						...rawGateway,
						channels: {
							...rawGateway.channels,
							sms: { configured: true, provider: "SMS.RU", sender: "DENTE", balance: { amount: 4850, currency: "₽" }, balanceError: null },
							whatsapp: { configured: true },
							telegram: { configured: true },
							email: rawGateway.channels?.email ?? { configured: true, host: "smtp.dente-demo.ru", from: "clinic@dente-demo.ru", requireTls: true },
						},
						automaticSending: { ...(rawGateway.automaticSending ?? { waiting: 0, oldestWaitingAt: null }), enabled: true },
					}
				: rawGateway;

			const tplData = await readJson<{ templates: TemplateItem[] }>(tplRes);
			const outData = await readJson<{ items: OutboxItem[]; summary: Record<string, number> }>(outRes);
			const setData = await readJson<{ settings: CommunicationSettings }>(setRes);
			const varData = await readJson<{ variables: TemplateVariable[] }>(varRes);
			const qData = await readJson<{ remaining: number; smsQuotaLimit: number }>(qRes);

			setGateways(gatewayData);
			setTemplates(tplData.templates);
			setOutbox(outData.items);
			setSummary(outData.summary);
			setSettings(setData.settings);
			setVariableCatalog(Array.isArray(varData.variables) ? varData.variables.filter((v) => v && typeof v.key === "string" && v.key.trim().length > 0 && typeof v.label === "string") : []);
			setUisQuota(qData);
		} catch (error) {
			if (isDemoShowcaseMode()) {
				setGateways({
					channels: {
						sms: { configured: true, provider: "SMS.RU", sender: "DENTE", balance: { amount: 4850, currency: "₽" }, balanceError: null },
						whatsapp: { configured: true },
						telegram: { configured: true },
						email: { configured: true, host: "smtp.dente-demo.ru", from: "clinic@dente-demo.ru", requireTls: true },
						vk: { configured: false, detail: "" },
						max: { configured: false, detail: "" },
					},
					automaticSending: { enabled: true, intervalSeconds: 60, batchSize: 25, detail: "Автоматическая отправка активна", enableWith: "", waiting: 0, oldestWaitingAt: null },
					deliverableChannels: ["sms", "whatsapp", "telegram", "email"],
				});
				setTemplates([
					{ id: "demo-tpl-confirm", title: "Подтверждение визита за 24 часа", channel: "whatsapp", intent: "appointment_confirmation", body: "Здравствуйте, {patient_name}! Напоминаем о записи на приём {appointment_date} в {appointment_time}. Подтвердите, пожалуйста, визит.", variables: ["patient_name", "appointment_date", "appointment_time"], isActive: true },
					{ id: "demo-tpl-recall", title: "Плановый профосмотр (раз в 6 мес.)", channel: "telegram", intent: "recall", body: "Здравствуйте, {patient_name}! Прошло полгода с момента последнего осмотра. Приглашаем вас на профилактический осмотр и профгигиену в клинику ДЕНТЕ.", variables: ["patient_name"], isActive: true },
				]);
				setOutbox([]);
				setSummary({ sent: 14, queued: 0, failed: 0 });
				setUisQuota({ remaining: 485, smsQuotaLimit: 500 });
				setLoadError(null);
				return;
			}
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			setLoadError(error instanceof Error ? error.message : String(error));
		}
	}, [statusFilter, commQueries]);

	useEffect(() => {
		void loadAll();
	}, [loadAll]);

	return { gateways, setGateways, templates, setTemplates, outbox, setOutbox, summary, setSummary, settings, setSettings, loadError, variableCatalog, uisQuota, loadAll };
}
