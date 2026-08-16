/**
 * PostExtractionHemostasisTriageService.ts — Алгоритм триажа луночкового кровотечения после удаления зуба.
 */

export type HemostasisStatus = "stable" | "urgent_compression" | "emergency_clinic_visit";

export type BleedingType = "capillary_oozing" | "liver_clot" | "pulsating_arterial";

export interface TriageResult {
    readonly status: HemostasisStatus;
    readonly recommendation: string;
}

export class PostExtractionHemostasisTriageService {
    /**
     * Оценка характера кровотечения и рекомендации по действиям.
     * @param bleedingType Тип кровотечения.
     */
    public static triage(bleedingType: BleedingType): TriageResult {
        switch (bleedingType) {
            case "capillary_oozing":
                return {
                    status: "stable",
                    recommendation: "Тугая марлевая тампонада с транексамовой кислотой / гемостатической губкой на 30-40 мин, лед на щеку."
                };
            case "liver_clot":
                return {
                    status: "urgent_compression",
                    recommendation: "Удаление рыхлого сгустка и повторная компрессия."
                };
            case "pulsating_arterial":
                return {
                    status: "emergency_clinic_visit",
                    recommendation: "Экстренный статус: вызов скорой / немедленный возврат в клинику для прошивания лунки и лигирования сосуда."
                };
            default:
                throw new Error(`Unknown bleeding type: ${bleedingType}`);
        }
    }
}
