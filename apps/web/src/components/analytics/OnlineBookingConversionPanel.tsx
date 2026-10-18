import React from "react";
import "./executiveDashboard.css";
import "./onlineBookingAnalytics.css";
import { OnlineBookingAdminComparison } from "./OnlineBookingAdminComparison";
import { OnlineBookingChannelsTable } from "./OnlineBookingChannelsTable";
import { OnlineBookingFunnelView } from "./OnlineBookingFunnelView";
import { OnlineBookingHeader } from "./onlineBookingModules/OnlineBookingHeader";
import { OnlineBookingKpiCards } from "./onlineBookingModules/OnlineBookingKpiCards";
import { useOnlineBookingData } from "./onlineBookingModules/useOnlineBookingData";

export type {
	AdminPhoneFunnelMetric,
	OnlineBookingPeriod,
	SelfBookingChannelMetric,
} from "./onlineBookingModules/onlineBookingTypes";

export function OnlineBookingConversionPanel() {
	const {
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
	} = useOnlineBookingData();

	return (
		<div className="space-y-4" data-testid="online-booking-conversion-panel">
			<OnlineBookingHeader period={period} onPeriodChange={setPeriod} />

			<OnlineBookingKpiCards
				onlineSummary={onlineSummary}
				comparison={comparison}
			/>

			<div className="flex items-center gap-2 border-b border-[var(--line)] pb-2 overflow-x-auto no-scrollbar flex-nowrap">
				<button
					type="button"
					onClick={() => setActiveTab("self_booking")}
					className={`online-tab-btn ${activeTab === "self_booking" ? "active" : ""}`}
				>
					Каналы онлайн-самозаписи ({channels.length})
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("admin_comparison")}
					className={`online-tab-btn ${activeTab === "admin_comparison" ? "active" : ""}`}
				>
					Сравнение: Онлайн vs Администраторы (АТС)
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("funnel")}
					className={`online-tab-btn ${activeTab === "funnel" ? "active" : ""}`}
				>
					Пошаговая воронка конверсии виджета
				</button>
			</div>

			{activeTab === "self_booking" && (
				<OnlineBookingChannelsTable
					channels={channels}
					selectedChannelKey={selectedChannelKey}
					onSelectChannelKey={setSelectedChannelKey}
					savedHours={comparison.savedHours}
					onlineSummary={onlineSummary}
				/>
			)}

			{activeTab === "admin_comparison" && (
				<OnlineBookingAdminComparison
					comparison={comparison}
					onlineSummary={onlineSummary}
					adminFunnel={adminFunnel}
				/>
			)}

			{activeTab === "funnel" && (
				<OnlineBookingFunnelView onlineSummary={onlineSummary} />
			)}
		</div>
	);
}

export default OnlineBookingConversionPanel;
