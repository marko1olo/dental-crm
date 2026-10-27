/**
 * consentsCardStyles.ts
 * Card layout, titles, badges, and action bar styles for VisitConsentsTab.
 */

export const CONSENTS_CARD_STYLES = `
	.vct-cards-list { display: flex; flex-direction: column; gap: 10px; }
	.vct-consent-card {
		border: 1px solid var(--glass-border); border-radius: var(--radius-lg, 10px);
		background: var(--paper); transition: border-color 0.15s ease, box-shadow 0.15s ease;
		overflow: visible; position: relative;
	}
	.vct-consent-card:hover { border-color: var(--glass-border); box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.05); }
	.vct-consent-card.highlight-required { border-left: 3px solid var(--amber, #d97706); }
	.vct-consent-card.highlight-signed { border-left: 3px solid var(--emerald, #059669); }

	.vct-card-summary-row {
		display: flex; align-items: center; justify-content: space-between;
		padding: 12px 14px; gap: 12px; flex-wrap: wrap;
	}
	.vct-card-left { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 260px; }
	.vct-card-meta { display: flex; flex-direction: column; gap: 3px; }
	.vct-card-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
	.vct-card-title { font-size: 13.5px; font-weight: 700; color: var(--ink); margin: 0; }
	.vct-code-pill {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
		font-size: 11px; font-weight: 700; letter-spacing: 0.3px; padding: 2px 7px;
		border-radius: 4px; background: var(--paper-soft); border: 1px solid var(--glass-border);
		color: var(--muted); white-space: nowrap; flex-shrink: 0;
	}
	.vct-statutory-pill { font-size: 11px; font-weight: 600; color: var(--muted); }
	.vct-card-desc { font-size: 12px; color: var(--muted); margin: 0; line-height: 1.35; }

	.vct-card-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
	.vct-badge {
		display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px;
		border-radius: var(--radius-full, 9999px); font-size: 11px; font-weight: 700;
		letter-spacing: 0.02em; box-sizing: border-box;
	}
	.vct-badge-signed {
		background: rgba(5, 150, 105, 0.12); color: var(--emerald, #059669); border: 1px solid rgba(5, 150, 105, 0.3);
	}
	.vct-badge-required {
		background: rgba(217, 119, 6, 0.12); color: var(--amber, #d97706); border: 1px solid rgba(217, 119, 6, 0.3);
	}
	.vct-badge-neutral { background: var(--paper-soft); color: var(--muted); border: 1px solid var(--glass-border); }
	.vct-signed-detail { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px; }
	.vct-card-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
`;
