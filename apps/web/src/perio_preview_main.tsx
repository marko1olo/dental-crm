import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import { EmkPerioSection } from "./components/visit/emk/EmkPerioSection";
import { PeriodontogramChart } from "./components/perio/PeriodontogramChart";
import { GlobalToast } from "./components/GlobalToast";

function PerioPreviewApp() {
	const [diaryForm, setDiaryForm] = useState<Record<string, string>>({
		objectiveStatus: "",
		diagnosis: "",
		treatmentPlan: "",
		complaint: "",
		anamnesis: "",
	});

	const updateField = (field: string, value: any) => {
		setDiaryForm((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] p-2 sm:p-5">
			<div className="max-w-6xl mx-auto space-y-4">
				{/* Header banner */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div>
						<h1 className="text-sm sm:text-base font-black text-[var(--ink)] m-0">
							Пародонтологический скрининг и гигиена полости рта (DENTE)
						</h1>
						<p className="text-xs text-[var(--muted)] m-0">
							Мандат 8e • 1-клик физиологическая норма, индексы OHI-S и автоматический кюретаж
						</p>
					</div>
					<div className="text-xs font-mono px-2.5 py-1 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold">
						Пациент: Смирнова А. С. • Зуб 16
					</div>
				</div>

				{/* 1. EMK Chairside Express Screening & Prophylaxis Section */}
				<EmkPerioSection
					visitNoteForm={diaryForm as any}
					updateVisitNoteField={updateField}
					patientId="demo_perio_patient"
					patientName="Смирнова Анна Сергеевна"
					activeTooth={16}
				/>

				{/* 2. Full Periodontal Chart (Florida Probe / 192 sites) */}
				<div className="mt-4 pt-4 border-t border-[var(--line)]">
					<PeriodontogramChart
						patientId="demo_perio_patient"
						patientName="Смирнова Анна Сергеевна (Пародонтограмма)"
						doctorName="Д-р Воронов А. В."
					/>
				</div>
			</div>
			<GlobalToast />
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<PerioPreviewApp />);
}
