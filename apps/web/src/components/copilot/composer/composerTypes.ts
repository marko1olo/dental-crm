export interface CopilotComposerProps {
  value: string;
  busy: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
  onReset?: (() => void) | undefined;
  organizationId?: string | null | undefined;
  patientId?: string | null | undefined;
  visitId?: string | null | undefined;
}

export const DEFAULT_CLINICAL_PROMPT =
  "Проанализируй состояние пациента и подготовь рекомендации для дневника приёма";
