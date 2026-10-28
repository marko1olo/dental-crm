import React from "react";
import { ToothChart, type ToothData } from "./ToothChart";
import { OdontogramPrintHeader } from "./print/OdontogramPrintHeader";
import { OdontogramPrintTable } from "./print/OdontogramPrintTable";
import { OdontogramPrintFooter } from "./print/OdontogramPrintFooter";

export interface OdontogramPrintA4Props {
	patientId: string;
	teethData: ToothData[];
	isPediatricMode: boolean;
	odontogramUseSurfaces?: boolean | undefined;
	activePatient?: any | undefined;
	activeDoctor?: any | undefined;
	auth?: any | undefined;
}

export const OdontogramPrintA4: React.FC<OdontogramPrintA4Props> = ({
	patientId,
	teethData,
	isPediatricMode,
	odontogramUseSurfaces,
	activePatient,
	activeDoctor,
	auth,
}) => {
	return (
		<div id="odontogram-print-a4" className="hidden print:block font-sans text-slate-900 bg-white p-6">
			<OdontogramPrintHeader
				isPediatricMode={isPediatricMode}
				activePatient={activePatient}
			/>

			<div className="my-4 flex justify-center scale-95 origin-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
				<ToothChart
					patientId={patientId}
					teethData={teethData}
					pediatricMode={isPediatricMode}
					selectedTeeth={[]}
					onToothClick={() => {}}
					useSurfaces={odontogramUseSurfaces}
				/>
			</div>

			<OdontogramPrintTable teethData={teethData} />

			<OdontogramPrintFooter
				activeDoctor={activeDoctor}
				activePatient={activePatient}
				auth={auth}
			/>
		</div>
	);
};
