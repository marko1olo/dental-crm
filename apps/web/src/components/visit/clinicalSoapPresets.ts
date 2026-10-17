/**
 * clinicalSoapPresets.ts
 * SSOT Clinical Catalog of SOAP Protocols & Presets (Минздрав РФ № 804н, № 1051н).
 */

import { getToothAnatomicalDescription } from "../emr/templates/clinicalDiaryTemplatesEngine";

export * from "./clinicalSoapTypes.js";
export * from "./presets/therapyPresets.js";
export * from "./presets/surgeryPresets.js";
export * from "./presets/orthopedicPresets.js";
export * from "./presets/hygienePerioPresets.js";
export * from "./presets/canonicalTemplates.js";
export * from "./presets/autopilotPresets.js";
export * from "./clinicalSoapSearch.js";
export * from "./clinicalSoapFormat.js";
export * from "./clinicalSoapValidation.js";

export { getToothAnatomicalDescription };
