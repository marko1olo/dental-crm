import React from "react";

export interface ImplantPassportModalNavProps {
	readonly activeTab: "protocol" | "isq" | "diary" | "passport";
	readonly setActiveTab: (tab: "protocol" | "isq" | "diary" | "passport") => void;
	readonly torqueNcm: number;
	readonly isIsqEnabled: boolean;
	readonly isqValue: number;
}

export const ImplantPassportModalNav: React.FC<ImplantPassportModalNavProps> = ({
	activeTab,
	setActiveTab,
	torqueNcm,
	isIsqEnabled,
	isqValue,
}) => {
	return (
		<nav className="implant-tabs-nav" role="tablist">
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "protocol"}
				onClick={() => setActiveTab("protocol")}
				className={`secondary-button ${activeTab === "protocol" ? "active" : ""}`}
				data-testid="implant-tab-protocol"
			>
				1. Протокол & Кость
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "isq"}
				onClick={() => setActiveTab("isq")}
				className={`secondary-button ${activeTab === "isq" ? "active" : ""}`}
				data-testid="implant-tab-isq"
			>
				2. Стабильность ({torqueNcm} Н·см{isIsqEnabled ? ` · ${isqValue} ISQ` : " · Ключ"})
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "diary"}
				onClick={() => setActiveTab("diary")}
				className={`secondary-button ${activeTab === "diary" ? "active" : ""}`}
				data-testid="implant-tab-diary"
			>
				3. В дневник приёма
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === "passport"}
				onClick={() => setActiveTab("passport")}
				className={`secondary-button ${activeTab === "passport" ? "active" : ""}`}
				data-testid="implant-tab-passport"
			>
				4. Гарантийный паспорт
			</button>
		</nav>
	);
};
