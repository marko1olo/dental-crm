/**
 * @file TelephonyRecentCallsList.tsx
 * @description Layer 4: Presentation subcomponent for recent call history journal.
 */

import React, { useMemo, useState } from "react";
import { RecentCallHistoryItem } from "./recentCalls/RecentCallHistoryItem";
import { RecentCallsFilterTabs } from "./recentCalls/RecentCallsFilterTabs";
import { type HistoryFilter, filterRecentCalls } from "./recentCalls/filterRecentCalls";
import type { TelephonyRecentCallsListProps } from "./types";

export function TelephonyRecentCallsList({
	callHistory,
	onRedial,
	onSendWhatsApp,
}: TelephonyRecentCallsListProps) {
	const [filter, setFilter] = useState<HistoryFilter>("all");
	const [expandedAudioId, setExpandedAudioId] = useState<string | null>(null);

	const deduplicatedCalls = useMemo(
		() => filterRecentCalls(callHistory, filter),
		[callHistory, filter],
	);

	return (
		<div className="space-y-2.5" data-testid="telephony-call-history-journal">
			<RecentCallsFilterTabs filter={filter} onFilterChange={setFilter} />

			{deduplicatedCalls.length === 0 ? (
				<div
					className="py-8 text-center text-xs text-[var(--muted,#64748b)] space-y-1"
					data-testid="telephony-history-empty"
				>
					<div className="font-semibold text-[var(--ink,#0f172a)]">
						{callHistory.length === 0
							? "История звонков пуста"
							: "Нет звонков по выбранному фильтру"}
					</div>
					<div>
						{callHistory.length === 0
							? "Ожидание вебхука АТС (UIS / Mango / Zadarma / Asterisk)"
							: "Переключите вкладку фильтра для просмотра всех вызовов"}
					</div>
				</div>
			) : (
				deduplicatedCalls.slice(0, 20).map((item) => (
					<RecentCallHistoryItem
						key={item.id}
						item={item}
						isAudioExpanded={expandedAudioId === item.id}
						onToggleAudio={() => setExpandedAudioId(expandedAudioId === item.id ? null : (item.id ?? null))}
						onRedial={onRedial}
						onSendWhatsApp={onSendWhatsApp}
					/>
				))
			)}
		</div>
	);
}
