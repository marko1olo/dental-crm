import React from "react";
import { FileText, User, HeartPulse, Activity, Calendar, Award } from "lucide-react";
import type { RecordTabType } from "./recordModalTypes";

interface RecordNavTabsProps {
	activeTab: RecordTabType;
	onSelectTab: (tab: RecordTabType) => void;
	diariesCount: number;
}

export const RecordNavTabs: React.FC<RecordNavTabsProps> = React.memo(function RecordNavTabs({ activeTab, onSelectTab, diariesCount }) {
	return (
		<nav className="emr043-nav-tabs" style={{ flexWrap: "nowrap", width: "100%", padding: "4px 16px", gap: "6px", overflowX: "auto" }}>
			<button type="button" className={`emr043-tab-btn ${activeTab === "overview" ? "active" : ""}`} onClick={() => onSelectTab("overview")}>
				<FileText className="w-3.5 h-3.5 shrink-0" /><span>Обзор и печать A4</span>
			</button>
			<button type="button" className={`emr043-tab-btn ${activeTab === "passport" ? "active" : ""}`} onClick={() => onSelectTab("passport")}>
				<User className="w-3.5 h-3.5 shrink-0" /><span>1. Паспортная часть</span>
			</button>
			<button type="button" className={`emr043-tab-btn ${activeTab === "anamnesis" ? "active" : ""}`} onClick={() => onSelectTab("anamnesis")}>
				<HeartPulse className="w-3.5 h-3.5 shrink-0" /><span>2. Анамнез и соматика</span>
			</button>
			<button type="button" className={`emr043-tab-btn ${activeTab === "odontogram" ? "active" : ""}`} onClick={() => onSelectTab("odontogram")}>
				<Activity className="w-3.5 h-3.5 shrink-0" /><span>3. Зубная формула и индексы</span>
			</button>
			<button type="button" className={`emr043-tab-btn ${activeTab === "diaries" ? "active" : ""}`} onClick={() => onSelectTab("diaries")}>
				<Calendar className="w-3.5 h-3.5 shrink-0" /><span>4. Дневники визитов</span>
				<span style={{ fontSize: "11px", fontWeight: "bold", opacity: 0.8 }}>({diariesCount})</span>
			</button>
			<button type="button" className={`emr043-tab-btn ${activeTab === "epicrisis" ? "active" : ""}`} onClick={() => onSelectTab("epicrisis")}>
				<Award className="w-3.5 h-3.5 shrink-0" /><span>5. Эпикриз и наблюдение</span>
			</button>
		</nav>
	);
});
