/**
 * useMarketingRomiChannels.ts — Hook for ROMI Channels State, Sync & Fastify API persistence.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e, Mandate 8n (Solo Doctor, 1-Click Sync).
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import {
	type AdvertisingChannelInput,
	type AdvertisingChannelMetric,
	buildAdvertisingChannelMetric,
	calculateMarketingRomiSummary,
	aggregateCrmMarketingMetrics,
} from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext.js";
import { DEFAULT_DENTE_CHANNELS } from "./marketingRomiPresets.js";
import type { RomiFieldKey } from "./MarketingRomiTableRow.js";

export function useMarketingRomiChannels() {
	const appLogic = useOptionalAppLogicContext();
	const [channels, setChannels] = useState<AdvertisingChannelInput[]>(() => [...DEFAULT_DENTE_CHANNELS]);
	const [draftInputs, setDraftInputs] = useState<Record<string, string>>({});
	const [syncMessage, setSyncMessage] = useState<string | null>(null);

	const persistChannels = useCallback((updated: AdvertisingChannelInput[]) => {
		setChannels(updated);
		try {
			const headers = appLogic?.auth && typeof appLogic.auth.denteClinicalMutationHeaders === "function"
				? appLogic.auth.denteClinicalMutationHeaders()
				: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() };
			void fetch("/api/marketing/campaigns", {
				method: "POST",
				headers,
				body: JSON.stringify({ channels: updated, campaigns: updated }),
			}).catch(() => {});
		} catch {}
	}, [appLogic?.auth]);

	const calculatedMetrics: AdvertisingChannelMetric[] = useMemo(() => channels.map(buildAdvertisingChannelMetric), [channels]);
	const summary = useMemo(() => calculateMarketingRomiSummary(calculatedMetrics), [calculatedMetrics]);

	const handleUpdateField = useCallback((channelId: string, field: RomiFieldKey, rawValue: string) => {
		const num = Math.max(0, parseFloat(rawValue) || 0);
		const updated = channels.map((ch) => {
			if (ch.id !== channelId) return ch;
			if (field === "spentRub") return { ...ch, spentKopecks: Math.round(num * 100) };
			if (field === "leads") return { ...ch, leadsCount: Math.round(num) };
			if (field === "patients") return { ...ch, primaryPatientsCount: Math.round(num) };
			if (field === "revenueRub") return { ...ch, revenueKopecks: Math.round(num * 100) };
			if (field === "repeatVisits") return { ...ch, repeatVisitsCount: Math.round(num) };
			return ch;
		});
		persistChannels(updated);
	}, [channels, persistChannels]);

	const getInputValue = useCallback((channelId: string, field: RomiFieldKey, def: string) => {
		const key = `${channelId}_${field}`;
		return draftInputs[key] !== undefined ? draftInputs[key] : def;
	}, [draftInputs]);

	const handleInputChange = useCallback((channelId: string, field: RomiFieldKey, rawValue: string) => {
		const key = `${channelId}_${field}`;
		setDraftInputs((prev) => ({ ...prev, [key]: rawValue }));
		if (rawValue.trim() !== "") handleUpdateField(channelId, field, rawValue);
	}, [handleUpdateField]);

	const handleInputBlur = useCallback((channelId: string, field: RomiFieldKey) => {
		const key = `${channelId}_${field}`;
		const rawValue = draftInputs[key];
		if (rawValue !== undefined) {
			handleUpdateField(channelId, field, rawValue);
			setDraftInputs((prev) => {
				const next = { ...prev };
				delete next[key];
				return next;
			});
		}
	}, [draftInputs, handleUpdateField]);

	const handleSyncWithCrm = useCallback(() => {
		const patients = (appLogic?.dashboard?.patients ?? appLogic?.patients ?? []) as any[];
		const appointments = (appLogic?.dashboard?.appointments ?? appLogic?.appointments ?? appLogic?.sortedAppointments ?? []) as any[];
		const payments = (appLogic?.dashboard?.payments ?? appLogic?.payments ?? appLogic?.activePayments ?? []) as any[];
		const communicationEvents = (appLogic?.dashboard?.communicationEvents ?? []) as any[];
		const customBudgetsKopecks: Record<string, number> = {};
		for (const ch of channels) if (ch.spentKopecks > 0) customBudgetsKopecks[ch.channelKey] = ch.spentKopecks;
		const aggregated = aggregateCrmMarketingMetrics({ patients, appointments, payments, communicationEvents, customBudgetsKopecks });
		persistChannels(aggregated);
		const totalPatients = aggregated.reduce((acc, c) => acc + (c.primaryPatientsCount || 0), 0);
		const totalRevRub = Math.round(aggregated.reduce((acc, c) => acc + (c.revenueKopecks || 0), 0) / 100).toLocaleString("ru-RU");
		setSyncMessage(`Синхронизировано с CRM: учтено ${patients.length} пациентов (${totalPatients} первичных), ${appointments.length} приемов, ${payments.length} оплат (выручка ${totalRevRub} ₽)`);
	}, [appLogic, channels, persistChannels]);

	const handleSaveNewChannel = useCallback((newEntry: AdvertisingChannelInput) => persistChannels([...channels, newEntry]), [channels, persistChannels]);
	const handleRemoveChannel = useCallback((id: string) => persistChannels(channels.filter((c) => c.id !== id)), [channels, persistChannels]);
	const handleResetDefaults = useCallback(() => {
		persistChannels([...DEFAULT_DENTE_CHANNELS]);
		setSyncMessage(null);
	}, [persistChannels]);

	useEffect(() => {
		if ((appLogic?.dashboard?.patients?.length ?? 0) > 0) handleSyncWithCrm();
	}, []);

	return {
		channels,
		summary,
		calculatedMetrics,
		syncMessage,
		getInputValue,
		handleInputChange,
		handleInputBlur,
		handleSyncWithCrm,
		handleSaveNewChannel,
		handleRemoveChannel,
		handleResetDefaults,
	};
}
