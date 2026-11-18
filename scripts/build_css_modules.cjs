const fs = require('fs');
const path = require('path');

const stylesDir = 'C:/Clinic_MVP/dental-crm/apps/web/src/components/egisz/styles';
if (!fs.existsSync(stylesDir)) {
  fs.mkdirSync(stylesDir, { recursive: true });
}

// 1. remdRoot.css (<= 110 lines)
const remdRoot = `/**
 * remdRoot.css — EGISZ Modal Shell, Container & Overlay Layout
 * Mandate 8b compliant (<= 110 lines). Apple HIG standards.
 */

.egisz-modal-backdrop,
.egisz-hub-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  padding: 16px;
}

.egisz-modal-container,
.egisz-hub-modal-panel {
  background: var(--paper, #ffffff);
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 16px;
  width: 100%;
  max-width: 960px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  color: var(--ink, #0f172a);
}

.egisz-modal-body,
.egisz-hub-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.egisz-mobile-drag-handle {
  display: none;
  width: 36px;
  height: 5px;
  background: var(--line-strong, #cbd5e1);
  border-radius: 3px;
  margin: 8px auto 0 auto;
}
`;

// 2. remdHeader.css (<= 110 lines)
const remdHeader = `/**
 * remdHeader.css — EGISZ Modal & Hub Header Styles
 * Mandate 8b compliant (<= 110 lines).
 */

.egisz-modal-header,
.egisz-hub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line, #e2e8f0);
  background: var(--paper-fade, #f8fafc);
  gap: 12px;
}

.egisz-header-left,
.egisz-hub-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.egisz-header-icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.1);
  color: var(--primary, #0d9488);
  flex-shrink: 0;
}

.egisz-modal-title,
.egisz-hub-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
  color: var(--ink, #0f172a);
}

.egisz-modal-subtitle,
.egisz-hub-sub {
  font-size: 0.8125rem;
  color: var(--muted, #64748b);
  margin: 2px 0 0 0;
}

.egisz-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.egisz-close-btn,
.egisz-hub-close-btn,
.egisz-close-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--line, #e2e8f0);
  background: var(--paper, #ffffff);
  color: var(--muted, #64748b);
  cursor: pointer;
  transition: all 0.15s ease;
}

.egisz-close-btn:hover,
.egisz-hub-close-btn:hover,
.egisz-close-icon-btn:hover {
  background: var(--paper-strong, #f1f5f9);
  color: var(--ink, #0f172a);
}
`;

// 3. remdFilterChips.css (<= 110 lines)
const remdFilterChips = `/**
 * remdFilterChips.css — Document Filters, Year/Relationship Chips & Tab Navigation
 * Mandate 8b compliant (<= 110 lines).
 */

.egisz-doc-filter-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--paper, #ffffff);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--line, #e2e8f0);
}

.egisz-doc-filter-btn {
  padding: 6px 12px;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--muted, #64748b);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.egisz-doc-filter-btn:hover {
  color: var(--ink, #0f172a);
  background: var(--paper-fade, #f8fafc);
}

.egisz-doc-filter-btn.active {
  background: var(--primary, #0d9488);
  color: #ffffff;
  font-weight: 600;
}

.egisz-tabs-nav,
.egisz-hub-tabs {
  display: flex;
  border-bottom: 1px solid var(--line, #e2e8f0);
  gap: 8px;
  padding: 0 20px;
  background: var(--paper, #ffffff);
}

.egisz-tab-badge {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 10px;
  background: var(--paper-strong, #f1f5f9);
  color: var(--muted, #64748b);
  margin-left: 6px;
}

.egisz-year-chips,
.egisz-rel-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
`;

