import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  doctorCommissions,
  treatmentPlanItemsNew,
  type dentalSpecialty,
  type serviceCategory
} from '../db/schema.js';

export interface TreatmentBundleItem {
  priceId: string;
  quantity: number;
  phase: number;
  isBundle: boolean;
  name: string;
  price: number;
}

export interface DoctorCommissionParams {
  doctorId: string;
  specialty: typeof dentalSpecialty.enumValues[number];
  serviceCategory: typeof serviceCategory.enumValues[number];
  grossPrice: number;
  materialCost: number; // to subtract before percentage
}

export class CommercialEngine {
  
  /**
   * Smart Bundles: Suggest bundled services based on clinical condition.
   * e.g., Caries MOD -> Complex Restoration (Anesthesia + Cofferdam + Build-up + Restoration).
   */
  static getSmartBundles(clinicalState: string, toothNumber: number): TreatmentBundleItem[] {
    const bundles: TreatmentBundleItem[] = [];

    if (clinicalState === 'Pulpitis') {
      bundles.push(
        { priceId: 'ENDO_PULP', quantity: 1, phase: 1, isBundle: true, name: 'Лечение пульпита (механика и обтурация)', price: 15000 },
        { priceId: 'ANES_INFIL', quantity: 1, phase: 1, isBundle: true, name: 'Анестезия инфильтрационная', price: 1000 },
        { priceId: 'ISO_COFF', quantity: 1, phase: 1, isBundle: true, name: 'Изоляция коффердамом', price: 1500 }
      );
    } else if (clinicalState === 'Planned_Implant') {
      // Surgical Bundle
      bundles.push(
        { priceId: 'SURG_IMPL_PREM', quantity: 1, phase: 2, isBundle: true, name: 'Установка имплантата (Премиум) с шаблоном', price: 45000 },
        { priceId: 'SURG_ANES', quantity: 2, phase: 2, isBundle: true, name: 'Анестезия хирургическая', price: 1200 }
      );
      // Prosthetic Bundle
      bundles.push(
        { priceId: 'PROSTH_CROWN_ZR', quantity: 1, phase: 3, isBundle: true, name: 'Коронка из диоксида циркония на имплантат', price: 35000 }
      );
    } else if (clinicalState === 'Caries') {
      bundles.push(
        { priceId: 'REST_COMP', quantity: 1, phase: 1, isBundle: true, name: 'Восстановление зуба композитом (Кариес)', price: 7500 },
        { priceId: 'ANES_INFIL', quantity: 1, phase: 1, isBundle: true, name: 'Анестезия', price: 1000 }
      );
    }

    return bundles;
  }

  /**
   * Split Commission Engine: Calculate exactly what a doctor earns per service.
   */
  static async calculateDoctorCommission(params: DoctorCommissionParams): Promise<number> {
    const { doctorId, specialty, serviceCategory, grossPrice, materialCost } = params;

    // Fetch config from DB
    const configs = await db.select().from(doctorCommissions).where(
      and(
        eq(doctorCommissions.specialty, specialty),
        eq(doctorCommissions.serviceCategory, serviceCategory)
      )
    );

    const config = configs.length > 0 ? configs[0] : null;
    
    // Default fallback if not configured (e.g., 20% standard)
    if (!config) {
      return (grossPrice - materialCost) * 0.20;
    }

    // New schema: commissionPct, materialCostDeductionPct
    const deductMaterial = materialCost * ((config.materialCostDeductionPct ?? 100) / 100);
    const baseAmount = Math.max(0, grossPrice - deductMaterial);
    const commission = baseAmount * ((config.commissionPct ?? 30) / 100);

    // Floor at 0
    return Math.max(0, commission);
  }
}
