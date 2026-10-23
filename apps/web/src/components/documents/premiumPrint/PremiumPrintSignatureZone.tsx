import React from "react";
import { QrCode } from "lucide-react";
import type { DocumentBrandingState } from "../../store/documentBrandingStore";
import type { PremiumPatientInfo } from "./types";

export interface PremiumPrintSignatureZoneProps {
	branding: DocumentBrandingState;
	patient: PremiumPatientInfo | null | undefined;
	doctorName?: string | null | undefined;
	diaryHash?: string | null | undefined;
	hasCryptoSignature?: boolean | null | undefined;
}

export const PremiumPrintSignatureZone: React.FC<PremiumPrintSignatureZoneProps> = ({
	branding,
	patient,
	doctorName,
	diaryHash,
	hasCryptoSignature,
}) => {
	return (
		<div className="doc-sign-zone break-inside-avoid" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
			{branding.showQrVerification && (
				<div className="doc-qr-stamp">
					<div className="w-12 h-12 bg-white p-1 border border-neutral-300 rounded flex items-center justify-center shrink-0">
						<QrCode className="w-10 h-10 text-neutral-900" />
					</div>
					<div className="doc-qr-meta">
						<strong>Электронная верификация карты:</strong>
						<br />
						{diaryHash ? (
							<span className="font-mono text-[9px] block truncate max-w-[170px]">
								SHA-256: {diaryHash.slice(0, 24)}…
							</span>
						) : (
							<span>Документ зарегистрирован в МИС ДЕНТЕ</span>
						)}
						{hasCryptoSignature && <span className="text-[var(--ok-fg,#059669)] font-bold block">Подписано УКЭП</span>}
					</div>
				</div>
			)}

			{branding.showDoctorStampFrame && (
				<div className="doc-stamp-box">
					<span>М.П.</span>
				</div>
			)}

			{/* Doctor Signature */}
			<div className="doc-signature-block">
				<div className="text-xs font-bold text-[var(--doc-primary-dark)]">
					Врач-стоматолог: ____________________ / {doctorName || "____________________"} /
				</div>
				<div className="doc-sign-hint">(подпись и личная печать врача)</div>
			</div>

			{/* Patient Signature */}
			{branding.showPatientSignatureLine && (
				<div className="doc-signature-block">
					<div className="text-xs font-bold text-[var(--doc-primary-dark)]">
						Пациент: ____________________ / {patient?.fullName || "____________________"} /
					</div>
					<div className="doc-sign-hint">(с диагнозом и планом лечения ознакомлен)</div>
				</div>
			)}
		</div>
	);
};
