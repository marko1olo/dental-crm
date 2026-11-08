/**
 * patientDuplicateFinder.ts — Delegating facade to Canonical SSOT duplicate detector.
 * Conforms to Mandates 8s (SSOT) and 8b (Sweet Spot <= 30 lines).
 */

import type { Patient } from "@dental/shared";
import { findPotentialDuplicates as findDuplicatesSSOT } from "../../patients/patientSearch/duplicateFinder";
import type {
	FindPotentialDuplicatesCriteria,
	PotentialDuplicateItem,
} from "./searchEngineTypes";

export function findPotentialDuplicates(
	patients: readonly Patient[],
	criteria: FindPotentialDuplicatesCriteria,
): PotentialDuplicateItem[] {
	return findDuplicatesSSOT(patients, criteria) as unknown as PotentialDuplicateItem[];
}
