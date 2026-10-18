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
						fontSize: "11px",
						fontWeight: 700,
						letterSpacing: "0.09em",
						textTransform: "uppercase",
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
