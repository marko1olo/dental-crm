import React, { useState } from "react";
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

function PreviewApp() {
	const [isOpen, setIsOpen] = useState(true);
	const searchParams = new URLSearchParams(window.location.search);
	const section = (searchParams.get("section") as any) || "tax_deduction";

	return (
		<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center p-4">
			<EgiszCertificatesHubModal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				initialSection={section}
				patientName="Смирнов Алексей Викторович"
				patientInn="770123456789"
			/>
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<PreviewApp />);
}
