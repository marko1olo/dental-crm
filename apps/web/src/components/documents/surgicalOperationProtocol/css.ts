export const SURGICAL_OPERATION_PROTOCOL_CSS = `
    @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PT Sans", Roboto, Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #111827; background: #ffffff; padding: 0; }
    .protocol-container { width: 100%; max-width: 190mm; margin: 0 auto; position: relative; }
    .header-table { width: 100%; border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 14px; }
    .clinic-title { font-size: 13pt; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .clinic-meta { font-size: 8.5pt; color: #4b5563; line-height: 1.3; margin-top: 3px; }
    .doc-number { text-align: right; font-size: 9pt; color: #4b5563; }
    .doc-number strong { font-size: 11pt; color: #0f172a; }
    h1 { font-size: 13pt; font-weight: 800; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; margin: 12px 0 4px 0; color: #0f172a; }
    .sub-title { text-align: center; font-size: 9pt; color: #6b7280; margin-bottom: 16px; text-transform: uppercase; }
    .meta-box { border: 1px solid #d1d5db; border-radius: 4px; padding: 10px 12px; margin-bottom: 14px; background: #f9fafb; font-size: 9.5pt; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label { font-weight: 700; color: #374151; width: 32%; }
    .meta-val { color: #111827; width: 68%; }
    .section-title { font-size: 10.5pt; font-weight: 800; text-transform: uppercase; color: #0d9488; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 14px 0 8px 0; letter-spacing: 0.3px; }
    .protocol-text-block { white-space: pre-wrap; font-size: 10pt; line-height: 1.5; text-align: justify; color: #111827; margin-bottom: 14px; border-left: 3px solid #0d9488; padding-left: 10px; }
    .implant-table { width: 100%; border-collapse: collapse; margin: 10px 0 14px 0; font-size: 9pt; }
    .implant-table th, .implant-table td { border: 1px solid #d1d5db; padding: 5px 8px; text-align: left; }
    .implant-table th { background: #f3f4f6; font-weight: 700; color: #374151; }
    .signatures-block { margin-top: 24px; padding-top: 14px; border-top: 1px solid #d1d5db; display: flex; justify-content: space-between; align-items: flex-start; position: relative; }
    .sig-col { width: 48%; font-size: 9pt; line-height: 1.6; }
    .sig-line { margin-top: 24px; border-bottom: 1px solid #111827; width: 100%; height: 1px; }
    .sig-caption { font-size: 8pt; color: #6b7280; text-align: center; margin-top: 3px; }
    .stamp-draft { position: absolute; right: 15px; bottom: 60px; border: 3px dashed #d97706; border-radius: 8px; padding: 6px 14px; text-align: center; color: #b45309; transform: rotate(-7deg); opacity: 0.85; pointer-events: none; }
    .stamp-signed { position: absolute; right: 15px; bottom: 60px; border: 3px double #0d9488; border-radius: 8px; padding: 6px 14px; text-align: center; color: #0f766e; transform: rotate(-4deg); opacity: 0.9; pointer-events: none; }
    .stamp-title { font-size: 11pt; font-weight: 900; letter-spacing: 1px; }
    .stamp-sub { font-size: 8pt; font-weight: 600; }
    .stamp-date { font-size: 7.5pt; margin-top: 2px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;
