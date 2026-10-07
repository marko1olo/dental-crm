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
import { TreatmentPlanCompletedActPrint } from "./components/treatment-plans/TreatmentPlanCompletedActPrint";
import type { CompletedWorksActAndWriteOffData } from "./components/treatment-plans/types";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

const sampleActData: CompletedWorksActAndWriteOffData = {
	actNumber: "АКТ-2026/042",
	actDate: "07.10.2026",
	contractNumber: "ДОГ-2026/001",
	patientId: "patient-1",
	patientName: "Кузнецов Дмитрий Михайлович",
	doctorFullName: "Смирнов Алексей Викторович",
	clinicName: 'ООО "Стоматологическая клиника ДЕНТЕ"',
	stageNumber: 1,
	stageTitle: "Терапевтическая санация и эндодонтия",
	completedProcedures: [
		{
			id: "proc-1",
			toothNumber: 46,
			code804n: "A16.07.002.001",
			name: "Наложение пломбы светового отверждения (Estelite Sigma Quick)",
			category: "Терапия",
			priceRub: 6500,
			unitPriceRub: 6500,
			discountRub: 0,
			quantity: 1,
			stageKind: "stage_1_therapy",
		},
		{
			id: "proc-2",
			toothNumber: 46,
			code804n: "A16.07.030.001",
			name: "Инфильтрационная анестезия (Артикаин 4% с эпинефрином)",
			category: "Анестезия",
			priceRub: 1200,
			unitPriceRub: 1200,
			discountRub: 0,
			quantity: 1,
			stageKind: "stage_1_therapy",
		},
	],
	writtenOffMaterials: [
		{
			id: "mat-1",
			materialName: "Артикаин 4% с эпинефрином (карпула 1.7 мл)",
			order804nCode: "A16.07.030.001",
			procedureName: "Анестезия",
			quantityRequired: 1,
			unitOfMeasure: "карп.",
			unitCostRub: 250,
			unitCostKopecks: 25000 as any,
			totalCostRub: 250,
			totalCostKopecks: 25000 as any,
			isDeficit: false,
			deficitQuantity: 0,
		},
		{
			id: "mat-2",
			materialName: "Estelite Sigma Quick A2 (универсальный композит)",
			order804nCode: "A16.07.002.001",
			procedureName: "Пломбирование",
			quantityRequired: 0.3,
			unitOfMeasure: "г",
			unitCostRub: 400,
			unitCostKopecks: 40000 as any,
			totalCostRub: 400,
			totalCostKopecks: 40000 as any,
			isDeficit: false,
			deficitQuantity: 0,
		},
	],
	totalServiceRub: 7700,
	totalServiceKopecks: 770000 as any,
	totalMaterialCostRub: 650,
	totalMaterialCostKopecks: 65000 as any,
	marginRub: 7050,
	marginPercent: 91.5,
	status: "draft",
	createdAtIso: "2026-10-07T14:30:00.000Z",
};

function TreatmentActPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	return (
		<div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4">
			<TreatmentPlanCompletedActPrint
				isOpen={true}
				actData={sampleActData}
				clinicLegalName='ООО "Стоматологическая клиника ДЕНТЕ"'
				clinicInn="7701234567"
				clinicOgrn="1027700132195"
				clinicKpp="770101001"
				clinicAddress="г. Москва, ул. Арбат, д. 20"
				clinicLicense="ЛО41-01137-77/00345678"
				clinicPhone="+7 (495) 777-88-99"
				patientPassport="4512 890123"
				patientBirthDate="14.06.1988"
				patientGender="male"
				patientPhone="+7 (916) 123-45-67"
				doctorSpecialty="Врач-стоматолог-терапевт"
				doctorSnils="123-456-789 00"
				contractDate="15.01.2026"
				onClose={() => {}}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<TreatmentActPreviewApp />);
}
