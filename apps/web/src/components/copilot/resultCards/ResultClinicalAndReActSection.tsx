import React from 'react';
import type { Protocol043Data, ReactStepItem } from '../copilotTypes';
import { CopilotReactTracker } from '../cards/CopilotReactTracker';
import { CopilotClinicalProtocolCard } from '../cards/CopilotClinicalProtocolCard';
import { CopilotVisitCardConfirm } from '../cards/CopilotVisitCardConfirm';
import {
  CopilotSurgeryPassportCard,
  type CopilotSurgeryPassportData,
} from '../cards/CopilotSurgeryPassportCard';
import type { ClinicalProtocolCardData } from '../cards/types';

type Obj = Record<string, unknown>;

export function renderClinicalAndReActSection(tool: string, obj: Obj): React.ReactNode | null {
  // Surgery & Implant Passport Card
  if (
    tool.includes('surgery') ||
    tool.includes('implant') ||
    obj.implantSystem !== undefined ||
    obj.torqueNcm !== undefined
  ) {
    const passportData: CopilotSurgeryPassportData = {
      toothNumber:
        (obj.tooth as string | number) ??
        (obj.toothNumber as string | number) ??
        46,
      procedureName: String(
        obj.procedureName || obj.procedure || 'Дентальная имплантация'
      ),
      ...(typeof obj.implantSystem === 'string' ? { implantSystem: obj.implantSystem } : {}),
      ...(typeof obj.implantSize === 'string' ? { implantSize: obj.implantSize } : {}),
      ...(typeof obj.torqueNcm === 'number' ? { torqueNcm: obj.torqueNcm } : {}),
      ...(typeof obj.isqIndex === 'number' ? { isqIndex: obj.isqIndex } : {}),
      ...(typeof obj.membrane === 'string' ? { membrane: obj.membrane } : {}),
      ...(typeof obj.boneGraft === 'string' ? { boneGraft: obj.boneGraft } : {}),
      ...(typeof obj.lotNumber === 'string' ? { lotNumber: obj.lotNumber } : {}),
      ...(typeof obj.osteointegrationMonths === 'number'
        ? { osteointegrationMonths: obj.osteointegrationMonths }
        : {}),
      isApplied: Boolean(obj.isApplied || obj.applied),
    };
    return <CopilotSurgeryPassportCard data={passportData} />;
  }
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
      toothState:
        obj.toothState === 'treatment' ||
        obj.toothState === 'done' ||
        obj.toothState === 'missing' ||
        obj.toothState === 'idle'
          ? obj.toothState
          : undefined,
      applied: typeof obj.applied === 'boolean' ? obj.applied : true,
      totalCatalogProtocols: 1142,
      alternatives: Array.isArray(obj.alternatives)
        ? (obj.alternatives
            .filter((item): item is { id: string | number; procedureName?: string; name?: string; categoryKey?: string; categoryName?: string; matchedIcd10?: string } =>
              typeof item === 'object' && item !== null && ('id' in item || 'procedureName' in item || 'name' in item)
            )
            .map(alt => ({
              id: String(alt.id || `alt-${Date.now()}`),
              procedureName: String(alt.procedureName || alt.name || 'Альтернативный протокол'),
              ...(typeof alt.categoryKey === 'string' ? { categoryKey: alt.categoryKey } : {}),
              ...(typeof alt.categoryName === 'string' ? { categoryName: alt.categoryName } : {}),
              ...(typeof alt.matchedIcd10 === 'string' ? { matchedIcd10: alt.matchedIcd10 } : {}),
            })))
        : undefined,
    };
    return <CopilotClinicalProtocolCard data={cardData} />;
  }

  // Medical Record Diary Card (Examination Protocol)
  if (
    tool.includes('examination') ||
    tool.includes('diary') ||
    tool.includes('clinical_protocol') ||
    tool.includes('emr_protocol') ||
    tool.includes('043') ||
    (obj.complaints !== undefined && obj.treatment !== undefined) ||
    obj.clinicalProtocol !== undefined ||
    obj.protocolEmr !== undefined ||
    obj.protocol_043 !== undefined ||
    obj.examination_protocol !== undefined
  ) {
    const pObj = (obj.examination_protocol && typeof obj.examination_protocol === 'object'
      ? obj.examination_protocol
      : obj.clinicalProtocol && typeof obj.clinicalProtocol === 'object'
      ? obj.clinicalProtocol
      : obj.protocolEmr && typeof obj.protocolEmr === 'object'
      ? obj.protocolEmr
      : obj.protocol_043 && typeof obj.protocol_043 === 'object'
      ? obj.protocol_043
      : obj) as Obj;
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
    return <CopilotVisitCardConfirm data={p043Data} />;
  }

  return null;
}
