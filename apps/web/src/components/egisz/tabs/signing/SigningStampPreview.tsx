/**
 * SigningStampPreview.tsx — GOST R 7.0.97-2016 Visual Stamp preview for Doctor and MO
 */

import React from "react";
import {
	generateGostSignatureStampHtml,
	type EgiszClinicInfo,
	type EgiszDoctorInfo,
	type GostSignatureInfo,
} from "../../egiszRemdEngine";

export interface SigningStampPreviewProps {
	readonly doctorSig: GostSignatureInfo | null;
	readonly moSig: GostSignatureInfo | null;
	readonly doctor: EgiszDoctorInfo;
	readonly clinic: EgiszClinicInfo;
}

export const SigningStampPreview: React.FC<SigningStampPreviewProps> = ({
	doctorSig,
	moSig,
	doctor,
	clinic,
}) => {
	if (!doctorSig && !moSig) return null;

	return (
		<div
			className="gost-stamps-wrapper"
			style={{
				border: "1px solid var(--line)", borderRadius: "8px", padding: "1rem",
				background: "var(--paper)", display: "flex", flexDirection: "column", gap: "1rem",
			}}
		>
			<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
				Визуальный штамп электронной подписи
			</div>
			<div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
				{doctorSig && (
					<div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						<div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)" }}>
							Подпись лечащего врача:
						</div>
						<div
							dangerouslySetInnerHTML={{
								__html: generateGostSignatureStampHtml({
									signerName: doctor.doctorFullName,
									certificateNumber: doctorSig.certificateSerialNumber,
									validFrom: doctorSig.validFrom || new Date().toISOString(),
									validTo: doctorSig.validTo || new Date().toISOString(),
									orgName: clinic.clinicName,
								}),
							}}
						/>
					</div>
				)}
				{moSig && (
					<div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						<div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)" }}>
							Подпись клиники (организации):
						</div>
						<div
							dangerouslySetInnerHTML={{
								__html: generateGostSignatureStampHtml({
									signerName: clinic.clinicName,
									certificateNumber: moSig.certificateSerialNumber,
									validFrom: moSig.validFrom || new Date().toISOString(),
									validTo: moSig.validTo || new Date().toISOString(),
									orgName: clinic.clinicName,
								}),
							}}
						/>
					</div>
				)}
			</div>
		</div>
	);
};
