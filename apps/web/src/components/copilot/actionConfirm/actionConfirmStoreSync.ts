import { useVisitStore } from '../../../store/visitStore';

export function syncVisitStoreWithAction(rawName: string, finalArgs: Record<string, unknown>): void {
  try {
    const store = useVisitStore.getState();
    const explicitTooth = finalArgs.tooth
      ? String(finalArgs.tooth)
      : (Array.isArray(finalArgs.teeth) && finalArgs.teeth.length > 0 && finalArgs.teeth[0]
        ? String(finalArgs.teeth[0])
        : null);

    if (rawName.includes('043') || rawName.includes('diary') || rawName.includes('note')) {
      const diagStr = finalArgs.diagnosis
        ? String(finalArgs.diagnosis)
        : (finalArgs.icd10 ? String(finalArgs.icd10) : undefined);

      if (explicitTooth) {
        store.applyAiToothCodes([explicitTooth], 'done', { [explicitTooth]: 'treatment' }, diagStr ? { [explicitTooth]: diagStr } : undefined);
      }
      store.setVisitNoteForm((prev) => ({
        ...prev,
        complaint: finalArgs.complaint || finalArgs.complaints ? String(finalArgs.complaint || finalArgs.complaints) : prev.complaint,
        anamnesis: finalArgs.anamnesis ? String(finalArgs.anamnesis) : prev.anamnesis,
        objectiveStatus: finalArgs.objectiveStatus || finalArgs.objective ? String(finalArgs.objectiveStatus || finalArgs.objective) : prev.objectiveStatus,
        diagnosis: finalArgs.diagnosis ? String(finalArgs.diagnosis) : prev.diagnosis,
        treatmentPlan: finalArgs.treatmentPlan || finalArgs.treatment ? String(finalArgs.treatmentPlan || finalArgs.treatment) : prev.treatmentPlan,
      }));
    } else if (rawName.includes('estimate') || rawName.includes('plan')) {
      const teethList = Array.isArray(finalArgs.teeth) && finalArgs.teeth.length > 0
        ? finalArgs.teeth.map(String)
        : (finalArgs.tooth ? [String(finalArgs.tooth)] : []);

      if (teethList.length > 0) {
        const plannedMap: Record<string, 'planned'> = {};
        teethList.forEach((t) => { plannedMap[t] = 'planned'; });
        store.applyAiToothCodes(teethList, 'planned', plannedMap);
      }
    }
  } catch {
    // resilient
  }
}
