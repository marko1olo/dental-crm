export interface DieQualityAssessment {
  ditchDepthMm: number;
  hasContinuousMargin: boolean;
  hasChips: boolean;
}

export type AcceptanceStatus = 'accepted' | 'rejected_undercut_inadequate' | 'rejected_risk_of_fracture' | 'rejected_remake_required';

export class LabDieMarginAcceptanceEngine {
  /**
   * Evaluates the quality of a die trimming.
   * Rules:
   * - 0.5 <= depth <= 1.0 -> Pass
   * - depth < 0.5 -> Fail (rejected_undercut_inadequate)
   * - depth > 1.5 -> Fail (rejected_risk_of_fracture)
   * - !hasContinuousMargin -> Fail (rejected_remake_required)
   * - hasChips -> Fail (rejected_remake_required)
   */
  public evaluate(assessment: DieQualityAssessment): AcceptanceStatus {
    if (assessment.hasChips) {
      return 'rejected_remake_required';
    }

    if (!assessment.hasContinuousMargin) {
      return 'rejected_remake_required';
    }

    if (assessment.ditchDepthMm < 0.5) {
      return 'rejected_undercut_inadequate';
    }

    if (assessment.ditchDepthMm > 1.5) {
      return 'rejected_risk_of_fracture';
    }

    return 'accepted';
  }
}
