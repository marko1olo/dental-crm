/**
 * apps/web/src/PaymentsView.tsx
 *
 * DENTE Dental CRM — Dedicated payments & invoices registry view.
 * Virtualized via domVirtualizationHelper (sliceDomList) and IntersectionObserver.
 * Compliance: Mandates 8e, 8k, 8n (Solo Doctor & Low-Spec Hardware Support).
 */

import {
	InvoicesView,
	type InvoicesViewProps,
	type BillingInvoice,
} from "./components/billing/InvoicesView.js";

export type PaymentsViewProps = InvoicesViewProps;
export { InvoicesView, type InvoicesViewProps, type BillingInvoice };
export const PaymentsView = InvoicesView;
export default InvoicesView;
