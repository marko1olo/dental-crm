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
import "./components/egisz/egiszRemd.css";
import { EgiszCertificatesHubModal } from "./components/egisz/EgiszCertificatesHubModal";
import { EgiszRemdHubModal } from "./components/egisz/EgiszRemdHubModal";
import { SAMPLE_DENTAL_SEMD_105_PRESET } from "./components/egisz/egiszRemdSamplePresets";

function PreviewApp() {
	const [isOpen, setIsOpen] = useState(true);
	const searchParams = new URLSearchParams(window.location.search);
	const modal = searchParams.get("modal") || (searchParams.get("section") ? "certs" : "hub");
	const section = (searchParams.get("section") as any) || "queue";
	const tab = (searchParams.get("tab") as any) || "signature";
	const theme = searchParams.get("theme") || "light";

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.body.setAttribute("data-theme", theme);
		document.body.classList.toggle("dark", theme === "dark");
	}, [theme]);

	return (
		<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center p-4">
			{modal === "certs" ? (
				<EgiszCertificatesHubModal
					isOpen={isOpen}
					onClose={() => setIsOpen(false)}
					initialSection={section}
					patientName="Смирнов Алексей Викторович"
					patientInn="770123456789"
				/>
			) : (
				<EgiszRemdHubModal
					isOpen={isOpen}
					onClose={() => setIsOpen(false)}
					initialTab={tab}
					initialPayload={SAMPLE_DENTAL_SEMD_105_PRESET}
				/>
			)}
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<PreviewApp />);
}