// 4. remdButtons.css (<= 110 lines)
const remdButtons = `/**
 * remdButtons.css — Action Buttons, Primary CTA & Footer Styles
 * Mandate 8b compliant (<= 110 lines). Mandates 8e, 8am (Single Primary CTA).
 */

.egisz-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid var(--line, #e2e8f0);
  background: var(--paper-fade, #f8fafc);
  gap: 12px;
}

.egisz-footer-actions,
.egisz-action-btns,
.egisz-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.egisz-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid var(--line, #cbd5e1);
  background: var(--paper, #ffffff);
  color: var(--ink, #0f172a);
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 40px;
}

.egisz-btn:hover {
  background: var(--paper-strong, #f1f5f9);
}

.egisz-btn-primary,
.egisz-primary-cta-btn,
.egisz-btn.primary,
.egisz-btn.emerald,
.egisz-btn.teal {
  background: var(--primary, #0d9488);
  border-color: var(--primary, #0d9488);
  color: #ffffff;
}

.egisz-btn-primary:hover,
.egisz-primary-cta-btn:hover,
.egisz-btn.primary:hover,
.egisz-btn.emerald:hover,
.egisz-btn.teal:hover {
  background: var(--primary-strong, #0f766e);
  border-color: var(--primary-strong, #0f766e);
}

.egisz-sign-both-one-click-btn {
  font-weight: 700;
  box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.2);
}
`;

// 5. remdCryptoProCard.css (<= 110 lines)
const remdCryptoProCard = `/**
 * remdCryptoProCard.css — CryptoPro CSP, Rutoken & Non-blocking Telemetry Cards
 * Mandate 8b compliant (<= 110 lines). Mandate 8e (Doctor Autonomy).
 */

.egisz-nonblocking-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.2);
  color: var(--ink, #0f172a);
  font-size: 0.875rem;
}

.egisz-telemetry-card,
.egisz-quiet-telemetry-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 18px;
  border-radius: 10px;
  background: var(--paper-fade, #f8fafc);
  border: 1px solid var(--line, #e2e8f0);
}

.egisz-cert-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--line, #e2e8f0);
  background: var(--paper, #ffffff);
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.egisz-cert-card:hover {
  border-color: var(--primary, #0d9488);
}

.egisz-cert-card.selected {
  border-color: var(--primary, #0d9488);
  background: rgba(13, 148, 136, 0.04);
}
`;

// 6. remdQueueTable.css (<= 110 lines)
const remdQueueTable = `/**
 * remdQueueTable.css — EGISZ Background Queue Table & Mobile Cards
 * Mandate 8b compliant (<= 110 lines).
 */

.egisz-queue-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.egisz-queue-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.egisz-queue-heading {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
}

.egisz-queue-subheading {
  font-size: 0.8125rem;
  color: var(--muted, #64748b);
  margin: 0;
}

.egisz-queue-table,
.egisz-queue-desktop-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.egisz-queue-table th,
.egisz-queue-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--line, #e2e8f0);
}

.egisz-table-fixed {
  table-layout: fixed;
}

.egisz-cell-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.egisz-queue-mobile-cards {
  display: none;
  flex-direction: column;
  gap: 12px;
}

.egisz-queue-card {
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--line, #e2e8f0);
  background: var(--paper, #ffffff);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
`;

// 7. remdStatusBadges.css (<= 110 lines)
const remdStatusBadges = `/**
 * remdStatusBadges.css — Status Badges, Empty Boxes & Saved Badges
 * Mandate 8b compliant (<= 110 lines).
 */

.egisz-badge-teal,
.egisz-moh-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(13, 148, 136, 0.12);
  color: var(--primary-strong, #0f766e);
}

.egisz-queue-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.egisz-queue-badge.delivered {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.egisz-queue-badge.pending {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.egisz-queue-badge.failed {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.egisz-empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  border: 1px dashed var(--line, #e2e8f0);
  border-radius: 12px;
  color: var(--muted, #64748b);
}

.egisz-empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink, #0f172a);
  margin: 8px 0 4px 0;
}

.egisz-empty-desc {
  font-size: 0.8125rem;
  margin: 0;
}

.vde-043__saved-badge,
.visit-diary-egisz-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.2);
}
`;

