/**
 * treatmentPlanPreviewEntry.tsx — Preview entry for 3-Tier Treatment Plan (Mandate 8b <= 120 lines).
 */

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./theme.css";
import { TreatmentPlan3TierComparison } from "./components/treatment-plans/TreatmentPlan3TierComparison";
import { generate3TierPlanComparison } from "./components/treatment-plans/treatmentPlanStagesEngine";
import type { TreatmentPlanTierId } from "./components/treatment-plans/types";

const demoTeeth: any[] = [
	{ id: 16, state: "caries", systemicNotes: "Глубокий кариес" },
	{ id: 36, state: "missing", systemicNotes: "Отсутствует зуб, показана имплантация" },
];

function TreatmentPlanPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const themeParam = params.get("theme") || "light";
	const isDark = themeParam === "dark" || themeParam === "night";
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>("optimum");
	const tiers = generate3TierPlanComparison(demoTeeth);

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
		if (isDark) {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
	}, [isDark]);

	return (
		<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col p-0">
			<TreatmentPlan3TierComparison
				tiers={tiers}
				selectedTierId={selectedTierId}
				onSelectTier={setSelectedTierId}
				onApproveAndSign={() => {}}
				onOpenInstallment={() => {}}
				onPrintContract={() => {}}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<TreatmentPlanPreviewApp />);
}
