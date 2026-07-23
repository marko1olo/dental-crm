import { Decimal } from "decimal.js";
import {
  Patient,
  ServiceCatalogItem,
  TreatmentPlanItem,
  ClinicalToothRow,
  ServiceCategory
} from "@dental/shared";
import { randomUUID } from "node:crypto";

export class TreatmentPlanBuilder {
  private items: TreatmentPlanItem[] = [];
  private patient: Patient;
  private toothRows: ClinicalToothRow[];

  constructor(patient: Patient, toothRows: ClinicalToothRow[]) {
    this.patient = patient;
    this.toothRows = toothRows;
  }

  /**
   * Adds an item to the treatment plan. Uses rigid snapshots of the price list to prevent
   * historical plans from changing if global prices are updated.
   */
  public addItem(
    service: ServiceCatalogItem,
    quantity: number,
    toothCode: string | null = null,
    discountRub: number = 0
  ): TreatmentPlanItem {
    // 1. Validate against the patient's actual dental formula (FDI)
    if (toothCode) {
      this.validateTooth(toothCode, service.category, service.title);
    }

    // 2. Wisdom tooth specific semantic adjustments (Защита от дурака / Семантика восьмерок)
    if (toothCode && ["18", "28", "38", "48"].includes(toothCode)) {
      if (service.title.toLowerCase().includes("удаление") && !service.title.toLowerCase().includes("сложное")) {
        console.warn(`[CLINICAL WARNING] Удаление зуба мудрости (${toothCode}) обычно требует сложного удаления. Выбран обычный прайс: ${service.title}`);
        // В реальном приложении здесь можно автоматически подменить serviceId на "сложное удаление", если известно, или выдать ошибку.
      }
    }

    // 3. Mathematical check to ensure no negative totals
    const unitPrice = new Decimal(service.basePriceRub);
    const discount = new Decimal(discountRub);
    const qty = new Decimal(quantity);
    
    const itemTotal = unitPrice.minus(discount).times(qty);
    if (itemTotal.isNegative()) {
      throw new Error("ОШИБКА ФИНАНСОВ: Скидка не может превышать стоимость услуги.");
    }

    // 4. Create a legal snapshot of the service
    const item: TreatmentPlanItem = {
      id: randomUUID(),
      organizationId: this.patient.organizationId,
      patientId: this.patient.id,
      visitId: null,
      serviceId: service.id,
      snapshotServiceName: service.title,
      snapshotServiceCategory: service.category,
      toothCode,
      quantity,
      unitPriceRub: service.basePriceRub,
      discountRub,
      status: "proposed",
      plannedDoctorUserId: null,
      plannedChairId: null,
      notes: null
    };

    this.items.push(item);
    return item;
  }

  private validateTooth(toothCode: string, category: ServiceCategory, serviceTitle: string) {
    const tooth = this.toothRows.find((r) => r.toothOrArea === toothCode);
    if (!tooth) return;

    // Защита от дурака: Нельзя лечить (кариес, пульпит и т.д.) удаленный зуб
    if ((tooth.status as string) === "missing") {
      // Хирургия (имплантация) на отсутствующем зубе — это нормально
      if (category === "surgery" && (serviceTitle.toLowerCase().includes("имплант") || serviceTitle.toLowerCase().includes("синус"))) {
         return; 
      }
      throw new Error(`ОШИБКА ЛОГИКИ: Зуб ${toothCode} отсутствует. Действие '${serviceTitle}' невозможно.`);
    }

    // Нельзя удалять уже удаленный зуб
    if ((tooth.status as string) === "missing" && serviceTitle.toLowerCase().includes("удаление")) {
      throw new Error(`ОШИБКА ЛОГИКИ: Зуб ${toothCode} уже удален.`);
    }
  }

  /**
   * Calculates the exact total using decimal.js to prevent JS float bugs
   */
  public calculateTotal(): number {
    let total = new Decimal(0);
    for (const item of this.items) {
       const unitPrice = new Decimal(item.unitPriceRub);
       const discount = new Decimal(item.discountRub);
       const qty = new Decimal(item.quantity);
       const itemTotal = unitPrice.minus(discount).times(qty);
       total = total.plus(itemTotal);
    }
    return total.toNumber();
  }

  public getItems(): TreatmentPlanItem[] {
    return this.items;
  }

  /**
   * Translates "Proposed" items to "Completed", generates an Act, 
   * and deducts from the patient's balance.
   */
  public convertToAct(itemIds: string[]): {
    updatedItems: TreatmentPlanItem[],
    actTotalRub: number,
    newBalanceRub: number
  } {
    const itemsToConvert = this.items.filter((i) => itemIds.includes(i.id) && i.status !== "completed");
    
    let actTotal = new Decimal(0);
    for (const item of itemsToConvert) {
       const itemTotal = new Decimal(item.unitPriceRub).minus(item.discountRub).times(item.quantity);
       actTotal = actTotal.plus(itemTotal);
       item.status = "completed";
    }

    const currentBalance = new Decimal(this.patient.balanceRub || 0);
    const newBalance = currentBalance.minus(actTotal);

    this.patient.balanceRub = newBalance.toNumber();

    return {
      updatedItems: itemsToConvert,
      actTotalRub: actTotal.toNumber(),
      newBalanceRub: newBalance.toNumber()
    };
  }
}
