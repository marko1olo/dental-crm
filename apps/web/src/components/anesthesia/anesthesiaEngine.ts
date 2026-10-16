/**
 * Clinical Anesthesiology & Pharmacology Safety Engine (Минздрав РФ / СтАР / AHA)
 * Maximum dose calculation, Epinephrine cardiac limits, Pediatric/Geriatric scaling, Form 043/u diary.
 * Modular facade compliant with submodules <= 120 lines invariant.
 */

export * from './engine/anesthesiaEngineTypes.js';
export * from './engine/anesthesiaAgeClassification.js';
export * from './engine/anesthesiaDiaryFormatter.js';
export * from './engine/anesthesiaSafetyAdvisor.js';
export * from './engine/anesthesiaDoseCalculator.js';
