/**
 * DENTE Dental CRM — Funnel Spend & Budget Customization Hook
 * Mandate 8b (<= 120 lines)
 */

import { useEffect, useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	getDefaultChannelSpendMap,
	mapLiveAttributionToChannelSpends,
	parseSanitizedBudgetRub,
} from "./funnelAnalyticsUtils";
import type {
	CanonicalMarketingChannelKey,
	ChannelSpendMap,
	LiveMarketingAttributionPayload,
} from "./types";

interface UseFunnelSpendStateOptions {
	isOpen: boolean;
	attributionEndpoint?: string;
	getRequestHeaders?: () => Record<string, string>;
}

export function useFunnelSpendState({
	isOpen,
	attributionEndpoint = "/api/marketing/attribution",
	getRequestHeaders,
}: UseFunnelSpendStateOptions) {
	const [customSpends, setCustomSpends] = useState<ChannelSpendMap>(() =>
		getDefaultChannelSpendMap(),
	);
	const [isBudgetDrawerOpen, setIsBudgetDrawerOpen] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		let cancelled = false;

		async function fetchLiveSpends() {
			try {
				const headers = getRequestHeaders ? getRequestHeaders() : undefined;
				const res = await fetch(attributionEndpoint, {
					...(headers ? { headers } : {}),
				});
				if (!res.ok) return;
				const data = (await res.json()) as LiveMarketingAttributionPayload;
				if (cancelled || !data) return;

				const liveSpends = mapLiveAttributionToChannelSpends(data);
				if (!cancelled && Object.keys(liveSpends).length > 0) {
					setCustomSpends((prev) => ({
						...prev,
						...liveSpends,
					}));
				}
			} catch {
				// Silently fallback to default spend map on network hiccups
			}
		}

		fetchLiveSpends();
		return () => {
			cancelled = true;
		};
	}, [isOpen, attributionEndpoint, getRequestHeaders]);

	const handleBudgetChange = (
		channelKey: CanonicalMarketingChannelKey,
		valueStr: string,
	) => {
		const num = parseSanitizedBudgetRub(valueStr);
		setCustomSpends((prev) => ({
			...prev,
			[channelKey]: num,
		}));
	};

	const handleResetBudgets = () => {
		setCustomSpends(getDefaultChannelSpendMap());
		showToast("Рекламные бюджеты сброшены к стандартным", "info");
	};

	const toggleBudgetDrawer = () => setIsBudgetDrawerOpen((prev) => !prev);

	return {
		customSpends,
		isBudgetDrawerOpen,
		toggleBudgetDrawer,
		handleBudgetChange,
		handleResetBudgets,
	};
}
