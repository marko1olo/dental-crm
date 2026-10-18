import { useEffect, useMemo, useState } from "react";
import type { Kopecks } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	computeOnlineComparison,
	computeOnlineSummary,
} from "./onlineBookingCalculators";
import {
	DEFAULT_ADMIN_PHONE_FUNNEL,
	DEFAULT_ONLINE_CHANNELS,
} from "./onlineBookingDefaults";
import type {
	AdminPhoneFunnelMetric,
	OnlineBookingPeriod,
	SelfBookingChannelMetric,
} from "./onlineBookingTypes";

function mapIconType(key: string): SelfBookingChannelMetric["iconType"] {
	if (key === "website_widget") return "globe";
	if (key === "yandex_maps") return "yandex";
	if (key === "gis_2") return "gis";
	if (key === "prodoctorov") return "prodoc";
	if (key === "tg_bot") return "tg";
	return "wa";
}

export function useOnlineBookingData() {
	const [period, setPeriod] = useState<OnlineBookingPeriod>("30d");
	const [selectedChannelKey, setSelectedChannelKey] = useState<string>("all");
	const [activeTab, setActiveTab] = useState<
		"self_booking" | "admin_comparison" | "funnel"
	>("self_booking");
	const [channels, setChannels] =
		useState<readonly SelfBookingChannelMetric[]>(DEFAULT_ONLINE_CHANNELS);
	const [adminFunnel, setAdminFunnel] = useState<AdminPhoneFunnelMetric>(
		DEFAULT_ADMIN_PHONE_FUNNEL,
	);
	const [_loading, setLoading] = useState(false);

	useEffect(() => {
		let isMounted = true;
		async function loadLiveAttribution() {
			try {
				setLoading(true);
				const res = await fetch("/api/marketing/attribution", {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (isMounted && Array.isArray(data.selfBookingChannels)) {
					// biome-ignore lint/suspicious/noExplicitAny: API shape
					const mapped = data.selfBookingChannels.map((c: any) => ({
						key: c.key,
						nameRu: c.nameRu,
						categoryRu: c.categoryRu,
						iconType: mapIconType(c.key),
						viewsCount: Math.max(0, Math.round(Number(c.viewsCount) || 0)),
						slotSelectedCount: Math.max(0, Math.round(Number(c.slotSelectedCount) || 0)),
						bookingsCount: Math.max(0, Math.round(Number(c.bookingsCount) || 0)),
						attendedCount: Math.max(0, Math.round(Number(c.attendedCount) || 0)),
						noShowCount: Math.max(0, Math.round(Number(c.noShowCount) || 0)),
						paidPatientsCount: Math.max(0, Math.round(Number(c.paidPatientsCount) || 0)),
						revenueKopecks: Math.max(0, Math.round(Number(c.revenueKopecks) || 0)) as Kopecks,
						spentKopecks: Math.max(0, Math.round(Number(c.spentKopecks) || 0)) as Kopecks,
					}));
					setChannels(mapped);
				}
				if (isMounted && data.telephonyAdminFunnel) {
					const taf = data.telephonyAdminFunnel;
					setAdminFunnel({
						incomingCallsCount: Math.max(0, Math.round(Number(taf.incomingCallsCount) || 0)),
						answeredCallsCount: Math.max(0, Math.round(Number(taf.answeredCallsCount) || 0)),
						bookedAppointmentsCount: Math.max(0, Math.round(Number(taf.bookedAppointmentsCount) || 0)),
						attendedCount: Math.max(0, Math.round(Number(taf.attendedCount) || 0)),
						noShowCount: Math.max(0, Math.round(Number(taf.noShowCount) || 0)),
						paidPatientsCount: Math.max(0, Math.round(Number(taf.paidPatientsCount) || 0)),
						revenueKopecks: Math.max(0, Math.round(Number(taf.revenueKopecks) || 0)) as Kopecks,
						avgCallDurationSeconds: Math.max(0, Math.round(Number(taf.avgCallDurationSeconds) || 120)),
					});
				}
			} catch {
				// Graceful fallback
			} finally {
				if (isMounted) setLoading(false);
			}
		}
		loadLiveAttribution();
		return () => {
			isMounted = false;
		};
	}, []);

	const onlineSummary = useMemo(
		() => computeOnlineSummary(channels, selectedChannelKey),
		[selectedChannelKey, channels],
	);

	const comparison = useMemo(
		() => computeOnlineComparison(onlineSummary, adminFunnel),
		[onlineSummary, adminFunnel],
	);

	return {
		period,
		setPeriod,
		selectedChannelKey,
		setSelectedChannelKey,
		activeTab,
		setActiveTab,
		channels,
		adminFunnel,
		onlineSummary,
		comparison,
	};
}
