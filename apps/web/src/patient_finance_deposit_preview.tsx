import React, { useState, useEffect } from "react";
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
import "./styles/components.css";

import { PatientCardModal } from "./components/patients/PatientCardModal";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

const SAMPLE_PATIENT = {
	id: "pat-fin-2026",
	fullName: "Воронова Екатерина Сергеевна",
	phone: "+7 (925) 876-54-32",
	birthDate: "1991-03-22",
	gender: "female" as const,
	address: "г. Москва, ул. Арбат, д. 24, кв. 12",
	registrationAddress: "г. Москва, ул. Арбат, д. 24, кв. 12",
	residentialAddress: "г. Москва, ул. Арбат, д. 24, кв. 12",
	patientBalanceRub: 4500,
	familyBalanceRub: 12500,
	familyGroupId: "fam-grp-001",
	docType: "passport_rf" as const,
	passportSeries: "4512",
	passportNumber: "789123",
	inn: "",
	snils: "",
};

export function PatientFinanceDepositPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const initialTheme = (params.get("theme") as ThemeMode) || "dark";
	const [theme, setTheme] = useState<ThemeMode>(initialTheme);
	const [isOpen, setIsOpen] = useState(true);

	useEffect(() => {
		const resolved = resolveTheme(theme, theme === "dark");
		applyThemeToRoot(document.documentElement, resolved);
	}, [theme]);

	return (
		<div className="min-h-screen bg-[var(--paper-soft)] text-[var(--ink)] p-4 font-sans flex flex-col items-center justify-center">
			<header className="w-full max-w-5xl mb-3 p-3 bg-[var(--paper-strong)] border border-[var(--glass-border)] rounded-2xl flex items-center justify-between gap-3 shadow-xs">
				<div className="flex items-center gap-2">
					<span className="font-bold text-xs uppercase tracking-wider text-[var(--muted)]">
						Тема оформления:
					</span>
					<button
						type="button"
						onClick={() => setTheme("light")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
							theme === "light"
								? "bg-[var(--teal)] text-white border-transparent"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--glass-border)]"
						}`}
						data-testid="switch-theme-light"
					>
						Светлая (Light)
					</button>
					<button
						type="button"
						onClick={() => setTheme("dark")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
							theme === "dark"
								? "bg-[var(--teal)] text-white border-transparent"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--glass-border)]"
						}`}
						data-testid="switch-theme-dark"
					>
						Тёмная (Dark)
					</button>
				</div>
				<span className="text-xs text-[var(--muted)] font-medium">
					Мандат 8e: Депозиты & Врачебная автономия
				</span>
			</header>

			<PatientCardModal
				isOpen={isOpen}
				onClose={() => setIsOpen(true)}
				patient={SAMPLE_PATIENT}
				initialTab="finance"
			/>
		</div>
	);
}

const rootElement = document.getElementById("root");
if (rootElement) {
	ReactDOM.createRoot(rootElement).render(<PatientFinanceDepositPreviewApp />);
}
