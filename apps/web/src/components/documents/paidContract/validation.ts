/**
 * paidContract/validation.ts
 * Facade for statutory contract validation (Mandate 8b <= 120 lines)
 */

import type {
	PaidContractData,
	PaidContractValidationResult,
	ValidatePaidContractOptions,
} from "./contractDataTypes";
import { validateClinicRequisites } from "./validateClinicRequisites";
import { validatePatientCustomer } from "./validatePatientCustomer";
import { validateServicesPrice } from "./validateServicesPrice";

export function validatePaidContract736(
	contract: PaidContractData,
	options?: ValidatePaidContractOptions,
): PaidContractValidationResult {
	const clinicMissing = validateClinicRequisites(contract);
	const { missing: patientMissing, warnings: patientWarnings } = validatePatientCustomer(contract, options);
	const { missing: servicesMissing, warnings: servicesWarnings } = validateServicesPrice(contract, options);

	const missingFields = [...clinicMissing, ...patientMissing, ...servicesMissing];
	const warnings = [...patientWarnings, ...servicesWarnings];

	return {
		isValid: missingFields.length === 0,
		missingFields,
		warnings,
	};
}
