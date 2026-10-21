export const A4_PRINT_BLANK_CSS = `
	@page { size: A4 portrait; margin: 8mm 12mm; }
	body {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
		color: #0f172a;
		background: #ffffff;
		margin: 0;
		padding: 4px;
		font-size: 12px;
		line-height: 1.35;
	}
	.header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px; }
	.title { font-size: 17px; font-weight: 800; text-transform: uppercase; margin: 0 0 2px 0; color: #0f172a; }
	.subtitle { font-size: 11px; color: #475569; margin: 0; }
	.section-title {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		background: #f1f5f9;
		padding: 4px 8px;
		margin: 8px 0 5px 0;
		border-left: 4px solid #0d9488;
	}
	.grid-2 { display: table; width: 100%; margin-bottom: 5px; }
	.col { display: table-cell; width: 50%; vertical-align: top; padding-right: 10px; }
	.data-row { margin-bottom: 3px; font-size: 11.5px; }
	.label { font-weight: 600; color: #475569; width: 150px; display: inline-block; }
	.value { font-weight: 700; color: #0f172a; }
	.box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 8px; margin-top: 3px; }
	.teeth-block { text-align: center; margin: 4px 0; }
	.status-strip {
		display: table;
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 4px;
		background: #f8fafc;
		margin: 6px 0;
		table-layout: fixed;
	}
	.status-cell {
		display: table-cell;
		text-align: center;
		padding: 6px 4px;
		font-size: 10px;
		font-weight: 700;
		border-right: 1px solid #e2e8f0;
		color: #64748b;
	}
	.status-cell:last-child { border-right: none; }
	.status-cell.active { background: #0d9488; color: #ffffff; }
	.signatures { margin-top: 16px; display: table; width: 100%; }
	.sig-col { display: table-cell; width: 33.3%; padding: 0 8px; text-align: center; }
	.sig-line { border-bottom: 1px solid #0f172a; margin-top: 28px; margin-bottom: 4px; }
	.sig-sub { font-size: 9.5px; color: #64748b; }
	.box, .teeth-block, .status-strip, .section-title, tr, .signatures, .grid-2, .header-table {
		break-inside: avoid;
		page-break-inside: avoid;
	}
	@media print {
		html, body {
			background: #ffffff !important;
			color: #000000 !important;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}
		.box, .teeth-block, .status-strip, .section-title, tr, .signatures, .grid-2, .header-table {
			break-inside: avoid !important;
			page-break-inside: avoid !important;
		}
	}
`;
