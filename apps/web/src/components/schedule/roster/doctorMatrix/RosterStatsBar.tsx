import React from "react";
import type { RosterStatsBarProps } from "./types";
import { RosterDoctorsTabView } from "./RosterDoctorsTabView";
import { RosterT13TabView } from "./RosterT13TabView";
import { RosterUtilizationTabView } from "./RosterUtilizationTabView";

export const RosterStatsBar: React.FC<RosterStatsBarProps> = React.memo(
	function RosterStatsBar(props) {
		const { activeTab } = props;
		return (
			<>
				{activeTab === "doctors" && <RosterDoctorsTabView {...props} />}
				{activeTab === "t13" && <RosterT13TabView {...props} />}
				{activeTab === "utilization" && <RosterUtilizationTabView {...props} />}
			</>
		);
	},
);
