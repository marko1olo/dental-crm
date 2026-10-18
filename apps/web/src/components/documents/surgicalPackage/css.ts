export const SURGICAL_PACKAGE_CSS = `
    @page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #111827; background: #ffffff; font-size: 8.8pt; line-height: 1.3; margin: 0; padding: 0; }
    .print-sheet { width: 100%; min-height: 272mm; max-height: 280mm; page-break-after: always; break-after: page; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
    .print-sheet:last-child { page-break-after: avoid; break-after: avoid; }
    .sheet-header { border-bottom: 1.5px solid #1f2937; padding-bottom: 4pt; margin-bottom: 6pt; }
    .clinic-top-row { display: flex; justify-content: space-between; align-items: flex-start; font-size: 7.5pt; color: #4b5563; line-height: 1.25; }
    .statutory-badge { font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #111827; background: #f3f4f6; border: 1px solid #9ca3af; padding: 1.5pt 5pt; border-radius: 2pt; display: inline-block; margin-bottom: 2pt; }
    h1 { font-size: 11pt; font-weight: 800; text-align: center; margin: 3pt 0 2pt 0; text-transform: uppercase; color: #111827; }
    .sheet-subtitle { font-size: 8pt; text-align: center; color: #4b5563; margin: 0 0 6pt 0; }
    .parties-block { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 3pt; padding: 5pt 7pt; font-size: 8pt; margin-bottom: 6pt; line-height: 1.35; }
    .section-title { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; color: #1f2937; margin: 5pt 0 2pt 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 1pt; }
    p, li { margin: 2pt 0; text-align: justify; }
    ol, ul { margin: 2pt 0 4pt 14pt; padding: 0; }
    .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16pt; margin-top: 8pt; padding-top: 6pt; border-top: 1px solid #d1d5db; font-size: 8pt; break-inside: avoid; page-break-inside: avoid; }
    .sign-line { margin-top: 14pt; border-bottom: 1px solid #4b5563; height: 1pt; }
    .sign-caption { font-size: 7pt; color: #6b7280; text-align: center; margin-top: 2pt; }
    .memo-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 4pt; padding: 6pt 8pt; margin: 4pt 0; }
    .memo-alert { background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 4pt; padding: 6pt 8pt; margin: 4pt 0; }
`;
