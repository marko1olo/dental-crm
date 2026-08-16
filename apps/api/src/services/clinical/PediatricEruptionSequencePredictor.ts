/**
 * PediatricEruptionSequencePredictor.ts
 * 
 * Predicts eruption timing and recommends space maintainers based on pediatric dental development.
 */

export enum ToothType {
  PRIMARY = 'primary',
  PERMANENT = 'permanent',
}

export enum SpaceMaintainerType {
  BAND_AND_LOOP = 'Band-and-Loop',
  DISTAL_SHOE = 'Distal Shoe',
  LINGUAL_ARCH = 'Lingual Arch',
  NONE = 'None',
}

export interface EruptionPrediction {
  toothId: string;
  expectedEruptionAgeMonths: number;
  isDelayed: boolean;
  recommendedIntervention?: SpaceMaintainerType;
}

export class PediatricEruptionSequencePredictor {
  // Approximate eruption ages in months (simplified for logic)
  private readonly eruptionAges: Record<string, number> = {
    '54': 30, // Primary 2nd molar
    '55': 30,
    '64': 30,
    '65': 30,
    '74': 30,
    '75': 30,
    '84': 30,
    '85': 30,
  };

  /**
   * Predicts eruption status and recommends space maintainers if necessary.
   * 
   * @param toothId ID of the tooth (e.g., '54')
   * @param currentAgeMonths Current age of the child in months
   * @param isPrematurelyLost Whether the primary tooth was lost prematurely
   */
  public predict(
    toothId: string, 
    currentAgeMonths: number, 
    isPrematurelyLost: boolean
  ): EruptionPrediction {
    const expected = this.eruptionAges[toothId] || 30;
    
    let recommendation = SpaceMaintainerType.NONE;

    if (isPrematurelyLost) {
      if (['54', '64', '74', '84'].includes(toothId)) {
        recommendation = SpaceMaintainerType.BAND_AND_LOOP;
      } else if (['55', '65', '75', '85'].includes(toothId)) {
        // Simple logic: if 2nd molar lost before 1st permanent molar eruption
        recommendation = SpaceMaintainerType.DISTAL_SHOE;
      }
    }

    return {
      toothId,
      expectedEruptionAgeMonths: expected,
      isDelayed: currentAgeMonths > expected + 6,
      recommendedIntervention: recommendation,
    };
  }
}
