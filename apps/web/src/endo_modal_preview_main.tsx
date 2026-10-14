import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import { EndoCanalLogModal } from "./components/endo/EndoCanalLogModal";
import { GlobalToast } from "./components/GlobalToast";

function EndoPreviewApp() {
	const [isOpen, setIsOpen] = useState(true);

	return (
		<div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-0 sm:p-4">
			<EndoCanalLogModal
				isOpen={isOpen}
				onClose={() => setIsOpen(true)}
				toothNumber={16}
				toothState="Пульпит K04.0"
				patientName="Захаров Игорь Дмитриевич"
				doctorName="Врач-стоматолог-эндодонтист"
			/>
			<GlobalToast />
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<EndoPreviewApp />);
}
