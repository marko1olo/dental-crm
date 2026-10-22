import React from "react";
import { CheckSquare, MessageSquare } from "lucide-react";

interface CopilotDrawerTabsProps {
	activeTab: "chat" | "pending";
	onTabChange: (tab: "chat" | "pending") => void;
	messagesCount: number;
	totalTasksCount: number;
}

export const CopilotDrawerTabs: React.FC<CopilotDrawerTabsProps> = ({
	activeTab,
	onTabChange,
	messagesCount,
	totalTasksCount,
}) => {
	return (
		<div className="copilot-tabs">
			<button
				type="button"
				onClick={() => onTabChange("chat")}
				className={`copilot-tab-btn ${activeTab === "chat" ? "active" : ""}`}
			>
				<MessageSquare size={16} />
				<span>Чат</span>
				{messagesCount > 0 && (
					<span
						style={{
							fontSize: "12px",
							fontWeight: 600,
							padding: "1px 7px",
							borderRadius: "9999px",
							background: "var(--paper-soft)",
							border: "1px solid var(--line)",
						}}
					>
						{messagesCount}
					</span>
				)}
			</button>
			<button
				type="button"
				onClick={() => onTabChange("pending")}
				className={`copilot-tab-btn ${activeTab === "pending" ? "active" : ""}`}
			>
				<CheckSquare size={16} />
				<span>Задачи</span>
				{totalTasksCount > 0 && (
					<span className="copilot-badge-count">{totalTasksCount}</span>
				)}
			</button>
		</div>
	);
};
