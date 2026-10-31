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
import { PediatricStudioModal } from "./components/pediatric/PediatricStudioModal";
import { Baby, Sparkles } from "lucide-react";

function PediatricPreviewApp() {
	const [isStudioOpen, setIsStudioOpen] = useState(true);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const theme = params.get("theme") || "light";
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme !== "dark");
		document.documentElement.style.colorScheme = theme;
	}, []);

	return (
		<main className="min-h-screen bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] p-4 sm:p-6 flex flex-col items-center justify-center">
			<div className="w-full max-w-md p-6 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-lg text-center space-y-4">
				<div className="w-12 h-12 mx-auto rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
					<Baby className="w-6 h-6" />
				</div>
				<h1 className="text-xl font-black text-[var(--ink,#0f172a)]">
					Детская стоматология SSOT
				</h1>
				<p className="text-xs text-[var(--muted,#64748b)]">
					Молочный прикус FDI 51–85, шкала Франкла 1–4, расчет анестезии по весу, диплом маленького героя и памятка родителям.
				</p>
				<button
					type="button"
					onClick={() => setIsStudioOpen(true)}
					className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
					data-testid="btn-open-pediatric-studio"
				>
					<Sparkles className="w-4 h-4" />
					Открыть детскую студию
				</button>
			</div>

			<PediatricStudioModal
				isOpen={isStudioOpen}
				onClose={() => setIsStudioOpen(false)}
				patientName="Артём Смирнов"
				patientAgeYears={6}
				patientWeightKg={20}
				doctorName="Д-р Смирнова Е.В."
				clinicName="Клиника DENTE"
				initialToothNumber={54}
			/>
		</main>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<PediatricPreviewApp />);
}
