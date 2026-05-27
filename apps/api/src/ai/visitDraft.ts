import { buildRuleBasedVisitDraftFromTranscript } from "@dental/shared";
import type { DentalSpecialty, VisitNoteDraft } from "@dental/shared";

export function buildVisitDraftFromTranscript(transcript: string, specialty: DentalSpecialty = "universal"): VisitNoteDraft {
  return buildRuleBasedVisitDraftFromTranscript(transcript, specialty, {
    sourceLabel: "Серверный локальный парсер правил"
  });
}
