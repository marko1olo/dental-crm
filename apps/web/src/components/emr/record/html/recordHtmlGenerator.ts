import type { MedicalCardForm043uData, Form043PrintConfig } from "../../emr043Types";
import { escapeHtml } from "../../emr043Math";
import { getMedicalRecordPrintStyles } from "./recordHtmlStyles";
import { renderClinicHeaderHtml, renderCardTitleBlockHtml, renderPassportSectionHtml } from "./recordPassportHtml";
import { renderAnamnesisSectionHtml } from "./recordAnamnesisHtml";
import { renderOdontogramSectionHtml } from "./recordOdontogramHtml";
import { renderDiariesSectionHtml } from "./recordDiariesHtml";
import { renderEpicrisisAndSignaturesHtml } from "./recordEpicrisisHtml";

/** Главный сборщик HTML документа медицинской карты для печати на А4 */
export function generateMedicalRecordPrintHtml(data: MedicalCardForm043uData, config?: Partial<Form043PrintConfig>): string {
	const cfg: Form043PrintConfig = {
		activeTab: "overview",
		pageOrientation: "portrait",
		includeClinicLogo: true,
		includeClinicRequisites: true,
		includeUkepStamp: true,
		includeDoctorStampSeal: true,
		includePatientSignatureBlock: true,
		includeXrayThumbnails: true,
		includeFullSoapDiaries: true,
		fontSizePt: 8.5,
		scaleRatio: 1.0,
		themeMode: "light",
		...config,
	};

	const isDocDraft = Boolean(
		cfg.isDraft ||
		cfg.status === "draft" ||
		cfg.isLocked === false ||
		(data as any).isDraft ||
		(data as any).status === "draft" ||
		(data as any).isLocked === false,
	);

	const watermarkHtml = isDocDraft
		? '<div class="watermark-draft" aria-hidden="true">ЧЕРНОВИК</div>'
		: '<div class="watermark-draft watermark-signed" aria-hidden="true" style="color: rgba(5, 150, 105, 0.06);">ПОДПИСАНО ВРАЧОМ</div>';

	const revisionCount = (data as any).revisionCount ?? cfg.revisionCount ?? 0;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Медицинская карта приёма № ${escapeHtml(data.passport.medicalCardNumber)}</title>
  <style>${getMedicalRecordPrintStyles(cfg.fontSizePt)}</style>
</head>
<body>
<div class="doc-container print-paper-sheet pro-a4-physical-sheet" data-paper-sheet="true" data-preserve-white="true">
  ${watermarkHtml}
  ${renderClinicHeaderHtml(data.clinic, data.formOrderName)}
  ${renderCardTitleBlockHtml(data.passport, isDocDraft, revisionCount)}
  ${renderPassportSectionHtml(data.passport)}
  ${renderAnamnesisSectionHtml(data.anamnesis)}
  ${renderOdontogramSectionHtml(data.dentalStatus)}
  ${renderDiariesSectionHtml(data.visitDiaries, cfg)}
  ${renderEpicrisisAndSignaturesHtml(data.epicrisis, data.passport, data.generalTreatmentPlan, cfg)}
</div>
</body>
</html>`;
}

/** Совместимый фасад генератора формы */
export const generatePrintableHtml043 = generateMedicalRecordPrintHtml;
