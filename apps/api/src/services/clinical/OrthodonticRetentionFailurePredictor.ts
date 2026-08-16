/**
 * OrthodonticRetentionFailurePredictor.ts — Предиктор отклеивания несъемных ретейнеров и рецидива скученности.
 * 
 * КЛИНИЧЕСКИЕ СТАНДАРТЫ:
 * 1. Риск-анализ: глубокий прикус, бруксизм, тип фиксации, наклон зубов.
 * 2. Рекомендации: защита каппой (Vivera/Essix), динамический контроль.
 */

export interface RetentionRiskFactors {
    readonly hasTraumaticDeepBite: boolean;
    readonly hasSevereBruxism: boolean;
    readonly usedDirectBondingWithoutTemplate: boolean;
    readonly hasLingualInclination: boolean;
}

export interface PredictionResult {
    readonly riskScore: number;
    readonly recommendations: string[];
}

export class OrthodonticRetentionFailurePredictor {
    public static readonly SCORE_DEEP_BITE = 30;
    public static readonly SCORE_BRUXISM = 25;
    public static readonly SCORE_DIRECT_BONDING = 15;
    public static readonly SCORE_LINGUAL_INCLINATION = 15;

    /**
     * Оценка риска отклеивания ретейнера (Retention Failure Risk Score 0-100).
     */
    public static predictRisk(factors: RetentionRiskFactors): PredictionResult {
        let riskScore = 0;

        if (factors.hasTraumaticDeepBite) riskScore += this.SCORE_DEEP_BITE;
        if (factors.hasSevereBruxism) riskScore += this.SCORE_BRUXISM;
        if (factors.usedDirectBondingWithoutTemplate) riskScore += this.SCORE_DIRECT_BONDING;
        if (factors.hasLingualInclination) riskScore += this.SCORE_LINGUAL_INCLINATION;

        const recommendations: string[] = [];

        if (riskScore >= 40) {
            recommendations.push("Дублирование несъемного ретейнера ночной прозрачной ретенционной каппой (Vivera/Essix).");
        }
        
        recommendations.push("Регулярный контроль каждые 3 месяца.");

        return {
            riskScore: Math.min(riskScore, 100),
            recommendations
        };
    }
}
