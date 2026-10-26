/**
 * paidContract/contractPrintStyles.ts
 * A4 typography and layout styles for contract printouts (Mandate 8b <= 120 lines)
 */

export function getContractPrintStyles(): string {
	return `@page { size: A4 portrait; margin: 12mm 10mm 12mm 20mm; }
* { box-sizing: border-box; }
body {
	font-family: "PT Astra Sans", "PT Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	color: #0f172a; margin: 0; padding: 0; background: #ffffff; line-height: 1.34; font-size: 8.5pt;
	-webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.contract-sheet { max-width: 190mm; margin: 0 auto; box-sizing: border-box; }
.header-table { width: 100%; border-bottom: 2pt solid #0f172a; padding-bottom: 4px; margin-bottom: 8px; }
.clinic-name { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; }
.clinic-sub { font-size: 7.5pt; color: #334155; }
.law-tag { font-size: 7pt; color: #475569; text-align: right; }
.contract-title { text-align: center; font-size: 11pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 6px 0 2px 0; }
.contract-subtitle { text-align: center; font-size: 7.5pt; color: #475569; margin-bottom: 6px; }
.city-date-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 8pt; margin-bottom: 6px; border-bottom: 0.5pt solid #cbd5e1; padding-bottom: 2px; }
.section-title { font-size: 8.5pt; font-weight: bold; text-transform: uppercase; margin-top: 6px; margin-bottom: 2px; color: #0f172a; border-bottom: 0.5pt solid #e2e8f0; padding-bottom: 1px; page-break-after: avoid; }
p, li { margin: 2px 0; text-align: justify; }
.services-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin: 4px 0 6px 0; }
.services-table th, .services-table td { border: 0.5pt solid #94a3b8; padding: 3px 5px; }
.services-table th { background: #f1f5f9; font-weight: bold; text-align: center; }
.notice-box { border: 1pt solid #0f172a; background: #f8fafc; padding: 4px 6px; margin: 5px 0; font-size: 8pt; page-break-inside: avoid; }
.requisites-grid { display: table; width: 100%; margin-top: 8px; border-top: 1.5pt solid #0f172a; padding-top: 6px; font-size: 7.5pt; page-break-inside: avoid; }
.req-col { display: table-cell; width: 50%; vertical-align: top; padding-right: 8px; }
.sign-underline { border-bottom: 1pt solid #0f172a; min-height: 18px; margin: 10px 0 2px 0; }
.pep-stamp { border: 1.5pt solid #0f766e; background: #f0fdfa; color: #0f766e; padding: 4px 6px; border-radius: 4px; font-size: 7pt; line-height: 1.25; margin-top: 6px; }
.touch-sign-preview { min-height: 48px; display: flex; align-items: flex-end; border-bottom: 1pt solid #0f172a; margin-top: 4px; }
.paper-sign-stamp { border: 1pt solid #0f172a; background: #f8fafc; color: #0f172a; padding: 4px 6px; border-radius: 4px; font-size: 7pt; line-height: 1.25; margin-top: 4px; }
.page-break { page-break-before: always; break-before: page; margin-top: 20px; }
`;
}
