/**
 * XmlClinicalContentSections.tsx — Sections 5-7: Diagnosis, Dental formula, Procedures
 */

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { EgiszDiagnosisItem, EgiszProcedureItem } from "../../egiszRemdEngine";

export interface XmlClinicalContentSectionsProps {
	readonly collapsedSections: Record<string, boolean>;
	readonly onToggleSection: (sectionKey: string) => void;
	readonly diagnoses: readonly EgiszDiagnosisItem[];
	readonly procedures: readonly EgiszProcedureItem[];
}

export const XmlClinicalContentSections: React.FC<XmlClinicalContentSectionsProps> = ({
	collapsedSections,
	onToggleSection,
	diagnoses,
	procedures,
}) => {
	const renderSectionHeader = (key: string, title: string) => (
		<button
			type="button"
			onClick={() => onToggleSection(key)}
			style={{ width: "100%", padding: "0.6rem 0.875rem", textAlign: "left", fontWeight: 700, fontSize: "0.8125rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper-strong)", border: "none", cursor: "pointer" }}
		>
			<span>{title}</span>
			{collapsedSections[key] ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
		</button>
	);

	const codeBoxStyle: React.CSSProperties = { padding: "0.75rem", fontFamily: "monospace", fontSize: "0.75rem", background: "var(--paper)" };
	const boxStyle: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", background: "var(--paper)" };

	return (
		<>
			<div style={boxStyle}>
				{renderSectionHeader("diagnosis", "5. Диагноз и зуб")}
				{!collapsedSections.diagnosis && (
					<div style={codeBoxStyle}>
						<div>&lt;value xsi:type="CD" code="{diagnoses[0]?.icd10Code || 'K02.1'}" displayName="{diagnoses[0]?.icd10Name || 'Кариес дентина'}"/&gt;</div>
					</div>
				)}
			</div>

			<div style={boxStyle}>
				{renderSectionHeader("dentalFormula", "6. Зубная формула")}
				{!collapsedSections.dentalFormula && (
					<div style={codeBoxStyle}>
						<div>&lt;section&gt;</div>
						<div style={{ paddingLeft: "1rem" }}>&lt;code code="74208-1" displayName="Зубная формула и одонтограмма"/&gt;</div>
						<div>&lt;/section&gt;</div>
					</div>
				)}
			</div>

			<div style={boxStyle}>
				{renderSectionHeader("procedures", "7. Оказанные медицинские услуги")}
				{!collapsedSections.procedures && (
					<div style={codeBoxStyle}>
						<div>&lt;procedure classCode="PROC"&gt;</div>
						<div style={{ paddingLeft: "1rem" }}>&lt;code code="{procedures[0]?.code || 'A16.07.002'}" displayName="{procedures[0]?.name || 'Восстановление зуба пломбой'}"/&gt;</div>
						<div>&lt;/procedure&gt;</div>
					</div>
				)}
			</div>
		</>
	);
};
