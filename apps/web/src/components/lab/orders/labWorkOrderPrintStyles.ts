export const LAB_WORK_ORDER_A4_PRINT_STYLES = `
	@page { size: A4 portrait; margin: 12mm 15mm; }
	body {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
		color: #0f172a;
		background: #ffffff;
		margin: 0;
		padding: 10px;
		font-size: 13px;
		line-height: 1.4;
	}
	.header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
	.title { font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0; color: #0f172a; }
	.subtitle { font-size: 12px; color: #475569; margin: 0; }
	.section-title {
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
		background: #f1f5f9;
		padding: 4px 8px;
		margin: 12px 0 6px 0;
		border-left: 4px solid #0d9488;
	}
	.grid-2 { display: table; width: 100%; margin-bottom: 8px; }
	.col { display: table-cell; width: 50%; vertical-align: top; padding-right: 10px; }
	.data-row { margin-bottom: 4px; }
	.label { font-weight: 600; color: #475569; width: 150px; display: inline-block; }
	.value { font-weight: 700; color: #0f172a; }
	.highlight-box {
		background: #f8fafc;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		padding: 8px;
		margin-top: 6px;
	}
	.teeth-grid { margin: 8px 0; text-align: center; }
	.signatures { margin-top: 24px; display: table; width: 100%; }
	.sig-col { display: table-cell; width: 50%; padding: 0 16px; text-align: center; }
	.sig-line { border-bottom: 1px solid #0f172a; margin-top: 36px; margin-bottom: 4px; }
	.sig-sub { font-size: 11px; color: #64748b; }
`;
