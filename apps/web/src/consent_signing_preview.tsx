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

import { InformedConsentModal } from "./components/consents/InformedConsentModal";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

function ConsentSigningPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const initialMethod = (params.get("method") || "paper_physical") as "tablet_stylus" | "sms_otp" | "paper_physical";
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
					Информированные добровольные согласия (323-ФЗ ст. 20, 1051н) — Live Preview
				</h1>
				<p className="text-xs text-[var(--muted)]">
					Тема: {rawTheme.toUpperCase()} | Метод: {initialMethod} | Zero Fake Signatures
				</p>
			</div>

			<InformedConsentModal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				initialMode="packages"
				initialPackageKey="PACKAGE_PRIMARY_VISIT"
				initialTemplateKey="CONSENT_THERAPY"
				initialVerificationMethod={initialMethod}
				patient={{
					fullName: "Соколова Екатерина Павловна",
					birthDate: "14.05.1991",
					passport: "серия 4515 № 891234",
					phone: "+7 (916) 555-43-21",
					cardNumber: "043/у-2026-8812",
				}}
				doctorName="Смирнов Алексей Викторович"
				doctorSpecialty="Врач-стоматолог-терапевт"
				clinicName="ООО «Стоматологическая клиника ДЕНТЕ»"
				clinicLegalName="ООО «Стоматологическая клиника ДЕНТЕ»"
				clinicAddress="г. Москва, ул. Большая Стоматологическая, д. 12"
				clinicOgrn="1217700123456"
				clinicPhone="+7 (495) 123-45-67"
				licenseNumber="ЛО41-01137-77/00368421"
				diagnosisIcd="K02.1 Кариес дентина"
				toothNumbers="1.6, 1.7"
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<ConsentSigningPreviewApp />
		</React.StrictMode>,
	);
}
