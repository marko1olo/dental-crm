/**
 * EgiszXmlPreviewTab.tsx
 *
 * Tab: Medical Document Status & Telemetry (Export & Background Queue).
 * Mandates 8e, 8n, 8x, 8am: Quiet Telemetry («Отправлено в ЕГИСЗ ✓»),
 * zero raw XML trees in doctor's default path. Administrative XML spoiler.
 */

import React from "react";
import { CheckCircle2, Download, FileArchive, ShieldCheck } from "lucide-react";
import { XmlCodeViewer } from "./xmlPreview/XmlCodeViewer";
import { XmlPreviewToolbar } from "./xmlPreview/XmlPreviewToolbar";
import type { EgiszXmlPreviewTabProps } from "./xmlPreview/xmlPreviewTabTypes";
import { XmlStructureSectionsTree } from "./xmlPreview/XmlStructureSectionsTree";

export type { EgiszXmlPreviewTabProps } from "./xmlPreview/xmlPreviewTabTypes";

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
	const docTitle =
		semdDocCode === "302"
			? "Протокол консультации стоматолога"
			: semdDocCode === "303"
			? "Протокол стоматологического вмешательства"
			: "Медицинская карта приёма";

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			{/* Quiet Telemetry Status Card */}
			<div
				className="egisz-telemetry-card"
				data-testid="egisz-quiet-telemetry-card"
				style={{
					background: "linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(14, 165, 233, 0.06) 100%)",
					border: "1px solid rgba(13, 148, 136, 0.25)",
					borderRadius: "12px",
					padding: "1.25rem",
					display: "flex",
					flexDirection: "column",
					gap: "0.75rem",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
						<div
							style={{
								width: "40px",
								height: "40px",
								borderRadius: "10px",
								background: "rgba(13, 148, 136, 0.15)",
								color: "var(--teal, #0d9488)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<ShieldCheck size={22} />
						</div>
						<div>
							<h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }}>
								{docTitle}
							</h3>
							<p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)" }}>
								Электронный медицинский документ сформирован и готов к фоновой передаче
							</p>
						</div>
					</div>
					<div
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "0.35rem",
							padding: "0.35rem 0.75rem",
							borderRadius: "20px",
							background: "rgba(16, 185, 129, 0.15)",
							color: "var(--success, #10b981)",
							fontSize: "0.8125rem",
							fontWeight: 700,
						}}
						data-testid="egisz-status-badge"
					>
						<CheckCircle2 size={15} />
						<span>Отправлено в ЕГИСЗ ✓</span>
					</div>
				</div>

				{/* Passport grid */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
						gap: "0.75rem",
						marginTop: "0.5rem",
						fontSize: "0.8125rem",
					}}
				>
					<div style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", background: "var(--paper)", border: "1px solid var(--line)" }}>
						<span style={{ color: "var(--muted)", fontSize: "0.75rem", display: "block" }}>Пациент</span>
						<strong style={{ color: "var(--ink)" }}>{patient?.patientFullName || "Смирнов Алексей Викторович"}</strong>
						<span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem" }}>
							СНИЛС: {patient?.patientSnils || "—"}
						</span>
					</div>
					<div style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", background: "var(--paper)", border: "1px solid var(--line)" }}>
						<span style={{ color: "var(--muted)", fontSize: "0.75rem", display: "block" }}>Врач</span>
						<strong style={{ color: "var(--ink)" }}>{doctor?.doctorFullName || "Иванов Сергей Владимирович"}</strong>
						<span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem" }}>
							{doctor?.doctorPosition || "Врач-стоматолог-терапевт"}
						</span>
					</div>
					<div style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", background: "var(--paper)", border: "1px solid var(--line)" }}>
						<span style={{ color: "var(--muted)", fontSize: "0.75rem", display: "block" }}>Медицинская организация</span>
						<strong style={{ color: "var(--ink)" }}>{clinic?.clinicName || "ООО «ДЕНТЕ КЛИНИК»"}</strong>
						<span style={{ display: "block", color: "var(--muted)", fontSize: "0.75rem" }}>
							ОГРН: {clinic?.clinicOgrn || "1157746123457"}
						</span>
					</div>
				</div>

				{/* Diagnoses and procedures overview */}
				{(diagnoses.length > 0 || procedures.length > 0) && (
					<div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.25rem", fontSize: "0.8125rem" }}>
						{diagnoses.length > 0 && (
							<div style={{ color: "var(--ink)", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
								<span style={{ color: "var(--muted)" }}>Диагноз:</span>
								{diagnoses.map((d, i) => (
									<span key={i} style={{ fontWeight: 600 }}>
										{d.icd10Code} {d.diagnosisName}{d.tooth ? ` (зуб ${d.tooth})` : ""}
									</span>
								))}
							</div>
						)}
						{procedures.length > 0 && (
							<div style={{ color: "var(--ink)", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
								<span style={{ color: "var(--muted)" }}>Оказано услуг:</span>
								<span style={{ fontWeight: 600 }}>{procedures.length} {procedures.length === 1 ? "услуга" : "услуги"}</span>
							</div>
						)}
					</div>
				)}

				{/* Quick Actions */}
				<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
					<button
						type="button"
						onClick={onExportCurrentPackageZip}
						data-testid="btn-export-current-zip"
						className="egisz-btn sm"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.4rem",
							padding: "0.45rem 0.9rem",
							fontSize: "0.8125rem",
							fontWeight: 600,
							borderRadius: "8px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							cursor: "pointer",
						}}
					>
						<FileArchive size={15} />
						<span>Скачать пакет (ZIP)</span>
					</button>
					<button
						type="button"
						onClick={onDownloadXml}
						data-testid="btn-export-cda-xml"
						className="egisz-btn sm"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.4rem",
							padding: "0.45rem 0.9rem",
							fontSize: "0.8125rem",
							fontWeight: 600,
							borderRadius: "8px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							cursor: "pointer",
						}}
					>
						<Download size={15} />
						<span>Экспорт файла</span>
					</button>
				</div>
			</div>

			{/* Administrative Collapsed Details for Tech XML */}
			<details
				className="egisz-tech-accordion"
				style={{
					border: "1px solid var(--line)",
					borderRadius: "10px",
					padding: "0.75rem 1rem",
					background: "var(--paper-strong)",
				}}
			>
				<summary
					style={{
						cursor: "pointer",
						fontSize: "0.8125rem",
						fontWeight: 600,
						color: "var(--muted)",
						userSelect: "none",
					}}
				>
					Технические сведения для администратора (структура XML, тегов: {xmlValidation.tagCount})
				</summary>

				<div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
					<XmlPreviewToolbar
						tagCount={xmlValidation.tagCount}
						onValidateCdaXml={onValidateCdaXml}
						onDownloadXml={onDownloadXml}
						onExportCurrentPackageZip={onExportCurrentPackageZip}
						onSendToRegistry={onSendToRegistry}
						onCopyXml={onCopyXml}
						isSending={isSending}
					/>

					<XmlStructureSectionsTree
						collapsedSections={collapsedSections}
						onToggleSection={onToggleSection}
						semdDocCode={semdDocCode}
						clinic={clinic}
						doctor={doctor}
						patient={patient}
						semdPayload={semdPayload}
						diagnoses={diagnoses}
						procedures={procedures}
					/>

					<XmlCodeViewer generatedXml={generatedXml} />
				</div>
			</details>
		</div>
	);
};
