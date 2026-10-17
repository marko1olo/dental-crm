import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import { PrescriptionModal } from "./components/prescriptions/PrescriptionModal";
import { GlobalToast } from "./components/GlobalToast";

function PrescriptionPreviewApp() {
	const [isOpen, setIsOpen] = useState(true);

	useEffect(() => {
		(window as any).__setPreviewTheme = (theme: "light" | "dark") => {
			if (theme === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.setAttribute("data-theme", "dark");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.setAttribute("data-theme", "light");
			}
		};
	}, []);

	return (
		<div className="min-h-screen bg-[var(--canvas)] p-0 sm:p-4">
			<PrescriptionModal
				isOpen={isOpen}
				onClose={() => setIsOpen(true)}
				patient={{
					fullName: "Иванов Иван Иванович",
					cardNumber: "4201",
					birthDate: "1988-04-12",
					gender: "male",
					allergies: ["Пенициллин"],
				}}
				doctorName="Д-р Соколов А. В."
				clinicName="ООО «ДЕНТЕ КЛИНИК»"
				initialSelectedDrugIds={["amoxiclav_875_125"]}
			/>
			<GlobalToast />
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<PrescriptionPreviewApp />);
}
