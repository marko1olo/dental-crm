import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PatientCabinetModal, type PatientCabinetTab } from "./components/portal/patientCabinet/PatientCabinetModal";
import { DEMO_PATIENT_CABINET } from "./components/portal/patientCabinet/patientCabinetPresets";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./components/portal/patientCabinet/patientCabinet.css";

const PortalPreviewApp: React.FC = () => {
	const urlParams = new URLSearchParams(window.location.search);
	const theme = urlParams.get("theme") || "light";
	const rawTab = urlParams.get("tab") || "overview";
	const tab = (rawTab === "treatment_plan" || rawTab === "treatmentPlans" || rawTab === "plan" ? "plans" : rawTab) as PatientCabinetTab;
	const sheet = urlParams.get("sheet") || "";

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		if (theme === "dark" || theme === "night") {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
		document.body.style.background = theme === "dark" ? "#0f172a" : "#f8fafc";
	}, [theme]);

	useEffect(() => {
		if (sheet === "booking") {
			const timer = setTimeout(() => {
				const bookBtn = document.querySelector('[data-testid="quick-action-book"]') as HTMLButtonElement;
				bookBtn?.click();
			}, 350);
			return () => clearTimeout(timer);
		}
		if (sheet === "reception_qr") {
			const timer = setTimeout(() => {
				const qrBtn = document.querySelector('[data-testid="btn-show-reception-qr"]') as HTMLButtonElement;
				qrBtn?.click();
			}, 350);
			return () => clearTimeout(timer);
		}
	}, [sheet]);

	return (
		<div style={{ width: "100%", maxWidth: "100%", height: "100vh", position: "relative" }}>
			<PatientCabinetModal
				isOpen={true}
				initialData={DEMO_PATIENT_CABINET}
				initialTab={tab}
			/>
		</div>
	);
};

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<PortalPreviewApp />);
}
