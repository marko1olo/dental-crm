import {
	ImagingStudy
} from "@dental/shared";
import {
	kindLabels
} from "./imagingConstants.js";
import type { ImagingStudyKind } from "@dental/shared";

export function escapeXml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

export function previewSvg(study: ImagingStudy) {
	const label = kindLabels[study.kind] ?? "Рентген-снимок";
	const toothBadge = study.toothCode ? `Зуб #${study.toothCode}` : (study.kind === "opg" ? "Панорама ОПТГ" : (study.region ?? "Дентальный снимок"));
	const modalityCode = study.kind === "opg" ? "ОПТГ" : (study.kind === "periapical" || study.kind === "bitewing" ? "RVG" : (study.kind === "cbct" ? "КЛКТ" : "РЕНТГЕН"));
	const studyDateFormatted = typeof study.capturedAt === "string" ? study.capturedAt.slice(0, 10) : "";

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 344 220" role="img" aria-label="${escapeXml(study.title || label)}">
  <rect width="344" height="220" rx="12" fill="var(--paper, #090d16)"/>
  <rect x="8" y="8" width="328" height="204" rx="8" fill="none" stroke="var(--line, #1e293b)" stroke-width="1.5"/>
  
  <!-- Modality Badge -->
  <rect x="20" y="20" width="60" height="22" rx="4" fill="rgba(13, 148, 136, 0.12)" stroke="var(--teal, #0d9488)" stroke-width="1"/>
  <text x="50" y="35" text-anchor="middle" fill="var(--teal, #2dd4bf)" font-family="Inter, -apple-system, sans-serif" font-size="10" font-weight="700" letter-spacing="0.5">${modalityCode}</text>
  
  <!-- Tooth FDI Badge -->
  <rect x="86" y="20" width="100" height="22" rx="4" fill="rgba(13, 148, 136, 0.2)" stroke="var(--teal, #0d9488)" stroke-width="1"/>
  <text x="136" y="35" text-anchor="middle" fill="var(--teal, #5eead4)" font-family="monospace, sans-serif" font-size="10" font-weight="700">${escapeXml(toothBadge)}</text>
  
  <!-- Study Details -->
  <text x="172" y="100" text-anchor="middle" fill="var(--ink, #f8fafc)" font-family="Inter, -apple-system, sans-serif" font-size="14" font-weight="700">${escapeXml(study.title || label)}</text>
  <text x="172" y="125" text-anchor="middle" fill="var(--ink-muted, #94a3b8)" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="500">${escapeXml(label)} • Система DENTE PACS</text>
  ${studyDateFormatted ? `<text x="172" y="150" text-anchor="middle" fill="var(--ink-muted, #64748b)" font-family="monospace" font-size="11">Дата съёмки: ${escapeXml(studyDateFormatted)}</text>` : ""}
  
  <!-- Bottom Status Indicator -->
  <rect x="20" y="180" width="304" height="24" rx="6" fill="rgba(255, 255, 255, 0.03)" stroke="var(--line, #1e293b)" stroke-width="1"/>
  <text x="172" y="196" text-anchor="middle" fill="var(--teal, #0d9488)" font-family="Inter, -apple-system, sans-serif" font-size="11" font-weight="600">Нажмите для просмотра в высоком разрешении</text>
</svg>`;
}
