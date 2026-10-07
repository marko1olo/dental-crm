import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./components/settings/SettingsPricesTab.css";

import { PrescriptionPrintModal, type PrescriptionFormType } from "./components/prescriptions/PrescriptionPrintModal";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

function PrescriptionModalPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const [theme, setTheme] = useState<ThemeMode>(rawTheme);

	useEffect(() => {
		const resolved = resolveTheme(theme, false);
		applyThemeToRoot(document.documentElement, resolved);
		const isDark = theme === "dark" || theme === "night" || theme === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen p-4`;
	}, [theme]);

	useEffect(() => {
		// biome-ignore lint/suspicious/noExplicitAny: test hook
		(window as any).__setPreviewTheme = (t: ThemeMode) => setTheme(t);
	}, []);

	return (
		<div className="w-full h-full min-h-screen flex items-center justify-center p-2 sm:p-6 bg-slate-900/40">
			<PrescriptionPrintModal
				isOpen={true}
				onClose={() => {}}
				patient={{
					id: "pat-102",
					fullName: "Ковалёв Роман Станиславович",
					birthDate: "1988-04-12",
					cardNumber: "043/у-2026-102",
					address: "Москва, ул. Тверская, 12, кв. 45",
					allergies: ["Пенициллины", "НПВС (аспирин)"],
				}}
				allergies={["Пенициллины", "НПВС (аспирин)"]}
				diary={{ diagnosisIcd10: "K04.0" }}
				doctorName="Д-р Воронов Алексей Владимирович"
				doctorSpecialty="Врач-стоматолог-терапевт"
				doctorSnils="123-456-789 00"
				clinicName="Стоматология ДЕНТЕ Премиум"
				clinicAddress="Москва, Столярный переулок, 14"
				clinicPhone="+7 (495) 123-45-67"
				clinicOgrn="1027700132195"
				clinicInn="7701234567"
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<PrescriptionModalPreviewApp />
		</React.StrictMode>,
	);
}
