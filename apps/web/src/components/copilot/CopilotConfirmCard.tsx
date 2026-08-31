import React from 'react';
import { CopilotActionConfirm, type CopilotActionConfirmProps } from './CopilotActionConfirm';

export type CopilotConfirmCardProps = CopilotActionConfirmProps;

export const CopilotConfirmCard: React.FC<CopilotConfirmCardProps> = (props) => {
  return <CopilotActionConfirm {...props} />;
};
