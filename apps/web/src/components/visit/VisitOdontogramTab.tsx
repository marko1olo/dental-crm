import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { EgiszMonitor } from "../EgiszMonitor";
import { OdontogramModule } from "../odontogram/OdontogramModule";
import { VisitDiaryEditor } from "../VisitDiaryEditor";

export function VisitOdontogramTab() {
	const { activePatient, activeAppointment, dashboard } = useAppLogicContext();

	if (!activePatient?.id || !activeAppointment?.id) return null;

	return (
		<div className="flex flex-col xl:flex-row gap-6 my-6 w-full max-w-full">
			<div className="w-full xl:w-[45%] flex-shrink-0">
				<OdontogramModule
					patientId={activePatient.id}
					pediatricMode={dashboard?.clinicSettings?.profile?.hasPediatricMode}
				/>
			</div>
			<div className="w-full xl:w-[55%] flex-grow">
				<VisitDiaryEditor
					visitId={activeAppointment.id}
					patientId={activePatient.id}
				/>
				<div className="mt-4">
					<EgiszMonitor
						visitId={activeAppointment.id}
						patientId={activePatient.id}
					/>
				</div>
			</div>
		</div>
	);
}
