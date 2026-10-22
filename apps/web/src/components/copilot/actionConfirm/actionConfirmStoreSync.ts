import { useVisitStore } from '../../../store/visitStore';

export function syncVisitStoreWithAction(rawName: string, finalArgs: Record<string, unknown>): void {
  try {
    const store = useVisitStore.getState();
    if (rawName.includes('043') || rawName.includes('diary') || rawName.includes('note')) {
      const toothCode = String(finalArgs.tooth || (Array.isArray(finalArgs.teeth) ? finalArgs.teeth[0] : '') || '36');
      const diagStr = String(finalArgs.diagnosis || finalArgs.icd10 || 'K02.1');
      if (toothCode) {
        store.applyAiToothCodes([toothCode], 'done', { [toothCode]: 'treatment' }, { [toothCode]: diagStr });
      }
      store.setVisitNoteForm((prev) => ({
        ...prev,
        complaint: String(finalArgs.complaint || finalArgs.complaints || prev.complaint),
        anamnesis: String(finalArgs.anamnesis || prev.anamnesis),
        objectiveStatus: String(finalArgs.objectiveStatus || finalArgs.objective || prev.objectiveStatus),
        diagnosis: String(finalArgs.diagnosis || prev.diagnosis),
        treatmentPlan: String(finalArgs.treatmentPlan || finalArgs.treatment || prev.treatmentPlan),
      }));
    } else if (rawName.includes('estimate') || rawName.includes('plan')) {
      const teethList = Array.isArray(finalArgs.teeth) && finalArgs.teeth.length > 0 ? finalArgs.teeth.map(String) : ['36'];
      const plannedMap: Record<string, 'planned'> = {};
      teethList.forEach((t) => { plannedMap[t] = 'planned'; });
      store.applyAiToothCodes(teethList, 'planned', plannedMap);
    }
  } catch {
    // resilient
  }
}
