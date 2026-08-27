import { z } from "zod";
// ─── Dental Anesthetic & Medication Types ────────────────────────────────────
export const dentalAnestheticVasoconstrictorSchema = z.enum([
    "none",
    "1:100000",
    "1:200000",
    "1:50000",
]);
