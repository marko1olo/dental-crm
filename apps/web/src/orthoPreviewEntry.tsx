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

import { OrthodonticWorkspaceModal } from "./components/orthodontics/OrthodonticWorkspaceModal";

function OrthoPreviewApp() {
	const [tab, setTab] = useState<"visit" | "ceph" | "aligners">("visit");

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const theme = params.get("theme") || localStorage.getItem("dente_theme_mode") || "light";
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme !== "dark");
		document.documentElement.style.colorScheme = theme;

		const hash = window.location.hash.toLowerCase();
		if (params.get("modal") === "ceph" || hash.includes("#ceph")) {
			setTab("ceph");
		} else if (params.get("modal") === "aligners" || hash.includes("#aligner")) {
			setTab("aligners");
		} else {
			setTab("visit");
		}
	}, []);

	return (
		<div className="min-h-screen w-full bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center">
			<OrthodonticWorkspaceModal
				isOpen={true}
				onClose={() => {}}
				initialTab={tab}
				patientName="Смирнова Екатерина Андреевна"
				doctorName="Д-р Соколов А. В."
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<OrthoPreviewApp />);
}
