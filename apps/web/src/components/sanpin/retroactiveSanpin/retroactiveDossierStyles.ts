export const retroactiveDossierStyles = `
	@page {
		size: A4 landscape;
		margin: 12mm 10mm 12mm 10mm;
	}
	* { box-sizing: border-box; }
	body {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
		font-size: 8.5pt;
		line-height: 1.3;
		color: #0f172a;
		background: #ffffff;
		margin: 0;
		padding: 0;
	}
	.page-break { page-break-after: always; }
	.cover-page {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 180mm;
		border: 3px double #1e293b;
		padding: 20mm;
		text-align: center;
	}
	.cover-header { font-size: 11pt; text-transform: uppercase; font-weight: bold; color: #475569; }
	.cover-title { font-size: 20pt; font-weight: 800; color: #0f172a; margin: 15mm 0 5mm 0; line-height: 1.2; }
	.cover-subtitle { font-size: 12pt; font-weight: 600; color: #059669; }
	.cover-stats-box {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
		margin: 15mm 0;
		text-align: left;
		background: #f8fafc;
		padding: 12px;
		border: 1px solid #cbd5e1;
		border-radius: 4px;
	}
	.stat-cell strong { display: block; font-size: 13pt; color: #1e293b; }
	.stat-cell span { font-size: 8pt; color: #64748b; text-transform: uppercase; }
	.cover-signatures {
		display: flex;
		justify-content: space-between;
		margin-top: 10mm;
		text-align: left;
		font-size: 9pt;
	}
	.signature-line { width: 65mm; border-bottom: 1px solid #000; display: inline-block; margin-top: 12px; }
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		border-bottom: 2px solid #0f172a;
		padding-bottom: 4px;
		margin-bottom: 8px;
	}
	.section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #0f172a; }
	.section-law { font-size: 8pt; color: #059669; font-weight: 600; }
	table.sanpin-print-table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 15px;
		font-size: 8pt;
	}
	table.sanpin-print-table th, table.sanpin-print-table td {
		border: 1px solid #334155;
		padding: 4px 6px;
		text-align: left;
		vertical-align: middle;
	}
	table.sanpin-print-table th {
		background: #f1f5f9;
		font-weight: 700;
		color: #1e293b;
		text-align: center;
		font-size: 7.5pt;
	}
	.tag-norm { color: #059669; font-weight: bold; }
	.stamp-cell { font-family: monospace; font-size: 7pt; color: #475569; }
`;
