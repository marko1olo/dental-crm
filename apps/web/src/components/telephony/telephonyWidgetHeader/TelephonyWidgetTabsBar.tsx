import { History, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import React from "react";
import type { TelephonyLineSession } from "../../../store/telephonyStore";

export interface TelephonyWidgetTabsBarProps {
	activeTab: "call" | "dialer" | "history";
	onSelectTab: (tab: "call" | "dialer" | "history") => void;
	callHistoryCount: number;
	activeLineId: number;
	onSwitchLine: (line: 1 | 2) => void;
	line1?: TelephonyLineSession | undefined;
	line2?: TelephonyLineSession | undefined;
}

export function TelephonyWidgetTabsBar({
	activeTab,
	onSelectTab,
	callHistoryCount,
	activeLineId,
	onSwitchLine,
	line1,
	line2,
}: TelephonyWidgetTabsBarProps) {
	return (
		<div className="dnt-widget-tabs-bar">
			<div className="dnt-tabs-group">
				<button
					type="button"
					onClick={() => onSelectTab("call")}
					className={`dnt-tab-btn ${activeTab === "call" ? "dnt-tab-btn--active" : ""}`}
				>
					<PhoneIncoming size={14} />
					<span>Вызов</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTab("dialer")}
					className={`dnt-tab-btn ${activeTab === "dialer" ? "dnt-tab-btn--active" : ""}`}
				>
					<PhoneOutgoing size={14} />
					<span>Набор</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTab("history")}
					className={`dnt-tab-btn ${activeTab === "history" ? "dnt-tab-btn--active" : ""}`}
				>
					<History size={14} />
					<span>Журнал{callHistoryCount > 0 ? ` (${callHistoryCount})` : ""}</span>
				</button>
			</div>

			<div className="dnt-segmented-group">
				<button
					type="button"
					onClick={() => onSwitchLine(1)}
					className={`dnt-line-chip ${activeLineId === 1 ? "dnt-line-chip--active" : ""}`}
					title={line1?.call ? `Линия 1: ${line1.call.patientName || line1.call.phone}` : "Линия 1 свободна"}
				>
					<span className={`dnt-line-dot ${line1?.call ? "dnt-line-dot--busy" : ""}`} />
					<span>Л1</span>
				</button>
				<button
					type="button"
					onClick={() => onSwitchLine(2)}
					className={`dnt-line-chip ${activeLineId === 2 ? "dnt-line-chip--active" : ""}`}
					title={line2?.call ? `Линия 2: ${line2.call.patientName || line2.call.phone}` : "Линия 2 свободна"}
				>
					<span className={`dnt-line-dot ${line2?.call ? "dnt-line-dot--busy" : ""}`} />
					<span>Л2</span>
				</button>
			</div>
		</div>
	);
}
