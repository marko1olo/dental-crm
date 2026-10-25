/**
 * XmlHeaderParticipantsSections.tsx — Sections 1-4: Header, Clinic FRMO, Doctor, Patient
 */

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
	EGISZ_DENTAL_SEMD_TYPES,
	type EgiszClinicInfo,
	type EgiszDentalCdaPayload,
	type EgiszDentalSemdCode,
	type EgiszDoctorInfo,
	type EgiszPatientInfo,
} from "../../egiszRemdEngine";

export interface XmlHeaderParticipantsSectionsProps {
	readonly collapsedSections: Record<string, boolean>;
	readonly onToggleSection: (sectionKey: string) => void;
	readonly semdDocCode: EgiszDentalSemdCode;
	readonly clinic: EgiszClinicInfo;
	readonly doctor: EgiszDoctorInfo;
	readonly patient: EgiszPatientInfo;
	readonly semdPayload: EgiszDentalCdaPayload | null;
}

export const XmlHeaderParticipantsSections: React.FC<XmlHeaderParticipantsSectionsProps> = ({
	collapsedSections,
	onToggleSection,
	semdDocCode,
	clinic,
	doctor,
	patient,
	semdPayload,
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
				{renderSectionHeader("header", "1. Заголовок документа")}
				{!collapsedSections.header && (
					<div style={codeBoxStyle}>
						<div>&lt;realmCode code="RU"/&gt;</div>
						<div>&lt;templateId root="{EGISZ_DENTAL_SEMD_TYPES[semdDocCode]?.templateRoot || '1.2.643.5.1.13.13.11.1527'}"/&gt;</div>
						<div>&lt;id root="{clinic.clinicOid || '1.2.643.5.1.13.13.12.2'}.100.1.1" extension="{semdPayload?.documentUuid || 'DOC-UUID-DRAFT'}"/&gt;</div>
					</div>
				)}
			</div>

			<div style={boxStyle}>
				{renderSectionHeader("frmo", "2. Клиника (организация)")}
				{!collapsedSections.frmo && (
					<div style={codeBoxStyle}>
						<div>&lt;representedOrganization&gt;</div>
						<div style={{ paddingLeft: "1rem" }}>&lt;id root="1.2.643.5.1.13.13.12.2" extension="{clinic.clinicOid || '1.2.643.5.1.13.13.12.2'}"/&gt;</div>
						<div style={{ paddingLeft: "1rem" }}>&lt;id root="1.2.643.100.1" extension="{clinic.clinicOgrn || ''}"/&gt;</div>
						<div style={{ paddingLeft: "1rem" }}>&lt;name&gt;{clinic.clinicName}&lt;/name&gt;</div>
						<div>&lt;/representedOrganization&gt;</div>
					</div>
				)}
			</div>

			<div style={boxStyle}>
				{renderSectionHeader("doctor", "3. Врач (автор документа)")}
				{!collapsedSections.doctor && (
					<div style={codeBoxStyle}>
						<div>&lt;assignedAuthor&gt;</div>
						<div style={{ paddingLeft: "1rem" }}>&lt;id root="1.2.643.100.3" extension="{doctor.doctorSnils || ''}"/&gt;</div>
						<div style={{ paddingLeft: "1rem" }}>&lt;assignedPerson&gt;&lt;name&gt;{doctor.doctorFullName}&lt;/name&gt;&lt;/assignedPerson&gt;</div>
						<div>&lt;/assignedAuthor&gt;</div>
					</div>
				)}
			</div>

			<div style={boxStyle}>
				{renderSectionHeader("patient", "4. Пациент")}
				{!collapsedSections.patient && (
					<div style={codeBoxStyle}>
						<div>&lt;patientRole&gt;</div>
						<div style={{ paddingLeft: "1rem" }}>&lt;id root="1.2.643.100.3" extension="{patient.patientSnils || ''}"/&gt;</div>
						<div style={{ paddingLeft: "1rem" }}>&lt;patient&gt;&lt;name&gt;{patient.patientFullName}&lt;/name&gt;&lt;/patient&gt;</div>
						<div>&lt;/patientRole&gt;</div>
					</div>
				)}
			</div>
		</>
	);
};
