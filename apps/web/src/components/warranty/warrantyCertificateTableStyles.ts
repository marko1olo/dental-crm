/**
 * WARRANTY CERTIFICATE PRINTABLE STYLES — PART 2 (TABLE & SIGNATURES)
 * Mandate 8b: strict file length budget <= 120 lines.
 */

export const WARRANTY_CERTIFICATE_TABLE_CSS = `
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 9pt; position: relative; z-index: 1; }
    .items-table th { background: #0f766e; color: #ffffff; font-weight: 700; text-align: left; padding: 8px 10px; font-size: 8.5pt; }
    .items-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .items-table tr:nth-child(even) { background: #f8fafc; }
    .col-num { width: 4%; text-align: center; color: #64748b; }
    .col-tooth { width: 10%; font-size: 11pt; color: #0f766e; }
    .col-work { width: 28%; }
    .work-title { font-weight: 700; color: #0f172a; }
    .work-cat { font-size: 8pt; color: #64748b; }
    .col-material { width: 34%; }
    .mat-name { font-weight: 600; }
    .mat-meta { font-size: 8pt; color: #475569; }
    .mat-lot { font-size: 7.5pt; color: #0f766e; margin-top: 2px; }
    .col-warranty { width: 14%; text-align: right; }
    .war-period { font-weight: 800; color: #0f766e; font-size: 10pt; }
    .war-date { font-size: 7.5pt; color: #64748b; }
    .col-life { width: 10%; text-align: right; font-weight: 600; color: #475569; }

    .risk-summary-box { background: #f0fdfa; border-left: 4px solid #0f766e; padding: 10px 14px; border-radius: 0 6px 6px 0; margin-bottom: 16px; font-size: 8.5pt; position: relative; z-index: 1; }
    .risk-summary-box .title { font-weight: 800; color: #0f766e; margin-bottom: 4px; display: flex; justify-content: space-between; }

    .checkups-section { margin-bottom: 18px; position: relative; z-index: 1; }
    .checkups-section h4 { font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .checkup-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .checkup-pill { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 8pt; display: flex; flex-direction: column; }
    .chk-num { color: #64748b; font-size: 7.5pt; }
    .chk-date { color: #0f766e; font-size: 9.5pt; }
    .chk-status { color: #475569; font-size: 7pt; text-transform: uppercase; }

    .conditions-section { margin-bottom: 20px; position: relative; z-index: 1; }
    .conditions-section h4 { font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; }
    .conditions-list { list-style: none; font-size: 8pt; color: #334155; }
    .condition-item { margin-bottom: 6px; padding-left: 4px; }
    .cond-head { font-weight: 700; color: #0f172a; }
    .cond-desc { color: #475569; margin-top: 1px; }

    .signatures-block { display: grid; grid-template-columns: 1fr 1fr 160px; gap: 16px; align-items: flex-end; border-top: 1px solid #cbd5e1; padding-top: 16px; margin-top: 20px; position: relative; z-index: 1; break-inside: avoid; page-break-inside: avoid; }
    .sign-col .sign-title { font-size: 8pt; font-weight: 700; color: #64748b; margin-bottom: 24px; }
    .sign-line { border-bottom: 1px dashed #475569; margin-bottom: 4px; }
    .sign-name { font-size: 8.5pt; color: #0f172a; font-weight: 600; }
    .qr-col { text-align: center; }
    .qr-col svg { width: 90px; height: 90px; margin: 0 auto; }
    .qr-note { font-size: 6.5pt; color: #64748b; margin-top: 4px; }
    .hash-footer { margin-top: 14px; text-align: center; font-family: monospace; font-size: 6.5pt; color: #94a3b8; }
`;
