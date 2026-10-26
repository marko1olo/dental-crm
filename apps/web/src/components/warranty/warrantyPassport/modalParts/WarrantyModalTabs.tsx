import { Calendar, Eye, FileCheck, Sliders, Sparkles } from "lucide-react";
import type React from "react";
import type { WarrantyTab } from "./types";

export interface WarrantyModalTabsProps {
	activeTab: WarrantyTab;
	setActiveTab: (tab: WarrantyTab) => void;
	checkupScheduleCount: number;
	remediationsCount: number;
}

export const WarrantyModalTabs: React.FC<WarrantyModalTabsProps> = ({
	activeTab,
	setActiveTab,
	checkupScheduleCount,
	remediationsCount,
}) => {
	return (
		<div className="warranty-tabs-bar">
			<button
				type="button"
				className={`warranty-tab-btn ${activeTab === "editor" ? "active" : ""}`}
				onClick={() => setActiveTab("editor")}
			>
				<Sliders size={16} /> Позиции и регламент гарантии
			</button>
			<button
				type="button"
				className={`warranty-tab-btn ${activeTab === "preview" ? "active" : ""}`}
				onClick={() => setActiveTab("preview")}
			>
				<Eye size={16} /> Гарантийный паспорт (A4 / A5)
			</button>
			<button
				type="button"
				className={`warranty-tab-btn ${activeTab === "schedule" ? "active" : ""}`}
				onClick={() => setActiveTab("schedule")}
			>
				<Calendar size={16} /> График чекапов ({checkupScheduleCount})
			</button>
			<button
				type="button"
				className={`warranty-tab-btn ${activeTab === "conditions" ? "active" : ""}`}
				onClick={() => setActiveTab("conditions")}
			>
				<FileCheck size={16} /> Правила ухода и гарантии клиники
			</button>
			<button
				type="button"
				className={`warranty-tab-btn warranty-tab-remediation ${activeTab === "remediation" ? "active" : ""}`}
				onClick={() => setActiveTab("remediation")}
			>
				<Sparkles size={16} /> Гарантийная переделка (0 ₽) {remediationsCount > 0 ? `(${remediationsCount})` : ""}
			</button>
		</div>
	);
};
