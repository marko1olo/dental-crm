import React from "react";
import { Scan, Wallet } from "lucide-react";
import { ToothMolar, DentalSyringe, ToothDeciduous } from "../../icons/DentalIcons";
import type { WarmAccordionSection } from "./toothDrawerTypes";

interface ToothDrawerQuickTabsProps {
	activeSection: WarmAccordionSection;
	setActiveSection: (section: WarmAccordionSection) => void;
	isPediatricTooth: boolean;
}

export const ToothDrawerQuickTabs: React.FC<ToothDrawerQuickTabsProps> = ({
	activeSection,
	setActiveSection,
	isPediatricTooth,
}) => {
	return (
		<nav className="dente-drawer-quick-tabs" aria-label="Разделы клинического контекста">
			<button
				type="button"
				onClick={() => setActiveSection("surfaces_endo")}
				className={`dente-quick-tab-btn ${activeSection === "surfaces_endo" ? "active" : ""}`}
			>
				<ToothMolar size={14} />
				<span>1. MOD & Каналы</span>
			</button>

			<button
				type="button"
				onClick={() => setActiveSection("anesthesia")}
				className={`dente-quick-tab-btn ${activeSection === "anesthesia" ? "active" : ""}`}
			>
				<DentalSyringe size={14} />
				<span>2. Анестезия</span>
			</button>

			<button
				type="button"
				onClick={() => setActiveSection("rvg_xray")}
				className={`dente-quick-tab-btn ${activeSection === "rvg_xray" ? "active" : ""}`}
			>
				<Scan size={14} />
				<span>3. Снимок RVG</span>
			</button>

			<button
				type="button"
				onClick={() => setActiveSection("family_loyalty")}
				className={`dente-quick-tab-btn ${activeSection === "family_loyalty" ? "active" : ""}`}
			>
				<Wallet size={14} />
				<span>4. Депозит & Бонусы</span>
			</button>

			{isPediatricTooth && (
				<button
					type="button"
					onClick={() => setActiveSection("pediatric")}
					className={`dente-quick-tab-btn pediatric ${activeSection === "pediatric" ? "active" : ""}`}
				>
					<ToothDeciduous size={14} />
					<span>5. Детский (Франкл)</span>
				</button>
			)}
		</nav>
	);
};
