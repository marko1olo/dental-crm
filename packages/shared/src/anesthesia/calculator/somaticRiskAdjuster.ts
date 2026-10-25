/**
 * @dental/shared/anesthesia/calculator/somaticRiskAdjuster.ts
 * Somatic Anamnesis Risk Parsing & Contraindications Facade (Mandate 8b, <= 120 lines)
 */

export { resolveClinicalDefaultWeightKg } from "./somaticAdjusterModules/clinicalWeightResolver.js";
export { extractSomaticRiskProfileFromText } from "./somaticAdjusterModules/somaticRiskProfileParser.js";
export { checkAnesthesiaSomaticContraindications } from "./somaticAdjusterModules/somaticCheckEngine.js";
