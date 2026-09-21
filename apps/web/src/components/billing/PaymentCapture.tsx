/**
 * apps/web/src/components/billing/PaymentCapture.tsx
 *
 * Canonical facade for PaymentCapture component.
 * Compliant with:
 * - Mandate 8e, Item 9 (54-FZ Cash Desk: no INN obstacle for physical persons, 1-click checkout)
 * - Mandate 8e, Item 7 (Doctor Autonomy: 100% warranty reworks / staff discounts without admin password)
 * - Mandate 8n (Scale sovereignty: solo-doctor and small clinic prioritization)
 */

export * from "../../PaymentCapture";
export { PaymentCapture as default } from "../../PaymentCapture";
