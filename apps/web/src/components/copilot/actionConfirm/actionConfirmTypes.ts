import type { ConfirmHandler } from '../copilotTypes';

export interface CopilotActionConfirmProps {
  callId?: string | undefined;
  name?: string | undefined;
  args?: Record<string, unknown> | undefined;
  confirmation?: {
    callId: string;
    name: string;
    args?: Record<string, unknown> | undefined;
  } | undefined;
  resolved?: ('confirm' | 'reject') | undefined;
  nameCache?: Record<string, string> | undefined;
  onConfirm?: ConfirmHandler | undefined;
  disabled?: boolean | undefined;
}

export interface ClinicalDiff {
  target: string;
  from: string;
  to: string;
  badge?: string;
}

export interface ArgHumanized {
  label: string;
  text: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}
