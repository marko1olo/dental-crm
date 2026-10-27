export const invoicePrintStyles = `
	@page { size: A4 portrait; margin: 12mm 15mm 12mm 15mm; }
	* { box-sizing: border-box; }
	body {
		font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.25;
		color: #000000; background: #ffffff; margin: 0; padding: 10px;
	}
	.header-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 6px; }
	.header-table td { vertical-align: top; font-size: 9.5pt; line-height: 1.2; }
	.clinic-title { font-size: 13pt; font-weight: bold; text-transform: uppercase; font-family: Arial, sans-serif; }
	.doc-title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 12px 0 4px; font-family: Arial, sans-serif; }
	.doc-subtitle { text-align: center; font-size: 10pt; margin-bottom: 12px; }
	.requisites-grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10pt; }
	.requisites-grid td { padding: 4px 6px; border: 1px solid #777; }
	.requisites-grid .lbl { font-weight: bold; background-color: #f3f3f3; width: 22%; }
	.items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5pt; }
	.items-table th, .items-table td { border: 1px solid #000; padding: 5px 6px; }
	.items-table th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
	.num-cell { text-align: center; font-family: monospace; }
	.money-cell { text-align: right; font-family: monospace; font-weight: bold; white-space: nowrap; }
	.warranty-box { margin-top: 12px; border: 1.5px solid #000; border-radius: 4px; padding: 8px 10px; font-size: 9.5pt; background-color: #fafafa; }
	.warranty-title { font-weight: bold; text-transform: uppercase; font-size: 10pt; margin-bottom: 6px; font-family: Arial, sans-serif; color: #111; }
	.legal-text { font-size: 8.5pt; color: #333; margin-top: 8px; text-align: justify; line-height: 1.2; }
	.signatures { margin-top: 20px; width: 100%; border-collapse: collapse; page-break-inside: avoid; }
	.signatures td { width: 50%; vertical-align: top; padding: 4px 10px; font-size: 9.5pt; }
	.sign-line { border-bottom: 1px solid #000; margin-top: 25px; display: flex; justify-content: space-between; font-size: 8.5pt; }
	.stamp-place { border: 1px dashed #777; width: 85px; height: 85px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #777; text-align: center; margin-top: 8px; }
	.paid-badge { border: 2px solid #059669; color: #047857; font-weight: 900; font-size: 11pt; padding: 4px 10px; border-radius: 4px; display: inline-block; transform: rotate(-3deg); text-transform: uppercase; letter-spacing: 1px; }
	@media print {
		body { padding: 0; }
		.no-print { display: none; }
	}
`;
