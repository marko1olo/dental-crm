import React from "react";
import {
	BRAND_COLOR_PALETTES,
	useDocumentBrandingStore,
} from "../../store/documentBrandingStore";
import "../../styles/premium-document-print.css";
import type { PremiumDocumentPrintSheetProps } from "./premiumPrint/types";
import { PremiumPrintClinicHeader } from "./premiumPrint/PremiumPrintClinicHeader";
import { PremiumPrintTitleBox } from "./premiumPrint/PremiumPrintTitleBox";
import { PremiumPrintPatientTable } from "./premiumPrint/PremiumPrintPatientTable";
import { PremiumPrintClinicalDiary } from "./premiumPrint/PremiumPrintClinicalDiary";
import { PremiumPrintRadiologySection } from "./premiumPrint/PremiumPrintRadiologySection";
import { PremiumPrintSignatureZone } from "./premiumPrint/PremiumPrintSignatureZone";

/**
 * Canonical signatures specification & breakInside: "avoid":
 * Врач-стоматолог: ____________________ / {doctorName || "____________________"} /
 * Пациент: ____________________ / {patient?.fullName || "____________________"} /
 * (See PremiumPrintSignatureZone.tsx for full DOM implementation)
 */
export type { PremiumDocumentPrintSheetProps };

export const PremiumDocumentPrintSheet: React.FC<PremiumDocumentPrintSheetProps> = ({
	documentTitle = "МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА",
	documentSubtitle = "Амбулаторная медицинская карта стоматологического пациента / Дневник приёма",
	patient,
	doctorName,
	doctorSpecialty,
	doctorSnils,
	visitDate = new Date(),
	diary,
	icd10Label,
	teethData,
	radiologySnapshots,
	diaryHash,
	hasCryptoSignature,
	isLocked = false,
	revisionCount = 0,
	customDisclaimer,
	className = "",
}) => {
	const branding = useDocumentBrandingStore();
	const palette = BRAND_COLOR_PALETTES[branding.brandAccentColor] || BRAND_COLOR_PALETTES.deep_teal;
	const formattedDate = new Date(visitDate || Date.now()).toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	const activeTeethWithFindings = (teethData || []).filter((t) => {
		const s = (t.state || "").toLowerCase();
		return s !== "healthy" && s !== "" && s !== "0";
	});

	const showDetailedSoap = Boolean(
		branding.showDetailedSoap || (branding as unknown as { showDetailed043?: boolean }).showDetailed043,
	);

	return (
		<div
			className={`premium-doc-sheet doc-palette-${branding.brandAccentColor} doc-density-${branding.layoutDensity} doc-font-${branding.fontFamily} ${className}`.trim()}
			style={
				{
					"--doc-primary": palette.primary,
					"--doc-primary-dark": palette.primaryDark,
					"--doc-soft-bg": palette.softBg,
					"--doc-accent-border": palette.accentBorder,
				} as React.CSSProperties
			}
		>
			<PremiumPrintClinicHeader branding={branding} palette={palette} />
			<PremiumPrintTitleBox
				documentTitle={documentTitle}
				documentSubtitle={documentSubtitle}
				isLocked={isLocked}
				revisionCount={revisionCount ?? 0}
			/>
			<PremiumPrintPatientTable
				patient={patient}
				doctorName={doctorName}
				doctorSpecialty={doctorSpecialty}
				doctorSnils={doctorSnils}
				formattedDate={formattedDate}
			/>
			{showDetailedSoap && diary && (
				<PremiumPrintClinicalDiary
					diary={diary}
					palette={palette}
					icd10Label={icd10Label}
					showOdontogramDiagram={branding.showOdontogramDiagram}
					activeTeethWithFindings={activeTeethWithFindings}
				/>
			)}
			{branding.showRadiologyThumbnails && radiologySnapshots && (
				<PremiumPrintRadiologySection radiologySnapshots={radiologySnapshots} />
			)}
			<PremiumPrintSignatureZone
				branding={branding}
				patient={patient}
				doctorName={doctorName}
				diaryHash={diaryHash}
				hasCryptoSignature={hasCryptoSignature}
			/>
			{(customDisclaimer || branding.customDisclaimer) && (
				<footer className="doc-footer-disclaimer">
					{customDisclaimer || branding.customDisclaimer}
				</footer>
			)}
		</div>
	);
};
