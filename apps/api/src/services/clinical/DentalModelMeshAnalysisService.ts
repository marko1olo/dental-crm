/**
 * DentalModelMeshAnalysisService.ts — Сервис анализа 3D-моделей челюстей.
 * 
 * РАСЧЕТЫ:
 * 1. Bolton Overall Ratio: (SumMandibular / SumMaxillary) * 100 (Норма: 91.3%)
 * 2. Bolton Anterior Ratio: (SumMandibularAnterior / SumMaxillaryAnterior) * 100 (Норма: 77.2%)
 * 3. Индекс Пона: 
 *    - Премолярный индекс: (Ширина премоляров * 100) / Расстояние между премолярами
 *    - Молярный индекс: (Ширина моляров * 100) / Расстояние между молярами
 */

export interface ToothDimensions {
    readonly mesiodistalWidth: number; // в мм
}

export interface BoltonMetrics {
    readonly overallRatio: number;
    readonly anteriorRatio: number;
    readonly deviationOverall: number;
    readonly deviationAnterior: number;
}

export interface PonMetrics {
    readonly premolarIndex: number;
    readonly molarIndex: number;
    readonly premolarDiscrepancy: number; // мм
    readonly molarDiscrepancy: number; // мм
}

export class DentalModelMeshAnalysisService {
    public static readonly BOLTON_OVERALL_NORMAL = 91.3;
    public static readonly BOLTON_ANTERIOR_NORMAL = 77.2;

    /**
     * Расчет пропорций Болтона.
     * @param maxAnteriorSum Сумма мезиодистальных ширин 6 зубов верхней челюсти (13-23)
     * @param manAnteriorSum Сумма мезиодистальных ширин 6 зубов нижней челюсти (33-43)
     * @param maxTotalSum Сумма мезиодистальных ширин 12 зубов верхней челюсти (16-26)
     * @param manTotalSum Сумма мезиодистальных ширин 12 зубов нижней челюсти (36-46)
     */
    public static calculateBolton(
        maxAnteriorSum: number,
        manAnteriorSum: number,
        maxTotalSum: number,
        manTotalSum: number
    ): BoltonMetrics {
        const anteriorRatio = (manAnteriorSum / maxAnteriorSum) * 100;
        const overallRatio = (manTotalSum / maxTotalSum) * 100;

        return {
            anteriorRatio: parseFloat(anteriorRatio.toFixed(2)),
            overallRatio: parseFloat(overallRatio.toFixed(2)),
            deviationAnterior: parseFloat((anteriorRatio - this.BOLTON_ANTERIOR_NORMAL).toFixed(2)),
            deviationOverall: parseFloat((overallRatio - this.BOLTON_OVERALL_NORMAL).toFixed(2))
        };
    }

    /**
     * Расчет индекса Пона.
     * @param premolarWidthSum Сумма ширин коронок первых премоляров
     * @param molarWidthSum Сумма ширин коронок первых моляров
     * @param premolarDistance Расстояние между премолярами (между фиссурами)
     * @param molarDistance Расстояние между молярами (между фиссурами)
     */
    public static calculatePon(
        premolarWidthSum: number,
        molarWidthSum: number,
        premolarDistance: number,
        molarDistance: number
    ): PonMetrics {
        const premolarIndex = (premolarWidthSum * 100) / premolarDistance;
        const molarIndex = (molarWidthSum * 100) / molarDistance;

        // Норма индекса Пона: премолярный = 80, молярный = 64
        return {
            premolarIndex: parseFloat(premolarIndex.toFixed(2)),
            molarIndex: parseFloat(molarIndex.toFixed(2)),
            premolarDiscrepancy: parseFloat((premolarDistance - (premolarWidthSum * 100 / 80)).toFixed(2)),
            molarDiscrepancy: parseFloat((molarDistance - (molarWidthSum * 100 / 64)).toFixed(2))
        };
    }
}
