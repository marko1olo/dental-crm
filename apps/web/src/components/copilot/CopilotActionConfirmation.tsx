import React from 'react';
import {
  CopilotActionConfirm,
  type CopilotActionConfirmProps,
} from './CopilotActionConfirm';

export type CopilotActionConfirmationProps = CopilotActionConfirmProps;

export const CopilotActionConfirmation: React.FC<CopilotActionConfirmationProps> = (
  props,
) => {
  return <CopilotActionConfirm {...props} />;
};

export default CopilotActionConfirmation;
