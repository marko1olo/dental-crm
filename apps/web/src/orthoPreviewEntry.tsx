import React, { useState, useEffect } from "react";
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

import { OrthodonticVisitProtocolWidget } from "./components/orthodontics/OrthodonticVisitProtocolWidget";
import { CephalometricAnalysisModal } from "./components/orthodontics/cephModal/CephalometricAnalysisModalUI";

function OrthoPreviewApp() {
	const [isCephOpen, setIsCephOpen] = useState(false);
	const [mode, setMode] = useState<"protocol" | "ceph">("protocol");

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const theme = params.get("theme") || localStorage.getItem("dente_theme_mode") || "light";
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme !== "dark");
		document.documentElement.style.colorScheme = theme;

		if (params.get("modal") === "ceph" || window.location.hash === "#ceph") {
			setMode("ceph");
			setIsCephOpen(true);
		}
	}, []);

	return (
		<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)]">
			{mode === "protocol" ? (
				<OrthodonticVisitProtocolWidget
					isOpen={true}
					onClose={() => {}}
					patientName="Смирнова Екатерина Андреевна"
					patientId="pat-demo-ortho-01"
					doctorName="Д-р Соколов А. В."
					clinicName="DENTE Clinic"
				/>
			) : (
				<CephalometricAnalysisModal
					isOpen={true}
					onClose={() => {}}
					patientName="Смирнова Екатерина Андреевна"
					patientId="pat-demo-ortho-01"
					initialTab="metrics"
				/>
			)}
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<OrthoPreviewApp />);
}
