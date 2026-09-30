/**
 * Стили интерфейса вкладок и карточек информированных согласий (АРМ ИДС).
 * Мандат 8d: Vanilla CSS, токены темы var(--paper), var(--ink), var(--line).
 */

export const VISIT_CONSENTS_TAB_STYLES = `
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

				.vct-btn {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					gap: 6px;
					height: 32px;
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
					width: 32px;
					height: 32px;
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
					padding: 7px 10px;
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

				/* Hot Path Banner */
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

				.vct-package-banner.required {
					border-color: var(--amber, #d97706);
					background: var(--amber-surface, #fffbeb);
				}

				.vct-package-banner.all-signed {
					border-color: var(--emerald, #059669);
					background: var(--emerald-surface, #ecfdf5);
				}

				[data-theme="dark"] .vct-package-banner.required {
					background: rgba(217, 119, 6, 0.12);
					border-color: rgba(217, 119, 6, 0.4);
				}

				[data-theme="dark"] .vct-package-banner.all-signed {
					background: rgba(5, 150, 105, 0.12);
					border-color: rgba(5, 150, 105, 0.4);
				}

				.vct-package-info {
					display: flex;
					align-items: flex-start;
					gap: 12px;
					max-width: 650px;
				}

				.vct-package-icon-box {
					width: 32px;
					height: 32px;
					border-radius: 8px;
					display: flex;
					align-items: center;
					justify-content: center;
					flex-shrink: 0;
				}

				.vct-package-icon-box.required {
					background: rgba(217, 119, 6, 0.15);
					color: var(--amber, #d97706);
				}

				.vct-package-icon-box.all-signed {
					background: rgba(5, 150, 105, 0.15);
					color: var(--emerald, #059669);
				}

				.vct-package-title {
					font-size: 13.5px;
					font-weight: 700;
					margin: 0;
					color: var(--ink);
				}

				.vct-package-desc {
					font-size: 12px;
					color: var(--muted);
					margin: 2px 0 0 0;
					line-height: 1.4;
				}

				.vct-package-actions {
					display: flex;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}

				/* Navigation sub-tabs */
				.vct-nav-row {
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 12px;
					border-bottom: 1px solid var(--glass-border);
					padding-bottom: 6px;
					flex-wrap: wrap;
				}

				.vct-tabs-nav {
					display: flex;
					align-items: center;
					gap: 6px;
				}

				.vct-tab-trigger {
					display: inline-flex;
					align-items: center;
					gap: 6px;
					padding: 6px 12px;
					font-size: 12px;
					font-weight: 600;
					border-radius: var(--radius-md, 6px);
					background: transparent;
					color: var(--muted);
					border: none;
					cursor: pointer;
					transition: all 0.15s ease;
				}

				.vct-tab-trigger:hover {
					color: var(--ink);
					background: var(--paper-soft);
				}

				.vct-tab-trigger.active {
					color: var(--teal);
					background: var(--teal-surface, var(--paper-soft));
					font-weight: 700;
				}

				.vct-counter-badge {
					font-size: 10.5px;
					font-weight: 700;
					padding: 1px 6px;
					border-radius: 9999px;
					background: var(--paper);
					border: 1px solid var(--glass-border);
					color: var(--ink);
				}

				/* Cards List */
				.vct-cards-list {
					display: flex;
					flex-direction: column;
					gap: 10px;
				}

				.vct-consent-card {
					border: 1px solid var(--glass-border);
					border-radius: var(--radius-lg, 10px);
					background: var(--paper);
					transition: border-color 0.15s ease, box-shadow 0.15s ease;
					overflow: visible;
					position: relative;
				}

				.vct-consent-card:hover {
					border-color: var(--glass-border);
					box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.05);
				}

				.vct-consent-card.highlight-required {
					border-left: 3px solid var(--amber, #d97706);
				}

				.vct-consent-card.highlight-signed {
					border-left: 3px solid var(--emerald, #059669);
				}

				.vct-card-summary-row {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 12px 14px;
					gap: 12px;
					flex-wrap: wrap;
				}

				.vct-card-left {
					display: flex;
					align-items: flex-start;
					gap: 10px;
					flex: 1;
					min-width: 260px;
				}

				.vct-card-meta {
					display: flex;
					flex-direction: column;
					gap: 3px;
				}

				.vct-card-title-row {
					display: flex;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}

				.vct-card-title {
					font-size: 13.5px;
					font-weight: 700;
					color: var(--ink);
					margin: 0;
				}

				.vct-code-pill {
					font-family: monospace;
					font-size: 10.5px;
					font-weight: 700;
					padding: 2px 6px;
					border-radius: 4px;
					background: var(--paper-soft);
					border: 1px solid var(--glass-border);
					color: var(--muted);
				}

				.vct-statutory-pill {
					font-size: 11px;
					font-weight: 600;
					color: var(--muted);
				}

				.vct-card-desc {
					font-size: 12px;
					color: var(--muted);
					margin: 0;
					line-height: 1.35;
				}

				.vct-card-badges {
					display: flex;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}

				.vct-badge {
					display: inline-flex;
					align-items: center;
					gap: 5px;
					height: 24px;
					padding: 0 9px;
					border-radius: var(--radius-full, 9999px);
					font-size: 11px;
					font-weight: 700;
					letter-spacing: 0.02em;
					box-sizing: border-box;
				}

				.vct-badge-signed {
					background: rgba(5, 150, 105, 0.12);
					color: var(--emerald, #059669);
					border: 1px solid rgba(5, 150, 105, 0.3);
				}

				.vct-badge-required {
					background: rgba(217, 119, 6, 0.12);
					color: var(--amber, #d97706);
					border: 1px solid rgba(217, 119, 6, 0.3);
				}

				.vct-badge-neutral {
					background: var(--paper-soft);
					color: var(--muted);
					border: 1px solid var(--glass-border);
				}

				.vct-signed-detail {
					font-size: 11px;
					color: var(--muted);
					display: flex;
					align-items: center;
					gap: 4px;
				}

				.vct-card-actions {
					display: flex;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}

				/* Inline Accordion Preview */
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
					from {
						opacity: 0;
						transform: translateY(-4px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				.vct-preview-header {
					display: flex;
					align-items: center;
					justify-content: space-between;
					border-bottom: 1px solid var(--glass-border);
					padding-bottom: 6px;
				}

				.vct-preview-title {
					font-size: 12px;
					font-weight: 700;
					text-transform: uppercase;
					color: var(--muted);
					letter-spacing: 0.04em;
					margin: 0;
				}

				.vct-preview-body {
					font-size: 12.5px;
					line-height: 1.5;
					color: var(--ink);
					display: flex;
					flex-direction: column;
					gap: 8px;
					max-height: 320px;
					overflow-y: auto;
					padding-right: 6px;
				}

				.vct-preview-section {
					display: flex;
					flex-direction: column;
					gap: 3px;
				}

				.vct-preview-section-title {
					font-weight: 700;
					font-size: 12px;
					color: var(--ink);
				}

				.vct-preview-bullets {
					margin: 2px 0 0 0;
					padding-left: 18px;
				}

				.vct-preview-bullets li {
					margin-bottom: 2px;
				}

				.vct-preview-risk-box {
					background: var(--amber-surface, #fffbeb);
					border: 1px solid rgba(217, 119, 6, 0.25);
					border-radius: var(--radius-md, 6px);
					padding: 8px 12px;
					font-size: 11.5px;
				}

				[data-theme="dark"] .vct-preview-risk-box {
					background: rgba(217, 119, 6, 0.1);
					border-color: rgba(217, 119, 6, 0.3);
				}

				.vct-preview-aftercare-box {
					background: var(--paper-soft);
					border: 1px solid var(--glass-border);
					border-radius: var(--radius-md, 6px);
					padding: 8px 12px;
					font-size: 11.5px;
				}

				/* Archive Table */
				.vct-archive-container {
					border: 1px solid var(--glass-border);
					border-radius: var(--radius-lg, 10px);
					overflow: hidden;
					background: var(--paper);
				}

				.vct-archive-table {
					width: 100%;
					border-collapse: collapse;
					font-size: 12px;
				}

				.vct-archive-table th {
					text-align: left;
					padding: 8px 12px;
					font-weight: 700;
					color: var(--muted);
					border-bottom: 1px solid var(--glass-border);
					background: var(--paper-soft);
				}

				.vct-archive-table td {
					padding: 10px 12px;
					border-bottom: 1px solid var(--glass-border);
					color: var(--ink);
					vertical-align: middle;
				}

				.vct-archive-table tr:hover td {
					background: var(--paper-soft);
				}

				.vct-archive-empty {
					padding: 24px;
					text-align: center;
					color: var(--muted);
					font-size: 12.5px;
				}

				/* Footer Bar */
				.vct-footer-bar {
					display: flex;
					align-items: center;
					justify-content: space-between;
					border-top: 1px solid var(--glass-border);
					padding-top: 12px;
					flex-wrap: wrap;
					gap: 10px;
				}

				.vct-footer-left {
					font-size: 12px;
					color: var(--muted);
					display: flex;
					align-items: center;
					gap: 6px;
				}

				.vct-footer-actions {
					display: flex;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}
`;
