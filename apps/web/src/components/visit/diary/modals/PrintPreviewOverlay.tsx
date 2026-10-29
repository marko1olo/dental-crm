import React from "react";
import { createPortal } from "react-dom";
import { PremiumDocumentPrintSheet } from "../../../documents/PremiumDocumentPrintSheet";
import type { DiaryState } from "../../../useVisitDiaryLogic";
import { PrintPreviewToolbar } from "./PrintPreviewToolbar";

export interface PrintPreviewOverlayProps {
	readonly showPreview: boolean;
	readonly setShowPreview: (val: boolean) => void;
	readonly setShowBrandingCustomizer: (val: boolean) => void;
	readonly patientFullName: string;
	readonly patientBirthDate?: string | null;
	readonly patientCardNumber?: string | null;
	readonly patientPassport?: string | null;
	readonly patientOms?: string | null;
	readonly patientSnils?: string | null;
	readonly patientPhone?: string | null;
	readonly patientAddress?: string | null;
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly lastSavedAt?: Date | null;
	readonly diary: DiaryState;
	readonly icdEntry?: any;
	readonly activeTeeth?: readonly any[];
	readonly radiologySnapshots?: readonly any[];
	readonly diaryHash?: string | null;
	readonly hasCryptoSignature?: boolean;
	readonly isLocked: boolean;
	readonly lockedAt?: string | null;
	readonly revisionCount?: number;
}

export const PrintPreviewOverlay: React.FC<PrintPreviewOverlayProps> = ({
	showPreview,
	setShowPreview,
	setShowBrandingCustomizer,
	patientFullName,
	patientBirthDate,
	patientCardNumber,
	patientPassport,
	patientOms,
	patientSnils,
	patientPhone,
	patientAddress,
	doctorName,
	doctorSpecialty,
	lastSavedAt,
	diary,
	icdEntry,
	activeTeeth,
	radiologySnapshots,
	diaryHash,
	hasCryptoSignature,
	isLocked,
	lockedAt,
	revisionCount,
}) => {
	if (!showPreview || typeof window === "undefined") return null;

	return createPortal(
		<div
			className="clinical-diary-print-overlay print-layer"
			data-testid="clinical-diary-preview"
			data-legacy-testid="form-043-preview"
			role="dialog"
			aria-modal="true"
			aria-label="Медицинская карта стоматологического пациента"
		>
			<div className="clinical-diary-print-sheet print-content">
				<PrintPreviewToolbar
					onOpenBranding={() => setShowBrandingCustomizer(true)}
					onClosePreview={() => setShowPreview(false)}
				/>
				<div className="p-4 sm:p-6 overflow-y-auto">
					<PremiumDocumentPrintSheet
						documentTitle="МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА"
						documentSubtitle="Медицинская карта стоматологического пациента"
						patient={{
							fullName: patientFullName !== "—" ? patientFullName : null,
							birthDate: patientBirthDate || null,
							medicalCardNumber: patientCardNumber || null,
							passport: patientPassport || null,
							omsPolis: patientOms || null,
							snils: patientSnils || null,
							phone: patientPhone || null,
							address: patientAddress || null,
						}}
						doctorName={doctorName !== "—" ? doctorName : null}
						doctorSpecialty={doctorSpecialty || null}
						visitDate={lastSavedAt || new Date()}
						diary={diary}
						icd10Label={icdEntry ? icdEntry.label : null}
						teethData={activeTeeth as any}
						radiologySnapshots={radiologySnapshots}
						diaryHash={diaryHash}
						hasCryptoSignature={hasCryptoSignature}
						isLocked={isLocked}
						lockedAt={lockedAt}
						revisionCount={revisionCount}
					/>
				</div>
			</div>
		</div>,
		document.body,
	);
};
