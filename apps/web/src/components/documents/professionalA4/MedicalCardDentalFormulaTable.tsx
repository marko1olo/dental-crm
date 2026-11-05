import React from "react";
import type { A4DocumentMedicalCardData } from "@dental/shared";
import { DentalFormulaRowTable } from "./DentalFormulaRowTable";
import { MedicalCardPrintDentalArchSvg } from "./MedicalCardPrintDentalArchSvg";

export function MedicalCardDentalFormulaTable({
	medicalCardData,
}: {
	medicalCardData: A4DocumentMedicalCardData;
}): React.JSX.Element {
	// biome-ignore lint/suspicious/noExplicitAny: formula maps
	const mc = medicalCardData as any;

	const initialMap =
		mc.initialTeethFormulaMap || mc.teethFormulaMap || undefined;
	const sanitizedMap =
		mc.sanitizedTeethFormulaMap || mc.teethFormulaMap || undefined;

	return (
		<>
			<div
				style={{ fontSize: "8pt", fontWeight: "bold", margin: "4px 0 2px" }}
			>
				3.1. Анатомическая одонтограмма при первичном обследовании (до лечения):
			</div>
			<MedicalCardPrintDentalArchSvg
				formulaMap={initialMap}
				title=""
			/>

			<div
				style={{ fontSize: "8pt", fontWeight: "bold", margin: "6px 0 2px" }}
			>
				3.2. Состояние зубных рядов после проведенного лечения (санации):
			</div>
			<DentalFormulaRowTable
				formulaMap={sanitizedMap}
				headerBg="#e6f4ea"
				defaultState="Norm"
			/>

			<div
				style={{ fontSize: "7.5pt", color: "#444444", marginBottom: "6px" }}
			>
				Обозначения: C — кариес, P — пульпит, Pt — периодонтит, R — корень, П — пломба, К —
				коронка, И — имплантат, O — отсутствует, — — интактный.
				{medicalCardData.teethFormulaSummary ? (
					<>
						<br />
						<strong>Расшифровка:</strong> {medicalCardData.teethFormulaSummary}
					</>
				) : null}
			</div>
		</>
	);
}
