export const prescriptionPrintCss = `
  @page { size: A5 portrait; margin: 8mm 10mm 8mm 10mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Times New Roman", Times, serif; color: #000; background: #fff; font-size: 10pt; line-height: 1.25; margin: 0; padding: 0; }
  .rx-sheet { width: 100%; min-height: 195mm; display: flex; flex-direction: column; justify-content: space-between; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #000; padding-bottom: 4pt; margin-bottom: 6pt; }
  .clinic-stamp-box { width: 58%; border: 1px dashed #444; padding: 3pt 5pt; font-size: 8pt; line-height: 1.2; }
  .form-statutory-info { width: 40%; text-align: right; font-size: 8pt; line-height: 1.2; }
  .rx-title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5pt; margin: 4pt 0 1pt 0; }
  .rx-series { text-align: center; font-size: 9.5pt; margin-bottom: 6pt; }
  .patient-block { border-bottom: 1px solid #000; padding-bottom: 5pt; margin-bottom: 8pt; font-size: 9.5pt; line-height: 1.4; }
  .rp-container { min-height: 85mm; margin-bottom: 6pt; }
  .rp-item { margin-bottom: 10pt; }
  .rp-line-main { font-weight: bold; font-style: italic; font-size: 10.5pt; }
  .rp-line-dispense { margin-left: 18pt; font-style: italic; font-size: 9.5pt; }
  .rp-line-signa { margin-left: 18pt; font-size: 9.5pt; }
  .rp-trade-name { margin-left: 18pt; font-size: 8pt; color: #555; }
  .footer-section { border-top: 1.5px solid #000; padding-top: 6pt; font-size: 9pt; line-height: 1.3; break-inside: avoid; page-break-inside: avoid; }
  .footer-grid { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6pt; }
  .doctor-stamp-circle { width: 52px; height: 52px; border: 1px dashed #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7.5pt; font-weight: bold; }
  .clinic-stamp-circle { width: 65px; height: 38px; border: 1px dashed #000; border-radius: 4px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7pt; margin-right: 12pt; }
`;
