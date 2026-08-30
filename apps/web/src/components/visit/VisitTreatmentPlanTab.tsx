import React, { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { TreatmentPlanModule } from "../treatment-plans/TreatmentPlanModule";
import type { ToothData } from "../odontogram/ToothChart";

const ALL_ADULT_FDI_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

function getDefaultToothData(): ToothData[] {
	return ALL_ADULT_FDI_TEETH.map((toothNumber) => ({
		toothNumber,
		state: "Healthy",
	}));
}

export interface VisitTreatmentPlanTabPatient {
	id: string;
	fullName?: string | null | undefined;
	name?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitTreatmentPlanTabProps {
	readonly activePatient?: VisitTreatmentPlanTabPatient | null | undefined;
	readonly teethData?: readonly ToothData[] | undefined;
}

export function VisitTreatmentPlanTab(props?: VisitTreatmentPlanTabProps) {
	const ctx = useAppLogicContext();
	const activePatient = props?.activePatient ?? ctx?.activePatient;

	const patientId = activePatient?.id;
	const patientName =
		activePatient?.fullName ||
		activePatient?.name ||
		ctx?.activePatient?.name ||
		"Пациент";

	// If teethData not directly passed, derive from patient context or generate defaults
	const teethData = useMemo<readonly ToothData[]>(() => {
		if (props?.teethData && props.teethData.length > 0) {
			return props.teethData;
		}
		const patientTeeth = (activePatient as any)?.teeth;
		if (Array.isArray(patientTeeth) && patientTeeth.length > 0) {
			return patientTeeth as ToothData[];
		}
		return getDefaultToothData();
	}, [props?.teethData, activePatient]);

	if (!patientId) {
		return (
			<div className="text-center py-12 px-6 text-slate-500 dark:text-slate-400">
				<Sparkles className="w-8 h-8 text-teal-400 opacity-40 mx-auto mb-2" />
				<h4 className="text-base font-semibold text-slate-900 dark:text-white">
					Пациент не выбран
				</h4>
				<p className="text-sm m-0">
					Выберите пациента, чтобы открыть план лечения.
				</p>
			</div>
		);
	}

	return (
		<div
			data-testid="visit-treatment-plan-tab"
			className="visit-treatment-plan-tab flex flex-col gap-3 w-full max-w-full my-0 p-0"
		>
			<TreatmentPlanModule
				patientId={patientId}
				patientName={patientName}
				teethData={teethData}
			/>
		</div>
	);
}

export default VisitTreatmentPlanTab;
