import React from "react";
import { Hash, User } from "lucide-react";
import type { Patient } from "@dental/shared";
import { formatShortDate } from "../../../AppHelpers";

interface SignatureContextCardProps {
	readonly titleText: string;
	readonly patient?: Patient | null | undefined;
	readonly patientName: string;
	readonly clinicName: string;
	readonly doctorFullName?: string | null | undefined;
	readonly docFingerprint: string;
}

export const SignatureContextCard: React.FC<SignatureContextCardProps> = ({
	titleText,
	patient,
	patientName,
	clinicName,
	doctorFullName,
	docFingerprint,
}) => {
	const shortHash = `${docFingerprint.slice(0, 8).toUpperCase()}-${docFingerprint.slice(8, 16).toUpperCase()}-${docFingerprint.slice(-8).toUpperCase()}`;

	return (
		<div
			style={{
				padding: "12px 14px",
				borderRadius: "10px",
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "12px",
				flexWrap: "wrap",
			}}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 360px" }}>
				<div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
					{titleText}
				</div>
				<div
					style={{
						fontSize: "12px",
						color: "var(--muted, #64748b)",
						display: "flex",
						alignItems: "center",
						gap: "8px",
						flexWrap: "wrap",
					}}
				>
					<span
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							fontWeight: 600,
							color: "var(--ink, #0f172a)",
						}}
					>
						<User size={13} color="var(--teal, #0d9488)" />
						{patientName}
					</span>
					{patient?.birthDate && <span>· ДР: {formatShortDate(patient.birthDate)}</span>}
					<span>· Клиника: {clinicName}</span>
					{doctorFullName && <span>· Врач: {doctorFullName}</span>}
				</div>
			</div>

			<div style={{ textAlign: "right", flexShrink: 0 }}>
				<div
					style={{
						fontSize: "10.5px",
						textTransform: "uppercase",
						letterSpacing: "0.04em",
						fontWeight: 700,
						color: "var(--muted, #64748b)",
					}}
				>
					Отпечаток SHA-256
				</div>
				<div
					style={{
						marginTop: "4px",
						fontFamily: "monospace",
						fontSize: "11.5px",
						fontWeight: 600,
						padding: "3px 8px",
						borderRadius: "6px",
						background: "var(--paper, #ffffff)",
						border: "1px solid var(--line, #e2e8f0)",
						color: "var(--teal, #0d9488)",
						display: "inline-flex",
						alignItems: "center",
						gap: "5px",
					}}
					title={`Полный отпечаток SHA-256: ${docFingerprint}`}
				>
					<Hash size={12} />
					<span>{shortHash}</span>
				</div>
			</div>
		</div>
	);
};
