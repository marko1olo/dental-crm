export enum FranklScale {
  CATEGORICALLY_NEGATIVE = 1,
  NEGATIVE = 2,
  POSITIVE = 3,
  CATEGORICALLY_POSITIVE = 4,
}

export enum TreatmentAdaptationMethod {
  STANDARD_ADAPTATION = 'Standard Adaptation (Tell-Show-Do)',
  SEDATION_N2O_O2 = 'Sedation (N2O/O2)',
  GENERAL_ANESTHESIA = 'General Anesthesia (Sevoflurane/Propofol)',
}

export interface FranklAssessment {
  franklScore: FranklScale;
  isEarlyChildhood: boolean;
  hasMultiplePulpitis: boolean;
}

export class PediatricFranklBehaviorService {
  public determineAdaptationMethod(assessment: FranklAssessment): TreatmentAdaptationMethod {
    if (assessment.franklScore >= FranklScale.POSITIVE) {
      return TreatmentAdaptationMethod.STANDARD_ADAPTATION;
    }

    if (assessment.franklScore === FranklScale.NEGATIVE) {
      return TreatmentAdaptationMethod.SEDATION_N2O_O2;
    }

    if (
      assessment.franklScore === FranklScale.CATEGORICALLY_NEGATIVE &&
      assessment.isEarlyChildhood &&
      assessment.hasMultiplePulpitis
    ) {
      return TreatmentAdaptationMethod.GENERAL_ANESTHESIA;
    }

    // Default fallback
    return TreatmentAdaptationMethod.STANDARD_ADAPTATION;
  }
}
