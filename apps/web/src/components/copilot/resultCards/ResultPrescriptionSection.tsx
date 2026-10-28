import React from 'react';
import type { PrescriptionData } from '../cards/types';
import { PrescriptionCard } from '../cards/PrescriptionCard';

type Obj = Record<string, unknown>;

export function renderPrescriptionSection(tool: string, obj: Obj): React.ReactNode | null {
  const isRx =
    tool.includes('prescription') ||
    tool.includes('107') ||
    tool.includes('recipe') ||
    tool.includes('create_prescription_107') ||
    obj.prescription !== undefined ||
    obj.form107 !== undefined ||
    (Array.isArray(obj.drugs) && obj.drugs.length > 0 && ('latinName' in (obj.drugs[0] as Obj) || 'signa' in (obj.drugs[0] as Obj))) ||
    (Array.isArray(obj.items) && obj.items.length > 0 && ('latinName' in (obj.items[0] as Obj) || 'signaRussian' in (obj.items[0] as Obj)));

  if (!isRx) return null;

  const rawRx = (obj.prescription || obj.form107 || obj) as Record<string, unknown>;
  const rawDrugs = Array.isArray(rawRx.drugs)
    ? rawRx.drugs
    : Array.isArray(rawRx.items)
    ? rawRx.items
    : [];

  const drugsList: PrescriptionData['drugs'] = rawDrugs.map((d: unknown, i: number) => {
    const dObj = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
    return {
      id: String(dObj.id || `drug_${i + 1}`),
      mnn: String(dObj.mnn || dObj.nameRu || dObj.tradeName || 'Препарат'),
      tradeName: typeof dObj.tradeName === 'string' ? dObj.tradeName : undefined,
      latinName: String(dObj.latinName || dObj.nameLatin || dObj.dispenseLatin || dObj.mnn || 'Medicamentum'),
      dosageForm: String(dObj.dosageForm || dObj.form || 'таблетки'),
      dosage: String(dObj.dosage || '500 мг'),
      quantity: String(dObj.quantity || dObj.packageCount || '10 шт'),
      signa: String(dObj.signa || dObj.signaRussian || 'По 1 таб. 2 раза в день во время еды'),
      icd10: typeof dObj.icd10 === 'string' ? dObj.icd10 : undefined,
    };
  });

  const rxData: PrescriptionData = {
    id: typeof rawRx.id === 'string' ? rawRx.id : undefined,
    series: String(rawRx.series || rawRx.prescriptionSeriesNumber || '77-АА'),
    number: String(rawRx.number || '004821'),
    issueDate: String(rawRx.issueDate || rawRx.prescriptionDate || new Date().toLocaleDateString('ru-RU')),
    validityDays: (rawRx.validityDays as number | string) || 60,
    patientName: String(rawRx.patientName || rawRx.patientFullName || 'Пациент клиники'),
    patientBirthDate: typeof rawRx.patientBirthDate === 'string' ? rawRx.patientBirthDate : undefined,
    patientAgeYears: typeof rawRx.patientAgeYears === 'number' ? rawRx.patientAgeYears : undefined,
    patientAddress: typeof rawRx.patientAddress === 'string' ? rawRx.patientAddress : undefined,
    doctorName: String(rawRx.doctorName || rawRx.doctorFullName || 'Лечащий врач'),
    doctorSpecialty: typeof rawRx.doctorSpecialty === 'string' ? rawRx.doctorSpecialty : 'Врач-стоматолог',
    clinicName: typeof rawRx.clinicName === 'string' ? rawRx.clinicName : typeof rawRx.clinicLegalName === 'string' ? rawRx.clinicLegalName : undefined,
    clinicOgrn: typeof rawRx.clinicOgrn === 'string' ? rawRx.clinicOgrn : undefined,
    clinicAddress: typeof rawRx.clinicAddress === 'string' ? rawRx.clinicAddress : undefined,
    diagnosisIcd10: typeof rawRx.diagnosisIcd10 === 'string' ? rawRx.diagnosisIcd10 : undefined,
    diagnosisName: typeof rawRx.diagnosisName === 'string' ? rawRx.diagnosisName : undefined,
    drugs: drugsList,
    isChronicallyIll: Boolean(rawRx.isChronicallyIll || rawRx.isChronicSpecialCare),
    isSignedUkep: Boolean(rawRx.isSignedUkep),
    ukepCertificate: typeof rawRx.ukepCertificate === 'string' ? rawRx.ukepCertificate : undefined,
    ukepSignedAt: typeof rawRx.ukepSignedAt === 'string' ? rawRx.ukepSignedAt : undefined,
  };

  return <PrescriptionCard prescription={rxData} />;
}
