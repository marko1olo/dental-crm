import React from 'react';
import {
  CopilotActionConfirmation,
  type CopilotActionConfirmationProps,
} from './CopilotActionConfirmation';

export type CopilotConfirmCardProps = CopilotActionConfirmationProps;

export const CopilotConfirmCard: React.FC<CopilotConfirmCardProps> = (props) => {
  return <CopilotActionConfirmation {...props} />;
};
