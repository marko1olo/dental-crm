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

import { AppLogicProvider } from "./contexts/AppLogicContext";
import { VisitEmkTab } from "./components/visit/VisitEmkTab";

const SAMPLE_PATIENT = {
	id: "demo-pat-emk-360",
	fullName: "Смирнова Анна Сергеевна",
	birthDate: "1992-05-14",
	gender: "female" as const,
	phone: "+7 (925) 987-65-43",
	cardNumber: "СТ-2026-0843",
	hasSignedContract: true,
	hasSignedConsent: true,
};

const SAMPLE_DASHBOARD = {
	patients: [SAMPLE_PATIENT],
	documents: [
		{ kind: "paid_medical_services_contract", status: "issued", patientId: SAMPLE_PATIENT.id },
		{ kind: "informed_consent", status: "issued", patientId: SAMPLE_PATIENT.id },
	],
};

function EmkPreviewApp() {
	const [visitForm, setVisitForm] = useState<Record<string, any>>({
		complaint: "Периодическая ноющая боль в зубе 1.6 при приёме горячей и холодной пищи.",
		anamnesis: "Соматически здоров. Аллергологический анамнез не отягощен.",
		objectiveStatus: "Зуб 1.6: глубокая кариозная полость на жевательно-медиальной поверхности (MOD), дентин пигментирован, зондирование болезненно по дну.",
		diagnosis: "K04.0 Начальный пульпит зуба 1.6",
		treatmentPlan: "Анестезия Ультракаин Д-С 1.7 мл, препарирование, медикаментозная обработка, наложение девитализирующей пасты, временная пломба.",
		recommendations: "Явка на повторный приём через 5-7 дней для пломбирования корневых каналов.",
	});

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const theme = params.get("theme") || localStorage.getItem("dente_theme_mode") || "light";
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme !== "dark");
		document.documentElement.style.colorScheme = theme;
	}, []);

	const dummyAppLogicContext: any = {
		dashboard: SAMPLE_DASHBOARD,
		activeVisitPatient: SAMPLE_PATIENT,
		visitNoteForm: visitForm,
		updateVisitNoteField: (field: string, value: any) =>
			setVisitForm((prev) => ({ ...prev, [field]: value })),
		money: (rub: number) => `${rub.toLocaleString("ru-RU")} ₽`,
	};

	return (
		<AppLogicProvider value={dummyAppLogicContext}>
			<div
				className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-5 transition-colors duration-200 overflow-y-auto"
				data-testid="emk-standalone-workspace"
			>
				<div className="max-w-6xl mx-auto space-y-4">
					<VisitEmkTab
						activePatient={SAMPLE_PATIENT as any}
						dashboard={SAMPLE_DASHBOARD as any}
						openVisitId="demo-visit-emk-live"
						visitNoteForm={visitForm}
						updateVisitNoteField={(field: string, value: any) =>
							setVisitForm((prev) => ({ ...prev, [field]: value }))
						}
					/>
				</div>
			</div>
		</AppLogicProvider>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<EmkPreviewApp />);
}
