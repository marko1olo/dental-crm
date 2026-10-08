import { create } from "zustand";
import type { DocumentState } from "./types";
import { createDocumentSlice } from "./slices/documentSlice";
import { createTaxSlice } from "./slices/taxSlice";
import { createIntakeAndConsentSlice } from "./slices/intakeConsentSlice";
import { createFinancialSlice } from "./slices/financialSlice";
import { createClinicalSlice } from "./slices/clinicalSlice";
import { createMiscSlice } from "./slices/miscSlice";
import { documentFormInitialValues } from "./documentSelectors";

export const useDocumentStore = create<DocumentState>(
	(set) =>
		({
			...createDocumentSlice(set),
			...createTaxSlice(set),
			...createIntakeAndConsentSlice(set),
			...createFinancialSlice(set),
			...createClinicalSlice(set),
			...createMiscSlice(set),
			resetDocumentForms: () =>
				set(documentFormInitialValues() as DocumentState),
		}) as DocumentState,
);
