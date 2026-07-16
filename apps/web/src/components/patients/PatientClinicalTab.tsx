import { Dashboard } from "@dental/shared";
import React from "react";
import type { PatientsViewProps } from "../../PatientsView";
import { usePatientStore } from "../../store/patientStore";
import { AnamnesisPanel } from "../AnamnesisPanel";
import { VisiographAnalyzer } from "../imaging/VisiographAnalyzer";
import { OdontogramModule } from "../odontogram/OdontogramModule";
export function PatientClinicalTab({ props }: { props: PatientsViewProps }) {
	const { selectedPatientId } = usePatientStore();

	return (
		<>
			{/* Premium Clinical Experience (Full Width Odontogram + Grid) */}
			<div className="patients-flex-col-gap-24-my">
				{selectedPatientId && <AnamnesisPanel patientId={selectedPatientId} />}
				<div className="patients-w-100">
					{selectedPatientId && (
						<OdontogramModule
							patientId={selectedPatientId}
							pediatricMode={Boolean(
								(props.dashboard?.clinicSettings?.profile as any)
									?.hasPediatricMode,
							)}
						/>
					)}
				</div>

				<div className="patient-clinical-grid patients-my-0">
					<div className="clinical-col-left">
						<VisiographAnalyzer />
					</div>
					<div className="clinical-col-right"></div>
				</div>
			</div>
		</>
	);
}
