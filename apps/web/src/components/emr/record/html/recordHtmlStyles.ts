/**
 * CSS-стили печатного документа медицинской карты (ГОСТ Р 7.0.97-2016 / А4 Portrait)
 */
export function getMedicalRecordPrintStyles(fontSizePt = 8.5): string {
	return `
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 12mm 15mm;
      @bottom-right {
        content: "Стр. " counter(page);
        font-family: "PT Astra Sans", Arial, sans-serif;
        font-size: 7.5pt;
        color: #64748b;
      }
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: "PT Astra Serif", "Times New Roman", "PT Astra Sans", Arial, serif;
      font-size: ${fontSizePt}pt;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc-container { width: 100%; max-width: 185mm; margin: 0 auto; padding: 0; }
    .header-grid {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 6px; border-bottom: 1.5pt solid #0f172a; padding-bottom: 4px;
    }
    .clinic-info { width: 58%; font-family: "PT Astra Sans", Arial, sans-serif; font-size: 7pt; line-height: 1.2; color: #334155; }
    .clinic-title { font-weight: 800; font-size: 10pt; text-transform: uppercase; color: #0f172a; margin-bottom: 2px; }
    .doc-requisites { width: 40%; text-align: right; font-family: "PT Astra Sans", Arial, sans-serif; font-size: 7pt; line-height: 1.2; color: #334155; }
    .form-badge { display: inline-block; font-weight: 800; font-size: 8pt; text-transform: uppercase; color: #0f172a; border: 1pt solid #0f172a; padding: 1pt 4pt; margin-bottom: 2pt; background: #f8fafc; }
    .doc-title-block { text-align: center; margin: 6px 0; }
    .doc-main-title { font-family: "PT Astra Sans", Arial, sans-serif; font-size: 11pt; font-weight: 800; text-transform: uppercase; color: #0f172a !important; margin: 0; line-height: 1.2; }
    .doc-sub-title { font-size: 7.5pt; margin: 2px 0 0 0; font-style: italic; color: #475569; }
    .section-title {
      font-family: "PT Astra Sans", Arial, sans-serif; font-weight: 700; font-size: 8.5pt;
      text-transform: uppercase; letter-spacing: 0.02em; margin-top: 6px; margin-bottom: 3px;
      background: #f1f5f9; color: #0f172a; padding: 2px 5px; border-left: 3.5px solid #0284c7;
      page-break-after: avoid; break-after: avoid;
    }
    table.data-table { width: 100%; border-collapse: collapse; margin: 2px 0 5px 0; font-size: 7.5pt; line-height: 1.2; }
    table.data-table th, table.data-table td { border: 0.5pt solid #94a3b8; padding: 2.5pt 3.5pt; vertical-align: top; }
    table.data-table th { background: #f1f5f9; color: #0f172a; font-family: "PT Astra Sans", Arial, sans-serif; font-weight: 700; text-align: center; }
    table.data-table tr:nth-child(even) td { background: #f8fafc; }
    .signature-row { display: flex; justify-content: space-between; margin-top: 10px; page-break-inside: avoid; break-inside: avoid; }
    .sig-box { width: 48%; }
    .sig-line { border-bottom: 0.75pt solid #0f172a; width: 100%; height: 14px; margin-bottom: 2px; }
    .sig-caption { font-family: "PT Astra Sans", Arial, sans-serif; font-size: 6.5pt; color: #64748b; text-align: center; }
    .stamp-seal { display: inline-block; width: 38px; height: 38px; border: 1.5px dashed #0284c7; border-radius: 50%; text-align: center; line-height: 36px; font-size: 7pt; color: #0284c7; font-weight: 700; float: right; margin-top: -12px; }
    .ukep-stamp-card { border: 1.5pt solid #0284c7; background: #f0f9ff; border-radius: 4px; padding: 4pt 6pt; margin-top: 8px; font-size: 6.5pt; color: #0369a1; line-height: 1.2; page-break-inside: avoid; break-inside: avoid; }
    .watermark-draft {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-32deg);
      font-size: 76pt; font-weight: 900; color: rgba(239, 68, 68, 0.15); text-transform: uppercase;
      letter-spacing: 0.1em; pointer-events: none; z-index: 9999; white-space: nowrap; user-select: none;
    }
    @media print {
      body { font-size: ${fontSizePt}pt; color: #000 !important; background: #fff !important; }
      .watermark-draft { color: rgba(0, 0, 0, 0.08) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section-title { background: #f1f5f9 !important; color: #0f172a !important; border-left-color: #0f172a !important; page-break-after: avoid; break-after: avoid; }
      table.data-table th, table.data-table-dense th { background: #f1f5f9 !important; color: #0f172a !important; }
      table.data-table td, table.data-table th, table.data-table-dense td, table.data-table-dense th { border-color: #000 !important; color: #000 !important; }
      table.data-table tr:nth-child(even) td, table.data-table-dense tr:nth-child(even) td { background: transparent !important; }
      .header-grid { border-bottom-color: #000 !important; }
      .sig-line { border-bottom-color: #000 !important; }
      .form-badge { border-color: #000 !important; color: #000 !important; background: #fff !important; }
      .soap-diary-card { border-color: #000 !important; background: #fff !important; page-break-inside: avoid !important; break-inside: avoid !important; }
      .signature-row, .sig-box, .ukep-stamp-card, .stamp-seal { page-break-inside: avoid !important; break-inside: avoid !important; }
    }
  `;
}
