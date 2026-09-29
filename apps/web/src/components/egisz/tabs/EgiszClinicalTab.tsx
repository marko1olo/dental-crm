/**
 * EgiszClinicalTab.tsx
 *
 * Tab 1: Dental Clinical SEMD Protocol Editor (Form 043/u, SEMD 105 / 302 / 303).
 * Interactive FDI Dental Formula (ISO 3950), ICD-10 Diagnoses and 804n Procedures.
 * Mandate 8e: Doctor Autonomy (Zero disabled buttons).
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
	DENTAL_TOOTH_STATUS_DICTIONARY,
	type EgiszDentalSemdCode,
	type EgiszDiagnosisItem,
	type EgiszDoctorInfo,
	type EgiszPatientInfo,
	type EgiszProcedureItem,
	FDI_ADULT_TEETH,
} from "../egiszRemdEngine";

export interface EgiszClinicalTabProps {
	readonly semdDocCode: EgiszDentalSemdCode;
	readonly onSemdDocCodeChange: (code: EgiszDentalSemdCode) => void;
	readonly patient: EgiszPatientInfo;
	readonly onPatientChange: (patient: EgiszPatientInfo) => void;
	readonly doctor: EgiszDoctorInfo;
	readonly onDoctorChange: (doctor: EgiszDoctorInfo) => void;
	readonly complaints: string;
	readonly onComplaintsChange: (complaints: string) => void;
	readonly anamnesisMorbi: string;
	readonly onAnamnesisMorbiChange: (anamnesis: string) => void;
	readonly selectedTooth: number;
	readonly onSelectTooth: (tooth: number) => void;
	readonly toothStates: Record<number, string>;
	readonly onUpdateToothStatus: (tooth: number, status: string) => void;
	readonly diagnoses: readonly EgiszDiagnosisItem[];
	readonly onAddDiagnosis: () => void;
	readonly onRemoveDiagnosis: (index: number) => void;
	readonly procedures: readonly EgiszProcedureItem[];
	readonly onAddProcedure: () => void;
	readonly onRemoveProcedure: (index: number) => void;
}

export const EgiszClinicalTab: React.FC<EgiszClinicalTabProps> = ({
	semdDocCode,
	onSemdDocCodeChange,
	patient,
	onPatientChange,
	doctor,
	onDoctorChange,
	complaints,
	onComplaintsChange,
	anamnesisMorbi,
	onAnamnesisMorbiChange,
	selectedTooth,
	onSelectTooth,
	toothStates,
	onUpdateToothStatus,
	diagnoses,
	onAddDiagnosis,
	onRemoveDiagnosis,
	procedures,
	onAddProcedure,
	onRemoveProcedure,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			{/* SEMD Type selector & Key Meta */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
				<div>
					<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
						Вид СЭМД ЕГИСЗ РЭМД
					</label>
					<select
						value={semdDocCode}
						onChange={(e) => onSemdDocCodeChange(e.target.value as EgiszDentalSemdCode)}
						style={{
							width: "100%",
							padding: "0.5rem",
							marginTop: "0.35rem",
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							fontSize: "0.875rem",
						}}
					>
						<option value="105">СЭМД 105: Протокол консультации стоматолога (ф. 043/у)</option>
						<option value="302">СЭМД 302: Первичный консультативно-диагностический осмотр</option>
						<option value="303">СЭМД 303: Протокол лечебно-диагностического вмешательства</option>
					</select>
				</div>

				<div>
					<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
						Пациент (ФИО & Карта)
					</label>
					<input
						type="text"
						value={patient.patientFullName}
						onChange={(e) => onPatientChange({ ...patient, patientFullName: e.target.value })}
						style={{
							width: "100%",
							padding: "0.5rem",
							marginTop: "0.35rem",
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							fontSize: "0.875rem",
						}}
					/>
				</div>

				<div>
					<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
						Лечащий врач (ФИО)
					</label>
					<input
						type="text"
						value={doctor.doctorFullName}
						onChange={(e) => onDoctorChange({ ...doctor, doctorFullName: e.target.value })}
						style={{
							width: "100%",
							padding: "0.5rem",
							marginTop: "0.35rem",
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							fontSize: "0.875rem",
						}}
					/>
				</div>
			</div>

			{/* Complaints & Anamnesis */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
				<div>
					<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
						Жалобы пациента (LOINC 10154-3)
					</label>
					<textarea
						rows={3}
						value={complaints}
						onChange={(e) => onComplaintsChange(e.target.value)}
						style={{
							width: "100%",
							padding: "0.5rem",
							marginTop: "0.35rem",
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							fontSize: "0.875rem",
							resize: "vertical",
						}}
					/>
				</div>

				<div>
					<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
						Анамнез заболевания (LOINC 10164-2)
					</label>
					<textarea
						rows={3}
						value={anamnesisMorbi}
						onChange={(e) => onAnamnesisMorbiChange(e.target.value)}
						style={{
							width: "100%",
							padding: "0.5rem",
							marginTop: "0.35rem",
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							fontSize: "0.875rem",
							resize: "vertical",
						}}
					/>
				</div>
			</div>

			{/* Interactive FDI Dental Formula */}
			<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper-strong)" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
					<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
						Зубная формула (FDI ISO 3950 / Одонтограмма 043/у)
					</div>
					<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
						Выбран зуб: <strong style={{ color: "var(--primary)" }}>{selectedTooth}</strong> (Статус: {DENTAL_TOOTH_STATUS_DICTIONARY[toothStates[selectedTooth] || "Healthy"]?.labelRu || "Интактен"})
					</div>
				</div>

				{/* Adult Quadrants */}
				<div style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)", gap: "4px", marginBottom: "4px" }}>
					{FDI_ADULT_TEETH.slice(0, 16).map((t) => {
						const st = toothStates[t] || "Healthy";
						const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[st] || { shortSymbol: "З", color: "var(--success)" };
						const isSelected = selectedTooth === t;
						return (
							<button
								key={t}
								type="button"
								onClick={() => onSelectTooth(t)}
								style={{
									border: isSelected ? "2px solid var(--primary)" : "1px solid var(--line)",
									borderRadius: "4px",
									padding: "4px 2px",
									background: "var(--paper)",
									cursor: "pointer",
									textAlign: "center",
									minHeight: "42px",
								}}
							>
								<div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)" }}>{t}</div>
								<div style={{ fontSize: "12px", fontWeight: 800, color: stObj.color }}>{stObj.shortSymbol}</div>
							</button>
						);
					})}
				</div>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)", gap: "4px" }}>
					{FDI_ADULT_TEETH.slice(16, 32).map((t) => {
						const st = toothStates[t] || "Healthy";
						const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[st] || { shortSymbol: "З", color: "var(--success)" };
						const isSelected = selectedTooth === t;
						return (
							<button
								key={t}
								type="button"
								onClick={() => onSelectTooth(t)}
								style={{
									border: isSelected ? "2px solid var(--primary)" : "1px solid var(--line)",
									borderRadius: "4px",
									padding: "4px 2px",
									background: "var(--paper)",
									cursor: "pointer",
									textAlign: "center",
									minHeight: "42px",
								}}
							>
								<div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)" }}>{t}</div>
								<div style={{ fontSize: "12px", fontWeight: 800, color: stObj.color }}>{stObj.shortSymbol}</div>
							</button>
						);
					})}
				</div>

				{/* Status quick selector for selected tooth */}
				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.75rem" }}>
					{Object.entries(DENTAL_TOOTH_STATUS_DICTIONARY).map(([key, val]) => (
						<button
							key={key}
							type="button"
							onClick={() => onUpdateToothStatus(selectedTooth, key)}
							style={{
								padding: "0.25rem 0.6rem",
								fontSize: "0.75rem",
								fontWeight: 600,
								borderRadius: "4px",
								border: "1px solid var(--line)",
								background: (toothStates[selectedTooth] || "Healthy") === key ? val.color : "var(--paper)",
								color: (toothStates[selectedTooth] || "Healthy") === key ? "var(--ink-inverse)" : "var(--ink)",
								cursor: "pointer",
							}}
						>
							{val.shortSymbol} &bull; {val.labelRu}
						</button>
					))}
				</div>
			</div>

			{/* Diagnoses (ICD-10) and Services (804n) */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
				{/* Diagnoses List */}
				<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)" }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
						<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
							Клинические диагнозы (МКБ-10)
						</div>
						<button
							type="button"
							onClick={onAddDiagnosis}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.25rem",
								padding: "0.25rem 0.5rem",
								fontSize: "0.75rem",
								fontWeight: 600,
								borderRadius: "4px",
								background: "var(--primary)",
								color: "var(--ink-inverse)",
								border: "none",
								cursor: "pointer",
							}}
						>
							<Plus size={14} /> Добавить
						</button>
					</div>

					{diagnoses.map((diag, idx) => (
						<div
							key={idx}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: "0.5rem",
								padding: "0.35rem 0",
								borderBottom: "1px solid var(--line)",
								fontSize: "0.8125rem",
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
				</div>

				{/* Procedures List */}
				<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)" }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
						<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
							Оказанные медицинские услуги
						</div>
						<button
							type="button"
							onClick={onAddProcedure}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.25rem",
								padding: "0.25rem 0.5rem",
								fontSize: "0.75rem",
								fontWeight: 600,
								borderRadius: "4px",
								background: "var(--primary)",
								color: "var(--ink-inverse)",
								border: "none",
								cursor: "pointer",
							}}
						>
							<Plus size={14} /> Добавить
						</button>
					</div>

					{procedures.map((proc, idx) => (
						<div
							key={idx}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: "0.5rem",
								padding: "0.35rem 0",
								borderBottom: "1px solid var(--line)",
								fontSize: "0.8125rem",
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
		</div>
	);
};
