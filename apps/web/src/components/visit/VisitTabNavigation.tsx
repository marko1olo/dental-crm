import { motion } from "framer-motion";
import React from "react";

export type VisitTabType = "diary" | "odontogram" | "diagnostics" | "conclusion";

interface VisitTabNavigationProps {
	activeTab: VisitTabType;
	onTabChange: (tab: VisitTabType) => void;
}

export const VISIT_TABS: Array<{ id: VisitTabType; label: string }> = [
	{ id: "diary", label: "Осмотр" },
	{ id: "odontogram", label: "Зубная формула и Дневник" },
	{ id: "diagnostics", label: "Снимки и Анализы" },
	{ id: "conclusion", label: "Заключение" },
];

export function VisitTabNavigation({
	activeTab,
	onTabChange,
}: VisitTabNavigationProps) {
	return (
		<div className="visit-tabs-navigation">
			{VISIT_TABS.map((tab) => (
				<button
					key={tab.id}
					type="button"
					className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
					onClick={() => onTabChange(tab.id)}
				>
					{tab.label}
					{activeTab === tab.id && (
						<motion.div
							layoutId="visit-tab-indicator"
							className="visit-tab-indicator"
						/>
					)}
				</button>
			))}
		</div>
	);
}
