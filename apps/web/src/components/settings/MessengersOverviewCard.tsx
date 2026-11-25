import React, { useCallback, useEffect, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { useSettingsStore } from "../../store/settings";
import { showToast } from "../GlobalToast";
import { MessengerChannelGridItem } from "./messengers/MessengerChannelGridItem";
import {
	type MessengerChannelItem,
	type MessengersOverviewSummary,
	DEFAULT_OVERVIEW_CHANNELS,
} from "./messengers/messengerChannelTypes";
import { MessengersOverviewHeader } from "./messengers/MessengersOverviewHeader";

export interface MessengersOverviewCardProps {
	onSelectTab: (tabId: string) => void;
	onOpenOperatorDesk?: () => void;
	onOpenBotStudio?: () => void;
	className?: string;
}

export function MessengersOverviewCard({ onSelectTab, className = "" }: MessengersOverviewCardProps) {
	const [channels, setChannels] = useState<MessengerChannelItem[]>(DEFAULT_OVERVIEW_CHANNELS);
	const [summary, setSummary] = useState<MessengersOverviewSummary | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [testingChannelId, setTestingChannelId] = useState<string | null>(null);

	const fetchOverview = useCallback(async () => {
		setIsLoading(true);
		try {
			const adminSecret = useSettingsStore.getState().settingsAdminSecretSession;
			const res = await fetch("/api/messengers/overview", {
				headers: denteAdminSecretRequestHeaders({}, adminSecret),
			});
			if (res.ok) {
				const raw = await res.json();
				const data = (raw?.data ?? raw) as {
					channels?: MessengerChannelItem[];
					summary?: MessengersOverviewSummary;
				};
				if (Array.isArray(data?.channels)) setChannels(data.channels);
				if (data?.summary) setSummary(data.summary);
			}
		} catch {
			// keep defaults
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => { void fetchOverview(); }, [fetchOverview]);

	const handleTestChannel = async (ch: MessengerChannelItem) => {
		setTestingChannelId(ch.id);
		try {
			const adminSecret = useSettingsStore.getState().settingsAdminSecretSession;
			const res = await fetch("/api/messengers/test-connection", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders(
					{
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					},
					adminSecret,
				),
				body: JSON.stringify({ channelId: ch.id }),
			});
			const raw = await res.json().catch(() => null);
			const data = (raw?.data ?? raw) as { ok?: boolean; message?: string } | null;
			if (!res.ok || data?.ok === false) {
				showToast(data?.message || `${ch.title}: ошибка проверки канала (${res.status})`, "error");
				return;
			}
			showToast(data?.message || `${ch.title}: связь стабильна`, "success");
		} catch {
			showToast(`${ch.title}: не удалось проверить соединение`, "error");
		} finally {
			setTestingChannelId(null);
		}
	};

	const connectedCount = summary?.connectedCount ?? channels.filter((c) => c.status === "connected").length;
	const pendingCount = summary?.pendingCount ?? channels.filter((c) => c.status === "pending_qr").length;
	const unconfiguredCount = summary?.unconfiguredCount ?? channels.filter((c) => c.status === "unconfigured").length;

	return (
		<div
			className={`w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-xs p-5 flex flex-col gap-4 ${className}`}
			data-testid="messengers-overview-card"
		>
			<MessengersOverviewHeader
				connectedCount={connectedCount}
				pendingCount={pendingCount}
				unconfiguredCount={unconfiguredCount}
				isLoading={isLoading}
				onRefresh={fetchOverview}
			/>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{channels.map((ch) => (
					<MessengerChannelGridItem
						key={ch.id}
						channel={ch}
						isTesting={testingChannelId === ch.id}
						onTest={handleTestChannel}
						onSelectTab={onSelectTab}
					/>
				))}
			</div>
		</div>
	);
}

export default MessengersOverviewCard;
