/**
 * consentsPackageBannerStyles.ts
 * Today package banner and subtabs navigation styles for VisitConsentsTab.
 */

export const CONSENTS_PACKAGE_BANNER_STYLES = `
	.vct-package-banner {
		border-radius: var(--radius-lg, 10px);
		padding: 12px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		border: 1px solid var(--glass-border);
		background: var(--paper-soft);
	}
	.vct-package-banner.required { border-color: var(--amber, #d97706); background: var(--amber-surface, #fffbeb); }
	.vct-package-banner.all-signed { border-color: var(--emerald, #059669); background: var(--emerald-surface, #ecfdf5); }
	[data-theme="dark"] .vct-package-banner.required { background: rgba(217, 119, 6, 0.12); border-color: rgba(217, 119, 6, 0.4); }
	[data-theme="dark"] .vct-package-banner.all-signed { background: rgba(5, 150, 105, 0.12); border-color: rgba(5, 150, 105, 0.4); }

	.vct-package-info { display: flex; align-items: flex-start; gap: 12px; max-width: 650px; }
	.vct-package-icon-box {
		width: 36px; height: 36px; border-radius: 8px;
		display: flex; align-items: center; justify-content: center; flex-shrink: 0;
	}
	.vct-package-icon-box.required { background: rgba(217, 119, 6, 0.15); color: var(--amber, #d97706); }
	.vct-package-icon-box.all-signed { background: rgba(5, 150, 105, 0.15); color: var(--emerald, #059669); }

	.vct-package-title { font-size: 13.5px; font-weight: 700; margin: 0; color: var(--ink); }
	.vct-package-desc { font-size: 12px; color: var(--muted); margin: 2px 0 0 0; line-height: 1.4; }
	.vct-package-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

	.vct-nav-row {
		display: flex; align-items: center; justify-content: space-between;
		gap: 12px; border-bottom: 1px solid var(--glass-border); padding-bottom: 6px; flex-wrap: wrap;
	}
	.vct-tabs-nav { display: flex; align-items: center; gap: 6px; }
	.vct-tab-trigger {
		display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 6px 12px;
		font-size: 12px; font-weight: 600; border-radius: var(--radius-md, 6px);
		background: transparent; color: var(--muted); border: none; cursor: pointer; transition: all 0.15s ease;
	}
	.vct-tab-trigger:hover { color: var(--ink); background: var(--paper-soft); }
	.vct-tab-trigger.active { color: var(--teal); background: var(--teal-surface, var(--paper-soft)); font-weight: 700; }
	.vct-counter-badge {
		font-size: 10.5px; font-weight: 700; padding: 1px 6px; border-radius: 9999px;
		background: var(--paper); border: 1px solid var(--glass-border); color: var(--ink);
	}
`;
