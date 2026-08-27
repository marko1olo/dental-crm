import { z } from "zod";
export const procedureSpecificConsentProcedureSchema = z.enum([
    "local_anesthesia",
    "therapy_endo_restoration",
    "sedation",
    "surgery_extraction",
    "implantation_bone_graft",
    "prosthetics",
    "orthodontics",
    "hygiene_whitening",
    "periodontology",
    "other",
]);
