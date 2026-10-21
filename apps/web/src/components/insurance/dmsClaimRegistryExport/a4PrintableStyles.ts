/**
 * a4PrintableStyles.ts — CSS стили печатного бланка счета-реестра А4
 */

export const DMS_A4_PRINT_CSS = `
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #0f172a; line-height: 1.4; margin: 0; padding: 24px; }
  .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
  .clinic-head { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
  .doc-main-title { font-size: 16px; font-weight: 800; text-align: center; text-transform: uppercase; margin: 16px 0 4px; letter-spacing: 0.5px; }
  .doc-sub { text-align: center; font-size: 11px; color: #475569; margin-bottom: 16px; }
  .parties-grid { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; font-size: 11px; }
  .party-col { width: 48%; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10.5px; }
  th, td { border: 1px solid #94a3b8; padding: 5px 7px; }
  th { background: #f1f5f9; font-weight: 700; text-align: left; }
  .totals-row { background: #f8fafc; font-weight: 800; font-size: 11px; }
  .act-section { margin-top: 28px; page-break-inside: avoid; }
  .act-title { font-size: 13px; font-weight: 800; text-align: center; text-transform: uppercase; margin-bottom: 8px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 36px; page-break-inside: avoid; }
  .sig-col { width: 45%; }
  .sig-line { border-top: 1px solid #0f172a; margin-top: 32px; padding-top: 4px; font-size: 10px; text-align: center; }
  @media print { body { padding: 0; } }
`;
