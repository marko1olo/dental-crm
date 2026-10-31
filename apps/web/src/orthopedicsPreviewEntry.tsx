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

import { OrthopedicsStudioModal } from "./components/orthopedics/OrthopedicsStudioModal";

function OrthopedicsPreviewApp() {
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const theme = params.get("theme") || localStorage.getItem("dente_theme_mode") || "light";
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme !== "dark");
		document.documentElement.style.colorScheme = theme;
	}, []);

	return (
		<div className="min-h-screen w-full bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center">
			<OrthopedicsStudioModal
				isOpen={true}
				onClose={() => {}}
				initialToothFdi="16"
				patientName="Ковалев Дмитрий Сергеевич"
				doctorName="Д-р Смирнова Е. В. (Ортопед)"
				clinicName="Стоматологическая клиника DENTE"
				initialLabOrder={{
					orderNumber: "ЗТЛ-402",
					technicianName: "Смирнов А.В.",
					warrantyPassport: "ГП-ЗТЛ-402",
					status: "delivered_to_clinic",
				}}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<OrthopedicsPreviewApp />);
}
