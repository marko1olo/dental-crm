/**
 * TreatmentPlanActSignatures.tsx — Юридические условия сдачи-приемки, гарантии,
 * подписи сторон, печать клиники (М.П.) и QR-верификация по ГОСТ Р 7.0.97-2016.
 */

import React from "react";
import type { CompletedWorksActAndWriteOffData } from "./types.js";
import type { DocumentBrandColorPalette } from "../../store/documentBrandingStore.js";
import { ActLegalTermsSection } from "./actSignatures/ActLegalTermsSection.js";
import { ActSignatureGrid } from "./actSignatures/ActSignatureGrid.js";
import { ActQrVerificationStamp } from "./actSignatures/ActQrVerificationStamp.js";

export interface TreatmentPlanActSignaturesProps {
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly palette: DocumentBrandColorPalette;
	readonly legalName: string;
	readonly patientPassport?: string | null | undefined;
	readonly showDoctorStampFrame: boolean;
	readonly showQrVerification: boolean;
	readonly verificationHash: string;
	readonly customDisclaimer?: string;
}

export const TreatmentPlanActSignatures: React.FC<TreatmentPlanActSignaturesProps> = ({
	actData,
	palette,
	legalName,
	patientPassport,
	showDoctorStampFrame,
	showQrVerification,
	verificationHash,
	customDisclaimer,
}) => {
	return (
		<>
			{/* Section 3: Patient Acceptance & Legal Terms */}
			<ActLegalTermsSection palette={palette} />

			{/* Doctor Signature and Clinic Seal Zones */}
			<div
				className="doc-sign-zone !flex !flex-col !gap-0 !items-stretch !justify-start w-full pt-4 border-t border-slate-300 break-inside-avoid"
				style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
			>
				<ActSignatureGrid
					actData={actData}
					palette={palette}
					legalName={legalName}
					patientPassport={patientPassport}
					showDoctorStampFrame={showDoctorStampFrame}
				/>

				{/* Electronic Verification QR Stamp (GOST R 7.0.97-2016) */}
				{showQrVerification && (
					<ActQrVerificationStamp
						actData={actData}
						palette={palette}
						verificationHash={verificationHash}
					/>
				)}
			</div>

			{/* Footer Disclaimer & Clinic Guarantee */}
			<footer className="doc-footer-disclaimer mt-6 pt-3 border-t border-slate-300 text-[10px] text-slate-500 text-justify leading-relaxed">
				{customDisclaimer || (
					"Настоящий Акт составлен в 2 (двух) подлинных экземплярах, имеющих равную юридическую силу, по одному для каждой из Сторон. Документ хранится в архиве медицинской организации в составе медицинской карты пациента в течение 25 лет."
				)}
			</footer>
		</>
	);
};
