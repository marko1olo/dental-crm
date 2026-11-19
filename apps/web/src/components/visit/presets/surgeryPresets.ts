/**
 * apps/web/src/components/visit/presets/surgeryPresets.ts
 *
 * Single Source of Truth: Canonical Surgery SOAP Presets from @dental/shared.
 * Governed by Mandates 8b, 8e, 8bf.
 */

import { SURGERY_SOAP_PRESETS as SHARED_SURGERY_SOAP_PRESETS } from "@dental/shared";
import type { ClinicalSoapPreset } from "../clinicalSoapTypes";

export const SURGERY_SOAP_PRESETS: readonly ClinicalSoapPreset[] = SHARED_SURGERY_SOAP_PRESETS;