// 8. remdXmlPreview.css (<= 110 lines)
const remdXmlPreview = `/**
 * remdXmlPreview.css — XML Code Viewer & Collapsible Technical Accordion
 * Mandate 8b compliant (<= 110 lines). Quiet XML & Statutory Stamp.
 */

.egisz-tech-accordion {
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 8px;
  background: var(--paper-fade, #f8fafc);
  overflow: hidden;
}

.egisz-tech-accordion summary {
  padding: 10px 14px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--muted, #64748b);
  cursor: pointer;
  user-select: none;
}

.egisz-tech-accordion[open] summary {
  border-bottom: 1px solid var(--line, #e2e8f0);
}

.egisz-code-viewer {
  margin: 0;
  padding: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  background: var(--paper-strong, #1e293b);
  color: #f8fafc;
  overflow-x: auto;
  max-height: 360px;
}

.egisz-stamp-preview {
  display: inline-flex;
  flex-direction: column;
  padding: 12px;
  border: 2px solid #0056b3;
  border-radius: 6px;
  background: #ffffff;
  color: #0056b3;
  font-family: Arial, sans-serif;
  font-size: 0.75rem;
  max-width: 280px;
}
`;

// 9. remdTaxDrawer.css (<= 110 lines)
const remdTaxDrawer = `/**
 * remdTaxDrawer.css — Tax Deduction Certificate Drawer & FNS Grids
 * Mandate 8b compliant (<= 110 lines).
 */

.egisz-tax-drawer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.egisz-tax-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.egisz-tax-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--muted, #64748b);
}

.egisz-tax-summary-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: var(--paper-fade, #f8fafc);
  border-radius: 12px;
  border: 1px solid var(--line, #e2e8f0);
}

.egisz-tax-hero-amount {
  font-size: 2rem;
  font-weight: 800;
  color: var(--primary, #0d9488);
}

.egisz-tax-hero-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink, #0f172a);
}

.egisz-tax-hero-sub {
  font-size: 0.75rem;
  color: var(--muted, #64748b);
}

.egisz-tax-payments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.egisz-tax-payment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--paper, #ffffff);
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 8px;
}

.egisz-fns-meta-grid,
.egisz-fns-parties-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
`;

// 10. remdExtractDrawer.css (<= 110 lines)
const remdExtractDrawer = `/**
 * remdExtractDrawer.css — Medical Record Extract Drawer Styles
 * Mandate 8b compliant (<= 110 lines).
 */

.egisz-extract-drawer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.egisz-extract-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.egisz-extract-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
}

.egisz-extract-sub {
  font-size: 0.8125rem;
  color: var(--muted, #64748b);
  margin: 0;
}

.egisz-extract-types {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.egisz-extract-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.egisz-extract-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--muted, #64748b);
}

.egisz-extract-textarea {
  width: 100%;
  min-height: 90px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--line, #cbd5e1);
  background: var(--paper, #ffffff);
  color: var(--ink, #0f172a);
  font-size: 0.875rem;
  resize: vertical;
}

.egisz-extract-doctor-box {
  padding: 12px;
  border-radius: 8px;
  background: var(--paper-fade, #f8fafc);
  border: 1px solid var(--line, #e2e8f0);
}
`;

// 11. remdResponsive.css (<= 110 lines)
const remdResponsive = `/**
 * remdResponsive.css — Apple HIG Mobile Bottom Sheet Adaptive (<= 768px & <= 640px)
 * Mandate 8b compliant (<= 110 lines). Touch targets >= 44x44px.
 */

@media (max-width: 768px) {
  .egisz-modal-backdrop,
  .egisz-hub-backdrop {
    padding: 0;
    align-items: flex-end;
  }

  .egisz-modal-container,
  .egisz-hub-modal-panel {
    border-radius: 24px 24px 0 0;
    max-height: 92vh;
    max-width: 100vw;
    width: 100%;
    border-bottom: none;
    border-left: none;
    border-right: none;
    padding-bottom: env(safe-area-inset-bottom, 16px);
    overflow-x: clip;
  }

  .egisz-mobile-drag-handle {
    display: block;
  }

  .egisz-modal-header,
  .egisz-hub-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .egisz-doc-filter-toolbar {
    overflow-x: auto;
    width: 100%;
  }

  .egisz-queue-desktop-table {
    display: none;
  }

  .egisz-queue-mobile-cards {
    display: flex;
  }

  .egisz-fns-meta-grid,
  .egisz-fns-parties-grid {
    grid-template-columns: 1fr;
  }

  .egisz-btn {
    min-height: 44px;
  }

  .egisz-modal-footer {
    flex-direction: column;
  }

  .egisz-footer-actions,
  .egisz-action-btns {
    width: 100%;
    flex-direction: column;
  }

  .egisz-footer-actions .egisz-btn,
  .egisz-action-btns .egisz-btn {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .egisz-close-btn,
  .egisz-hub-close-btn,
  .egisz-close-icon-btn {
    min-width: 44px;
    min-height: 44px;
  }
}
`;

