export const TAX_CERTIFICATE_KND1151156_CSS = `
    @page { size: A4 portrait; margin: 8mm 12mm 10mm 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #0f172a; background: #ffffff; font-size: 8.5pt; line-height: 1.3; margin: 0; padding: 0; }
    .cert-sheet { width: 100%; min-height: 275mm; display: flex; flex-direction: column; justify-content: space-between; }
    .top-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 4pt; margin-bottom: 6pt; }
    .knd-stamp { font-size: 7.5pt; color: #334155; line-height: 1.25; }
    .barcode-container { display: flex; flex-direction: column; align-items: flex-end; }
    h1 { font-size: 11pt; font-weight: 800; text-align: center; margin: 4pt 0 2pt 0; text-transform: uppercase; letter-spacing: 0.3pt; color: #0f172a; }
    .sub-title { font-size: 8pt; text-align: center; color: #475569; margin-bottom: 8pt; }
    .section-title { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; background: #f1f5f9; padding: 2.5pt 6pt; border-left: 3px solid #0f172a; margin: 6pt 0 3pt 0; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 4pt; font-size: 8.2pt; }
    .details-table td { padding: 2.5pt 4pt; vertical-align: top; border-bottom: 1px solid #e2e8f0; }
    .details-table td.label-col { width: 32%; color: #475569; font-weight: 600; }
    .finance-grid { width: 100%; border-collapse: collapse; margin: 6pt 0; font-size: 8.5pt; }
    .finance-grid th, .finance-grid td { border: 1px solid #cbd5e1; padding: 4pt 6pt; text-align: left; }
    .finance-grid th { background: #f8fafc; font-weight: 700; color: #0f172a; }
    .finance-grid td.amount-col { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; width: 25%; }
    .total-in-words { background: #fafafa; border: 1px dashed #cbd5e1; padding: 4pt 8pt; font-size: 8pt; margin: 4pt 0; line-height: 1.35; }
    .receipts-list { font-size: 7.5pt; color: #475569; margin: 4pt 0; line-height: 1.3; }
    .bottom-signatures { display: grid; grid-template-columns: 120px 1fr 1fr; gap: 12pt; align-items: center; margin-top: 8pt; padding-top: 6pt; border-top: 1.5px solid #0f172a; font-size: 8pt; break-inside: avoid; page-break-inside: avoid; }
    .stamp-box { border: 1px dashed #94a3b8; width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7pt; color: #64748b; margin: 0 auto; }
`;
