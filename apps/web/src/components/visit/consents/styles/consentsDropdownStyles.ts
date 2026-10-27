/**
 * consentsDropdownStyles.ts
 * Dropdown actions menu and scope mismatch banner for VisitConsentsTab.
 */

export const CONSENTS_DROPDOWN_STYLES = `
	.vct-dropdown-wrapper {
		position: relative;
		display: inline-block;
	}

	.vct-dropdown-menu {
		position: absolute;
		right: 0;
		top: calc(100% + 4px);
		min-width: 220px;
		background: var(--paper);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-lg, 10px);
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		padding: 4px;
		z-index: 50;
		display: flex;
		flex-direction: column;
		gap: 2px;
		animation: vctDropdownFade 0.15s ease-out;
	}

	@keyframes vctDropdownFade {
		from {
			opacity: 0;
			transform: translateY(-4px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.vct-dropdown-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 10px;
		min-height: 40px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		color: var(--ink);
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 0.12s ease;
		box-sizing: border-box;
	}

	.vct-dropdown-item:hover {
		background: var(--paper-soft);
		color: var(--ink);
	}

	.vct-dropdown-divider {
		height: 1px;
		background: var(--glass-border);
		margin: 2px 0;
	}

	.vct-scope-mismatch-banner {
		background: var(--amber-surface, #fffbeb);
		border: 1px solid var(--amber, #d97706);
		border-radius: var(--radius-lg, 10px);
		padding: 12px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	[data-theme="dark"] .vct-scope-mismatch-banner {
		background: rgba(217, 119, 6, 0.14);
		border-color: rgba(217, 119, 6, 0.45);
	}
`;
