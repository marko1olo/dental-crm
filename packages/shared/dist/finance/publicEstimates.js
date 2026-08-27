import { z } from "zod";
import { sha256Hex } from "../sync/hashing.js";
/**
 * 2FA Online Estimates & Financial Budgets Public Types & Contracts.
 * Implements the security cascade, rate-limiting and signature hashing
 * specified in ADR 0006 for DENTE Dental CRM.
 */
export const publicAuthMethodSchema = z.enum(["phone_last4", "dob", "manual_code", "none"]);
export const publicRejectionReasonSchema = z.enum(["price", "time", "second_opinion", "other"]);
export const publicEstimateStatusSchema = z.enum([
    "draft",
    "sent",
    "viewed",
    "accepted",
    "rejected",
    "expired",
    "cancelled",
    "invoiced",
    "paid",
]);
/**
 * Calculates net line total after discount
 */
export function calculateEstimateItemNet(item) {
    const total = Math.max(0, item.quantity * item.unit_price_rub);
    const discount = Math.max(0, item.discount_rub || 0);
    return Math.max(0, total - discount);
}
/**
 * Calculates full totals across estimate items
 */
export function calculateEstimateTotals(items) {
    let subtotal = 0;
    let discount = 0;
    for (const item of items) {
        const gross = Math.max(0, item.quantity * item.unit_price_rub);
        const itemDiscount = Math.max(0, item.discount_rub || 0);
        subtotal += gross;
        discount += itemDiscount;
    }
    const total = Math.max(0, subtotal - discount);
    return { subtotal, discount, total };
}
/**
 * Computes deterministic SHA-256 document hash for legal compliance and tamper detection
 */
export function computeEstimateDocumentHash(estimate, signature) {
    const canonicalPayload = [
        estimate.id,
        estimate.estimate_number,
        estimate.total_rub.toFixed(2),
        estimate.items.map((i) => `${i.id}:${i.net_line_total_rub.toFixed(2)}`).join(","),
        signature.signed_by_name.trim().toLowerCase(),
        signature.signed_at_iso,
        signature.signature_png || "CLICK_ACCEPT",
    ].join("|");
    return sha256Hex(canonicalPayload);
}
