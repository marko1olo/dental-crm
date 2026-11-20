import React from "react";
import { Activity, Scan } from "lucide-react";
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
			{isPediatricTooth && (
				<button
					type="button"
					onClick={() => setActiveSection("pediatric")}
					className={`dente-quick-tab-btn pediatric ${activeSection === "pediatric" ? "active" : ""}`}
					data-testid="tooth-quick-tab-pediatric"
				>
					<ToothDeciduous size={14} />
					<span>1. Детский прием</span>
				</button>
			)}

			<button
				type="button"
				onClick={() => setActiveSection("surfaces_endo")}
				className={`dente-quick-tab-btn ${activeSection === "surfaces_endo" ? "active" : ""}`}
			>
				<ToothMolar size={14} />
				<span>{isPediatricTooth ? "2. MOD & Поверхности" : "1. MOD & Каналы"}</span>
			</button>

			<button
				type="button"
				onClick={() => setActiveSection("anesthesia")}
				className={`dente-quick-tab-btn ${activeSection === "anesthesia" ? "active" : ""}`}
			>
				<DentalSyringe size={14} />
				<span>{isPediatricTooth ? "3. Анестезия" : "2. Анестезия"}</span>
			</button>

			<button
				type="button"
				onClick={() => setActiveSection("rvg_xray")}
				className={`dente-quick-tab-btn ${activeSection === "rvg_xray" ? "active" : ""}`}
			>
				<Scan size={14} />
				<span>{isPediatricTooth ? "4. Снимок RVG" : "3. Снимок RVG"}</span>
			</button>

			<button
				type="button"
				onClick={() => setActiveSection("perio")}
				className={`dente-quick-tab-btn ${activeSection === "perio" ? "active" : ""}`}
				data-testid="tooth-quick-tab-perio"
			>
				<Activity size={14} />
				<span>{isPediatricTooth ? "5. Пародонт" : "4. Пародонт"}</span>
			</button>
		</nav>
	);
};
