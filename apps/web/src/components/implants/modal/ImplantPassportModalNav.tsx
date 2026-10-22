import React from "react";
import { FileText, Award, Stethoscope } from "lucide-react";
import type { ImplantModalTab } from "./useImplantPassportLogic";

export interface ImplantPassportModalNavProps {
	readonly activeTab: ImplantModalTab;
	readonly setActiveTab: (tab: ImplantModalTab) => void;
	readonly torqueNcm: number;
}

export const ImplantPassportModalNav: React.FC<ImplantPassportModalNavProps> = ({
	activeTab,
	setActiveTab,
	torqueNcm,
}) => {
	return (
		<nav className="implant-tabs-nav" role="tablist">
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "protocol"}
				onClick={() => setActiveTab("protocol")}
				className={`secondary-button flex items-center gap-1.5 ${activeTab === "protocol" ? "active" : ""}`}
				data-testid="implant-tab-protocol"
			>
				<Stethoscope size={14} className="shrink-0" />
				<span>1. Протокол имплантации ({torqueNcm} Н·см)</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "diary"}
				onClick={() => setActiveTab("diary")}
				className={`secondary-button flex items-center gap-1.5 ${activeTab === "diary" ? "active" : ""}`}
				data-testid="implant-tab-diary"
			>
				<FileText size={14} className="shrink-0" />
				<span>2. В дневник приёма (SOAP)</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "passport"}
				onClick={() => setActiveTab("passport")}
				className={`secondary-button flex items-center gap-1.5 ${activeTab === "passport" ? "active" : ""}`}
				data-testid="implant-tab-passport"
			>
				<Award size={14} className="shrink-0" />
				<span>3. Паспорт имплантата</span>
			</button>
		</nav>
	);
};

export default ImplantPassportModalNav;
