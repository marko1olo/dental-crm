/**
 * consentsBaseStyles.ts
 * Root container and header styles for VisitConsentsTab.
 */

export const CONSENTS_BASE_STYLES = `
	.vct-root {
		background: var(--paper);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-xl, 12px);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		color: var(--ink);
		font-family: inherit;
		box-sizing: border-box;
	}

	.vct-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--glass-border);
	}

	.vct-title-group {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.vct-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--ink);
		margin: 0;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.vct-subtitle {
		font-size: 12px;
		color: var(--muted);
		margin: 0;
	}

	.vct-header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
`;
