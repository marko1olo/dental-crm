/**
 * TherapyLaunchers — Терапевтические лаунчеры (гигиена, пародонтология, анамнез, реколлы) (Мандат 8b, <= 120 строк).
 */

import React from "react";
import { HygieneIndicesPanel } from "../../../../hygiene/HygieneIndicesPanel";
import { PeriodontogramChart } from "../../../../perio/PeriodontogramChart";
import { PerioChartModal } from "../../../../perio/PerioChartModal";
import { PeriodontalPocketDepthModal } from "../../../../perio/PeriodontalPocketDepthModal";
import { EmkPerioSection } from "../../../../visit/emk/EmkPerioSection";
import { PatientAnamnesisTab } from "../../../../patient/PatientAnamnesisTab";
import { PatientRecallsHubModal } from "../../../../recalls/PatientRecallsHubModal";
import { renderEmkLauncher } from "./EmkStandaloneLauncher";

function PerioWorkspace() {
	const [diaryForm, setDiaryForm] = React.useState<Record<string, string>>({
		objectiveStatus: "",
		diagnosis: "",
		treatmentPlan: "",
	});
	return (
		<div className="w-full max-w-7xl mx-auto space-y-4">
			<EmkPerioSection
				visitNoteForm={diaryForm as any}
				updateVisitNoteField={(f, v) => setDiaryForm((p) => ({ ...p, [f]: v }))}
				patientId="demo_perio_patient"
				patientName="Смирнова Анна Сергеевна (Пародонтограмма)"
				activeTooth={16}
			/>
			<PeriodontogramChart
				patientId="demo_perio_patient"
				patientName="Смирнова Анна Сергеевна (Пародонтограмма)"
				doctorName="Д-р Соколов А. В."
			/>
		</div>
	);
}

export function renderTherapyLaunchers(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	const emk = renderEmkLauncher();
	if (emk) return emk;

	if (s.includes("hygiene") || h.includes("hygiene")) {
		return (
			<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto" data-testid="hygiene-standalone-workspace">
				<HygieneIndicesPanel patientName="Смирнова Анна Сергеевна" doctorName="Д-р Воронов А. В." />
			</div>
		);
	}

	if (s.includes("perio") || h.includes("perio")) {
		const mode = new URLSearchParams(s).get("perio");
		const cleanClose = () => {
			const u = new URL(window.location.href);
			u.searchParams.delete("perio");
			window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("perio") ? "" : u.hash));
		};
		if (mode === "modal") {
			return (
				<PerioChartModal isOpen={true} onClose={cleanClose} patientId="demo_perio_patient" patientName="Смирнова Анна Сергеевна (Пародонтограмма)" doctorName="Д-р Соколов А. В." />
			);
		}
		if (mode === "pocket") {
			return <PeriodontalPocketDepthModal isOpen={true} onClose={cleanClose} toothNumber={16} />;
		}
		return (
			<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto" data-testid="perio-standalone-workspace">
				<PerioWorkspace />
			</div>
		);
	}

	if (s.includes("anamnesis") || h.includes("anamnesis")) {
		return (
			<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto" data-testid="anamnesis-standalone-workspace">
				<div className="max-w-4xl mx-auto">
					<PatientAnamnesisTab patientId="demo_anamnesis_patient" patientName="Ковалёв Роман Станиславович" />
				</div>
			</div>
		);
	}

	if (s.includes("recalls") || h.includes("recalls")) {
		return (
			<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto" data-testid="recalls-standalone-workspace">
				<PatientRecallsHubModal
					isOpen={true}
					onClose={() => {}}
					initialCandidates={[
						{ id: "rec-1", patientId: "pat-1", fullName: "Иванов Иван Иванович", phone: "+7 (916) 123-45-67", cycleType: "standard_prophylaxis", attendingDoctorId: "doc-1", attendingDoctorName: "Д-р Воронов А. В.", lastVisitDate: "2026-04-10", dueDate: "2026-10-10", daysOverdue: 4, urgencyStatus: "due_now", status: "due_now" },
						{ id: "rec-2", patientId: "pat-2", fullName: "Смирнова Анна Сергеевна", phone: "+7 (925) 987-65-43", cycleType: "implant_monitoring", attendingDoctorId: "doc-2", attendingDoctorName: "Д-р Соколов А. В.", lastVisitDate: "2025-10-14", dueDate: "2026-10-14", daysOverdue: 0, urgencyStatus: "due_now", status: "invited" },
					]}
				/>
			</div>
		);
	}

	return null;
}
