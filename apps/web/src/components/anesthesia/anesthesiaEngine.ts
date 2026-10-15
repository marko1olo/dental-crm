/**
 * Clinical Anesthesiology & Pharmacology Safety Engine (Минздрав РФ / СтАР / AHA)
 * Maximum dose calculation, Epinephrine cardiac limits, Pediatric/Geriatric scaling, Form 043/u diary.
 * Modular facade compliant with submodules <= 120 lines invariant.
 */

export * from './engine/anesthesiaEngineTypes';
export * from './engine/anesthesiaAgeClassification';
export * from './engine/anesthesiaDiaryFormatter';
export * from './engine/anesthesiaSafetyAdvisor';
export * from './engine/anesthesiaDoseCalculator';
