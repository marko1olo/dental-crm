/**
 * WARRANTY CERTIFICATE PRINTABLE STYLES — PART 1 (CONTAINER & HEADER)
 * Mandate 8b: strict file length budget <= 120 lines.
 */

export const WARRANTY_CERTIFICATE_BASE_CSS = `
    @page { size: A4 portrait; margin: 12mm 15mm 12mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #0f172a; background: #ffffff; padding: 10px; }
    .cert-container { max-width: 800px; margin: 0 auto; border: 2px solid #0f766e; border-radius: 8px; padding: 24px 28px; position: relative; background: #ffffff; }
    .cert-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80pt; font-weight: 900; color: rgba(15, 118, 110, 0.03); text-transform: uppercase; letter-spacing: 12px; pointer-events: none; user-select: none; z-index: 0; white-space: nowrap; }
    .cert-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 18px; position: relative; z-index: 1; }
    .clinic-logo-block { display: flex; align-items: center; gap: 12px; }
    .clinic-emblem { width: 48px; height: 48px; background: #0f766e; color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 22pt; font-weight: bold; }
    .clinic-info h1 { font-size: 15pt; font-weight: 800; color: #0f766e; letter-spacing: -0.5px; }
    .clinic-info .legal { font-size: 8.5pt; color: #475569; }
    .cert-title-badge { text-align: right; }
    .cert-number { font-size: 11pt; font-weight: 800; color: #0f766e; background: #f0fdfa; border: 1px solid #ccfbf1; padding: 4px 10px; border-radius: 6px; display: inline-block; margin-bottom: 4px; }
    .cert-issue-date { font-size: 8.5pt; color: #64748b; }
    .cert-main-title { text-align: center; margin: 14px 0 18px 0; position: relative; z-index: 1; }
    .cert-main-title h2 { font-size: 16pt; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.8px; }
    .cert-main-title p { font-size: 9pt; color: #64748b; margin-top: 2px; }
    .patient-card-strip { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 18px; font-size: 9.5pt; position: relative; z-index: 1; }
    .patient-card-strip .label { font-size: 8pt; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; }
    .patient-card-strip .val { font-weight: 700; color: #0f172a; }
`;
