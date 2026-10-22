import React from "react";
import { Terminal, Globe, Database, Activity } from "lucide-react";
import type { TabKind } from "./diagnosticDrawerTypes";

interface DiagnosticDrawerTabsProps {
	activeTab: TabKind;
	setActiveTab: (tab: TabKind) => void;
	logsCount: number;
	networkLogsCount: number;
	pendingMutationCount: number;
}

export const DiagnosticDrawerTabs: React.FC<DiagnosticDrawerTabsProps> = ({
	activeTab,
	setActiveTab,
	logsCount,
	networkLogsCount,
	pendingMutationCount,
}) => {
	return (
		<div className="dente-diagnostic-tabs">
			<div className="dente-segmented-bar" role="tablist" aria-label="Разделы диагностики">
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "logs"}
					className={`dente-segmented-item ${activeTab === "logs" ? "active" : ""}`}
					onClick={() => setActiveTab("logs")}
				>
					<Terminal size={14} />
					<span>Консоль логов ({logsCount})</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "network"}
					className={`dente-segmented-item ${activeTab === "network" ? "active" : ""}`}
					onClick={() => setActiveTab("network")}
				>
					<Globe size={14} />
					<span>Сетевые запросы ({networkLogsCount})</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "offline"}
					className={`dente-segmented-item ${activeTab === "offline" ? "active" : ""}`}
					onClick={() => setActiveTab("offline")}
				>
					<Database size={14} />
					<span>Офлайн-очередь ({pendingMutationCount})</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "system"}
					className={`dente-segmented-item ${activeTab === "system" ? "active" : ""}`}
					onClick={() => setActiveTab("system")}
				>
					<Activity size={14} />
					<span>Системный отчет</span>
				</button>
			</div>
		</div>
	);
};
