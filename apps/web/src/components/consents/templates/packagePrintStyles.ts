/**
 * CSS-стили для непрерывной печати пакетов согласий А4
 */
export function getPackagePrintStyles(stampColor: string): string {
	return `
    @page { size: A4; margin: 10mm 14mm 12mm 14mm; }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 8.5pt; line-height: 1.35; color: #111827; background: #ffffff; margin: 0; padding: 0;
    }
    .watermark-draft {
      position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 48pt; font-weight: 900; color: rgba(0, 0, 0, 0.04); text-transform: uppercase;
      letter-spacing: 4pt; pointer-events: none; z-index: 0; user-select: none;
    }
    .watermark-stamp {
      display: inline-block; border: 1.5pt solid ${stampColor}; color: ${stampColor};
      padding: 1.5pt 5pt; border-radius: 2.5pt; font-size: 7pt; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .package-doc-sheet {
      position: relative; display: flex; flex-direction: column; justify-content: space-between;
      min-height: 100%; page-break-after: always; padding-bottom: 8pt;
    }
    .package-doc-sheet:last-child { page-break-after: avoid; }
    .package-header-banner {
      background: #f0fdfa; border: 1px solid #0d9488; border-radius: 3pt; padding: 3pt 6pt; margin-bottom: 4pt;
    }
    .package-banner-title {
      display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 8pt; color: #0f766e;
    }
    .package-banner-badge {
      font-size: 7.5pt; background: #ccfbf1; padding: 1pt 4pt; border-radius: 2pt; color: #115e59;
    }
    .sheet-header { border-bottom: 1.5px solid #111827; padding-bottom: 3pt; margin-bottom: 5pt; }
    .clinic-top-row { display: flex; justify-content: space-between; align-items: flex-start; font-size: 7.5pt; color: #4b5563; margin-bottom: 3pt; }
    .statutory-badge { display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 7pt; font-weight: 700; padding: 1.5pt 4pt; border-radius: 2pt; border: 0.5px solid #bae6fd; }
    h1 { font-size: 10.5pt; font-weight: 800; text-align: center; margin: 2pt 0 1pt 0; letter-spacing: 0.3pt; text-transform: uppercase; color: #0f172a; }
    .sheet-subtitle { font-size: 7.5pt; text-align: center; color: #475569; margin-bottom: 3pt; }
    .parties-block { background: #f8fafc; border: 1px solid #cbd5e1; padding: 4pt 6pt; border-radius: 3pt; margin-bottom: 5pt; font-size: 8pt; line-height: 1.35; }
    .section-title { font-weight: 700; font-size: 8.5pt; text-transform: uppercase; margin: 3pt 0 2pt 0; color: #1e293b; border-bottom: 0.5px solid #e2e8f0; padding-bottom: 1pt; }
    p { margin: 0 0 3pt 0; text-align: justify; }
    .bullets-list { margin: 2pt 0 4pt 0; padding-left: 14pt; font-size: 8pt; }
    .bullets-list li { margin-bottom: 1.5pt; }
    .risk-block, .aftercare-block { background: #fffbeb; border: 1px solid #fef3c7; padding: 3pt 6pt; border-radius: 3pt; margin: 3pt 0; font-size: 8pt; }
    .signatures-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16pt; margin-top: 6pt; padding-top: 5pt; border-top: 1px solid #94a3b8; font-size: 8pt; page-break-inside: avoid; }
    .sign-box { display: flex; flex-direction: column; gap: 2pt; }
    .sign-line { border-bottom: 1px solid #0f172a; height: 18pt; margin-top: 3pt; }
    .sign-hint { font-size: 6.5pt; color: #64748b; text-align: center; }
  `;
}
