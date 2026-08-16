import { Decimal } from 'decimal.js';

export interface TreatmentPlanItem {
    id: string;
    serviceId: string;
    title: string;
    priceRub: number;
    quantity: number;
}

export interface TreatmentPlanVersion {
    versionName: string;
    items: TreatmentPlanItem[];
    totalRub: number;
}

export interface DiscountParams {
    chiefPhysicianDiscountRub?: number;
    bonusPointsDiscountRub?: number;
    dmsCoPayPct?: number; // 0-100
}

export class TreatmentPlanVersioningService {
    static compareVersions(v1: TreatmentPlanVersion, v2: TreatmentPlanVersion) {
        const totalDiff = v2.totalRub - v1.totalRub;
        return {
            totalDiff,
            addedItems: v2.items.filter(i2 => !v1.items.find(i1 => i1.id === i2.id)),
            removedItems: v1.items.filter(i1 => !v2.items.find(i2 => i2.id === i1.id)),
        };
    }

    static calculateDiscount(basePrice: number, params: DiscountParams): number {
        let price = new Decimal(basePrice);
        
        // 1. DMS Co-pay
        if (params.dmsCoPayPct) {
            price = price.times(1 - (params.dmsCoPayPct / 100));
        }
        
        // 2. Fixed discounts
        if (params.chiefPhysicianDiscountRub) {
            price = price.minus(params.chiefPhysicianDiscountRub);
        }
        if (params.bonusPointsDiscountRub) {
            price = price.minus(params.bonusPointsDiscountRub);
        }
        
        return Math.max(0, price.toNumber());
    }

    static generateIdsText(procedureNames: string[], patientName: string): string {
        return `
ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ (ИДС)
Пациент: ${patientName}

Я, ${patientName}, даю согласие на медицинское вмешательство:
${procedureNames.map(p => `- ${p}`).join('\n')}

Возможные риски и осложнения:
- Аллергические реакции на препараты.
- Отеки, болевые ощущения в области вмешательства.
- Кровотечения.
- Риск неполного восстановления функции.

Ознакомлен(а) с протоколом согласно приказу 1051н.
        `.trim();
    }
}
