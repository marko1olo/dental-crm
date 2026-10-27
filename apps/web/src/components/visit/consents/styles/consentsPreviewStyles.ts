/**
 * consentsPreviewStyles.ts
 * Inline preview accordion, archive table and footer styles for VisitConsentsTab.
 */

export const CONSENTS_PREVIEW_STYLES = `
	.vct-inline-preview {
		border-top: 1px solid var(--glass-border);
		border-bottom-left-radius: var(--radius-lg, 10px);
		border-bottom-right-radius: var(--radius-lg, 10px);
		padding: 14px 16px;
		background: var(--paper-soft);
		display: flex;
		flex-direction: column;
		gap: 12px;
		animation: vctSlideDown 0.18s ease-out;
	}
	@keyframes vctSlideDown {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.vct-preview-header {
		display: flex; align-items: center; justify-content: space-between;
		border-bottom: 1px solid var(--glass-border); padding-bottom: 6px;
	}
	.vct-preview-title {
		font-size: 12px; font-weight: 700; text-transform: uppercase;
		color: var(--muted); letter-spacing: 0.04em; margin: 0;
	}
	.vct-preview-body {
		font-size: 12.5px; line-height: 1.5; color: var(--ink);
		display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; padding-right: 6px;
	}
	.vct-preview-section { display: flex; flex-direction: column; gap: 3px; }
	.vct-preview-section-title { font-weight: 700; font-size: 12px; color: var(--ink); }
	.vct-preview-bullets { margin: 2px 0 0 0; padding-left: 18px; }
	.vct-preview-bullets li { margin-bottom: 2px; }

	.vct-preview-risk-box {
		background: var(--amber-surface, #fffbeb); border: 1px solid rgba(217, 119, 6, 0.25);
		border-radius: var(--radius-md, 6px); padding: 8px 12px; font-size: 11.5px;
	}
	[data-theme="dark"] .vct-preview-risk-box {
		background: rgba(217, 119, 6, 0.1); border-color: rgba(217, 119, 6, 0.3);
	}
	.vct-preview-aftercare-box {
		background: var(--paper-soft); border: 1px solid var(--glass-border);
		border-radius: var(--radius-md, 6px); padding: 8px 12px; font-size: 11.5px;
	}

	.vct-archive-container {
		border: 1px solid var(--glass-border); border-radius: var(--radius-lg, 10px);
		overflow: hidden; background: var(--paper);
	}
	.vct-archive-table { width: 100%; border-collapse: collapse; font-size: 12px; }
	.vct-archive-table th {
		text-align: left; padding: 8px 12px; font-weight: 700; color: var(--muted);
		border-bottom: 1px solid var(--glass-border); background: var(--paper-soft);
	}
	.vct-archive-table td {
		padding: 10px 12px; border-bottom: 1px solid var(--glass-border); color: var(--ink); vertical-align: middle;
	}
	.vct-archive-table tr:hover td { background: var(--paper-soft); }
	.vct-archive-empty { padding: 24px; text-align: center; color: var(--muted); font-size: 12.5px; }

	.vct-footer-bar {
		display: flex; align-items: center; justify-content: space-between;
		border-top: 1px solid var(--glass-border); padding-top: 12px; flex-wrap: wrap; gap: 10px;
	}
	.vct-footer-left { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
	.vct-footer-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
`;
