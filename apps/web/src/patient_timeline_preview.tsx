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

import { PatientHistoryTab, DEFAULT_CLINICAL_VISITS, type ClinicalVisitItem } from "./components/patients/PatientHistoryTab";
import { TreatmentPlansList } from "./components/patients/TreatmentPlansList";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";
import type { TreatmentPlanItem } from "@dental/shared";

const SAMPLE_TREATMENT_PLANS: any[] = [
	{
		id: "plan-item-1",
		organizationId: "00000000-0000-0000-0000-000000000001",
		patientId: "pat-1",
		treatmentPlanId: "tp-main-1",
		serviceId: "srv-comp-1",
		snapshotServiceName: "Установка дентального имплантата Osstem TS III (Южная Корея)",
		snapshotServiceCategory: "surgery",
		toothCode: "46",
		unitPriceRub: 35000,
		discountRub: 0,
		status: "in_progress",
		plannedDoctorUserId: "doc-1",
		plannedChairId: "chair-1",
		notes: "Хирургический этап: лоскут, препарирование костного ложа, торк 35 Нсм, ISQ 74.",
		sortOrder: 1,
	},
	{
		id: "plan-item-2",
		organizationId: "00000000-0000-0000-0000-000000000001",
		patientId: "pat-1",
		treatmentPlanId: "tp-main-1",
		serviceId: "srv-comp-2",
		snapshotServiceName: "Лечение кариеса дентина с реставрацией Filtek Ultimate",
		snapshotServiceCategory: "therapy",
		toothCode: "16",
		unitPriceRub: 7500,
		discountRub: 500,
		status: "completed",
		plannedDoctorUserId: "doc-1",
		plannedChairId: "chair-1",
		notes: "Анатомическое восстановление бугров, полировка Enhance + PoGo.",
		sortOrder: 2,
	},
	{
		id: "plan-item-3",
		organizationId: "00000000-0000-0000-0000-000000000001",
		patientId: "pat-1",
		treatmentPlanId: "tp-main-1",
		serviceId: "srv-comp-3",
		snapshotServiceName: "Коронка из диоксида циркония на имплантате (Prettau)",
		snapshotServiceCategory: "orthopedics",
		toothCode: "46",
		unitPriceRub: 28000,
		discountRub: 0,
		status: "approved",
		plannedDoctorUserId: "doc-1",
		plannedChairId: "chair-1",
		notes: "Винтовая фиксация, титановое основание, цвет VITA A2.",
		sortOrder: 3,
	},
	{
		id: "plan-item-4",
		organizationId: "00000000-0000-0000-0000-000000000001",
		patientId: "pat-1",
		treatmentPlanId: "tp-main-1",
		serviceId: "srv-comp-4",
		snapshotServiceName: "Комплексная профессиональная гигиена Air-Flow + Clinpro",
		snapshotServiceCategory: "hygiene",
		toothCode: null,
		unitPriceRub: 6000,
		discountRub: 0,
		status: "proposed",
		plannedDoctorUserId: "doc-1",
		plannedChairId: "chair-1",
		notes: "Плановый контрольный осмотр и профгигиена через 6 месяцев.",
		sortOrder: 4,
	},
];

function PatientTimelinePreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper-soft)] text-[var(--ink)] antialiased min-h-screen p-4 sm:p-6`;
	}, [rawTheme]);

	return (
		<div className="max-w-6xl mx-auto flex flex-col gap-6">
			{/* Top Bar for Demonstration */}
			<div className="flex items-center justify-between p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-[var(--teal)]" />
					<span className="text-sm font-bold text-[var(--ink)]">
						Клинический таймлайн визитов пациента — Ковалёв Роман Станиславович (38 лет)
					</span>
				</div>
				<div className="flex items-center gap-2 text-xs font-semibold">
					<span className="px-2 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
						Тема: {rawTheme}
					</span>
					<span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
						CLS = 0
					</span>
				</div>
			</div>

			{/* Main Section: Compact Structured Clinical Timeline with Accordions */}
			<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
				<PatientHistoryTab
					patientId="pat-1"
					patientName="Ковалёв Роман Станиславович"
					visits={DEFAULT_CLINICAL_VISITS}
				/>
			</div>

			{/* Secondary Section: Structured Treatment Plans Registry */}
			<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
				<div className="mb-3">
					<h3 className="text-sm font-bold text-[var(--ink)] uppercase tracking-wider">
						Согласованные планы лечения и сметы (ПП РФ №659)
					</h3>
					<p className="text-xs text-[var(--muted)] mt-0.5">
						Фиксация позиций плана, контроль сметных сумм и статусов выполнения
					</p>
				</div>
				<TreatmentPlansList items={SAMPLE_TREATMENT_PLANS} />
			</div>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<PatientTimelinePreviewApp />);
}
