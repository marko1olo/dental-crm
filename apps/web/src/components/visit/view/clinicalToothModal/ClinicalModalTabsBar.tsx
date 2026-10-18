import React from "react";
import { Crown, Sparkles, Stethoscope, Zap } from "lucide-react";
import type { ClinicalTabType } from "./clinicalModalTypes";

export interface ClinicalModalTabsBarProps {
	activeTab: ClinicalTabType;
	setActiveTab: (tab: ClinicalTabType) => void;
}

export const ClinicalModalTabsBar: React.FC<ClinicalModalTabsBarProps> = ({
	activeTab,
	setActiveTab,
}) => {
	return (
		<div className="_ccm-tabs-bar">
			<button
				type="button"
				onClick={() => setActiveTab("diagnosis")}
				className={`_ccm-tab-btn${activeTab === "diagnosis" ? " active" : ""}`}
			>
				<Stethoscope className="w-3.5 h-3.5 shrink-0" />
				<span>Диагностика</span>
			</button>
			<button
				type="button"
				onClick={() => setActiveTab("therapy")}
				className={`_ccm-tab-btn${activeTab === "therapy" ? " active" : ""}`}
			>
				<Sparkles className="w-3.5 h-3.5 shrink-0" />
				<span>Терапия & Пломба</span>
			</button>
			<button
				type="button"
				onClick={() => setActiveTab("endo")}
				className={`_ccm-tab-btn${activeTab === "endo" ? " active" : ""}`}
			>
				<Zap className="w-3.5 h-3.5 shrink-0" />
				<span>Эндодонтия</span>
			</button>
			<button
				type="button"
				onClick={() => setActiveTab("surgery")}
				className={`_ccm-tab-btn${activeTab === "surgery" ? " active" : ""}`}
			>
				<Crown className="w-3.5 h-3.5 shrink-0" />
				<span>Орто & Хирургия</span>
			</button>
		</div>
	);
};
