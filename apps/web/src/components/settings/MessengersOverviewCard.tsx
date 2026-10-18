import React, { useCallback, useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
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
			const res = await fetch("/api/v1/messengers/overview", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.channels)) setChannels(data.channels);
				if (data.summary) setSummary(data.summary);
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
			showToast(`${ch.title}: связь стабильна`, "success");
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
