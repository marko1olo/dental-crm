/**
 * ClinicalDiagnosesAndProcedures.tsx — ICD-10 diagnoses & 804n procedures lists
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { EgiszDiagnosisItem, EgiszProcedureItem } from "../../egiszRemdEngine";
import { IcdDiagnosesWidget } from "../../../visit/IcdDiagnosesWidget";

export interface ClinicalDiagnosesAndProceduresProps {
	readonly patientId?: string | undefined;
	readonly diagnoses: readonly EgiszDiagnosisItem[];
	readonly onAddDiagnosis: () => void;
	readonly onRemoveDiagnosis: (index: number) => void;
	readonly procedures: readonly EgiszProcedureItem[];
	readonly onAddProcedure: () => void;
	readonly onRemoveProcedure: (index: number) => void;
}

export const ClinicalDiagnosesAndProcedures: React.FC<ClinicalDiagnosesAndProceduresProps> = ({
	patientId,
	diagnoses,
	onAddDiagnosis,
	onRemoveDiagnosis,
	procedures,
	onAddProcedure,
	onRemoveProcedure,
}) => {
	return (
		<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
			<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
					<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
						Клинические диагнозы (МКБ-10)
					</div>
					<button
						type="button"
						onClick={onAddDiagnosis}
						style={{
							display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem",
							fontSize: "0.75rem", fontWeight: 600, borderRadius: "4px", background: "var(--primary)",
							color: "var(--ink-inverse)", border: "none", cursor: "pointer",
						}}
					>
						<Plus size={14} /> Добавить
					</button>
				</div>

				{diagnoses.map((diag, idx) => (
					<div
						key={idx}
						style={{
							display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem",
							padding: "0.35rem 0", borderBottom: "1px solid var(--line)", fontSize: "0.8125rem",
						}}
					>
						<div>
							<span style={{ fontWeight: 700, color: "var(--primary)" }}>{diag.icd10Code}</span> &bull; {diag.icd10Name}
							{diag.tooth ? ` (Зуб ${diag.tooth})` : ""}
						</div>
						<button
							type="button"
							onClick={() => onRemoveDiagnosis(idx)}
							style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
						>
							<Trash2 size={14} />
						</button>
					</div>
				))}

				<div style={{ marginTop: diagnoses.length > 0 ? "0.75rem" : "0.25rem" }}>
					<IcdDiagnosesWidget {...(patientId ? { patientId } : {})} />
				</div>
			</div>

			<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
					<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
						Оказанные медицинские услуги
					</div>
					<button
						type="button"
						onClick={onAddProcedure}
						style={{
							display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem",
							fontSize: "0.75rem", fontWeight: 600, borderRadius: "4px", background: "var(--primary)",
							color: "var(--ink-inverse)", border: "none", cursor: "pointer",
						}}
					>
						<Plus size={14} /> Добавить
					</button>
				</div>

				{procedures.map((proc, idx) => (
					<div
						key={idx}
						style={{
							display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem",
							padding: "0.35rem 0", borderBottom: "1px solid var(--line)", fontSize: "0.8125rem",
						}}
					>
						<div>
							<span style={{ fontWeight: 700, color: "var(--primary)" }}>{proc.code}</span> &bull; {proc.name}
							{proc.tooth ? ` (Зуб ${proc.tooth})` : ""}
						</div>
						<button
							type="button"
							onClick={() => onRemoveProcedure(idx)}
							style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
						>
							<Trash2 size={14} />
						</button>
					</div>
				))}
			</div>
		</div>
	);
};
