import React, { useState } from 'react';
import type { CopilotActionConfirmProps } from './actionConfirm/actionConfirmTypes';
import { ACTION_TITLES, isActionDestructive } from './actionConfirm/actionConfirmTitles';
import { getClinicalDiff } from './actionConfirm/actionConfirmDiff';
import { syncVisitStoreWithAction } from './actionConfirm/actionConfirmStoreSync';
import { ActionConfirmHeader } from './actionConfirm/ActionConfirmHeader';
import { ActionConfirmDiffBox } from './actionConfirm/ActionConfirmDiffBox';
import { ActionConfirmParamsGrid } from './actionConfirm/ActionConfirmParamsGrid';
import { ActionConfirmRejectPrompt } from './actionConfirm/ActionConfirmRejectPrompt';
import { ActionConfirmButtons } from './actionConfirm/ActionConfirmButtons';

export type { CopilotActionConfirmProps };

export const CopilotActionConfirm: React.FC<CopilotActionConfirmProps> = ({
  callId,
  name,
  args,
  confirmation,
  resolved,
  nameCache = {},
  onConfirm,
  disabled = false,
}) => {
  const actualCallId = callId || confirmation?.callId || 'call';
  const rawName = name || confirmation?.name || 'action';
  const shortName = rawName.split('.').pop() || rawName;
  const actionTitle = ACTION_TITLES[rawName] || ACTION_TITLES[shortName] || shortName;
  const initialArgs = args || confirmation?.args || {};

  const [isEditing, setIsEditing] = useState(false);
  const [editedArgs, setEditedArgs] = useState<Record<string, unknown>>(() => ({ ...initialArgs }));
  const [rejectReasonPrompt, setRejectReasonPrompt] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const currentArgs = isEditing ? editedArgs : initialArgs;
  const clinicalDiff = getClinicalDiff(rawName, currentArgs, actionTitle);
  const isDestructive = isActionDestructive(rawName);

  const allergyWarningText = (typeof currentArgs.allergy === 'string' && currentArgs.allergy) ||
    (typeof currentArgs.allergen === 'string' && currentArgs.allergen) ||
    (typeof currentArgs.allergyWarning === 'string' && currentArgs.allergyWarning) ||
    (typeof currentArgs.warning === 'string' && currentArgs.warning.toLowerCase().includes('аллерг') ? currentArgs.warning : null) ||
    (currentArgs.hasAllergyClash ? 'У пациента зафиксирована аллергия в анамнезе' : null);

  const handleExecute = (decision: 'confirm' | 'reject', customArgs?: Record<string, unknown>) => {
    if (!onConfirm) return;
    const finalArgs = decision === 'confirm' ? (customArgs ?? editedArgs) : undefined;
    const finalReason = decision === 'reject' ? (rejectReason.trim() || undefined) : undefined;

    if (decision === 'confirm' && finalArgs) {
      syncVisitStoreWithAction(rawName, finalArgs);
    }
    onConfirm(actualCallId, decision, finalArgs, finalReason);
    setIsEditing(false);
    setRejectReasonPrompt(false);
  };

  const argEntries = Object.entries(isEditing ? editedArgs : initialArgs);
  const hasSafeAlternative = Boolean(
    (rawName.includes('interaction') || rawName.includes('replace') || rawName.includes('drug')) &&
    (initialArgs.safe_alternative || initialArgs.alternative)
  );

  return (
    <div
      className={`copilot-action-confirm-card ${isDestructive ? 'destructive' : ''} ${resolved ? `resolved-${resolved}` : ''}`}
      role="region"
      aria-label={`Подтверждение действия: ${actionTitle}`}
    >
      <ActionConfirmHeader
        actionTitle={actionTitle}
        isDestructive={isDestructive}
        resolved={resolved}
        isEditing={isEditing}
        allergyWarningText={allergyWarningText}
      />
      {clinicalDiff && <ActionConfirmDiffBox clinicalDiff={clinicalDiff} />}
      <ActionConfirmParamsGrid
        argEntries={argEntries}
        actualCallId={actualCallId}
        isEditing={isEditing}
        disabled={disabled}
        resolved={resolved}
        nameCache={nameCache}
        onStartEditing={() => setIsEditing(true)}
        onArgChange={(key, val) => setEditedArgs((prev) => ({ ...prev, [key]: val }))}
      />
      {rejectReasonPrompt && !resolved && (
        <ActionConfirmRejectPrompt
          actualCallId={actualCallId}
          rejectReason={rejectReason}
          disabled={disabled}
          onReasonChange={setRejectReason}
          onConfirmReject={() => handleExecute('reject')}
          onCancelReject={() => setRejectReasonPrompt(false)}
        />
      )}
      {!resolved && !rejectReasonPrompt && (
        <ActionConfirmButtons
          isEditing={isEditing}
          isDestructive={isDestructive}
          disabled={disabled}
          rawName={rawName}
          hasSafeAlternative={hasSafeAlternative}
          onStartRejectPrompt={() => setRejectReasonPrompt(true)}
          onCancelEditing={() => { setEditedArgs({ ...initialArgs }); setIsEditing(false); }}
          onSaveEditing={() => handleExecute('confirm', editedArgs)}
          onConfirmDefault={() => handleExecute('confirm', initialArgs)}
          onOverrideWithoutReplacement={() => handleExecute('confirm', { ...initialArgs, doctor_override: true })}
        />
      )}
    </div>
  );
};

export const CopilotActionConfirmation = CopilotActionConfirm;
export const CopilotConfirmCard = CopilotActionConfirm;
