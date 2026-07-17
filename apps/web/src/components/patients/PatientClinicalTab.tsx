import { Dashboard } from "@dental/shared";
import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import { AnamnesisPanel } from "../AnamnesisPanel";
import { VisiographAnalyzer } from "../imaging/VisiographAnalyzer";
import { OdontogramModule } from "../odontogram/OdontogramModule";
export function PatientClinicalTab() {
	const appLogic = useAppLogicContext();
	const { selectedPatientId } = usePatientStore();

	return (
		<>
			{/* Premium Clinical Experience (Full Width Odontogram + Grid) */}
			<div className="patients-flex-col-gap-24-my">
				<div className="patients-w-100">
					{selectedPatientId && (
						<OdontogramModule
							patientId={selectedPatientId}
							pediatricMode={Boolean(
								(appLogic.dashboard?.clinicSettings?.profile as any)
									?.hasPediatricMode,
							)}
						/>
					)}
				</div>

				<div className="patient-clinical-grid patients-my-0">
					<div className="clinical-col-left">
						<VisiographAnalyzer />
					</div>
					<div className="clinical-col-right">
						{selectedPatientId && (
							<AnamnesisPanel patientId={selectedPatientId} />
						)}
					</div>
				</div>
			</div>
		</>
	);
}
