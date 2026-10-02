/**
 * EgiszXmlPreviewTab.tsx
 *
 * Tab 5: Canonical HL7 CDA R2 XML Preview & Validation Inspector.
 * Formatted C14N XML viewer, collapsible CDA sections, and export buttons.
 * Mandate 8e: Doctor Autonomy (Zero disabled buttons).
 */

import React from "react";
import {
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Copy,
	Download,
	FileArchive,
	Send,
} from "lucide-react";
import {
	EGISZ_DENTAL_SEMD_TYPES,
	type EgiszClinicInfo,
	type EgiszDentalCdaPayload,
	type EgiszDentalSemdCode,
	type EgiszDiagnosisItem,
	type EgiszDoctorInfo,
	type EgiszPatientInfo,
	type EgiszProcedureItem,
} from "../egiszRemdEngine";

export interface EgiszXmlPreviewTabProps {
	readonly generatedXml: string;
	readonly xmlValidation: { readonly tagCount: number };
	readonly onValidateCdaXml: () => void;
	readonly onDownloadXml: () => void;
	readonly onExportCurrentPackageZip: () => void;
	readonly onSendToRegistry: () => void;
	readonly onCopyXml: () => void;
	readonly isSending: boolean;
	readonly collapsedSections: Record<string, boolean>;
	readonly onToggleSection: (sectionKey: string) => void;
	readonly semdDocCode: EgiszDentalSemdCode;
	readonly clinic: EgiszClinicInfo;
	readonly doctor: EgiszDoctorInfo;
	readonly patient: EgiszPatientInfo;
	readonly semdPayload: EgiszDentalCdaPayload;
	readonly diagnoses: readonly EgiszDiagnosisItem[];
	readonly procedures: readonly EgiszProcedureItem[];
}

