import { z } from "zod";
export declare const procedureSpecificConsentProcedureSchema: z.ZodEnum<["local_anesthesia", "therapy_endo_restoration", "sedation", "surgery_extraction", "implantation_bone_graft", "prosthetics", "orthodontics", "hygiene_whitening", "periodontology", "other"]>;
export type ProcedureSpecificConsentProcedure = z.infer<typeof procedureSpecificConsentProcedureSchema>;
