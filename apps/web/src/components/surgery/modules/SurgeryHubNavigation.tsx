/**
 * SurgeryHubNavigation.tsx — Навигация по сценариям и табам хирургического хаба (DENTE CRM).
 * Мандаты 8d, 8am, 8ze.
 */

import React from "react";
import { Award, FileText, MessageSquare, Stethoscope } from "lucide-react";
import {
	SURGERY_SCENARIOS,
	type SurgeryScenarioType,
} from "../surgeryCatalogData";

export type SurgeryHubTab = "protocol" | "diary" | "passport" | "memo";

export interface SurgeryHubNavigationProps {
	readonly activeScenario: SurgeryScenarioType;
	readonly onSelectScenario: (scen: SurgeryScenarioType) => void;
	readonly activeTab: SurgeryHubTab;
	readonly onSelectTab: (tab: SurgeryHubTab) => void;
}

export const SurgeryHubNavigation: React.FC<SurgeryHubNavigationProps> = ({
	activeScenario,
	onSelectScenario,
	activeTab,
	onSelectTab,
}) => {
	const scenarioKeys = Object.keys(SURGERY_SCENARIOS) as SurgeryScenarioType[];

	return (
		<>
			<nav className="surgery-hub-scenarios-nav" role="region" aria-label="Хирургические сценарии">
				{scenarioKeys.map((scenKey) => {
					const sc = SURGERY_SCENARIOS[scenKey];
					return (
						<button
							key={scenKey}
							type="button"
							onClick={() => onSelectScenario(scenKey)}
							className={`surgery-scenario-chip ${activeScenario === scenKey ? "active" : ""}`}
							data-testid={`scenario-chip-${scenKey}`}
						>
							<span className="text-xs font-bold leading-tight w-full">{sc.titleRu}</span>
							<span className="text-[10px] text-[var(--muted)] leading-tight w-full">
								{sc.defaultPriceRub.toLocaleString("ru-RU")} ₽
							</span>
						</button>
					);
				})}
			</nav>

			<nav className="surgery-hub-tabs-nav" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "protocol"}
					onClick={() => onSelectTab("protocol")}
					className={`surgery-hub-tab-btn ${activeTab === "protocol" ? "active" : ""}`}
					data-testid="tab-surgery-protocol"
				>
					<Stethoscope size={14} className="shrink-0" />
					<span className="hidden sm:inline">1. Протокол &amp; Параметры</span>
					<span className="sm:hidden">1. Протокол</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "diary"}
					onClick={() => onSelectTab("diary")}
					className={`surgery-hub-tab-btn ${activeTab === "diary" ? "active" : ""}`}
					data-testid="tab-surgery-diary"
				>
					<FileText size={14} className="shrink-0" />
					<span className="hidden sm:inline">2. Медицинская карта приёма</span>
					<span className="sm:hidden">2. Карта</span>
				</button>
				{activeScenario === "implant" && (
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "passport"}
						onClick={() => onSelectTab("passport")}
						className={`surgery-hub-tab-btn ${activeTab === "passport" ? "active" : ""}`}
						data-testid="tab-surgery-passport"
					>
						<Award size={14} className="shrink-0" />
						<span className="hidden sm:inline">3. Паспорт имплантата (А5)</span>
						<span className="sm:hidden">3. Паспорт</span>
					</button>
				)}
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "memo"}
					onClick={() => onSelectTab("memo")}
					className={`surgery-hub-tab-btn ${activeTab === "memo" ? "active" : ""}`}
					data-testid="tab-surgery-memo"
				>
					<MessageSquare size={14} className="shrink-0" />
					<span className="hidden sm:inline">
						{activeScenario === "implant" ? "4. Памятка пациенту" : "3. Памятка пациенту"}
					</span>
					<span className="sm:hidden">
						{activeScenario === "implant" ? "4. Памятка" : "3. Памятка"}
					</span>
				</button>
			</nav>
		</>
	);
};
