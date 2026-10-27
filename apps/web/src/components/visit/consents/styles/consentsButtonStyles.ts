/**
 * consentsButtonStyles.ts
 * Button and dropdown styles for VisitConsentsTab.
 * Apple HIG: min touch target 44px on mobile, 32px on desktop.
 */

export const CONSENTS_BUTTON_STYLES = `
	.vct-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 36px;
		min-height: 36px;
		padding: 0 12px;
		border-radius: var(--radius-md, 8px);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		border: 1px solid var(--glass-border);
		background: var(--paper);
		color: var(--ink);
		white-space: nowrap;
		user-select: none;
		text-decoration: none;
		box-sizing: border-box;
	}

	.vct-btn:hover:not(:disabled) {
		background: var(--paper-soft);
		border-color: var(--glass-border);
		color: var(--ink);
	}

	.vct-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.vct-btn-primary {
		background: var(--teal, #0d9488);
		color: #ffffff;
		border-color: var(--teal, #0d9488);
	}
	.vct-btn-primary:hover:not(:disabled) {
		background: var(--teal-dark, #0f766e);
		border-color: var(--teal-dark, #0f766e);
		color: #ffffff;
	}

	.vct-btn-success {
		background: var(--emerald, #059669);
		color: #ffffff;
		border-color: var(--emerald, #059669);
	}
	.vct-btn-success:hover:not(:disabled) {
		filter: brightness(0.92);
		color: #ffffff;
	}

	.vct-btn-secondary {
		background: var(--paper);
		color: var(--ink);
		border-color: var(--glass-border);
	}
	.vct-btn-secondary:hover:not(:disabled) {
		background: var(--paper-soft);
		border-color: var(--glass-border);
		color: var(--ink);
	}

	.vct-btn-outline-teal {
		background: rgba(13, 148, 136, 0.08);
		color: var(--teal, #0d9488);
		border-color: rgba(13, 148, 136, 0.35);
	}
	.vct-btn-outline-teal:hover:not(:disabled) {
		background: rgba(13, 148, 136, 0.16);
		border-color: var(--teal, #0d9488);
		color: var(--teal, #0d9488);
	}

	.vct-btn-icon {
		width: 36px;
		height: 36px;
		min-width: 36px;
		min-height: 36px;
		padding: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md, 8px);
		background: var(--paper);
		border: 1px solid var(--glass-border);
		color: var(--muted);
		cursor: pointer;
		transition: all 0.15s ease;
		box-sizing: border-box;
	}
	.vct-btn-icon:hover:not(:disabled) {
		background: var(--paper-soft);
		border-color: var(--glass-border);
		color: var(--ink);
	}
	.vct-btn-icon.active {
		background: var(--paper-soft);
		border-color: var(--teal, #0d9488);
		color: var(--teal, #0d9488);
	}
`;
