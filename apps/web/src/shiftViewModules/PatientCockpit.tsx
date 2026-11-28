import React from "react";
import { PatientCockpitFeatureGrid } from "../components/shift";
import type { PatientCockpitProps } from "./shiftViewTypes";
import { PatientCockpitEmpty } from "./PatientCockpitEmpty";
import { PatientCockpitInfoCard } from "./PatientCockpitInfoCard";
import { PatientCockpitInsightPanel } from "./PatientCockpitInsightPanel";

export function PatientCockpit({
	activePatient,
	activePatientInsight,
	dashboard,
	activeCommunicationTasks,
	activeImagingStudies,
	activeUsableDocuments,
}: PatientCockpitProps) {
	if (!activePatient) {
		return <PatientCockpitEmpty />;
	}

	return (
		<section className="patient-cockpit dnt-cockpit" aria-label="Карточка пациента">
			<div className="patient-summary-card col-gap-16">
				<p
					className="eyebrow"
					style={{
						margin: 0,
						fontSize: "12px",
						fontWeight: 600,
						color: "var(--muted)",
					}}
				>
					Карточка пациента
				</p>

				<PatientCockpitInfoCard activePatient={activePatient} />
				<PatientCockpitInsightPanel activePatientInsight={activePatientInsight} />
			</div>

			<PatientCockpitFeatureGrid
				activeUsableDocuments={activeUsableDocuments}
				dashboard={dashboard}
				activeCommunicationTasks={activeCommunicationTasks}
				activeImagingStudies={activeImagingStudies}
			/>
		</section>
	);
};
