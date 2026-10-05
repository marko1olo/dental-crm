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
import "./components/insurance/insurance.css";

import { DmsGuaranteeLetterModal } from "./components/insurance/DmsGuaranteeLetterModal";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

function DmsGuaranteeSplitPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const [isOpen, setIsOpen] = useState(true);

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	return (
		<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] p-4 flex flex-col items-center justify-center">
			<div className="text-center mb-4">
				<h1 className="text-lg font-bold text-[var(--ink)]">
					DENTE ДМС — Гарантийное письмо, Франшиза 20% и Сплит-расчет 54-ФЗ
				</h1>
				<p className="text-xs text-[var(--muted)]">
					Тема: {rawTheme.toUpperCase()} | СОГАЗ &bull; Полис 0320-77-009124/26 &bull; Лимит 50 000 ₽ &bull; Сплит: ДМС + Нал + Карта
				</p>
			</div>

			<DmsGuaranteeLetterModal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				patient={{
					id: "pat-dms-01",
					fullName: "Иванова Екатерина Сергеевна",
					birthDate: "14.05.1988",
					policyNumber: "0320-77-009124/26",
					insuranceCompany: "СОГАЗ",
					phone: "+7 (926) 789-01-23",
				}}
				initialLetter={{
					id: "letter-sogaz-01",
					letterNumber: "ГП-СОГАЗ-2026/0892",
					insurerKey: "sogaz",
					insurerName: "АО «СОГАЗ»",
					patientId: "pat-dms-01",
					patientFullName: "Иванова Екатерина Сергеевна",
					policyNumber: "0320-77-009124/26",
					issueDate: "2026-10-01",
					validFrom: "2026-10-01",
					validUntil: "2026-12-31",
					maxCoverageRub: 50000,
					usedAmountRub: 0,
					franchisePct: 20,
					franchiseType: "percent",
					franchiseFixedRub: 0,
					programExclusions: ["orthodontics", "implantology", "whitening", "veneers"],
					approvedServiceCodes: ["A16.07.002.001", "A11.07.010", "A16.07.008.001", "B01.003.004.001"],
					approvedDiagnosisCodes: ["K02.1", "K04.0"],
					notes: "Согласовано терапевтическое лечение зубов 1.6, 1.5, 4.6 по программе «Бизнес-ДМС». Франшиза 20% оплачивается пациентом в кассу клиники.",
					status: "active",
				}}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<DmsGuaranteeSplitPreviewApp />
		</React.StrictMode>
	);
}
