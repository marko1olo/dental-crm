import {
	calculateAnnualRadiationDose,
	DEFAULT_EFFECTIVE_DOSES_MSV,
	type DentalRadiologyStudyType,
} from "@dental/shared";
import { useMemo, useState } from "react";
import type { RadiationSafetyRecord } from "./radiationSafetyTypes.js";

const DEFAULT_RECORD: RadiationSafetyRecord = {
	id: "rec-1",
	studyDate: new Date().toISOString().slice(0, 10),
	studyType: "intraoral_radiovisiography",
	anatomicalArea: "Зуб 16",
	apparatusName: "Vatech EzSensor Soft",
	effectiveDoseMsv: 0.002,
	effectiveDoseMicrosv: 2.0,
	doctorName: "Лечащий врач",
};

export function useRadiationSafetyRegistry(
	initialRecords: RadiationSafetyRecord[] = [],
) {
	const currentYear = new Date().getFullYear();
	const [records, setRecords] = useState<RadiationSafetyRecord[]>(() =>
		initialRecords.length > 0 ? initialRecords : [DEFAULT_RECORD],
	);
	const doseAssessment = useMemo(
		() => calculateAnnualRadiationDose(records, currentYear),
		[records, currentYear],
	);

	const handleAddStudy = (type: DentalRadiologyStudyType, area: string) => {
		const standardMsv = DEFAULT_EFFECTIVE_DOSES_MSV[type] ?? 0.003;
		setRecords((prev) => [
			{
				id: `dose-${Date.now()}`,
				studyDate: new Date().toISOString().slice(0, 10),
				studyType: type,
				anatomicalArea: area,
				apparatusName: "Цифровой радиовизиограф",
				effectiveDoseMsv: standardMsv,
				effectiveDoseMicrosv: Number((standardMsv * 1000).toFixed(1)),
				doctorName: "Лечащий врач",
			},
			...prev,
		]);
	};

	return { currentYear, records, doseAssessment, handleAddStudy };
}
