/**
 * useMarketingLiveSpends.ts
 *
 * Layer 1/2: Хук загрузки актуальных расходов на каналы привлечения
 * и соотношения онлайн-записи с бэкенда Fastify (/api/marketing/attribution).
 */

import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	type ChannelSpendMap,
	getDefaultChannelSpendMap,
} from "../../components/leads/leadsFunnelEngine";
import type { MarketingAttributionSummary } from "./marketingDashboardTypes";

export function useMarketingLiveSpends() {
	const [customSpends, setCustomSpends] = useState<ChannelSpendMap>(() =>
		getDefaultChannelSpendMap(),
	);
	const [attributionSummary, setAttributionSummary] =
		useState<MarketingAttributionSummary | null>(null);

	useEffect(() => {
		let cancelled = false;
		async function fetchLiveSpends() {
			try {
				const res = await fetch("/api/marketing/attribution", {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (cancelled || !data) return;

				if (data.summary && typeof data.summary.onlineSharePercent === "number") {
					setAttributionSummary({
						onlineSharePercent: data.summary.onlineSharePercent,
						adminSharePercent:
							typeof data.summary.adminSharePercent === "number"
								? data.summary.adminSharePercent
								: Math.max(0, 100 - data.summary.onlineSharePercent),
					});
				}

				const liveSpends: Partial<ChannelSpendMap> = {};
				if (Array.isArray(data.selfBookingChannels)) {
					for (const ch of data.selfBookingChannels) {
						const rub = Math.round((ch.spentKopecks || 0) / 100);
						if (ch.key === "gis_2") liveSpends.gis_2 = rub;
						else if (ch.key === "prodoctorov") liveSpends.prodoctorov = rub;
						else if (ch.key === "yandex_maps") {
							liveSpends.yandex_maps = rub;
							liveSpends.yandex_direct = rub;
						}
						else if (ch.key === "website_widget") liveSpends.site_seo = rub;
						else if (ch.key === "tg_bot" || ch.key === "wa_bot") {
							liveSpends.social_media = (liveSpends.social_media || 0) + rub;
						}
					}
				}
				if (data.telephonyAdminFunnel) {
					liveSpends.other = Math.round(
						(data.telephonyAdminFunnel.spentKopecks || 0) / 100,
					);
				}

				if (!cancelled && Object.keys(liveSpends).length > 0) {
					setCustomSpends((prev) => ({
						...prev,
						...liveSpends,
					}));
				}
			} catch {
				// Silently fall back to standard presets
			}
		}

		fetchLiveSpends();
		return () => {
			cancelled = true;
		};
	}, []);

	return {
		customSpends,
		setCustomSpends,
		attributionSummary,
	};
}