export const EgiszXmlPreviewTab: React.FC<EgiszXmlPreviewTabProps> = ({
	generatedXml,
	xmlValidation,
	onValidateCdaXml,
	onDownloadXml,
	onExportCurrentPackageZip,
	onSendToRegistry,
	onCopyXml,
	isSending,
	collapsedSections,
	onToggleSection,
	semdDocCode,
	clinic,
	doctor,
	patient,
	semdPayload,
	diagnoses,
	procedures,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
				<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
					Структура данных документа (XML, тегов: {xmlValidation.tagCount})
				</div>
				<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
					<button
						type="button"
						onClick={onValidateCdaXml}
						className="egisz-btn sm"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.35rem",
							padding: "0.4rem 0.75rem",
							fontSize: "0.8125rem",
							fontWeight: 600,
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--teal)",
							cursor: "pointer",
						}}
					>
						<CheckCircle2 size={14} />
						<span>Проверить XML</span>
					</button>
					<button
						type="button"
						onClick={onDownloadXml}
						data-testid="btn-export-cda-xml"
						className="egisz-btn sm"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.35rem",
							padding: "0.4rem 0.75rem",
							fontSize: "0.8125rem",
							fontWeight: 600,
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							cursor: "pointer",
						}}
					>
						<Download size={14} />
						<span>Скачать XML</span>
					</button>
					<button
						type="button"
						onClick={onExportCurrentPackageZip}
						data-testid="btn-export-current-zip"
						className="egisz-btn sm"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.35rem",
							padding: "0.4rem 0.75rem",
							fontSize: "0.8125rem",
							fontWeight: 600,
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							cursor: "pointer",
						}}
					>
						<FileArchive size={14} />
						<span>Скачать архив (XML + подпись)</span>
					</button>
					<button
						type="button"
						onClick={onSendToRegistry}
						data-testid="btn-submit-egisz-remd"
						className="egisz-btn egisz-btn-primary sm"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.35rem",
							padding: "0.4rem 0.75rem",
							fontSize: "0.8125rem",
							fontWeight: 700,
							borderRadius: "6px",
							background: "var(--primary)",
							color: "var(--ink-inverse)",
							border: "none",
							cursor: isSending ? "wait" : "pointer",
						}}
					>
						<Send size={14} />
						<span>Отправить в Минздрав</span>
					</button>
					<button
						type="button"
						onClick={onCopyXml}
						className="egisz-btn sm"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.35rem",
							padding: "0.4rem 0.75rem",
							fontSize: "0.8125rem",
							fontWeight: 600,
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							cursor: "pointer",
						}}
					>
						<Copy size={14} /> Копировать
					</button>
				</div>
			</div>

			{/* 7 Collapsible Sections of CDA R2 */}
			<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
				{/* 1. Header Section */}
				<div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", background: "var(--paper)" }}>
					<button
						type="button"
						onClick={() => onToggleSection("header")}
						style={{ width: "100%", padding: "0.6rem 0.875rem", textAlign: "left", fontWeight: 700, fontSize: "0.8125rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper-strong)", border: "none", cursor: "pointer" }}
					>
						<span>1. Заголовок документа</span>
						{collapsedSections.header ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
					</button>
					{!collapsedSections.header && (
						<div style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.75rem", background: "var(--paper)" }}>
							<div>&lt;<span style={{ color: "var(--primary)" }}>realmCode</span> code="RU"/&gt;</div>
							<div>&lt;templateId root="{EGISZ_DENTAL_SEMD_TYPES[semdDocCode]?.templateRoot || '1.2.643.5.1.13.13.11.1527'}"/&gt;</div>
							<div>&lt;id root="{clinic.clinicOid || '1.2.643.5.1.13.13.12.2'}.100.1.1" extension="{semdPayload.documentUuid}"/&gt;</div>
						</div>
					)}
				</div>

				{/* 2. OID OGRN/FRMO Section */}
				<div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", background: "var(--paper)" }}>
					<button
						type="button"
						onClick={() => onToggleSection("frmo")}
						style={{ width: "100%", padding: "0.6rem 0.875rem", textAlign: "left", fontWeight: 700, fontSize: "0.8125rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper-strong)", border: "none", cursor: "pointer" }}
					>
						<span>2. Клиника (организация)</span>
						{collapsedSections.frmo ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
					</button>
					{!collapsedSections.frmo && (
						<div style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.75rem", background: "var(--paper)" }}>
							<div>&lt;representedOrganization&gt;</div>
							<div style={{ paddingLeft: "1rem" }}>&lt;id root="1.2.643.5.1.13.13.12.2" extension="{clinic.clinicOid || '1.2.643.5.1.13.13.12.2'}"/&gt;</div>
							<div style={{ paddingLeft: "1rem" }}>&lt;id root="1.2.643.100.1" extension="{clinic.clinicOgrn || ''}"/&gt;</div>
							<div style={{ paddingLeft: "1rem" }}>&lt;name&gt;{clinic.clinicName}&lt;/name&gt;</div>
							<div>&lt;/representedOrganization&gt;</div>
						</div>
					)}
				</div>

				{/* 3. Doctor SNILS/FRMR */}
				<div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", background: "var(--paper)" }}>
					<button
						type="button"
						onClick={() => onToggleSection("doctor")}
						style={{ width: "100%", padding: "0.6rem 0.875rem", textAlign: "left", fontWeight: 700, fontSize: "0.8125rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper-strong)", border: "none", cursor: "pointer" }}
					>
						<span>3. Врач (автор документа)</span>
						{collapsedSections.doctor ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
					</button>
					{!collapsedSections.doctor && (
						<div style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.75rem", background: "var(--paper)" }}>
							<div>&lt;assignedAuthor&gt;</div>
							<div style={{ paddingLeft: "1rem" }}>&lt;id root="1.2.643.100.3" extension="{doctor.doctorSnils || ''}"/&gt;</div>
							<div style={{ paddingLeft: "1rem" }}>&lt;assignedPerson&gt;&lt;name&gt;{doctor.doctorFullName}&lt;/name&gt;&lt;/assignedPerson&gt;</div>
							<div>&lt;/assignedAuthor&gt;</div>
						</div>
					)}
				</div>

				{/* 4. Patient SNILS/Polis OMS */}
				<div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", background: "var(--paper)" }}>
					<button
						type="button"
						onClick={() => onToggleSection("patient")}
						style={{ width: "100%", padding: "0.6rem 0.875rem", textAlign: "left", fontWeight: 700, fontSize: "0.8125rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper-strong)", border: "none", cursor: "pointer" }}
					>
						<span>4. Пациент</span>
						{collapsedSections.patient ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
					</button>
					{!collapsedSections.patient && (
						<div style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.75rem", background: "var(--paper)" }}>
							<div>&lt;patientRole&gt;</div>
							<div style={{ paddingLeft: "1rem" }}>&lt;id root="1.2.643.100.3" extension="{patient.patientSnils || ''}"/&gt;</div>
							<div style={{ paddingLeft: "1rem" }}>&lt;patient&gt;&lt;name&gt;{patient.patientFullName}&lt;/name&gt;&lt;/patient&gt;</div>
							<div>&lt;/patientRole&gt;</div>
						</div>
					)}
				</div>

				{/* 5. Diagnosis ICD-10 */}
				<div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", background: "var(--paper)" }}>
					<button
						type="button"
						onClick={() => onToggleSection("diagnosis")}
						style={{ width: "100%", padding: "0.6rem 0.875rem", textAlign: "left", fontWeight: 700, fontSize: "0.8125rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper-strong)", border: "none", cursor: "pointer" }}
					>
						<span>5. Диагноз и зуб</span>
						{collapsedSections.diagnosis ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
					</button>
					{!collapsedSections.diagnosis && (
						<div style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.75rem", background: "var(--paper)" }}>
							<div>&lt;value xsi:type="CD" code="{diagnoses[0]?.icd10Code || 'K02.1'}" displayName="{diagnoses[0]?.icd10Name || 'Кариес дентина'}"/&gt;</div>
						</div>
					)}
				</div>

				{/* 6. Dental Formula */}
				<div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", background: "var(--paper)" }}>
					<button
						type="button"
						onClick={() => onToggleSection("dentalFormula")}
						style={{ width: "100%", padding: "0.6rem 0.875rem", textAlign: "left", fontWeight: 700, fontSize: "0.8125rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper-strong)", border: "none", cursor: "pointer" }}
					>
						<span>6. Зубная формула</span>
						{collapsedSections.dentalFormula ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
					</button>
					{!collapsedSections.dentalFormula && (
						<div style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.75rem", background: "var(--paper)" }}>
							<div>&lt;section&gt;</div>
							<div style={{ paddingLeft: "1rem" }}>&lt;code code="74208-1" displayName="Зубная формула и одонтограмма"/&gt;</div>
							<div>&lt;/section&gt;</div>
						</div>
					)}
				</div>

				{/* 7. Performed procedures */}
				<div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", background: "var(--paper)" }}>
					<button
						type="button"
						onClick={() => onToggleSection("procedures")}
						style={{ width: "100%", padding: "0.6rem 0.875rem", textAlign: "left", fontWeight: 700, fontSize: "0.8125rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper-strong)", border: "none", cursor: "pointer" }}
					>
						<span>7. Оказанные медицинские услуги</span>
						{collapsedSections.procedures ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
					</button>
					{!collapsedSections.procedures && (
						<div style={{ padding: "0.75rem", fontFamily: "monospace", fontSize: "0.75rem", background: "var(--paper)" }}>
							<div>&lt;procedure classCode="PROC"&gt;</div>
							<div style={{ paddingLeft: "1rem" }}>&lt;code code="{procedures[0]?.code || 'A16.07.002'}" displayName="{procedures[0]?.name || 'Восстановление зуба пломбой'}"/&gt;</div>
							<div>&lt;/procedure&gt;</div>
						</div>
					)}
				</div>
			</div>

			<pre
				style={{
					margin: 0,
					padding: "1rem",
					borderRadius: "8px",
					background: "var(--paper-strong)",
					border: "1px solid var(--line)",
					fontFamily: "monospace",
					fontSize: "0.75rem",
					lineHeight: 1.4,
					maxHeight: "380px",
					overflow: "auto",
					whiteSpace: "pre-wrap",
					wordBreak: "break-all",
				}}
			>
				{generatedXml}
			</pre>
		</div>
	);
};
