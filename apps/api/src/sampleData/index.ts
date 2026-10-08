/**
 * @file index.ts
 * @description Layer 5: Master Coordinator and Public API Re-export for sampleData modules.
 */

export * from "./stateNotifier.js";
export * from "./fixtureIds.js";
export * from "./domainState.js";
export * from "./types.js";
export * from "./inventoryFixtures.js";
export * from "./sanpinFixtures.js";
export * from "./priceList.js";
export * from "./organizations.js";
export * from "./organizationMutations.js";
export * from "./staff.js";
export * from "./staffMutations.js";
export * from "./patients.js";
export * from "./patientMutations.js";
export * from "./appointments.js";
export * from "./scheduleTimeHelpers.js";
export * from "./scheduleSuggestions.js";
export * from "./scheduleIntelligence.js";
export * from "./scheduleValidation.js";
export * from "./appointmentMutations.js";
export * from "./clinicalRecords.js";
export * from "./documents.js";
export * from "./visitDrafts.js";
export * from "./clinicalRules.js";
export * from "./billing.js";
export * from "./communications.js";
export * from "./imaging.js";
export * from "./speechProviders.js";
export * from "./speechRecognition.js";
export * from "./audit.js";
export * from "./integrationPresets.js";
export * from "./statePersistence.js";
export * from "./dashboard.js";

import { applyPersistentState } from "./statePersistence.js";
import { normalizeMutableScheduleState } from "./statePersistence.js";

// Initialize persistent state hydration and schedule normalization on module load
applyPersistentState();
normalizeMutableScheduleState();