// 12. remdThemeDark.css (<= 110 lines)
const remdThemeDark = `/**
 * remdThemeDark.css — Dark Mode Tokens & Contrast Protection
 * Mandate 8b compliant (<= 110 lines). Zero blinding white spots.
 */

[data-theme="dark"] .egisz-modal-container,
[data-theme="dark"] .egisz-hub-modal-panel,
.dark .egisz-modal-container,
.dark .egisz-hub-modal-panel {
  background: var(--paper-strong, #1e293b);
  border-color: var(--line, #334155);
  color: var(--ink, #f8fafc);
}

[data-theme="dark"] .egisz-modal-header,
[data-theme="dark"] .egisz-hub-header,
.dark .egisz-modal-header,
.dark .egisz-hub-header {
  background: var(--paper-fade, #0f172a);
  border-color: var(--line, #334155);
}

[data-theme="dark"] .egisz-modal-footer,
.dark .egisz-modal-footer {
  background: var(--paper-fade, #0f172a);
  border-color: var(--line, #334155);
}

[data-theme="dark"] .egisz-btn,
.dark .egisz-btn {
  background: var(--paper, #1e293b);
  border-color: var(--line, #334155);
  color: var(--ink, #f8fafc);
}

[data-theme="dark"] .egisz-btn:hover,
.dark .egisz-btn:hover {
  background: var(--paper-strong, #334155);
}

[data-theme="dark"] .egisz-doc-filter-toolbar,
.dark .egisz-doc-filter-toolbar {
  background: var(--paper-strong, #0f172a);
  border-color: var(--line, #334155);
}

[data-theme="dark"] .egisz-queue-card,
[data-theme="dark"] .egisz-tax-payment-item,
.dark .egisz-queue-card,
.dark .egisz-tax-payment-item {
  background: var(--paper, #1e293b);
  border-color: var(--line, #334155);
}

[data-theme="dark"] .egisz-tax-summary-hero,
[data-theme="dark"] .egisz-extract-doctor-box,
[data-theme="dark"] .egisz-telemetry-card,
.dark .egisz-tax-summary-hero,
.dark .egisz-extract-doctor-box,
.dark .egisz-telemetry-card {
  background: var(--paper-fade, #0f172a);
  border-color: var(--line, #334155);
}
`;

const modules = {
  'remdRoot.css': remdRoot,
  'remdHeader.css': remdHeader,
  'remdFilterChips.css': remdFilterChips,
  'remdButtons.css': remdButtons,
  'remdCryptoProCard.css': remdCryptoProCard,
  'remdQueueTable.css': remdQueueTable,
  'remdStatusBadges.css': remdStatusBadges,
  'remdXmlPreview.css': remdXmlPreview,
  'remdTaxDrawer.css': remdTaxDrawer,
  'remdExtractDrawer.css': remdExtractDrawer,
  'remdResponsive.css': remdResponsive,
  'remdThemeDark.css': remdThemeDark
};

Object.entries(modules).forEach(([filename, content]) => {
  const filePath = path.join(stylesDir, filename);
  fs.writeFileSync(filePath, content.trim() + '\n', 'utf8');
  const lines = content.trim().split('\n').length;
  console.log(`${filename}: ${lines} lines`);
});
