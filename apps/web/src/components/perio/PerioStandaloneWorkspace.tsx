import React, { useState } from "react";
import { PeriodontogramChart } from "./PeriodontogramChart";
import { EmkPerioSection } from "../visit/emk/EmkPerioSection";

export function PerioStandaloneWorkspace(): React.ReactElement {
	const [diaryForm, setDiaryForm] = useState<Record<string, any>>({
		objectiveStatus: "",
		diagnosis: "",
		treatmentPlan: "",
	});

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto"
			data-testid="perio-standalone-workspace"
		>
			<div className="w-full max-w-7xl mx-auto space-y-4">
				<EmkPerioSection
					visitNoteForm={diaryForm}
					updateVisitNoteField={(field, value) =>
						setDiaryForm((prev) => ({ ...prev, [field]: value }))
					}
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
		</div>
	);
}
