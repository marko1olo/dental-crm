/**
 * ClinicalMetaAndAnamnesis.tsx — SEMD type selection, doctor/patient metadata and complaints/anamnesis
 */

import React from "react";
import type { EgiszDentalSemdCode, EgiszDoctorInfo, EgiszPatientInfo } from "../../egiszRemdEngine";

export interface ClinicalMetaAndAnamnesisProps {
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
}

const inputStyle: React.CSSProperties = {
	width: "100%", minHeight: "38px", lineHeight: 1.4, padding: "0.375rem 0.625rem",
	marginTop: "0.35rem", borderRadius: "6px", border: "1px solid var(--line)",
	background: "var(--paper)", color: "var(--ink)", fontSize: "0.875rem",
};

const labelStyle: React.CSSProperties = {
	fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase",
};

export const ClinicalMetaAndAnamnesis: React.FC<ClinicalMetaAndAnamnesisProps> = ({
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
}) => {
	return (
		<>
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
				<div>
					<label style={labelStyle}>Вид медицинского документа</label>
					<select value={semdDocCode} onChange={(e) => onSemdDocCodeChange(e.target.value as EgiszDentalSemdCode)} style={inputStyle}>
						<option value="105">Консультация стоматолога (Протокол приёма)</option>
						<option value="302">Первичный осмотр и диагностика</option>
						<option value="303">Протокол лечения и вмешательства</option>
					</select>
				</div>
				<div>
					<label style={labelStyle}>Пациент (ФИО & Карта)</label>
					<input type="text" value={patient.patientFullName} onChange={(e) => onPatientChange({ ...patient, patientFullName: e.target.value })} style={inputStyle} />
				</div>
				<div>
					<label style={labelStyle}>Лечащий врач (ФИО)</label>
					<input type="text" value={doctor.doctorFullName} onChange={(e) => onDoctorChange({ ...doctor, doctorFullName: e.target.value })} style={inputStyle} />
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
				<div>
					<label style={labelStyle}>Жалобы пациента</label>
					<textarea
						rows={3} value={complaints} onChange={(e) => onComplaintsChange(e.target.value)}
						style={{ ...inputStyle, minHeight: undefined, padding: "0.5rem", resize: "vertical" }}
					/>
				</div>
				<div>
					<label style={labelStyle}>Анамнез заболевания</label>
					<textarea
						rows={3} value={anamnesisMorbi} onChange={(e) => onAnamnesisMorbiChange(e.target.value)}
						style={{ ...inputStyle, minHeight: undefined, padding: "0.5rem", resize: "vertical" }}
					/>
				</div>
			</div>
		</>
	);
};
