import type {
	ClinicProfile,
	Payment,
	ServiceCatalogItem,
	TreatmentPlanItem,
} from "@dental/shared";

export type DocumentRenderContext = {
	clinicProfile?: ClinicProfile;
	payments?: Payment[];
	serviceCatalog?: ServiceCatalogItem[];
	treatmentPlanItems?: TreatmentPlanItem[];
	isDraft?: boolean;
};

export * from "./renderUtilsModules/renderTypographyAndCss.js";
export * from "./renderUtilsModules/renderHeaderFooterAndStamps.js";
