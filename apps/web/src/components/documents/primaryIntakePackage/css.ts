export const PRIMARY_INTAKE_PACKAGE_CSS = `
    @page { size: A4 portrait; margin: 12mm 10mm 12mm 20mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #111827; background: #ffffff; font-size: 8.8pt; line-height: 1.3; margin: 0; padding: 0; }
    .print-sheet { width: 100%; min-height: 272mm; max-height: 280mm; page-break-after: always; break-after: page; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
    .print-sheet:last-child { page-break-after: avoid; break-after: avoid; }
    .sheet-header { border-bottom: 1.5px solid #1f2937; padding-bottom: 4pt; margin-bottom: 6pt; }
    .clinic-top-row { display: flex; justify-content: space-between; align-items: flex-start; font-size: 7.5pt; color: #4b5563; line-height: 1.25; }
    .statutory-badge { font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #111827; background: #f3f4f6; border: 1px solid #9ca3af; padding: 1.5pt 5pt; border-radius: 2pt; display: inline-block; margin-bottom: 2pt; }
    h1 { font-size: 11.5pt; font-weight: 800; text-align: center; margin: 4pt 0 2pt 0; text-transform: uppercase; color: #111827; }
    .sheet-subtitle { font-size: 8pt; text-align: center; color: #4b5563; margin: 0 0 6pt 0; }
    .parties-block { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 3pt; padding: 5pt 7pt; font-size: 8pt; margin-bottom: 6pt; line-height: 1.35; }
    .section-title { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; margin: 5pt 0 2pt 0; color: #111827; border-bottom: 0.5px solid #d1d5db; padding-bottom: 1pt; }
    p, li { margin: 0 0 3pt 0; text-align: justify; }
    ol, ul { margin: 0 0 4pt 0; padding-left: 14pt; }
    table.data-table { width: 100%; border-collapse: collapse; margin: 4pt 0 6pt 0; font-size: 8pt; }
    table.data-table th, table.data-table td { border: 1px solid #9ca3af; padding: 3pt 5pt; vertical-align: middle; }
    table.data-table th { background: #f3f4f6; font-weight: 700; text-align: left; }
    .check-cell { text-align: center; font-weight: 700; white-space: nowrap; }
    .signatures-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14pt; margin-top: 6pt; padding-top: 4pt; border-top: 1px solid #9ca3af; font-size: 8pt; break-inside: avoid; page-break-inside: avoid; }
    .sign-box { display: flex; flex-direction: column; gap: 2pt; }
    .sign-line { border-bottom: 1px solid #111827; height: 18pt; margin-top: 3pt; }
    .sign-hint { font-size: 6.5pt; color: #6b7280; text-align: center; }
`;
