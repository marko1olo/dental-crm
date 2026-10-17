import React, { useEffect, useMemo, useState } from "react";
import {
	type CallHistoryItem,
	computeMissedCallsSlaSummary,
} from "../../../store/telephonyStore";
import { TelephonyFilterTabs } from "./TelephonyFilterTabs";
import { TelephonySlaBanner } from "./TelephonySlaBanner";
import type { TelephonyCallLogFilter } from "./telephonyDrawerTypes";

export interface TelephonyMissedCallsAlertBarProps {
	callHistory: CallHistoryItem[];
	activeFilter: TelephonyCallLogFilter;
	onFilterChange: (filter: TelephonyCallLogFilter) => void;
}

export function TelephonyMissedCallsAlertBar({
	callHistory,
	activeFilter,
	onFilterChange,
}: TelephonyMissedCallsAlertBarProps): React.JSX.Element {
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		const timer = setInterval(() => {
			if (typeof document !== "undefined" && document.hidden) return;
			setNowMs(Date.now());
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	const slaSummary = useMemo(
		() => computeMissedCallsSlaSummary(callHistory, nowMs),
		[callHistory, nowMs],
	);

	const recordedCount = useMemo(
		() => callHistory.filter((c) => Boolean(c.recordingUrl)).length,
		[callHistory],
	);

	return (
		<div
			className="space-y-2.5"
			data-testid="telephony-missed-calls-alert-bar"
		>
			<TelephonySlaBanner
				slaSummary={slaSummary}
				activeFilter={activeFilter}
				onFilterChange={onFilterChange}
			/>

			<TelephonyFilterTabs
				totalCount={callHistory.length}
				missedCount={slaSummary.totalUnhandledCount}
				recordedCount={recordedCount}
				activeFilter={activeFilter}
				onFilterChange={onFilterChange}
			/>
		</div>
	);
}
