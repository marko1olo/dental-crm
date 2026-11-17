import React from "react";
import type { A4DocumentMedicalCardData } from "@dental/shared";
import { DentalFormulaRowTable } from "./DentalFormulaRowTable";
import { MedicalCardPrintDentalArchSvg } from "./MedicalCardPrintDentalArchSvg";

interface MedicalCardFormulaPayload extends A4DocumentMedicalCardData {
	readonly initialTeethFormulaMap?: Record<string, string> | null | undefined;
	readonly sanitizedTeethFormulaMap?: Record<string, string> | null | undefined;
}

function normalizeFormulaMap(
	raw: Record<string, string> | Record<string | number, { state?: string; status?: string; label?: string } | undefined> | null | undefined,
): Record<number, { state?: string; statusCode?: string }> | undefined {
	if (!raw) return undefined;
	const result: Record<number, { state?: string; statusCode?: string }> = {};
	for (const [key, val] of Object.entries(raw)) {
		const num = Number(key);
		if (!Number.isNaN(num)) {
			if (typeof val === "string") {
				result[num] = { state: val, statusCode: val };
			} else if (val && typeof val === "object") {
				const state = typeof val.state === "string" ? val.state : typeof val.status === "string" ? val.status : typeof val.label === "string" ? val.label : undefined;
				const statusCode = typeof val.status === "string" ? val.status : typeof val.state === "string" ? val.state : undefined;
				result[num] = { state, statusCode };
			}
		}
	}
	return result;
}

export function MedicalCardDentalFormulaTable({
	medicalCardData,
}: {
	medicalCardData: A4DocumentMedicalCardData;
}): React.JSX.Element {
	const mc = medicalCardData as MedicalCardFormulaPayload;

	const initialMap = normalizeFormulaMap(
		mc.initialTeethFormulaMap || mc.teethFormulaMap,
	);
	const sanitizedMap = normalizeFormulaMap(
		mc.sanitizedTeethFormulaMap || mc.teethFormulaMap,
	);

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
