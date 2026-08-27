/**
 * Printable HTML/PDF Treatment Plan Estimate Renderer.
 * Generates statutory, high-grade dental cost estimates for patient presentation and signing.
 */
export interface EstimateStageItem {
    readonly id: string;
    readonly toothNumber?: number | null;
    readonly code804n?: string | null;
    readonly name: string;
    readonly quantity: number;
    readonly priceKopecks: number;
    readonly discountPercent?: number;
    readonly totalKopecks: number;
}
export interface EstimateStage {
    readonly stageNumber: number;
    readonly name: string;
    readonly description?: string | null;
    readonly items: readonly EstimateStageItem[];
    readonly totalKopecks: number;
}
export interface EstimateRenderData {
    readonly estimateNumber: string;
    readonly date: string;
    readonly validUntilDate?: string | null;
    readonly clinic: {
        readonly name: string;
        readonly legalName?: string | null;
        readonly address?: string | null;
        readonly phone?: string | null;
        readonly licenseInfo?: string | null;
        readonly inn?: string | null;
    };
    readonly patient: {
        readonly fullName: string;
        readonly birthDate?: string | null;
        readonly cardNumber?: string | null;
        readonly phone?: string | null;
    };
    readonly attendingDoctor?: {
        readonly fullName: string;
        readonly specialty?: string | null;
    } | null;
    readonly stages: readonly EstimateStage[];
    readonly subtotalKopecks: number;
    readonly discountKopecks: number;
    readonly totalPayableKopecks: number;
    readonly currencySymbol?: string;
    readonly notes?: string | null;
}
/**
 * Renders complete HTML document for estimate printing.
 */
export declare function renderEstimatePrintableHtml(data: EstimateRenderData): string;
