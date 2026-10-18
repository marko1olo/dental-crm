import React from "react";
import type {
	AdminPhoneFunnelMetric,
	OnlineBookingComparisonData,
	OnlineBookingSummary,
} from "./onlineBookingModules/onlineBookingTypes";
import { AdminTelephonyCard } from "./onlineBookingModules/AdminTelephonyCard";
import { OnlineSelfBookingCard } from "./onlineBookingModules/OnlineSelfBookingCard";

export interface OnlineBookingAdminComparisonProps {
	readonly comparison: OnlineBookingComparisonData;
	readonly onlineSummary: OnlineBookingSummary;
	readonly adminFunnel: AdminPhoneFunnelMetric;
}

export function OnlineBookingAdminComparison({
	comparison,
	onlineSummary,
	adminFunnel,
}: OnlineBookingAdminComparisonProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			<OnlineSelfBookingCard
				comparison={comparison}
				onlineSummary={onlineSummary}
			/>
			<AdminTelephonyCard
				comparison={comparison}
				adminFunnel={adminFunnel}
			/>
		</div>
	);
}

export default OnlineBookingAdminComparison;
