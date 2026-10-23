/**
 * WARRANTY REMEDIATION ACT PRINTABLE STYLES (A4)
 * Mandate 8b: strict file length budget <= 120 lines.
 */

export const WARRANTY_REMEDIATION_ACT_CSS = `
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 10.5pt;
      color: #0f172a;
      background: #ffffff;
      padding: 15px;
    }
    .act-container {
      max-width: 760px;
      margin: 0 auto;
      border: 2px solid #0f766e;
      border-radius: 8px;
      padding: 24px;
    }
    .act-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .act-title {
      font-size: 14pt;
      font-weight: 900;
      color: #0f766e;
      text-transform: uppercase;
    }
    .act-meta {
      font-size: 9pt;
      color: #475569;
      margin-top: 4px;
    }
    .act-badge {
      font-size: 11pt;
      font-weight: 800;
      color: #0f766e;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      padding: 4px 10px;
      border-radius: 6px;
      text-align: right;
    }
    .act-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 9.5pt;
    }
    .act-grid .field { margin-bottom: 4px; }
    .act-grid .lbl { font-size: 8pt; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .act-grid .val { font-weight: 700; color: #0f172a; }
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      margin: 14px 0 6px 0;
    }
    .box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 9.5pt;
      margin-bottom: 12px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 16px;
    }
    .table th {
      background: #0f766e;
      color: #ffffff;
      padding: 6px 8px;
      text-align: left;
    }
    .zero-pay-box {
      background: #ecfdf5;
      border: 2px solid #059669;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 16px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .zero-pay-title { font-size: 11pt; font-weight: 800; color: #065f46; }
    .zero-pay-val { font-size: 18pt; font-weight: 900; color: #059669; }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #cbd5e1;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sign-line { border-bottom: 1px dashed #475569; margin: 24px 0 4px 0; }
`;
