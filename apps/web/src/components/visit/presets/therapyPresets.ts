/**
 * apps/web/src/components/visit/presets/therapyPresets.ts
 *
 * Single Source of Truth: Canonical Therapy SOAP Presets from @dental/shared.
 * Governed by Mandates 8b, 8e, 8bf.
 */

import { THERAPY_SOAP_PRESETS as SHARED_THERAPY_SOAP_PRESETS } from "@dental/shared";
import type { ClinicalSoapPreset } from "../clinicalSoapTypes";

export const THERAPY_SOAP_PRESETS: readonly ClinicalSoapPreset[] = SHARED_THERAPY_SOAP_PRESETS as unknown as readonly ClinicalSoapPreset[];
