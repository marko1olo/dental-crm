/**
 * AnesthesiaDosageCalculatorService.ts — Сервис расчета предельных доз местных анестетиков
 * и мониторинга риска токсической передозировки.
 */

export interface AnesthesiaMedication {
    readonly name: "articaine" | "mepivacaine" | "lidocaine";
    readonly concentrationPercent: number; // 4, 3, 2
    readonly maxMgPerKg: number;
    readonly absoluteMaxMg: number;
}

export const ANESTHETICS_REGISTRY: Record<string, AnesthesiaMedication> = {
    ARTICAINE_4: {
        name: "articaine",
        concentrationPercent: 4,
        maxMgPerKg: 7.0,
        absoluteMaxMg: 500,
    },
    MEPIVACAINE_3: {
        name: "mepivacaine",
        concentrationPercent: 3,
        maxMgPerKg: 4.4,
        absoluteMaxMg: 300,
    },
    LIDOCAINE_2: {
        name: "lidocaine",
        concentrationPercent: 2,
        maxMgPerKg: 4.4,
        absoluteMaxMg: 300,
    },
};

export interface DosageCalculationResult {
    readonly maxAllowedMg: number;
    readonly maxAllowedCarpules: number;
    readonly currentTotalMg: number;
    readonly isToxicRisk: boolean;
    readonly safetyMarginMg: number;
}

export class AnesthesiaDosageCalculatorService {
    /**
     * Расчет максимально допустимой дозы для пациента.
     * @param patientWeightKg Масса тела в кг.
     * @param anestheticType Тип анестетика из реестра.
     */
    public static calculateMaxDose(
        patientWeightKg: number,
        anestheticType: keyof typeof ANESTHETICS_REGISTRY
    ): { maxMg: number; maxCarpules: number } {
        const drug = ANESTHETICS_REGISTRY[anestheticType];
        if (!drug) {
            throw new Error(`Anesthetic type ${anestheticType} not found.`);
        }
        const calculatedByWeight = patientWeightKg * drug.maxMgPerKg;
        const maxMg = Math.min(calculatedByWeight, drug.absoluteMaxMg);

        // Карпула обычно 1.7-1.8 мл. Используем 1.8 мл для безопасного консервативного расчета.
        // Концентрация 4% = 40 мг/мл. 1.8 мл * 40 = 72 мг в карпуле.
        const mgPerMl = drug.concentrationPercent * 10;
        const mgPerCarpule = mgPerMl * 1.8;
        const maxCarpules = Math.floor(maxMg / mgPerCarpule);

        return { maxMg, maxCarpules };
    }

    /**
     * Проверка дозировки с учетом уже введенного объема.
     */
    public static checkToxicRisk(
        patientWeightKg: number,
        anestheticType: keyof typeof ANESTHETICS_REGISTRY,
        alreadyAdministeredMg: number
    ): DosageCalculationResult {
        const { maxMg, maxCarpules } = this.calculateMaxDose(patientWeightKg, anestheticType);
        const safetyMarginMg = maxMg - alreadyAdministeredMg;
        
        return {
            maxAllowedMg: maxMg,
            maxAllowedCarpules: maxCarpules,
            currentTotalMg: alreadyAdministeredMg,
            isToxicRisk: alreadyAdministeredMg >= maxMg,
            safetyMarginMg: Math.max(0, safetyMarginMg)
        };
    }
}
