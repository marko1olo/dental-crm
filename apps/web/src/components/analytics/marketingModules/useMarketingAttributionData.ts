import { useEffect, useMemo, useState } from "react";
import {
	type AdvertisingChannelPerformanceInput,
	calculateMarketingChannelsPerformance,
	type PatientAttributionRecord,
} from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

export function useMarketingAttributionData(
	isOpen: boolean,
	customChannels?: AdvertisingChannelPerformanceInput[],
	customAttributions?: PatientAttributionRecord[],
) {
	const [fetchedChannels, setFetchedChannels] = useState<AdvertisingChannelPerformanceInput[]>([]);
	const [fetchedAttributions, setFetchedAttributions] = useState<PatientAttributionRecord[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	useEffect(() => {
		if (customChannels || !isOpen) return;
		let isCancelled = false;
		setIsLoading(true);

		async function loadLiveChannels() {
			try {
				const res = await fetch("/api/marketing/attribution", {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (isCancelled || !data) return;

				const list: AdvertisingChannelPerformanceInput[] = [];
				if (Array.isArray(data.selfBookingChannels)) {
					for (const ch of data.selfBookingChannels) {
						list.push({
							id: ch.key,
							channelKey: ch.key,
							nameRu: ch.nameRu,
							categoryRu: ch.categoryRu || "Самозапись",
							adSpendKopecks: ch.spentKopecks || 0,
							clicksCount: ch.viewsCount || 0,
							callsCount: ch.slotSelectedCount || 0,
							bookedAppointmentsCount: ch.bookingsCount || 0,
							attendedVisitsCount: ch.attendedCount || 0,
							paidPlansCount: ch.paidPatientsCount || 0,
							revenueKopecks: ch.revenueKopecks || 0,
						});
					}
				}
				if (data.telephonyAdminFunnel) {
					const t = data.telephonyAdminFunnel;
					list.push({
						id: "telephony",
						channelKey: "telephony",
						nameRu: "Телефония и коллтрекинг",
						categoryRu: "Коллтрекинг",
						adSpendKopecks: t.spentKopecks || 0,
						clicksCount: 0,
						callsCount: t.incomingCallsCount || 0,
						bookedAppointmentsCount: t.bookedAppointmentsCount || 0,
						attendedVisitsCount: t.attendedCount || 0,
						paidPlansCount: t.paidPatientsCount || 0,
						revenueKopecks: t.revenueKopecks || 0,
						notes: `Входящих: ${t.incomingCallsCount}, принято: ${t.answeredCallsCount}`,
					});
				}
				if (!isCancelled) {
					setFetchedChannels(list);
					if (Array.isArray(data.attributions)) {
						setFetchedAttributions(data.attributions);
					}
				}
			} catch {
				// Silently leave empty on network error
			} finally {
				if (!isCancelled) setIsLoading(false);
			}
		}

		loadLiveChannels();
		return () => {
			isCancelled = true;
		};
	}, [customChannels, isOpen]);

	const channelsData = useMemo(() => customChannels ?? fetchedChannels, [customChannels, fetchedChannels]);
	const attributionsData = useMemo(() => customAttributions ?? fetchedAttributions, [customAttributions, fetchedAttributions]);

	const { summary, channels: performanceChannels } = useMemo(
		() => calculateMarketingChannelsPerformance(channelsData),
		[channelsData],
	);

	return { channelsData, attributionsData, performanceChannels, summary, isLoading };
}
