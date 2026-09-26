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

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 344 220" role="img" aria-label="${escapeXml(study.title || label)}">
  <rect width="344" height="220" rx="12" fill="#090d16"/>
  <rect x="8" y="8" width="328" height="204" rx="8" fill="none" stroke="#1e293b" stroke-width="1.5"/>
  <path d="M20 32 V20 H32 M312 20 H324 V32 M20 188 V200 H32 M312 200 H324 V188" stroke="#334155" stroke-width="1.5" fill="none"/>
  
  <!-- Modality Badge -->
  <rect x="20" y="20" width="60" height="22" rx="4" fill="#0f172a" stroke="#0d9488" stroke-width="1"/>
  <text x="50" y="35" text-anchor="middle" fill="#2dd4bf" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="0.5">${modalityCode}</text>
  
  <!-- Tooth FDI Badge -->
  <rect x="86" y="20" width="90" height="22" rx="4" fill="#134e4a" stroke="#0d9488" stroke-width="1"/>
  <text x="131" y="35" text-anchor="middle" fill="#5eead4" font-family="monospace, sans-serif" font-size="10" font-weight="700">${escapeXml(toothBadge)}</text>
  
  <!-- Center Dental Sensor Graphic with Calibration Reticle -->
  <g transform="translate(142, 56)" stroke="#334155" stroke-width="1.5" fill="none">
    <rect x="0" y="0" width="60" height="50" rx="6" stroke="#0d9488" stroke-width="1.2" fill="#0f172a"/>
    <circle cx="30" cy="25" r="14" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.7"/>
    <circle cx="30" cy="25" r="3" fill="#2dd4bf"/>
    <path d="M30 4 V10 M30 40 V46 M4 25 H10 M50 25 H56" stroke="#2dd4bf" stroke-width="1.2" opacity="0.8"/>
  </g>
  
  <text x="172" y="126" text-anchor="middle" fill="#f8fafc" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">${escapeXml(study.title || label)}</text>
  <text x="172" y="146" text-anchor="middle" fill="#94a3b8" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500">${escapeXml(label)} • Формула FDI</text>
  
  <!-- Millimeter Calibration Scale bar -->
  <g transform="translate(97, 168)" stroke="#475569" stroke-width="1" fill="#94a3b8">
    <line x1="0" y1="0" x2="150" y2="0" stroke="#0d9488" stroke-width="1.5"/>
    <line x1="0" y1="-4" x2="0" y2="4" stroke="#0d9488" stroke-width="1.5"/>
    <line x1="75" y1="-3" x2="75" y2="3" stroke="#0d9488" stroke-width="1"/>
    <line x1="150" y1="-4" x2="150" y2="4" stroke="#0d9488" stroke-width="1.5"/>
    <text x="75" y="14" text-anchor="middle" font-family="monospace" font-size="9" fill="#2dd4bf">|-- 10 мм --|-- 20 мм --|</text>
  </g>
</svg>`;
}
