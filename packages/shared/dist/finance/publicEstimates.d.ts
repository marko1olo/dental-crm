import { z } from "zod";
/**
 * 2FA Online Estimates & Financial Budgets Public Types & Contracts.
 * Implements the security cascade, rate-limiting and signature hashing
 * specified in ADR 0006 for DENTE Dental CRM.
 */
export declare const publicAuthMethodSchema: z.ZodEnum<["phone_last4", "dob", "manual_code", "none"]>;
export type PublicAuthMethod = z.infer<typeof publicAuthMethodSchema>;
export declare const publicRejectionReasonSchema: z.ZodEnum<["price", "time", "second_opinion", "other"]>;
export type PublicRejectionReason = z.infer<typeof publicRejectionReasonSchema>;
export declare const publicEstimateStatusSchema: z.ZodEnum<["draft", "sent", "viewed", "accepted", "rejected", "expired", "cancelled", "invoiced", "paid"]>;
export type PublicEstimateStatus = z.infer<typeof publicEstimateStatusSchema>;
export interface PublicEstimateMeta {
    readonly requires_verification: boolean;
    readonly method: PublicAuthMethod;
    readonly locked: boolean;
    readonly expired: boolean;
    readonly already_decided: boolean;
    readonly decided_status: string | null;
    readonly clinic_name: string | null;
    readonly clinic_phone: string | null;
    readonly clinic_email: string | null;
    readonly clinic_address_line: string | null;
    readonly clinic_currency: string | null;
    readonly patient_first_name: string | null;
    readonly estimate_number: string | null;
    readonly estimate_total: string | null;
    readonly valid_until: string | null;
}
export interface PublicEstimateItem {
    readonly id: string;
    readonly title: string;
    readonly tooth_number: number | string | null;
    readonly quantity: number;
    readonly unit_price_rub: number;
    readonly line_total_rub: number;
    readonly discount_rub: number;
    readonly net_line_total_rub: number;
    readonly category?: string | null | undefined;
    readonly notes?: string | null | undefined;
}
export interface PublicEstimateDetail {
    readonly id: string;
    readonly estimate_number: string;
    readonly status: PublicEstimateStatus;
    readonly valid_from: string;
    readonly valid_until: string | null;
    readonly subtotal_rub: number;
    readonly total_discount_rub: number;
    readonly total_tax_rub: number;
    readonly total_rub: number;
    readonly patient_notes: string | null;
    readonly items: readonly PublicEstimateItem[];
    readonly tier_options?: readonly {
        readonly tierId: string;
        readonly title: string;
        readonly totalRub: number;
        readonly benefits: readonly string[];
    }[] | undefined;
}
export interface PublicEstimateSignature {
    readonly signed_by_name: string;
    readonly relationship_to_patient: string;
    readonly signature_method: "drawn" | "click_accept";
    readonly signature_png?: string | undefined;
    readonly signature_svg?: string | undefined;
    readonly ip_address?: string | undefined;
    readonly user_agent?: string | undefined;
    readonly signed_at_iso: string;
    readonly document_hash: string;
}
/**
 * Calculates net line total after discount
 */
export declare function calculateEstimateItemNet(item: {
    readonly quantity: number;
    readonly unit_price_rub: number;
    readonly discount_rub?: number | undefined;
}): number;
/**
 * Calculates full totals across estimate items
 */
export declare function calculateEstimateTotals(items: readonly {
    readonly quantity: number;
    readonly unit_price_rub: number;
    readonly discount_rub?: number | undefined;
}[]): {
    subtotal: number;
    discount: number;
    total: number;
};
/**
 * Computes deterministic SHA-256 document hash for legal compliance and tamper detection
 */
export declare function computeEstimateDocumentHash(estimate: {
    readonly id: string;
    readonly estimate_number: string;
    readonly total_rub: number;
    readonly items: readonly {
        readonly id: string;
        readonly net_line_total_rub: number;
    }[];
}, signature: {
    readonly signed_by_name: string;
    readonly signed_at_iso: string;
    readonly signature_png?: string | undefined;
}): string;
