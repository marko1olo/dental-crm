/**
 * DENTE CRM — Patient Plan Anatomical Dental Formula
 * (DOMAIN: PORTAL PATIENT CABINET - DENTAL FORMULA & HEALTH INDEX)
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import { DenteToothSvgDefs } from "../../odontogram/ToothChart";
import {
	type PatientToothInfo,
	type PatientToothStatus,
	calculateDentalHealthIndex,
} from "../PatientFriendlyOdontogram";
import { PatientToothDetailBox } from "../PatientToothDetailBox";
import { PatientHealthIndexCard } from "../patientOdontogram/PatientHealthIndexCard";
import { PatientStatusFilterBar } from "../patientOdontogram/PatientStatusFilterBar";
import { PatientPlanAnatomicalNode } from "./PatientPlanAnatomicalNode";

export interface PatientPlanDentalFormulaProps {
	readonly teeth: readonly PatientToothInfo[];
	readonly onSelectTooth?: (tooth: PatientToothInfo) => void;
	readonly showHealthIndex?: boolean;
}

const UR_FDI = ["18", "17", "16", "15", "14", "13", "12", "11"];
const UL_FDI = ["21", "22", "23", "24", "25", "26", "27", "28"];
const LR_FDI = ["48", "47", "46", "45", "44", "43", "42", "41"];
const LL_FDI = ["31", "32", "33", "34", "35", "36", "37", "38"];

export const PatientPlanDentalFormula: React.FC<PatientPlanDentalFormulaProps> = memo(({
	teeth,
	onSelectTooth,
	showHealthIndex = true,
}) => {
	const [selectedFdi, setSelectedFdi] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<"all" | PatientToothStatus>("all");

	const healthIndex = useMemo(() => calculateDentalHealthIndex(teeth), [teeth]);
	const toothMap = useMemo(() => new Map(teeth.map((t) => [t.fdiCode, t])), [teeth]);
	const selectedTooth = selectedFdi ? toothMap.get(selectedFdi) ?? null : null;

	const handleToothClick = useCallback((tooth: PatientToothInfo) => {
		setSelectedFdi((prev) => (prev === tooth.fdiCode ? null : tooth.fdiCode));
		onSelectTooth?.(tooth);
	}, [onSelectTooth]);

	const fallbackTooth = (fdi: string): PatientToothInfo => ({
		fdiCode: fdi, status: "healthy", humanNameRu: `Зуб №${fdi}`, clinicalStateRu: "Здоров",
	});

	const renderToothNode = (fdi: string, x: number, y: number, isTop: boolean) => (
		<PatientPlanAnatomicalNode
			key={fdi} fdi={fdi} x={x} y={y} isTop={isTop}
			tooth={toothMap.get(fdi) || fallbackTooth(fdi)}
			isSelected={selectedFdi === fdi}
			isDimmed={statusFilter !== "all" && toothMap.get(fdi)?.status !== statusFilter}
			onSelect={handleToothClick}
		/>
	);

	return (
		<div className="pc-dental-formula-container" data-testid="patient-plan-dental-formula" style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", boxSizing: "border-box" }}>
			<DenteToothSvgDefs />
			{showHealthIndex && <PatientHealthIndexCard healthIndex={healthIndex} />}
			<PatientStatusFilterBar statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} healthIndex={healthIndex} />
			<div className="pc-svg-arch-wrapper" data-testid="pc-svg-arch-wrapper" style={{ backgroundColor: "var(--pc-bg, #0f172a)", border: "1px solid var(--pc-border, #334155)", borderRadius: "12px", padding: "12px 8px", width: "100%", boxSizing: "border-box", overflow: "hidden" }}>
				<div style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, color: "var(--pc-text-muted, #64748b)", marginBottom: "6px", letterSpacing: "0.5px" }}>
					ВЕРХНЯЯ ЧЕЛЮСТЬ (ПРАВАЯ И ЛЕВАЯ СТОРОНЫ)
				</div>
				<svg viewBox="0 0 580 180" style={{ width: "100%", height: "auto", maxHeight: "180px", display: "block", margin: "0 auto", aspectRatio: "580 / 180" }} role="img" aria-label="Интерактивная зубная формула пациента">
					<line x1="290" y1="10" x2="290" y2="170" stroke="var(--pc-border, #334155)" strokeWidth="1.5" strokeDasharray="4 4" />
					<line x1="10" y1="90" x2="570" y2="90" stroke="var(--pc-border, #334155)" strokeWidth="1" />
					{UR_FDI.map((fdi, i) => renderToothNode(fdi, 16 + i * 33, 14, true))}
					{UL_FDI.map((fdi, i) => renderToothNode(fdi, 300 + i * 33, 14, true))}
					{LR_FDI.map((fdi, i) => renderToothNode(fdi, 16 + i * 33, 98, false))}
					{LL_FDI.map((fdi, i) => renderToothNode(fdi, 300 + i * 33, 98, false))}
				</svg>
				<div style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, color: "var(--pc-text-muted, #64748b)", marginTop: "6px", letterSpacing: "0.5px" }}>
					НИЖНЯЯ ЧЕЛЮСТЬ (ПРАВАЯ И ЛЕВАЯ СТОРОНЫ)
				</div>
			</div>
			{selectedTooth && <PatientToothDetailBox selectedTooth={selectedTooth} onClose={() => setSelectedFdi(null)} />}
		</div>
	);
});

PatientPlanDentalFormula.displayName = "PatientPlanDentalFormula";
export default PatientPlanDentalFormula;
