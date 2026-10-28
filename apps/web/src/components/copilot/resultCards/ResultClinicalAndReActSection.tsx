import React from 'react';
import type { Protocol043Data, ReactStepItem } from '../copilotTypes';
import { CopilotReactTracker } from '../cards/CopilotReactTracker';
import { CopilotClinicalProtocolCard } from '../cards/CopilotClinicalProtocolCard';
import { CopilotSoapDiaryCard } from '../cards/CopilotSoapDiaryCard';
import type { ClinicalProtocolCardData } from '../cards/types';

type Obj = Record<string, unknown>;

export function renderClinicalAndReActSection(tool: string, obj: Obj): React.ReactNode | null {
  // ReAct Execution Tracker
  if (
    tool.includes('react') ||
    tool.includes('pipeline') ||
    tool.includes('agentic') ||
    Array.isArray(obj.steps) ||
    Array.isArray(obj.react_steps)
  ) {
    const rawSteps = Array.isArray(obj.steps)
      ? (obj.steps as unknown as ReactStepItem[])
      : Array.isArray(obj.react_steps)
      ? (obj.react_steps as unknown as ReactStepItem[])
      : undefined;

    return (
      <CopilotReactTracker
        title={typeof obj.title === 'string' ? obj.title : undefined}
        steps={rawSteps}
        currentStepIndex={typeof obj.currentStepIndex === 'number' ? obj.currentStepIndex : undefined}
        isComplete={typeof obj.isComplete === 'boolean' ? obj.isComplete : undefined}
      />
    );
  }

  // Clinical Protocols Catalog Card
  if (
    tool.includes('clinical_protocol') ||
    tool.includes('apply_clinical_protocol') ||
    tool.includes('select_clinical_protocol') ||
    tool.includes('search_clinical_protocols') ||
    tool.includes('suggest_clinical_protocol') ||
    (typeof obj.procedureName === 'string' && (obj.patch !== undefined || obj.matchedIcd10 !== undefined)) ||
    obj.totalCatalogProtocols === 1142
  ) {
    const cardData: ClinicalProtocolCardData = {
      procedureId: typeof obj.procedureId === 'string' ? obj.procedureId : undefined,
      procedureName: String(obj.procedureName || obj.name || 'Клинический протокол'),
      categoryKey: typeof obj.categoryKey === 'string' ? obj.categoryKey : undefined,
      categoryName: typeof obj.categoryName === 'string' ? obj.categoryName : undefined,
      matchedIcd10: typeof obj.matchedIcd10 === 'string' ? obj.matchedIcd10 : undefined,
      tooth: (obj.tooth as string | number) ?? (obj.toothNumber as string | number),
      toothNumber: (obj.toothNumber as string | number) ?? (obj.tooth as string | number),
      patch: obj.patch && typeof obj.patch === 'object' ? (obj.patch as ClinicalProtocolCardData['patch']) : undefined,
      toothState: typeof obj.toothState === 'string' ? (obj.toothState as any) : undefined,
      applied: typeof obj.applied === 'boolean' ? obj.applied : true,
      totalCatalogProtocols: 1142,
      alternatives: Array.isArray(obj.alternatives) ? (obj.alternatives as any) : undefined,
    };
    return <CopilotClinicalProtocolCard data={cardData} />;
  }

  // Medical Record Diary Card
  if (
    tool.includes('043') ||
    tool.includes('diary') ||
    (obj.complaints !== undefined && obj.treatment !== undefined) ||
    obj.protocol_043 !== undefined
  ) {
    const pObj = (obj.protocol_043 && typeof obj.protocol_043 === 'object' ? obj.protocol_043 : obj) as Obj;
    const p043Data: Protocol043Data = {
      patientId: typeof pObj.patientId === 'string' ? pObj.patientId : undefined,
      patientName: typeof pObj.patientName === 'string' ? pObj.patientName : typeof pObj.patient_name === 'string' ? pObj.patient_name : undefined,
      tooth: (pObj.tooth as string | number) ?? (Array.isArray(pObj.teeth) ? (pObj.teeth[0] as string | number) : undefined),
      teeth: Array.isArray(pObj.teeth) ? (pObj.teeth as (string | number)[]) : undefined,
      diagnosis: typeof pObj.diagnosis === 'string' ? pObj.diagnosis : typeof pObj.icd10 === 'string' ? pObj.icd10 : undefined,
      icd10: typeof pObj.icd10 === 'string' ? pObj.icd10 : undefined,
      complaints: typeof pObj.complaints === 'string' ? pObj.complaints : undefined,
      anamnesis: typeof pObj.anamnesis === 'string' ? pObj.anamnesis : undefined,
      objective: typeof pObj.objective === 'string' ? pObj.objective : undefined,
      treatment: typeof pObj.treatment === 'string' ? pObj.treatment : undefined,
      recommendations: typeof pObj.recommendations === 'string' ? pObj.recommendations : undefined,
    };
    return <CopilotSoapDiaryCard data={p043Data} />;
  }

  return null;
}
