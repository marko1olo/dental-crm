import { createSetter } from "../createSetter";
import { loadUiPreferences } from "../../../utils/preferencesUtils";
import type { TaxSliceState } from "../types/coreTypes";

const initialUiPreferences = loadUiPreferences();

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export const createTaxSlice = (set: any): TaxSliceState => ({
	taxDocumentPayerInn: "",
	setTaxDocumentPayerInn: createSetter(set, "taxDocumentPayerInn"),
	taxApplicationTaxpayerFullName: "",
	setTaxApplicationTaxpayerFullName: createSetter(
		set,
		"taxApplicationTaxpayerFullName",
	),
	taxApplicationTaxpayerInn: "",
	setTaxApplicationTaxpayerInn: createSetter(set, "taxApplicationTaxpayerInn"),
	taxApplicationTaxpayerBirthDate: "",
	setTaxApplicationTaxpayerBirthDate: createSetter(
		set,
		"taxApplicationTaxpayerBirthDate",
	),
	taxApplicationTaxpayerIdentityDocument: "",
	setTaxApplicationTaxpayerIdentityDocument: createSetter(
		set,
		"taxApplicationTaxpayerIdentityDocument",
	),
	taxApplicationRelationship: "self",
	setTaxApplicationRelationship: createSetter(
		set,
		"taxApplicationRelationship",
	),
	taxApplicationForm: initialUiPreferences.taxApplicationForm,
	setTaxApplicationForm: createSetter(set, "taxApplicationForm"),
	taxApplicationDeliveryChannel:
		initialUiPreferences.taxApplicationDeliveryChannel,
	setTaxApplicationDeliveryChannel: createSetter(
		set,
		"taxApplicationDeliveryChannel",
	),
	taxApplicationContact: "",
	setTaxApplicationContact: createSetter(set, "taxApplicationContact"),
	taxApplicationAuthorityDocument: "",
	setTaxApplicationAuthorityDocument: createSetter(
		set,
		"taxApplicationAuthorityDocument",
	),
	taxApplicationRequestedAt: "",
	setTaxApplicationRequestedAt: createSetter(set, "taxApplicationRequestedAt"),
	taxApplicationDuplicateWarningAccepted: false,
	setTaxApplicationDuplicateWarningAccepted: createSetter(
		set,
		"taxApplicationDuplicateWarningAccepted",
	),
	taxDocumentYear:
		initialUiPreferences?.taxDocumentYear ?? new Date().getFullYear(),
	setTaxDocumentYear: (val) =>
		set((state: any) => ({
			taxDocumentYear:
				typeof val === "function" ? val(state.taxDocumentYear) : val,
		})),
});
