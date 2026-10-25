/**
 * patientCardPreviewEntry.tsx — Preview entry for EMR 360 Patient Card (Mandate 8b <= 120 lines).
 */

import React, { useEffect } from "react";
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
import { PatientCardModal, DEMO_SHOWCASE_MODAL_PATIENT } from "./components/patients/PatientCardModal";

function PatientCardPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const themeParam = params.get("theme") || "light";
	const isDark = themeParam === "dark" || themeParam === "night";

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
		<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-center p-0 sm:p-4">
			<PatientCardModal
				isOpen={true}
				onClose={() => {}}
				patient={DEMO_SHOWCASE_MODAL_PATIENT}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<PatientCardPreviewApp />);
}
