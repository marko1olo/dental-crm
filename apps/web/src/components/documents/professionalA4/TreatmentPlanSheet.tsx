import type React from "react";
import type { A4DocumentTreatmentPlanData } from "@dental/shared";
import { TreatmentPlanSheetPage1 } from "./TreatmentPlanSheetPage1";
import { TreatmentPlanSheetPage2 } from "./TreatmentPlanSheetPage2";

export interface TreatmentPlanSheetProps {
	zoomClass: string;
	treatmentPlanData: A4DocumentTreatmentPlanData;
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl: any;
}

export const TreatmentPlanSheet: React.FC<TreatmentPlanSheetProps> = ({
	treatmentPlanData,
	cl,
}) => {
	return (
		<div className="pro-a4-sheet-stack" data-testid="a4-treatment-plan-content">
			<TreatmentPlanSheetPage1 treatmentPlanData={treatmentPlanData} />
			<TreatmentPlanSheetPage2 treatmentPlanData={treatmentPlanData} cl={cl} />
		</div>
	);
};
