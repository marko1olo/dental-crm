/**
 * DENTE CRM — Doctor Signature & Rubber Stamp (Layer 2)
 * Authentic clinical stamp, live pen signature line, personal doctor stamp, and optional digital signature block.
 */

import React from "react";
import { ShieldCheck } from "lucide-react";

export interface ReportDoctorSignatureStampProps {
	doctorName: string;
	doctorRole?: string;
	clinicName?: string;
	clinicLicense?: string;
	showHandwrittenPreview?: boolean;
	isElectronicSigned?: boolean;
	electronicCertThumbprint?: string;
	electronicSignedAt?: string;
}

function formatDoctorSignatureInitials(fullName: string): string {
	const cleaned = fullName.replace(/^(Д-р|Доктор|Врач)\s+/i, "").trim();
	if (!cleaned) return "";
	const parts = cleaned.split(/\s+/);
	const surname = parts[0] ?? "";
	const firstInitial = parts[1]?.[0] ? `${parts[1][0]}.` : "";
	const secondInitial = parts[2]?.[0] ? `${parts[2][0]}.` : "";
	return [surname, `${firstInitial}${secondInitial}`].filter(Boolean).join(" ");
}

export const ReportDoctorSignatureStamp: React.FC<ReportDoctorSignatureStampProps> = ({
	doctorName,
	doctorRole = "Врач-стоматолог терапевт / рентгенолог",
	clinicName = "СТОМАТОЛОГИЯ DENTE",
	clinicLicense = "ЛО-77-01-019842",
	showHandwrittenPreview = true,
	isElectronicSigned = false,
	electronicCertThumbprint,
	electronicSignedAt,
}) => {
	const resolvedDoctorName = doctorName.trim() || "Дежурный врач-рентгенолог";
	const shortSignature = formatDoctorSignatureInitials(resolvedDoctorName);

	return (
		<footer className="radiology-signature-row">
			<div className="radiology-signature-doctor">
				<div className="radiology-signature-doc-name">Врач: {resolvedDoctorName}</div>
				<div className="radiology-signature-doc-role">{doctorRole}</div>
				{isElectronicSigned && (
					<div
						className="radiology-electronic-stamp"
						style={{
							marginTop: "0.5rem",
							padding: "0.375rem 0.625rem",
							borderRadius: "6px",
							border: "1px solid var(--line)",
							backgroundColor: "var(--paper-soft)",
							color: "var(--ink)",
							fontSize: "0.75rem",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.375rem",
						}}
					>
						<ShieldCheck size={14} />
						<span>
							Документ подписан ЭЦП врача
							{electronicCertThumbprint ? ` (${electronicCertThumbprint})` : ""}
							{electronicSignedAt ? ` • ${electronicSignedAt}` : ""}
						</span>
					</div>
				)}
			</div>

			<div className="radiology-signature-line-box">
				<div className="radiology-signature-line">
					{showHandwrittenPreview && shortSignature && (
						<div className="radiology-signature-handwritten">{shortSignature}</div>
					)}
					<div className="radiology-signature-underline" />
					<div className="radiology-signature-label">Личная подпись врача</div>
				</div>

				{/* Doctor Personal Stamp */}
				<div
					className="radiology-doctor-personal-stamp"
					aria-hidden="true"
					style={{
						width: "52px",
						height: "52px",
						borderRadius: "9999px",
						border: "1px dashed var(--line)",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "9px",
						lineHeight: 1.15,
						textAlign: "center",
						color: "var(--muted)",
						padding: "4px",
						flexShrink: 0,
					}}
				>
					<span style={{ fontWeight: 700 }}>ВРАЧ</span>
					<span>М.П.</span>
				</div>

				{/* Real Clinical Rubber Stamp */}
				<div className="radiology-clinic-stamp" aria-hidden="true">
					<div className="radiology-stamp-top">{clinicName}</div>
					<div className="radiology-stamp-center">ДЛЯ ДОКУМЕНТОВ</div>
					<div className="radiology-stamp-bottom">{clinicLicense}</div>
				</div>
			</div>
		</footer>
	);
};
